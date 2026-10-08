"""Respondent visit tracking (views and starts) for the completion rate."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.types import utcnow
from app.models import ResponseSession
from app.schemas.public import SessionEvent
from app.services.submissions import get_published_form


def record_event(db: Session, slug: str, event: SessionEvent) -> None:
    form, _version = get_published_form(db, slug)
    session = db.scalar(select(ResponseSession).where(ResponseSession.client_session_id == event.client_session_id))
    if session is None:
        session = ResponseSession(form_id=form.id, client_session_id=event.client_session_id, viewed_at=utcnow())
        db.add(session)
    elif session.form_id != form.id:
        return  # id collision with another form; ignore rather than corrupt stats
    if event.event == "start" and session.started_at is None:
        session.started_at = utcnow()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # concurrent "view" for the same session; the other one won
