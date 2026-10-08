"""partial responses

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-08
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # batch mode: SQLite can only add a foreign key by rebuilding the table.
    with op.batch_alter_table("response_sessions") as batch:
        batch.add_column(sa.Column("form_version_id", sa.String(36), nullable=True))
        batch.add_column(sa.Column("partial_answers_json", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("last_activity_at", sa.DateTime(), nullable=True))
        batch.create_foreign_key(
            "fk_response_sessions_form_version_id", "form_versions", ["form_version_id"], ["id"], ondelete="CASCADE"
        )


def downgrade() -> None:
    with op.batch_alter_table("response_sessions") as batch:
        batch.drop_constraint("fk_response_sessions_form_version_id", type_="foreignkey")
        batch.drop_column("last_activity_at")
        batch.drop_column("partial_answers_json")
        batch.drop_column("form_version_id")
