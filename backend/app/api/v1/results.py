"""Creator-facing results: responses, analytics, CSV export."""

import re
from typing import Annotated

from fastapi import APIRouter, Path, Query
from fastapi.responses import FileResponse, Response

from app.api.deps import DB, OwnedForm
from app.schemas.results import FormAnalytics, SubmissionDetail, SubmissionPage
from app.services import results, uploads

router = APIRouter(tags=["results"])


@router.get("/forms/{form_id}/submissions", response_model=SubmissionPage)
def list_submissions(
    db: DB,
    form: OwnedForm,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
):
    return results.list_submissions(db, form, page=page, page_size=page_size)


@router.get("/forms/{form_id}/submissions/{submission_id}", response_model=SubmissionDetail)
def get_submission(db: DB, form: OwnedForm, submission_id: Annotated[str, Path(max_length=36)]):
    return results.get_submission(db, form, submission_id)


@router.get("/forms/{form_id}/analytics", response_model=FormAnalytics)
def get_analytics(db: DB, form: OwnedForm):
    return results.analytics(db, form)


@router.get("/forms/{form_id}/export.csv", response_class=Response)
def export_csv(db: DB, form: OwnedForm):
    filename = re.sub(r"[^A-Za-z0-9_-]+", "-", form.title).strip("-") or "responses"
    return Response(
        content=results.export_csv(db, form),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )


@router.get("/forms/{form_id}/files/{upload_id}", response_class=FileResponse)
def download_file(db: DB, form: OwnedForm, upload_id: Annotated[str, Path(max_length=36)]):
    upload, path = uploads.get_upload(db, form, upload_id)
    # Always a download (never rendered inline), so uploaded HTML/SVG can't run in our origin.
    return FileResponse(path, media_type="application/octet-stream", filename=upload.filename)
