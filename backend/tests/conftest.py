import os
import tempfile
import uuid
from pathlib import Path

# Must be set before the app (and its engine) is imported.
_tmp = Path(tempfile.mkdtemp()) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.as_posix()}"
os.environ["SEED_ON_EMPTY"] = "false"
os.environ["DEMO_RESTORE_MINUTES"] = "0"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["UPLOAD_DIR"] = str(_tmp.parent / "uploads")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.services.creators import ensure_creator  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session", autouse=True)
def _migrate():
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(cfg, "head")


@pytest.fixture(autouse=True)
def _clean_db():
    with SessionLocal() as db:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        ensure_creator(db, "Test Creator", get_settings().default_creator_email)
        db.commit()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def qid() -> str:
    return str(uuid.uuid4())


def make_form(client, questions: list[dict], title: str = "Test form") -> dict:
    form = client.post("/api/v1/forms", json={"title": title}).json()
    res = client.put(
        f"/api/v1/forms/{form['id']}/draft",
        json={"revision": form["revision"], "title": title, "settings": {}, "questions": questions},
    )
    assert res.status_code == 200, res.text
    return client.get(f"/api/v1/forms/{form['id']}").json()


def publish(client, form_id: str) -> dict:
    res = client.post(f"/api/v1/forms/{form_id}/publish")
    assert res.status_code == 200, res.text
    return res.json()


def submit(client, slug: str, answers: dict, submission_id: str | None = None):
    return client.post(
        f"/api/v1/public/forms/{slug}/submissions",
        json={"client_submission_id": submission_id or qid(), "answers": answers},
    )
