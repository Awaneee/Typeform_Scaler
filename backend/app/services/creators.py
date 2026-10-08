"""Simplified auth: every request acts as the single default creator."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import NotFoundError
from app.models import Creator, Workspace


def get_default_creator(db: Session) -> Creator:
    creator = db.scalar(select(Creator).where(Creator.email == get_settings().default_creator_email))
    if creator is None:
        raise NotFoundError("Default creator is missing. Run the seed script.")
    return creator


def get_default_workspace(db: Session, creator: Creator) -> Workspace:
    workspace = db.scalar(
        select(Workspace).where(Workspace.creator_id == creator.id).order_by(Workspace.created_at).limit(1)
    )
    if workspace is None:
        raise NotFoundError("Creator has no workspace.")
    return workspace


def ensure_creator(db: Session, name: str, email: str) -> Creator:
    creator = db.scalar(select(Creator).where(Creator.email == email))
    if creator is None:
        creator = Creator(name=name, email=email)
        creator.workspaces.append(Workspace(name="My workspace"))
        db.add(creator)
        db.flush()
    return creator
