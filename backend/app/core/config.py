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
    # Where uploaded files are stored. On Railway, point it at the volume (e.g. /data/uploads).
    upload_dir: Path = BACKEND_DIR / "data" / "uploads"
    # Total disk space uploads may use (protects small hosting volumes).
    upload_storage_limit_mb: int = 200
    # Re-create/republish the seeded demo forms this often (0 = off). Keeps a public demo intact
    # even if visitors delete or unpublish them, without blocking those actions.
    demo_restore_minutes: int = 30
    # Per-IP limits on the public (no-login) endpoints.
    rate_limit_enabled: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlite_path(self) -> Path | None:
        prefix = "sqlite:///"
        if self.database_url.startswith(prefix):
            return Path(self.database_url[len(prefix) :])
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()
