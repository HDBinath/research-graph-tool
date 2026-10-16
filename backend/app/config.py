import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "research_graph.db"

class Settings(BaseModel):
    app_name: str = "ResearchGraph Engine"
    version: str = "1.0.0"
    db_path: str = str(DB_PATH)
    uploads_dir: str = str(UPLOADS_DIR)
    
    # LLM Settings (Pluggable)
    llm_provider: str = os.getenv("LLM_PROVIDER", "MOCK_HEURISTIC") # OLLAMA, GEMINI, CLAUDE, MOCK_HEURISTIC
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3.3:latest")

settings = Settings()
