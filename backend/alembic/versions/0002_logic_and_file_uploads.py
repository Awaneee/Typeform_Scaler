"""logic jumps and file uploads

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-08
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # A server default lets SQLite add the NOT NULL column to existing rows.
    with op.batch_alter_table("questions") as batch:
        batch.add_column(sa.Column("logic_json", sa.JSON(), nullable=False, server_default="[]"))

    op.create_table(
        "file_uploads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("form_id", sa.String(36), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.String(36), nullable=False),
        sa.Column("submission_id", sa.String(36), sa.ForeignKey("submissions.id", ondelete="SET NULL")),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(127), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_file_uploads_form", "file_uploads", ["form_id"])
    op.create_index("ix_file_uploads_submission_id", "file_uploads", ["submission_id"])


def downgrade() -> None:
    op.drop_table("file_uploads")
    with op.batch_alter_table("questions") as batch:
        batch.drop_column("logic_json")
