"""File uploads for file_upload questions.

Flow: the respondent picks a file -> POST /public/forms/{slug}/uploads stores it
and returns an upload id -> the submission's answer for that question is the id
-> on submit we check the id belongs to this form and question and attach it.
Files live on disk under settings.upload_dir with random names; the original
filename is only metadata (never used as a path).
"""

import secrets
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError, NotFoundError, ValidationFailedError
from app.models import FileUpload, Form, FormVersion
from app.services.submissions import version_definition

CHUNK = 1024 * 1024


class FileTooLargeError(AppError):
    status_code = 413
    code = "file_too_large"


def upload_dir() -> Path:
    path = get_settings().upload_dir
    path.mkdir(parents=True, exist_ok=True)
    return path


def _safe_name(name: str | None) -> str:
    name = Path(name or "file").name.strip() or "file"  # drop any directory parts
    return name[-255:]


async def store_upload(db: Session, form: Form, version: FormVersion, question_id: str, file: UploadFile) -> FileUpload:
    question = next((q for q in version_definition(version).questions if q.id == question_id), None)
    if question is None or question.type != "file_upload":
        raise ValidationFailedError("This question doesn't accept files.", fields={"question_id": "Not a file question."})

    limit = question.settings.get("max_size_mb", 10) * 1024 * 1024
    key = secrets.token_hex(16)
    target = upload_dir() / key
    size = 0
    try:
        with target.open("wb") as out:
            while chunk := await file.read(CHUNK):
                size += len(chunk)
                if size > limit:
                    raise FileTooLargeError(f"Files can be at most {limit // (1024 * 1024)} MB.")
                out.write(chunk)
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    if size == 0:
        target.unlink(missing_ok=True)
        raise ValidationFailedError("That file is empty.")

    upload = FileUpload(
        form_id=form.id,
        question_id=question_id,
        filename=_safe_name(file.filename),
        content_type=(file.content_type or "application/octet-stream")[:127],
        size_bytes=size,
        storage_key=key,
    )
    db.add(upload)
    db.commit()
    return upload


def claim_uploads(db: Session, form_id: str, questions, clean: dict, submission_id: str) -> dict[str, str]:
    """Attach the uploads referenced by file answers to the submission. Returns field errors."""
    errors: dict[str, str] = {}
    for q in questions:
        if q.type != "file_upload" or q.id not in clean:
            continue
        upload = db.get(FileUpload, clean[q.id])
        if upload is None or upload.form_id != form_id or upload.question_id != q.id or upload.submission_id not in (None, submission_id):
            errors[q.id] = "Please upload the file again."
        else:
            upload.submission_id = submission_id
    return errors


def get_upload(db: Session, form: Form, upload_id: str) -> tuple[FileUpload, Path]:
    upload = db.get(FileUpload, upload_id)
    if upload is None or upload.form_id != form.id:
        raise NotFoundError("File not found.")
    path = upload_dir() / upload.storage_key
    if not path.is_file():
        raise NotFoundError("File is missing from storage.")
    return upload, path


def file_names(db: Session, form_id: str) -> dict[str, str]:
    return dict(db.execute(select(FileUpload.id, FileUpload.filename).where(FileUpload.form_id == form_id)).all())


def delete_files_for_form(db: Session, form_id: str) -> list[Path]:
    """Paths to remove after the form (and, by cascade, its upload rows) is deleted."""
    keys = db.scalars(select(FileUpload.storage_key).where(FileUpload.form_id == form_id)).all()
    return [upload_dir() / k for k in keys]
