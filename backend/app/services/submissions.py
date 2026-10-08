"""Public form access and response submission."""

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError, ValidationFailedError
from app.core.types import new_id, utcnow
from app.models import Answer, Form, FormVersion, ResponseSession, Submission
from app.schemas.definition import FormDefinition
from app.schemas.public import PublicForm, SubmissionCreate
from app.validators.answers import validate_answers


def get_published_form(db: Session, slug: str) -> tuple[Form, FormVersion]:
    form = db.scalar(select(Form).where(Form.slug == slug).options(selectinload(Form.published_version)))
    if form is None:
        raise NotFoundError("This form doesn't exist.")
    if form.status != "published" or form.published_version is None:
        raise NotFoundError("This form is no longer accepting responses.", extra={"reason": "closed"})
    return form, form.published_version


def version_definition(version: FormVersion) -> FormDefinition:
    return FormDefinition.model_validate(version.definition_json)


def to_public_form(form: Form, version: FormVersion) -> PublicForm:
    definition = version_definition(version)
    return PublicForm(
        slug=form.slug,
        title=definition.title,
        version_number=version.version_number,
        settings=definition.settings,
        questions=definition.questions,
    )


def create_submission(
    db: Session,
    form: Form,
    version: FormVersion,
    answers: dict[str, Any],
    client_submission_id: str,
    *,
    client_session_id: str | None = None,
    submitted_at: datetime | None = None,
) -> Submission:
    """Validates against the *published version* (never the draft) and stores
    the submission and its answers in one transaction."""
    existing = db.scalar(select(Submission).where(Submission.client_submission_id == client_submission_id))
    if existing is not None:
        if existing.form_id != form.id:
            raise ConflictError("Submission id already used.")
        return existing  # idempotent retry / double click

    clean, errors = validate_answers(version_definition(version).questions, answers)
    if errors:
        raise ValidationFailedError("Some answers need another look.", fields=errors)

    submitted_at = submitted_at or utcnow()
    submission = Submission(
        id=new_id(),
        form_id=form.id,
        form_version_id=version.id,
        client_submission_id=client_submission_id,
        submitted_at=submitted_at,
        answers=[Answer(question_id=qid, value_json=value) for qid, value in clean.items()],
    )
    db.add(submission)

    from app.services.uploads import claim_uploads  # local import: uploads imports this module

    file_errors = claim_uploads(db, form.id, version_definition(version).questions, clean, submission.id)
    if file_errors:
        db.rollback()
        raise ValidationFailedError("Some answers need another look.", fields=file_errors)

    if client_session_id:
        session = db.scalar(select(ResponseSession).where(ResponseSession.client_session_id == client_session_id))
        if session is not None and session.form_id == form.id:
            session.started_at = session.started_at or submitted_at
            session.submitted_at = submitted_at
            session.partial_answers_json = None  # completed: no longer a partial response

    try:
        db.commit()
    except IntegrityError:
        # Two identical requests raced past the lookup above; return the winner.
        db.rollback()
        existing = db.scalar(select(Submission).where(Submission.client_submission_id == client_submission_id))
        if existing is None:
            raise
        return existing
    return submission


def submit_public(db: Session, slug: str, payload: SubmissionCreate) -> Submission:
    form, version = get_published_form(db, slug)
    return create_submission(
        db,
        form,
        version,
        payload.answers,
        payload.client_submission_id,
        client_session_id=payload.client_session_id,
    )
