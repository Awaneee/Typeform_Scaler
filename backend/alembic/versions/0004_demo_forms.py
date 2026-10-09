"""demo form keys

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEMO_FORMS = {
    "event_registration": "Event Registration",
    "product_feedback": "Product Feedback",
    "job_application": "Job Application",
}


def upgrade() -> None:
    with op.batch_alter_table("forms") as batch:
        batch.add_column(sa.Column("demo_key", sa.String(40), nullable=True))
        batch.create_unique_constraint("uq_forms_demo_key", ["demo_key"])
    # Mark the forms created by the seed script (the oldest form with each demo title).
    for key, title in DEMO_FORMS.items():
        op.execute(
            sa.text(
                "UPDATE forms SET demo_key = :key WHERE id = "
                "(SELECT id FROM forms WHERE title = :title ORDER BY created_at LIMIT 1)"
            ).bindparams(key=key, title=title)
        )


def downgrade() -> None:
    with op.batch_alter_table("forms") as batch:
        batch.drop_constraint("uq_forms_demo_key", type_="unique")
        batch.drop_column("demo_key")
