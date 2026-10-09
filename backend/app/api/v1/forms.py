"""Creator-facing form management: CRUD, autosave, publishing."""

from typing import Annotated

from fastapi import APIRouter, Query, Response, status
from sqlalchemy import func, select

from app.api.deps import DB, CurrentCreator, OwnedForm
from app.models import Form, Submission, Workspace
from app.schemas.forms import (
    DraftSaved,
    DraftUpdate,
    FormCreate,
    FormDetail,
    FormRename,
    FormSort,
    FormSummary,
    MeResponse,
    WorkspaceInfo,
)
from app.services import forms as form_service
from app.services import publishing

router = APIRouter(tags=["forms"])


@router.get("/me", response_model=MeResponse)
def me(db: DB, creator: CurrentCreator):
    workspaces = []
    for ws in creator.workspaces:
        count = db.scalar(select(func.count()).select_from(Form).where(Form.workspace_id == ws.id)) or 0
        workspaces.append(WorkspaceInfo(id=ws.id, name=ws.name, form_count=count))
    responses = (
        db.scalar(
            select(func.count())
            .select_from(Submission)
            .join(Form)
            .join(Workspace)
            .where(Workspace.creator_id == creator.id)
        )
        or 0
    )
    return MeResponse(
        id=creator.id, name=creator.name, email=creator.email, workspaces=workspaces, response_count=responses
    )


@router.get("/forms", response_model=list[FormSummary])
def list_forms(
    db: DB,
    creator: CurrentCreator,
    q: Annotated[str | None, Query(max_length=100)] = None,
    sort: FormSort = "updated",
):
    return form_service.list_forms(db, creator, query=q, sort=sort)


@router.post("/forms", response_model=FormDetail, status_code=status.HTTP_201_CREATED)
def create_form(db: DB, creator: CurrentCreator, body: FormCreate):
    form = form_service.create_form(db, creator, body.title)
    return form_service.to_detail(db, form_service.get_owned_form(db, creator, form.id))


@router.get("/forms/{form_id}", response_model=FormDetail)
def get_form(db: DB, form: OwnedForm):
    return form_service.to_detail(db, form)


@router.patch("/forms/{form_id}", response_model=FormDetail)
def rename_form(db: DB, form: OwnedForm, body: FormRename):
    return form_service.to_detail(db, form_service.rename_form(db, form, body.title))


@router.delete("/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(db: DB, form: OwnedForm):
    form_service.delete_form(db, form)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/forms/{form_id}/duplicate", response_model=FormDetail, status_code=status.HTTP_201_CREATED)
def duplicate_form(db: DB, creator: CurrentCreator, form: OwnedForm):
    copy = form_service.duplicate_form(db, form)
    return form_service.to_detail(db, form_service.get_owned_form(db, creator, copy.id))


@router.put("/forms/{form_id}/draft", response_model=DraftSaved)
def save_draft(db: DB, form: OwnedForm, body: DraftUpdate):
    return form_service.save_draft(db, form, body)


@router.post("/forms/{form_id}/publish", response_model=FormDetail)
def publish_form(db: DB, form: OwnedForm):
    publishing.publish(db, form)
    return form_service.to_detail(db, form)


@router.post("/forms/{form_id}/unpublish", response_model=FormDetail)
def unpublish_form(db: DB, form: OwnedForm):
    publishing.unpublish(db, form)
    return form_service.to_detail(db, form)
