from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "EventHub AI Backend"
    app_env: str = "development"
    ai_backend_port: int = 8001

    event_backend_url: str = "http://localhost:4000/api"
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_collection: str = "events_semantic_search"
    qdrant_local_path: Path = Path("./data/qdrant")

    embedding_provider: str = "local"
    embedding_vector_size: int = 256
    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"

    search_top_k: int = 8

    model_config = SettingsConfigDict(
      env_file=".env",
      env_file_encoding="utf-8",
      extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.qdrant_local_path.mkdir(parents=True, exist_ok=True)
    return settings
