from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.definition import FormDefinition, FormSettings, QuestionDef

FormSort = Literal["updated", "created", "title", "responses"]


class FormSummary(BaseModel):
    """A row in the workspace list."""

    id: str
    title: str
    status: Literal["draft", "published"]
    slug: str | None
    response_count: int
    question_count: int
    has_unpublished_changes: bool
    theme: str
    created_at: datetime
    updated_at: datetime


class FormDetail(BaseModel):
    """Everything the builder needs to hydrate."""

    id: str
    title: str
    status: Literal["draft", "published"]
    slug: str | None
    revision: int
    settings: FormSettings
    questions: list[QuestionDef]
    published_version_number: int | None
    published_at: datetime | None
    has_unpublished_changes: bool
    response_count: int
    created_at: datetime
    updated_at: datetime


class FormCreate(BaseModel):
    title: str = Field("My new form", min_length=1, max_length=255)


class FormRename(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class DraftUpdate(FormDefinition):
    """Autosave payload: the whole draft plus the revision the client last saw."""

    revision: int = Field(ge=1)


class DraftSaved(BaseModel):
    revision: int
    updated_at: datetime
    has_unpublished_changes: bool


class WorkspaceInfo(BaseModel):
    id: str
    name: str
    form_count: int


class MeResponse(BaseModel):
    id: str
    name: str
    email: str
    workspaces: list[WorkspaceInfo]
    response_count: int
