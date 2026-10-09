"""Seed demo data.

python -m scripts.seed           # seeds only if the database is empty
python -m scripts.seed --reset   # DELETES all data, then seeds (local dev only)
"""

import argparse

from app.core.db import SessionLocal
from app.models import Base
from app.services.seed import seed, seed_if_empty
from app.services.uploads import upload_dir


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="delete all rows before seeding")
    args = parser.parse_args()

    with SessionLocal() as db:
        if args.reset:
            for table in reversed(Base.metadata.sorted_tables):
                db.execute(table.delete())
            db.commit()
            for path in upload_dir().glob("*"):  # uploaded files belong to the deleted rows
                path.unlink()
            seed(db)
            print("Database reset and seeded.")
        elif seed_if_empty(db):
            print("Seeded demo data.")
        else:
            print("Database already has data; nothing to do (use --reset to start over).")


if __name__ == "__main__":
    main()
