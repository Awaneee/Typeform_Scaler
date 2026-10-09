import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.errors import register_error_handlers

logging.basicConfig(level=logging.INFO)
settings = get_settings()


async def _restore_demo_periodically(minutes: int) -> None:
    from app.services.seed import restore_demo

    while True:
        await asyncio.sleep(minutes * 60)
        try:
            await asyncio.to_thread(_run_restore, restore_demo)
        except Exception:  # never let a background repair crash the server
            logging.getLogger(__name__).exception("Demo restore failed")


def _run_restore(restore) -> None:
    with SessionLocal() as db:
        restore(db)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    from app.services.seed import restore_demo, seed_if_empty

    with SessionLocal() as db:
        if settings.seed_on_empty:
            seed_if_empty(db)
        if settings.demo_restore_minutes > 0:
            restore_demo(db)
    task = (
        asyncio.create_task(_restore_demo_periodically(settings.demo_restore_minutes))
        if settings.demo_restore_minutes > 0
        else None
    )
    yield
    if task:
        task.cancel()


app = FastAPI(title="Typeform clone API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)
app.include_router(v1_router)
