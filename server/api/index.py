import os
import re
import json
import uuid
from typing import Optional, List, Any
from datetime import datetime, timezone
from contextlib import asynccontextmanager, contextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Cookie, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from groq import Groq
import jwt
import psycopg2
import psycopg2.extras
from psycopg2 import pool

# Load environment variables
load_dotenv()

# ==========================
# Configuration & Setup
# ==========================
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "3010"))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "postgres")

raw_origins = os.getenv("ALLOWED_ORIGINS", "")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

client = Groq(api_key=GROQ_API_KEY)

# Connection pool instance
db_pool: Optional[pool.ThreadedConnectionPool] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    try:
        db_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=20,
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname=DB_NAME,
            connect_timeout=5,
        )
    except Exception as e:
        print(f"Warning: Failed to initialize database connection pool: {e}")
        db_pool = None

    yield

    if db_pool:
        db_pool.closeall()


app = FastAPI(
    title="Diagram Generation AI Service",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://([a-zA-Z0-9-]+\.)*unibrik\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================
# Helpers & Database Manager
# ==========================
@contextmanager
def get_db_cursor():
    if not db_pool:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database pool is not available."
        )
    conn = db_pool.getconn()
    try:
        conn.autocommit = False
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        yield conn, cur
    except Exception:
        conn.rollback()
        raise
    finally:
        db_pool.putconn(conn)


def parse_valid_uuid(val: Optional[Any]) -> Optional[str]:
    if val is None:
        return None
    val_str = str(val).strip()
    if val_str.lower() in ("null", "undefined", "none", "", "nan"):
        return None
    try:
        return str(uuid.UUID(val_str))
    except (ValueError, TypeError, AttributeError):
        return None


def get_token_from_request(request: Request, token_cookie: Optional[str] = None) -> Optional[str]:
    if token_cookie:
        return token_cookie
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return None


def get_optional_user_email(request: Request) -> str:
    token = get_token_from_request(request)
    if not token or not JWT_SECRET:
        return "anonymous"
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("email") or payload.get("user_id") or payload.get("id") or payload.get("name") or "anonymous"
    except Exception:
        return "anonymous"


# ==========================
# Prompt Engineering Engine
# ==========================
SYSTEM_PROMPT = """
You are an expert Diagram & Systems Architecture Engine.
Your sole job is to translate user prompts, raw unstructured text, system specs, or workflows into a clean DSL graph format.

STRICT SYNTAX RULES:
1. Declare Nodes using: NodeID[Human Readable Label] OR NodeID[Human Readable Label][shape]
- NodeID must be alphanumeric with no spaces (e.g., WebClient, Auth_API, DB1, UserWorker).
- Valid shape values: rectangle, rounded, circle, ellipse, diamond, cylinder, queue, document, actor, hexagon, cloud, star.
2. Declare Edges using: SourceID --> TargetID OR SourceID --> TargetID: Relationship Label
3. ONLY return the valid DSL text lines. Do NOT write conversational intros, explanations, summaries, or Markdown code blocks (e.g., do NOT wrap in ``` or ```dsl).

EXAMPLE INPUT:
"Build a user authentication flow where a Web Client calls an API Gateway with HTTPS, which verifies credentials against an Auth Service. The Auth Service reads from a User DB cylinder, and publishes an audit log event to a Queue."

EXAMPLE OUTPUT:
Client[Web Client][rounded]
Gateway[API Gateway][hexagon]
Auth[Auth Service]
UserDB[User DB][cylinder]
MQ[Message Queue][queue]

Client --> Gateway: HTTPS
Gateway --> Auth: Verify Token
Auth --> UserDB: Query Credentials
Auth --> MQ: Publish Audit Event
"""


class DiagramRequest(BaseModel):
    prompt: str
    model: Optional[str] = None


class DiagramResponse(BaseModel):
    dsl_text: str


def sanitize_dsl_output(text: str) -> str:
    text = re.sub(r'```(?:[a-zA-Z]*)?', '', text)
    return text.replace('```', '').strip()


# ==========================
# User Authentication API
# ==========================
@app.get("/api/me")
def get_current_user(request: Request, token: Optional[str] = Cookie(None)):
    raw_token = get_token_from_request(request, token)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error": "Unauthorized", "auth": False}
        )

    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET is not configured on the server."
        )

    try:
        payload = jwt.decode(raw_token, JWT_SECRET, algorithms=["HS256"])
        user_data = {
            "firstName": payload.get("firstName", payload.get("name", "User")),
            "lastName": payload.get("lastName", ""),
            "email": payload.get("email", ""),
            "profile_p": payload.get("profile_p", payload.get("picture", ""))
        }
        return {
            "success": True,
            "message": "Protected content",
            "user": user_data
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error": "Token expired", "auth": False}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error": "Invalid token", "auth": False}
        )


# ==========================
# Core Routes
# ==========================
@app.get("/")
def root():
    return {"status": "Diagram AI Service Running"}


@app.post("/generate-dsl", response_model=DiagramResponse)
def generate_diagram(req: DiagramRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    selected_model = req.model or DEFAULT_MODEL

    try:
        completion = client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Generate a diagram for the following text/prompt:\n\n{req.prompt}"}
            ],
            temperature=0.2,
            max_completion_tokens=1024
        )

        raw_content = completion.choices[0].message.content or ""
        clean_dsl = sanitize_dsl_output(raw_content)

        return DiagramResponse(dsl_text=clean_dsl)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq AI Generation Error: {str(e)}")


# ==================================================================
# ============  DATABASE PERSISTENCE FEATURE  =======================
# ==================================================================

class SaveFileRequest(BaseModel):
    file_id: Optional[Any] = None
    id: Optional[Any] = None
    name: Optional[str] = "Untitled Diagram"
    data: Optional[Any] = None
    content: Optional[Any] = None

    @field_validator("file_id", "id", mode="before")
    @classmethod
    def validate_uuid_str(cls, v):
        return parse_valid_uuid(v)


class SavedFileResponse(BaseModel):
    file_id: str
    name: str
    data: Optional[Any] = None
    size_bytes: int
    created_at: str
    updated_at: str
    opened_at: Optional[str] = None
    created_by: Optional[str] = None


class SavedFileMeta(BaseModel):
    file_id: str
    name: str
    size_bytes: int
    created_at: str
    updated_at: str
    opened_at: Optional[str] = None
    created_by: Optional[str] = None


class SavedFileContent(BaseModel):
    file_id: str
    name: str
    data: Any


@app.post("/api/files/save", response_model=SavedFileResponse)
def save_file(payload: SaveFileRequest, request: Request):
    """Creates or updates a diagram file strictly in PostgreSQL JSONB."""
    user_email = get_optional_user_email(request)
    now = datetime.now(timezone.utc)

    raw_name = (payload.name or "").strip()
    name = raw_name if raw_name else "Untitled Diagram"

    raw_data = payload.data if payload.data is not None else payload.content
    if raw_data is None:
        file_data = {}
    elif isinstance(raw_data, str):
        try:
            file_data = json.loads(raw_data)
        except Exception:
            file_data = {"raw": raw_data}
    else:
        file_data = raw_data

    size_bytes = len(json.dumps(file_data, ensure_ascii=False).encode("utf-8"))
    target_id = payload.file_id or payload.id

    with get_db_cursor() as (conn, cur):
        existing = None
        if target_id:
            cur.execute("SELECT id, created_by FROM diagram_files WHERE id = %s", (target_id,))
            existing = cur.fetchone()

        if existing:
            owner = existing.get("created_by") or "anonymous"
            if owner != user_email and owner != "anonymous":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You do not have permission to modify this file."
                )

            file_id = str(existing["id"])
            cur.execute(
                """
                UPDATE diagram_files
                SET name = %s, data = %s, size_bytes = %s, updated_at = %s, opened_at = %s
                WHERE id = %s
                RETURNING id, name, data, size_bytes, created_at, updated_at, opened_at, created_by
                """,
                (name, psycopg2.extras.Json(file_data), size_bytes, now, now, file_id),
            )
            row = cur.fetchone()
        else:
            file_id = target_id or str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO diagram_files
                    (id, name, data, size_bytes, created_by, created_at, updated_at, opened_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, data, size_bytes, created_at, updated_at, opened_at, created_by
                """,
                (file_id, name, psycopg2.extras.Json(file_data), size_bytes, user_email, now, now, now),
            )
            row = cur.fetchone()

        conn.commit()

        return SavedFileResponse(
            file_id=str(row["id"]),
            name=row["name"],
            data=row["data"],
            size_bytes=row["size_bytes"],
            created_at=row["created_at"].isoformat() if hasattr(row["created_at"], "isoformat") else str(row["created_at"]),
            updated_at=row["updated_at"].isoformat() if hasattr(row["updated_at"], "isoformat") else str(row["updated_at"]),
            opened_at=row["opened_at"].isoformat() if row.get("opened_at") and hasattr(row["opened_at"], "isoformat") else None,
            created_by=row.get("created_by"),
        )


@app.put("/api/files/{file_id}", response_model=SavedFileResponse)
def update_file_by_id(file_id: str, payload: SaveFileRequest, request: Request):
    payload.file_id = parse_valid_uuid(file_id)
    if not payload.file_id:
        raise HTTPException(status_code=400, detail="Invalid file ID format")
    return save_file(payload, request)


@app.get("/api/files", response_model=List[SavedFileMeta])
def list_files(request: Request, filter: str = "all"):
    """Returns diagram files belonging only to the requesting user."""
    user_email = get_optional_user_email(request)

    with get_db_cursor() as (conn, cur):
        if user_email and user_email != "anonymous":
            where_clause = "WHERE created_by = %s"
            params = [user_email]
        else:
            where_clause = "WHERE created_by = 'anonymous' OR created_by IS NULL"
            params = []

        if filter == "recent":
            query = f"""
                SELECT id, name, size_bytes, created_at, updated_at, opened_at, created_by
                FROM diagram_files
                {where_clause}
                ORDER BY COALESCE(opened_at, updated_at) DESC
                LIMIT 10
            """
        else:
            query = f"""
                SELECT id, name, size_bytes, created_at, updated_at, opened_at, created_by
                FROM diagram_files
                {where_clause}
                ORDER BY updated_at DESC
            """

        cur.execute(query, params)
        rows = cur.fetchall()

        return [
            SavedFileMeta(
                file_id=str(r["id"]),
                name=r["name"],
                size_bytes=r["size_bytes"] or 0,
                created_at=r["created_at"].isoformat() if hasattr(r["created_at"], "isoformat") else str(r["created_at"]),
                updated_at=r["updated_at"].isoformat() if hasattr(r["updated_at"], "isoformat") else str(r["updated_at"]),
                opened_at=r["opened_at"].isoformat() if r.get("opened_at") and hasattr(r["opened_at"], "isoformat") else None,
                created_by=r.get("created_by"),
            )
            for r in rows
        ]


@app.get("/api/files/{file_id}", response_model=SavedFileContent)
def get_file(file_id: str, request: Request):
    """Loads file content from PostgreSQL JSONB and updates opened_at."""
    valid_uuid = parse_valid_uuid(file_id)
    if not valid_uuid:
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    user_email = get_optional_user_email(request)
    now = datetime.now(timezone.utc)

    with get_db_cursor() as (conn, cur):
        cur.execute("SELECT id, name, data, created_by FROM diagram_files WHERE id = %s", (valid_uuid,))
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        owner = row.get("created_by") or "anonymous"
        if owner != user_email and owner != "anonymous":
            raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this file.")

        cur.execute("UPDATE diagram_files SET opened_at = %s WHERE id = %s", (now, valid_uuid))
        conn.commit()

        return SavedFileContent(
            file_id=str(row["id"]),
            name=row["name"],
            data=row["data"] if row.get("data") is not None else {}
        )


@app.delete("/api/files/{file_id}")
def delete_file(file_id: str, request: Request):
    """Deletes diagram record from PostgreSQL after checking ownership."""
    valid_uuid = parse_valid_uuid(file_id)
    if not valid_uuid:
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    user_email = get_optional_user_email(request)

    with get_db_cursor() as (conn, cur):
        cur.execute("SELECT id, created_by FROM diagram_files WHERE id = %s", (valid_uuid,))
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        owner = row.get("created_by") or "anonymous"
        if owner != user_email and owner != "anonymous":
            raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to delete this file.")

        cur.execute("DELETE FROM diagram_files WHERE id = %s", (valid_uuid,))
        conn.commit()

        return {"success": True, "deleted": valid_uuid}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("index:app", host=HOST, port=PORT, reload=True)