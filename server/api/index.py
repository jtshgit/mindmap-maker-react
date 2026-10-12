import os
import re
import json
import uuid
from typing import Optional, List, Any, Union
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Cookie, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import jwt
import psycopg2
import psycopg2.extras

# Load environment variables from .env file
load_dotenv()

# ==========================
# Configuration & Setup
# ==========================
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "3010"))

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "postgres")

# Origins loaded purely from .env
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

client = Groq(api_key=GROQ_API_KEY)

app = FastAPI(
    title="Diagram Generation AI Service",
    version="2.0.0"
)

# Enable CORS using environment configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://([a-zA-Z0-9-]+\.)*unibrik\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    """Removes any markdown code wrappers or accidental intro/outro comments."""
    text = re.sub(r'```(?:[a-zA-Z]*)?', '', text)
    text = text.replace('```', '').strip()
    return text

# ==========================
# User Authentication API
# ==========================
@app.get("/api/me")
def get_current_user(request: Request, token: Optional[str] = Cookie(None)):
    """Checks JWT token from HTTP Cookie or Authorization Header."""
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error": "Unauthorized", "auth": False}
        )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
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

        raw_content = completion.choices[0].message.content
        clean_dsl = sanitize_dsl_output(raw_content)

        return DiagramResponse(dsl_text=clean_dsl)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq AI Generation Error: {str(e)}")


# ==================================================================
# ============  FILE SAVE / PERSISTENCE FEATURE  ====================
# ==================================================================

# --- Disk storage location ---
env_files_dir = os.getenv("FILES_DIR")
if env_files_dir:
    FILES_DIR = Path(env_files_dir)
elif os.path.exists("/files") and os.access("/files", os.W_OK):
    FILES_DIR = Path("/files")
else:
    FILES_DIR = Path(__file__).resolve().parent.parent / "files"

try:
    FILES_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    FILES_DIR = Path(__file__).resolve().parent.parent / "files"
    FILES_DIR.mkdir(parents=True, exist_ok=True)


def parse_valid_uuid(val: Optional[Any]) -> Optional[str]:
    """
    Safely extracts a valid UUID string, or returns None if missing,
    null/undefined string from JS, or invalid.
    """
    if val is None:
        return None
    val_str = str(val).strip()
    if val_str.lower() in ("null", "undefined", "none", "", "nan"):
        return None
    try:
        return str(uuid.UUID(val_str))
    except (ValueError, TypeError, AttributeError):
        return None


def get_db_connection():
    """Opens a new psycopg2 connection using configured credentials."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME,
        connect_timeout=5,
    )


def get_optional_user_email(request: Request) -> str:
    """Best-effort JWT decode for identity tracking. Defaults to 'anonymous'."""
    token = request.cookies.get("token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    if not token:
        return "anonymous"
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("email") or payload.get("user_id") or payload.get("id") or payload.get("name") or "anonymous"
    except Exception:
        return "anonymous"


class SaveFileRequest(BaseModel):
    file_id: Optional[Any] = None
    id: Optional[Any] = None
    name: Optional[str] = "Untitled Diagram"
    data: Optional[Any] = None
    content: Optional[Any] = None


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


def _write_json(path: Path, data: Any) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False)
    path.write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def _current_file_path(file_id: str) -> Path:
    return FILES_DIR / f"{file_id}.json"


def _read_file_data(file_id: str, recorded_path: Optional[str] = None) -> Any:
    """Safely reads file JSON from recorded DB path or FILES_DIR fallback."""
    candidates = []
    if recorded_path:
        candidates.append(Path(recorded_path))
    candidates.append(_current_file_path(file_id))
    root_path = Path("/files") / f"{file_id}.json"
    if root_path not in candidates:
        candidates.append(root_path)

    for p in candidates:
        try:
            if p.exists() and p.is_file():
                return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
    return {}


@app.post("/api/files/save", response_model=SavedFileResponse)
def save_file(payload: SaveFileRequest, request: Request):
    """
    Creates a new saved file OR updates an existing file in place.
    Saves JSON directly in PostgreSQL JSONB column and as local file fallback.
    Returns the complete file metadata and saved data.
    """
    editor = get_optional_user_email(request)
    now = datetime.now(timezone.utc)

    # Sanitize diagram name
    raw_name = (payload.name or "").strip()
    name = raw_name if raw_name else "Untitled Diagram"

    # Extract diagram data
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

    # Sanitize and validate file_id
    raw_id = payload.file_id if payload.file_id is not None else payload.id
    valid_uuid = parse_valid_uuid(raw_id)

    conn = get_db_connection()
    try:
        conn.autocommit = False
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        existing = None
        if valid_uuid:
            cur.execute("SELECT * FROM diagram_files WHERE id = %s", (valid_uuid,))
            existing = cur.fetchone()

        if existing:
            file_id = str(existing["id"])
            file_path = _current_file_path(file_id)
            try:
                size_bytes = _write_json(file_path, file_data)
            except Exception:
                size_bytes = len(json.dumps(file_data, ensure_ascii=False).encode("utf-8"))

            cur.execute(
                """
                UPDATE diagram_files
                SET name = %s, data = %s, file_path = %s, size_bytes = %s, updated_at = %s, opened_at = %s
                WHERE id = %s
                RETURNING id, name, data, size_bytes, created_at, updated_at, opened_at, created_by
                """,
                (name, psycopg2.extras.Json(file_data), str(file_path), size_bytes, now, now, file_id),
            )
            row = cur.fetchone()
        else:
            file_id = valid_uuid or str(uuid.uuid4())
            file_path = _current_file_path(file_id)
            try:
                size_bytes = _write_json(file_path, file_data)
            except Exception:
                size_bytes = len(json.dumps(file_data, ensure_ascii=False).encode("utf-8"))

            cur.execute(
                """
                INSERT INTO diagram_files
                    (id, name, data, file_path, size_bytes, created_by, created_at, updated_at, opened_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, data, size_bytes, created_at, updated_at, opened_at, created_by
                """,
                (
                    file_id, name, psycopg2.extras.Json(file_data), str(file_path), size_bytes,
                    editor, now, now, now,
                ),
            )
            row = cur.fetchone()

        conn.commit()

        created_at_val = row["created_at"].isoformat() if hasattr(row["created_at"], "isoformat") else str(row["created_at"])
        updated_at_val = row["updated_at"].isoformat() if hasattr(row["updated_at"], "isoformat") else str(row["updated_at"])
        opened_at_val = row["opened_at"].isoformat() if row.get("opened_at") and hasattr(row["opened_at"], "isoformat") else None

        returned_data = row["data"] if row.get("data") is not None else file_data

        return SavedFileResponse(
            file_id=str(row["id"]),
            name=row["name"],
            data=returned_data,
            size_bytes=row["size_bytes"],
            created_at=created_at_val,
            updated_at=updated_at_val,
            opened_at=opened_at_val,
            created_by=row.get("created_by"),
        )
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    finally:
        conn.close()


@app.put("/api/files/{file_id}", response_model=SavedFileResponse)
def update_file_by_id(file_id: str, payload: SaveFileRequest, request: Request):
    """Updates an existing file by path ID."""
    payload.file_id = file_id
    return save_file(payload, request)


@app.get("/api/files", response_model=List[SavedFileMeta])
def list_files(request: Request, filter: str = "all"):
    """
    Returns list of files for the current user only.
    - filter='recent': Top 10 most recently opened or updated diagrams.
    - filter='all': All diagrams ordered by updated_at DESC.
    """
    user_email = get_optional_user_email(request)
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")
    finally:
        conn.close()


@app.get("/api/files/{file_id}", response_model=SavedFileContent)
def get_file(file_id: str, request: Request):
    """Loads file content and updates the opened_at timestamp."""
    valid_uuid = parse_valid_uuid(file_id)
    if not valid_uuid:
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    conn = get_db_connection()
    try:
        conn.autocommit = False
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        now = datetime.now(timezone.utc)

        # Update opened_at upon loading file
        cur.execute(
            """
            UPDATE diagram_files
            SET opened_at = %s
            WHERE id = %s
            RETURNING id, name, data, file_path, created_by
            """,
            (now, valid_uuid),
        )
        row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="File not found")

        conn.commit()

        # Read JSON from database directly; fallback to disk file if not present in DB
        data = row.get("data")
        if data is None or data == {} or data == "null":
            data = _read_file_data(valid_uuid, row.get("file_path"))

        return SavedFileContent(file_id=str(row["id"]), name=row["name"], data=data)
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to load file: {str(e)}")
    finally:
        conn.close()


@app.delete("/api/files/{file_id}")
def delete_file(file_id: str, request: Request):
    """Deletes a saved file's DB row and its content on disk."""
    valid_uuid = parse_valid_uuid(file_id)
    if not valid_uuid:
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id, file_path FROM diagram_files WHERE id = %s", (valid_uuid,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")

        cur.execute("DELETE FROM diagram_files WHERE id = %s", (valid_uuid,))
        conn.commit()

        # Clean up disk file
        candidates = [_current_file_path(valid_uuid), Path("/files") / f"{valid_uuid}.json"]
        if row.get("file_path"):
            candidates.append(Path(row["file_path"]))

        for p in candidates:
            try:
                if p.exists() and p.is_file():
                    p.unlink()
            except Exception:
                pass

        return {"success": True, "deleted": valid_uuid}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    finally:
        conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("index:app", host=HOST, port=PORT, reload=True)