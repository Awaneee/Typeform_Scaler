"""Responses table, individual responses, analytics and CSV export.

Every submission belongs to a FormVersion, so answers are always interpreted
with the question definitions the respondent actually saw."""

import csv
import io
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import timedelta
from statistics import mean
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import NotFoundError
from app.core.types import utcnow
from app.models import Form, FormVersion, ResponseSession, Submission
from app.schemas.definition import FormDefinition, QuestionDef
from app.services.uploads import file_names
from app.schemas.results import (
    AnswerDetail,
    ChoiceCount,
    FormAnalytics,
    QuestionAnalytics,
    ResultColumn,
    PartialPage,
    PartialRow,
    SubmissionDetail,
    SubmissionPage,
    SubmissionRow,
)


@dataclass
class QuestionCatalog:
    """All questions that ever existed across a form's published versions."""

    questions: list[QuestionDef] = field(default_factory=list)
    removed: set[str] = field(default_factory=set)
    option_labels: dict[str, str] = field(default_factory=dict)
    file_names: dict[str, str] = field(default_factory=dict)  # upload id -> original filename
    definitions: dict[str, FormDefinition] = field(default_factory=dict)  # version_id -> definition
    numbers: dict[str, int] = field(default_factory=dict)  # version_id -> version_number

    def columns(self) -> list[ResultColumn]:
        return [ResultColumn(id=q.id, title=q.title, type=q.type, removed=q.id in self.removed) for q in self.questions]


def build_catalog(db: Session, form: Form) -> QuestionCatalog:
    versions = db.scalars(
        select(FormVersion).where(FormVersion.form_id == form.id).order_by(FormVersion.version_number)
    ).all()
    catalog = QuestionCatalog(file_names=file_names(db, form.id))
    latest: dict[str, QuestionDef] = {}
    for version in versions:
        definition = FormDefinition.model_validate(version.definition_json)
        catalog.definitions[version.id] = definition
        catalog.numbers[version.id] = version.version_number
        for q in definition.questions:
            latest[q.id] = q  # newer versions overwrite older titles
            catalog.option_labels.update({o.id: o.label for o in q.options})
    if versions:
        newest = catalog.definitions[versions[-1].id]
        newest_ids = [q.id for q in newest.questions]
        older_ids = [qid for qid in latest if qid not in set(newest_ids)]
        catalog.questions = [latest[qid] for qid in newest_ids + older_ids]
        catalog.removed = set(older_ids)
    return catalog


def format_answer(q: QuestionDef, value: Any, labels: dict[str, str], files: dict[str, str] | None = None) -> str:
    if value is None:
        return ""
    if q.type == "file_upload":
        return (files or {}).get(value, "(file)")
    if q.type == "yes_no":
        return "Yes" if value else "No"
    if q.type == "multiple_choice":
        return ", ".join(labels.get(v, "(deleted choice)") for v in value)
    if q.type == "dropdown":
        return labels.get(value, "(deleted choice)")
    if q.type == "rating":
        return f"{value}/{q.settings.get('steps', 5)}"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def _row(sub: Submission, number: int, catalog: QuestionCatalog) -> SubmissionRow:
    by_id = {q.id: q for q in catalog.questions}
    return SubmissionRow(
        id=sub.id,
        number=number,
        submitted_at=sub.submitted_at,
        version_number=catalog.numbers.get(sub.form_version_id, 0),
        answers={
            a.question_id: format_answer(by_id[a.question_id], a.value_json, catalog.option_labels, catalog.file_names)
            for a in sub.answers
            if a.question_id in by_id
        },
    )


def list_submissions(db: Session, form: Form, *, page: int, page_size: int) -> SubmissionPage:
    catalog = build_catalog(db, form)
    total = db.scalar(select(func.count()).select_from(Submission).where(Submission.form_id == form.id)) or 0
    subs = db.scalars(
        select(Submission)
        .where(Submission.form_id == form.id)
        .order_by(Submission.submitted_at.desc(), Submission.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .options(selectinload(Submission.answers))
    ).all()
    first_number = total - (page - 1) * page_size
    return SubmissionPage(
        columns=catalog.columns(),
        items=[_row(s, first_number - i, catalog) for i, s in enumerate(subs)],
        total=total,
        page=page,
        page_size=page_size,
    )


def _partial_filter(form: Form):
    """Sessions with saved answers that never turned into a submission."""
    return (
        ResponseSession.form_id == form.id,
        ResponseSession.submitted_at.is_(None),
        ResponseSession.partial_answers_json.is_not(None),
    )


def list_partials(db: Session, form: Form, *, page: int, page_size: int) -> PartialPage:
    """Sessions that answered something but never submitted, newest activity first."""
    catalog = build_catalog(db, form)
    by_id = {q.id: q for q in catalog.questions}
    sessions = db.scalars(
        select(ResponseSession)
        .where(*_partial_filter(form))
        .order_by(ResponseSession.last_activity_at.desc())
    ).all()
    sessions = [s for s in sessions if s.partial_answers_json]  # skip sessions with nothing answered
    rows = [
        PartialRow(
            id=s.id,
            started_at=s.started_at or s.viewed_at,
            last_activity_at=s.last_activity_at or s.viewed_at,
            version_number=catalog.numbers.get(s.form_version_id, 0),
            answered=len(s.partial_answers_json),
            answers={
                qid: format_answer(by_id[qid], value, catalog.option_labels, catalog.file_names)
                for qid, value in s.partial_answers_json.items()
                if qid in by_id
            },
        )
        for s in sessions
    ]
    start = (page - 1) * page_size
    return PartialPage(columns=catalog.columns(), items=rows[start : start + page_size], total=len(rows), page=page, page_size=page_size)


def get_submission(db: Session, form: Form, submission_id: str) -> SubmissionDetail:
    sub = db.scalar(
        select(Submission)
        .where(Submission.id == submission_id, Submission.form_id == form.id)
        .options(selectinload(Submission.answers))
    )
    if sub is None:
        raise NotFoundError("Response not found.")
    catalog = build_catalog(db, form)
    number = db.scalar(
        select(func.count())
        .select_from(Submission)
        .where(Submission.form_id == form.id, Submission.submitted_at <= sub.submitted_at)
    )
    values = {a.question_id: a.value_json for a in sub.answers}
    # Show the questions exactly as this respondent saw them.
    definition = catalog.definitions[sub.form_version_id]
    return SubmissionDetail(
        id=sub.id,
        number=number or 1,
        submitted_at=sub.submitted_at,
        version_number=catalog.numbers[sub.form_version_id],
        answers=[
            AnswerDetail(
                question_id=q.id,
                title=q.title,
                type=q.type,
                value=values.get(q.id),
                display=format_answer(q, values[q.id], catalog.option_labels, catalog.file_names) if q.id in values else None,
                file_url=f"/api/v1/forms/{form.id}/files/{values[q.id]}" if q.type == "file_upload" and q.id in values else None,
            )
            for q in definition.questions
        ],
    )


def _question_analytics(q: QuestionDef, values: list[Any], total: int, removed: bool, labels: dict[str, str], files: dict[str, str]):
    base = dict(question_id=q.id, title=q.title, type=q.type, removed=removed, answered=len(values),
                skipped=max(total - len(values), 0))

    def choices(counter: Counter, keys: list[tuple[Any, str]]) -> list[ChoiceCount]:
        denom = len(values) or 1
        return [ChoiceCount(label=label, count=counter[key], percent=round(100 * counter[key] / denom, 1))
                for key, label in keys]

    if q.type in ("multiple_choice", "dropdown"):
        counter = Counter(v for value in values for v in (value if isinstance(value, list) else [value]))
        keys = [(o.id, o.label) for o in q.options]
        keys += [(oid, labels.get(oid, "(deleted choice)")) for oid in counter if oid not in {k for k, _ in keys}]
        return QuestionAnalytics(**base, kind="choices", choices=choices(counter, keys))
    if q.type == "yes_no":
        counter = Counter(values)
        return QuestionAnalytics(**base, kind="choices", choices=choices(counter, [(True, "Yes"), (False, "No")]))
    if q.type == "rating":
        counter = Counter(values)
        steps = q.settings.get("steps", 5)
        keys = [(n, str(n)) for n in range(1, max([steps, *values]) + 1)]
        avg = round(mean(values), 2) if values else None
        return QuestionAnalytics(**base, kind="rating", choices=choices(counter, keys), average=avg)
    if q.type == "number":
        return QuestionAnalytics(
            **base,
            kind="number",
            average=round(mean(values), 2) if values else None,
            minimum=min(values) if values else None,
            maximum=max(values) if values else None,
        )
    if q.type == "file_upload":
        return QuestionAnalytics(**base, kind="text", recent=[files.get(v, "(file)") for v in values[:10]])
    return QuestionAnalytics(**base, kind="text", recent=[str(v) for v in values[:10]])


def analytics(db: Session, form: Form) -> FormAnalytics:
    catalog = build_catalog(db, form)
    subs = db.scalars(
        select(Submission)
        .where(Submission.form_id == form.id)
        .order_by(Submission.submitted_at.desc())
        .options(selectinload(Submission.answers))
    ).all()

    values: dict[str, list[Any]] = defaultdict(list)  # newest first
    for sub in subs:
        for a in sub.answers:
            values[a.question_id].append(a.value_json)

    # A question only counts as "skipped" by respondents whose version contained it.
    seen_by: Counter = Counter()
    for sub in subs:
        definition = catalog.definitions.get(sub.form_version_id)
        if definition:
            seen_by.update(q.id for q in definition.questions)

    views = db.scalar(select(func.count()).select_from(ResponseSession).where(ResponseSession.form_id == form.id)) or 0
    starts = db.scalar(
        select(func.count())
        .select_from(ResponseSession)
        .where(ResponseSession.form_id == form.id, ResponseSession.started_at.is_not(None))
    ) or 0
    completion = round(min(100.0, 100 * len(subs) / starts), 1) if starts else None
    durations = [
        (finished - started).total_seconds()
        for started, finished in db.execute(
            select(ResponseSession.started_at, ResponseSession.submitted_at).where(
                ResponseSession.form_id == form.id,
                ResponseSession.started_at.is_not(None),
                ResponseSession.submitted_at.is_not(None),
            )
        ).all()
        if finished >= started
    ]
    avg_completion = round(mean(durations), 1) if durations else None
    partials = sum(
        1 for answers in db.scalars(select(ResponseSession.partial_answers_json).where(*_partial_filter(form))) if answers
    )

    today = utcnow().date()
    per_day = Counter(s.submitted_at.date() for s in subs)
    daily = [
        {"date": (today - timedelta(days=d)).isoformat(), "count": per_day[today - timedelta(days=d)]}
        for d in range(13, -1, -1)
    ]

    return FormAnalytics(
        views=views,
        starts=starts,
        submissions=len(subs),
        partials=partials,
        completion_rate=completion,
        avg_completion_seconds=avg_completion,
        daily=daily,
        questions=[
            _question_analytics(q, values[q.id], seen_by[q.id], q.id in catalog.removed, catalog.option_labels, catalog.file_names)
            for q in catalog.questions
        ],
    )


def export_csv(db: Session, form: Form) -> str:
    catalog = build_catalog(db, form)
    subs = db.scalars(
        select(Submission)
        .where(Submission.form_id == form.id)
        .order_by(Submission.submitted_at)
        .options(selectinload(Submission.answers))
    ).all()
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["#", "Submitted at (UTC)", "Version", *[q.title or "Untitled" for q in catalog.questions]])
    for number, sub in enumerate(subs, start=1):
        row = _row(sub, number, catalog)
        writer.writerow([
            number,
            sub.submitted_at.strftime("%Y-%m-%d %H:%M:%S"),
            row.version_number,
            *[row.answers.get(q.id, "") for q in catalog.questions],
        ])
    return out.getvalue()
