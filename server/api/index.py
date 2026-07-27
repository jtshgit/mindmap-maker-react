import os
import re
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Cookie, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import jwt

# Load environment variables from .env file
load_dotenv()

# ==========================
# Configuration & Setup
# ==========================
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")

# Parse origins from .env or use defaults
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    ""
)
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

client = Groq(api_key=GROQ_API_KEY)

app = FastAPI(
    title="Diagram Generation AI Service",
    version="2.0.0"
)

# Enable CORS for React frontend cross-origin requests with cookie credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    model: str = "llama-3.3-70b-versatile"

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
    """
    Checks JWT token from HTTP Cookie or Authorization Header.
    """
    # Fallback check for 'Authorization: Bearer <token>' header if cookie is missing
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
        # Decode and verify token using PyJWT
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        # Build user payload structure matching React component expectations
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

    try:
        completion = client.chat.completions.create(
            model=req.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Generate a diagram for the following text/prompt:\n\n{req.prompt}"}
            ],
            temperature=0.2, # Low temperature for reliable structure
            max_completion_tokens=1024
        )

        raw_content = completion.choices[0].message.content
        clean_dsl = sanitize_dsl_output(raw_content)

        return DiagramResponse(dsl_text=clean_dsl)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq AI Generation Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("index:app", host="0.0.0.0", port=8000, reload=True)