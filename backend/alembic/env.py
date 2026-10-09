from logging.config import fileConfig

from alembic import context
from app.core.db import engine
from app.models import Base

if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=str(engine.url), target_metadata=target_metadata, literal_binds=True, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    with engine.connect() as connection:
        is_sqlite = connection.dialect.name == "sqlite"
        if is_sqlite:
            # Batch migrations rebuild a table (copy, DROP old, rename). With foreign keys on,
            # that DROP would cascade-delete every child row, so turn enforcement off while
            # migrating, as SQLite's docs prescribe. Must run before the transaction starts.
            connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
            connection.commit()  # close the implicit transaction so Alembic manages its own
        # render_as_batch: SQLite can't ALTER most things, so Alembic rebuilds tables instead.
        context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
        with context.begin_transaction():
            context.run_migrations()
        connection.commit()
        if is_sqlite:
            # Re-enable, and fail loudly if a rebuilt table left a dangling reference.
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            problems = connection.exec_driver_sql("PRAGMA foreign_key_check").fetchall()
            if problems:
                raise RuntimeError(f"Foreign key check failed after migrating: {problems[:5]}")
            connection.commit()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
