from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

_ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    app_env: str = "development"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"

    llm_provider: str = "groq"
    groq_api_key: Optional[str] = None
    groq_llm_model: str = "llama-3.3-70b-versatile"
    groq_stt_model: str = "whisper-large-v3"

    stt_provider: str = "groq"
    tts_provider: str = "browser"

    embedding_provider: str = "mock"
    cohere_api_key: Optional[str] = None

    database_url: Optional[str] = None

    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": str(_ENV_FILE), "env_file_encoding": "utf-8"}


settings = Settings()
