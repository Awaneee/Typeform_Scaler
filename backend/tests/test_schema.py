"""The schema as created by the Alembic migrations (not by create_all)."""

from sqlalchemy import inspect, text

from app.core.db import engine

EXPECTED_TABLES = {
    "alembic_version",
    "creators",
    "workspaces",
    "forms",
    "questions",
    "question_options",
    "form_versions",
    "submissions",
    "answers",
    "response_sessions",
    "file_uploads",
}


def _fks(table: str) -> dict[str, tuple[str, str]]:
    """column -> (referenced table, ON DELETE action)"""
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA foreign_key_list({table})")).mappings().all()
    return {r["from"]: (r["table"], r["on_delete"]) for r in rows}


def test_all_tables_exist():
    assert set(inspect(engine).get_table_names()) == EXPECTED_TABLES


def test_foreign_keys_and_delete_rules():
    assert _fks("workspaces") == {"creator_id": ("creators", "CASCADE")}
    assert _fks("forms") == {
        "workspace_id": ("workspaces", "CASCADE"),
        "published_version_id": ("form_versions", "SET NULL"),
    }
    assert _fks("questions") == {"form_id": ("forms", "CASCADE")}
    assert _fks("question_options") == {"question_id": ("questions", "CASCADE")}
    assert _fks("form_versions") == {"form_id": ("forms", "CASCADE")}
    assert _fks("submissions") == {"form_id": ("forms", "CASCADE"), "form_version_id": ("form_versions", "CASCADE")}
    # answers.question_id is deliberately NOT a foreign key (answers outlive deleted draft questions).
    assert _fks("answers") == {"submission_id": ("submissions", "CASCADE")}
    assert _fks("response_sessions") == {
        "form_id": ("forms", "CASCADE"),
        "form_version_id": ("form_versions", "CASCADE"),
    }
    assert _fks("file_uploads") == {"form_id": ("forms", "CASCADE"), "submission_id": ("submissions", "SET NULL")}


def test_unique_constraints():
    insp = inspect(engine)

    def unique_cols(table):
        cols = [tuple(u["column_names"]) for u in insp.get_unique_constraints(table)]
        cols += [tuple(i["column_names"]) for i in insp.get_indexes(table) if i.get("unique")]
        return set(cols)

    assert ("email",) in unique_cols("creators")
    assert ("slug",) in unique_cols("forms")
    assert ("form_id", "version_number") in unique_cols("form_versions")
    assert ("client_submission_id",) in unique_cols("submissions")
    assert ("submission_id", "question_id") in unique_cols("answers")


def test_foreign_keys_are_enforced():
    with engine.connect() as conn:
        assert conn.execute(text("PRAGMA foreign_keys")).scalar() == 1
