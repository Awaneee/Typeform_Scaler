"""Migrations must keep existing data. SQLite rebuilds tables in batch migrations, which
used to cascade-delete child rows (questions, versions, responses) when it dropped the old table."""

import os
import subprocess
import sys
import uuid
from pathlib import Path

import sqlalchemy as sa

BACKEND = Path(__file__).resolve().parents[1]


def _alembic(db_url: str, *args: str) -> None:
    env = {**os.environ, "DATABASE_URL": db_url, "SEED_ON_EMPTY": "false"}
    subprocess.run([sys.executable, "-m", "alembic", *args], cwd=BACKEND, env=env, check=True, capture_output=True)


def test_upgrading_keeps_existing_rows(tmp_path):
    db_url = f"sqlite:///{(tmp_path / 'm.db').as_posix()}"
    _alembic(db_url, "upgrade", "0001")  # oldest schema; every later migration rebuilds tables

    engine = sa.create_engine(db_url)
    ids = {k: str(uuid.uuid4()) for k in ("creator", "ws", "form", "q", "opt", "ver", "sub", "ans")}
    now = "2026-01-01 00:00:00"
    with engine.begin() as c:
        c.exec_driver_sql("PRAGMA foreign_keys=ON")
        c.execute(sa.text("INSERT INTO creators VALUES (:creator, 'A', 'a@x.io', :now)"), {**ids, "now": now})
        c.execute(sa.text("INSERT INTO workspaces VALUES (:ws, :creator, 'W', :now)"), {**ids, "now": now})
        c.execute(
            sa.text(
                "INSERT INTO forms (id, workspace_id, title, status, slug, draft_revision, published_version_id,"
                " settings_json, created_at, updated_at) VALUES (:form, :ws, 'Event Registration', 'published',"
                " 'abc', 1, NULL, '{}', :now, :now)"
            ),
            {**ids, "now": now},
        )
        c.execute(
            sa.text("INSERT INTO questions VALUES (:q, :form, 0, 'dropdown', 'T', '', 0, '{}', :now, :now)"),
            {**ids, "now": now},
        )
        c.execute(sa.text("INSERT INTO question_options VALUES (:opt, :q, 0, 'One')"), ids)
        c.execute(sa.text("INSERT INTO form_versions VALUES (:ver, :form, 1, 1, '{}', :now)"), {**ids, "now": now})
        c.execute(sa.text("UPDATE forms SET published_version_id = :ver"), ids)
        c.execute(sa.text("INSERT INTO submissions VALUES (:sub, :form, :ver, 'client-1', :now)"), {**ids, "now": now})
        c.execute(sa.text("INSERT INTO answers VALUES (:ans, :sub, :q, '\"opt\"')"), ids)
    engine.dispose()

    _alembic(db_url, "upgrade", "head")

    engine = sa.create_engine(db_url)
    with engine.connect() as c:
        counts = {
            t: c.execute(sa.text(f"SELECT count(*) FROM {t}")).scalar()
            for t in ("forms", "questions", "question_options", "form_versions", "submissions", "answers")
        }
        published = c.execute(sa.text("SELECT published_version_id, demo_key FROM forms")).one()
    engine.dispose()
    assert counts == dict.fromkeys(counts, 1), counts
    assert published == (ids["ver"], "event_registration")  # backfilled by migration 0004
