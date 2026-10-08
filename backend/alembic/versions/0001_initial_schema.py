"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-08
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "creators",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("creator_id", sa.String(36), sa.ForeignKey("creators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_workspaces_creator_id", "workspaces", ["creator_id"])

    # forms <-> form_versions reference each other. SQLite can't add a foreign key
    # to an existing table, but it does allow a forward reference at CREATE time.
    op.create_table(
        "forms",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("slug", sa.String(32), unique=True),
        sa.Column("draft_revision", sa.Integer(), nullable=False),
        sa.Column(
            "published_version_id",
            sa.String(36),
            sa.ForeignKey("form_versions.id", ondelete="SET NULL", name="fk_forms_published_version_id"),
        ),
        sa.Column("settings_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("status IN ('draft', 'published')", name="ck_forms_status"),
    )
    op.create_index("ix_forms_workspace_id", "forms", ["workspace_id"])

    op.create_table(
        "form_versions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("form_id", sa.String(36), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("source_revision", sa.Integer(), nullable=False),
        sa.Column("definition_json", sa.JSON(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("form_id", "version_number", name="uq_form_versions_form_number"),
    )
    op.create_index("ix_form_versions_form_id", "form_versions", ["form_id"])

    op.create_table(
        "questions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("form_id", sa.String(36), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False),
        sa.Column("settings_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_questions_form_position", "questions", ["form_id", "position"])

    op.create_table(
        "question_options",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("question_id", sa.String(36), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(500), nullable=False),
    )
    op.create_index("ix_question_options_question_position", "question_options", ["question_id", "position"])

    op.create_table(
        "submissions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("form_id", sa.String(36), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "form_version_id", sa.String(36), sa.ForeignKey("form_versions.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("client_submission_id", sa.String(64), nullable=False, unique=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_submissions_form_submitted", "submissions", ["form_id", "submitted_at"])
    op.create_index("ix_submissions_form_version_id", "submissions", ["form_version_id"])

    op.create_table(
        "answers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("submission_id", sa.String(36), sa.ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.String(36), nullable=False),
        sa.Column("value_json", sa.JSON(), nullable=False),
        sa.UniqueConstraint("submission_id", "question_id", name="uq_answers_submission_question"),
    )
    op.create_index("ix_answers_question_id", "answers", ["question_id"])

    op.create_table(
        "response_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("form_id", sa.String(36), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_session_id", sa.String(64), nullable=False, unique=True),
        sa.Column("viewed_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime()),
        sa.Column("submitted_at", sa.DateTime()),
    )
    op.create_index("ix_response_sessions_form", "response_sessions", ["form_id"])


def downgrade() -> None:
    for table in (
        "response_sessions", "answers", "submissions", "question_options",
        "questions", "form_versions", "forms", "workspaces", "creators",
    ):
        op.drop_table(table)
