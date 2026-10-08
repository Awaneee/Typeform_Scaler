"""Respondent visit tracking (views and starts) for the completion rate, and partial responses."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.types import utcnow
from app.models import ResponseSession
from app.schemas.public import SessionEvent
from app.services.submissions import get_published_form, version_definition
from app.validators.answers import ANSWER_VALIDATORS, AnswerError, is_empty


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


def save_partial(db: Session, slug: str, client_session_id: str, answers: dict) -> None:
    """Stores the answers given so far by someone who hasn't submitted yet.

    Best effort: each answer is validated on its own and invalid, empty or unknown
    ones are dropped (nothing is "required" until the respondent submits).
    """
    form, version = get_published_form(db, slug)
    questions = {q.id: q for q in version_definition(version).questions}
    clean = {}
    for question_id, value in answers.items():
        q = questions.get(question_id)
        if q is None or is_empty(value):
            continue
        try:
            clean[question_id] = ANSWER_VALIDATORS[q.type](q, value)
        except AnswerError:
            continue

    session = db.scalar(select(ResponseSession).where(ResponseSession.client_session_id == client_session_id))
    now = utcnow()
    if session is None:
        session = ResponseSession(form_id=form.id, client_session_id=client_session_id, viewed_at=now)
        db.add(session)
    elif session.form_id != form.id or session.submitted_at is not None:
        return  # another form's id, or already submitted: nothing to keep
    session.started_at = session.started_at or now
    session.form_version_id = version.id
    session.partial_answers_json = clean
    session.last_activity_at = now
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
