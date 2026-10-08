"""Small column helpers shared by all models."""

import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime
from sqlalchemy.types import TypeDecorator


def new_id() -> str:
    return str(uuid.uuid4())


def new_slug() -> str:
    # 8 url-safe chars ≈ 48 bits; short like Typeform's /to/AbC12xYz links.
    return secrets.token_urlsafe(6)


def utcnow() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator):
    """Stores datetimes as naive UTC (SQLite has no tz) and returns them tz-aware."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, _dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Naive datetimes are not allowed; use utcnow().")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, _dialect):
        return value.replace(tzinfo=UTC) if value is not None else None
