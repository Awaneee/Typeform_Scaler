from typing import Annotated

from fastapi import Depends, Path
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Creator, Form
from app.services.creators import get_default_creator
from app.services.forms import get_owned_form

DB = Annotated[Session, Depends(get_db)]


def current_creator(db: DB) -> Creator:
    # Simplified auth (documented assumption): every request is the default creator.
    return get_default_creator(db)


CurrentCreator = Annotated[Creator, Depends(current_creator)]


def owned_form(db: DB, creator: CurrentCreator, form_id: Annotated[str, Path(max_length=36)]) -> Form:
    return get_owned_form(db, creator, form_id)


OwnedForm = Annotated[Form, Depends(owned_form)]
