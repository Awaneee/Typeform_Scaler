from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class ResultColumn(BaseModel):
    id: str
    title: str
    type: str
    removed: bool  # question no longer exists in the latest version


class SubmissionRow(BaseModel):
    id: str
    number: int
    submitted_at: datetime
    version_number: int
    # question_id -> human-readable answer (option labels resolved).
    answers: dict[str, str]


class PartialRow(BaseModel):
    id: str
    started_at: datetime
    last_activity_at: datetime
    version_number: int
    answered: int
    answers: dict[str, str]


class PartialPage(BaseModel):
    columns: list[ResultColumn]
    items: list[PartialRow]
    total: int
    page: int
    page_size: int


class SubmissionPage(BaseModel):
    columns: list[ResultColumn]
    items: list[SubmissionRow]
    total: int
    page: int
    page_size: int


class AnswerDetail(BaseModel):
    question_id: str
    title: str
    type: str
    value: Any
    display: str | None
    file_url: str | None = None


class SubmissionDetail(BaseModel):
    id: str
    number: int
    submitted_at: datetime
    version_number: int
    answers: list[AnswerDetail]


class ChoiceCount(BaseModel):
    label: str
    count: int
    percent: float


class QuestionAnalytics(BaseModel):
    question_id: str
    title: str
    type: str
    removed: bool
    answered: int
    skipped: int
    kind: Literal["choices", "rating", "number", "text"]
    choices: list[ChoiceCount] | None = None
    average: float | None = None
    minimum: float | None = None
    maximum: float | None = None
    recent: list[str] | None = None


class FormAnalytics(BaseModel):
    views: int
    starts: int
    submissions: int
    partials: int
    completion_rate: float | None
    daily: list[dict[str, Any]]
    questions: list[QuestionAnalytics]
