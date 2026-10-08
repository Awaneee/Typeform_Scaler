from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.definition import FormSettings, QuestionDef


class PublicForm(BaseModel):
    slug: str
    title: str
    version_number: int
    settings: FormSettings
    questions: list[QuestionDef]


class SubmissionCreate(BaseModel):
    client_submission_id: str = Field(min_length=8, max_length=64)
    client_session_id: str | None = Field(None, min_length=8, max_length=64)
    # question_id -> raw answer; validated against the published version.
    answers: dict[str, Any] = Field(max_length=500)


class SubmissionCreated(BaseModel):
    id: str
    submitted_at: datetime


class SessionEvent(BaseModel):
    client_session_id: str = Field(min_length=8, max_length=64)
    event: Literal["view", "start"]
