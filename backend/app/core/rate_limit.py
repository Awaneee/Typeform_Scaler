"""Tiny in-memory, per-IP rate limiter for the public (no-login) endpoints.

Good enough for a single server: it stops a script from flooding submissions
or uploads. A multi-server deployment would keep the counters in Redis instead.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import get_settings
from app.core.errors import TooManyRequestsError


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float = 60):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                raise TooManyRequestsError("Too many requests. Please wait a moment and try again.")
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def client_ip(request: Request) -> str:
    # Behind Vercel/Railway proxies the original client is the first X-Forwarded-For entry.
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def limit(limiter: RateLimiter):
    """FastAPI dependency factory: `Depends(limit(SUBMISSIONS))`."""

    def dependency(request: Request) -> None:
        if get_settings().rate_limit_enabled:
            limiter.hit(client_ip(request))

    return dependency


SUBMISSIONS = RateLimiter(limit=20)
UPLOADS = RateLimiter(limit=10)
SESSION_EVENTS = RateLimiter(limit=120)  # views, starts and partial-answer autosaves
