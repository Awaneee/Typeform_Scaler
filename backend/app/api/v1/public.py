"""Respondent-facing endpoints. No authentication: anyone with the link can fill."""

from typing import Annotated

from fastapi import APIRouter, File, Form, Path, UploadFile, status
from fastapi.responses import Response

from app.api.deps import DB
from app.schemas.public import PartialAnswers, PublicForm, SessionEvent, SubmissionCreate, SubmissionCreated, UploadCreated
from app.services import sessions, submissions, uploads

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


@router.put("/{slug}/sessions/{client_session_id}/answers", status_code=status.HTTP_204_NO_CONTENT)
def save_partial_answers(
    db: DB, slug: Slug, client_session_id: Annotated[str, Path(min_length=8, max_length=64)], body: PartialAnswers
):
    """Autosaves an unfinished response so creators can see partial responses."""
    sessions.save_partial(db, slug, client_session_id, body.answers)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{slug}/uploads", response_model=UploadCreated, status_code=status.HTTP_201_CREATED)
async def upload_file(
    db: DB,
    slug: Slug,
    question_id: Annotated[str, Form(max_length=36)],
    file: Annotated[UploadFile, File()],
):
    form, version = submissions.get_published_form(db, slug)
    upload = await uploads.store_upload(db, form, version, question_id, file)
    return UploadCreated(id=upload.id, filename=upload.filename, size_bytes=upload.size_bytes)
