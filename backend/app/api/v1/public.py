"""Respondent-facing endpoints. No authentication: anyone with the link can fill."""

from typing import Annotated

from fastapi import APIRouter, Path, status
from fastapi.responses import Response

from app.api.deps import DB
from app.schemas.public import PublicForm, SessionEvent, SubmissionCreate, SubmissionCreated
from app.services import sessions, submissions

router = APIRouter(prefix="/public/forms", tags=["public"])
Slug = Annotated[str, Path(max_length=32)]


@router.get("/{slug}", response_model=PublicForm)
def get_public_form(db: DB, slug: Slug):
    return submissions.to_public_form(*submissions.get_published_form(db, slug))


@router.post("/{slug}/submissions", response_model=SubmissionCreated, status_code=status.HTTP_201_CREATED)
def submit(db: DB, slug: Slug, body: SubmissionCreate):
    sub = submissions.submit_public(db, slug, body)
    return SubmissionCreated(id=sub.id, submitted_at=sub.submitted_at)


@router.post("/{slug}/sessions", status_code=status.HTTP_204_NO_CONTENT)
def track_session(db: DB, slug: Slug, body: SessionEvent):
    sessions.record_event(db, slug, body)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
