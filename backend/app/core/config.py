"""Application settings, read from environment variables (or backend/.env)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'app.db').as_posix()}"
    # Comma-separated list of browser origins allowed to call the API directly.
    # In production the frontend proxies /api/* so this mostly matters for local dev.
    cors_origins: str = "http://localhost:3000"
    # Seed demo data at startup when the database has no creator yet.
    seed_on_empty: bool = True
    default_creator_email: str = "creator@example.com"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlite_path(self) -> Path | None:
        prefix = "sqlite:///"
        if self.database_url.startswith(prefix):
            return Path(self.database_url[len(prefix):])
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()
