"""Form CRUD for the workspace and builder."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.core.types import new_id, utcnow
from app.models import Creator, Form, FormVersion, Question, QuestionOption, ResponseSession, Submission, Workspace
from app.schemas.forms import DraftSaved, DraftUpdate, FormDetail, FormSort, FormSummary
from app.services.creators import get_default_workspace
from app.services.definitions import apply_definition, draft_definition, read_settings


def _response_counts(db: Session, form_ids: list[str]) -> dict[str, int]:
    if not form_ids:
        return {}
    rows = db.execute(
        select(Submission.form_id, func.count()).where(Submission.form_id.in_(form_ids)).group_by(Submission.form_id)
    )
    return dict(rows.all())


def _start_counts(db: Session, form_ids: list[str]) -> dict[str, int]:
    if not form_ids:
        return {}
    rows = db.execute(
        select(ResponseSession.form_id, func.count())
        .where(ResponseSession.form_id.in_(form_ids), ResponseSession.started_at.is_not(None))
        .group_by(ResponseSession.form_id)
    )
    return dict(rows.all())


def has_unpublished_changes(form: Form) -> bool:
    if form.status != "published" or form.published_version is None:
        return False
    return form.published_version.source_revision != form.draft_revision


def get_owned_form(db: Session, creator: Creator, form_id: str) -> Form:
    form = db.scalar(
        select(Form)
        .join(Workspace)
        .where(Form.id == form_id, Workspace.creator_id == creator.id)
        .options(selectinload(Form.questions).selectinload(Question.options), selectinload(Form.published_version))
    )
    if form is None:
        raise NotFoundError("Form not found.")
    return form


def list_forms(db: Session, creator: Creator, *, query: str | None, sort: FormSort) -> list[FormSummary]:
    stmt = (
        select(Form)
        .join(Workspace)
        .where(Workspace.creator_id == creator.id)
        .options(selectinload(Form.questions), selectinload(Form.published_version))
    )
    if query:
        stmt = stmt.where(Form.title.ilike(f"%{query.strip()}%"))
    forms = list(db.scalars(stmt))
    counts = _response_counts(db, [f.id for f in forms])
    starts = _start_counts(db, [f.id for f in forms])

    sort_keys = {
        "updated": (lambda f: f.updated_at, True),
        "created": (lambda f: f.created_at, True),
        "title": (lambda f: f.title.lower(), False),
        "responses": (lambda f: counts.get(f.id, 0), True),
    }
    key, reverse = sort_keys[sort]
    forms.sort(key=key, reverse=reverse)

    return [
        FormSummary(
            id=f.id,
            title=f.title,
            status=f.status,
            slug=f.slug,
            response_count=counts.get(f.id, 0),
            completion_rate=(
                round(min(100.0, 100 * counts.get(f.id, 0) / starts[f.id]), 1) if starts.get(f.id) else None
            ),
            question_count=len(f.questions),
            has_unpublished_changes=has_unpublished_changes(f),
            theme=read_settings(f).theme,
            created_at=f.created_at,
            updated_at=f.updated_at,
        )
        for f in forms
    ]


def to_detail(db: Session, form: Form) -> FormDetail:
    definition = draft_definition(form)
    version = form.published_version
    return FormDetail(
        id=form.id,
        title=form.title,
        status=form.status,
        slug=form.slug,
        revision=form.draft_revision,
        settings=definition.settings,
        questions=definition.questions,
        published_version_number=version.version_number if version else None,
        published_at=version.published_at if version else None,
        has_unpublished_changes=has_unpublished_changes(form),
        response_count=_response_counts(db, [form.id]).get(form.id, 0),
        created_at=form.created_at,
        updated_at=form.updated_at,
    )


def create_form(db: Session, creator: Creator, title: str) -> Form:
    form = Form(workspace_id=get_default_workspace(db, creator).id, title=title.strip(), settings_json={})
    db.add(form)
    db.commit()
    return form


def rename_form(db: Session, form: Form, title: str) -> Form:
    form.title = title.strip()
    form.draft_revision += 1
    db.commit()
    return form


def save_draft(db: Session, form: Form, update: DraftUpdate) -> DraftSaved:
    """Atomic autosave. The client sends the whole draft plus the revision it
    last saw; if someone saved in between we refuse instead of overwriting."""
    if update.revision != form.draft_revision:
        raise ConflictError(
            "This form was changed somewhere else. Reload to get the latest version.",
            extra={"current_revision": form.draft_revision},
        )
    apply_definition(form, update)
    form.draft_revision += 1
    form.updated_at = utcnow()
    db.commit()
    return DraftSaved(
        revision=form.draft_revision,
        updated_at=form.updated_at,
        has_unpublished_changes=has_unpublished_changes(form),
    )


def duplicate_form(db: Session, form: Form) -> Form:
    """Copies the draft structure with fresh ids. Responses and versions are not copied."""
    copy = Form(
        workspace_id=form.workspace_id,
        title=f"{form.title} (copy)"[:255],
        settings_json=dict(form.settings_json or {}),
    )
    for q in form.questions:
        copy.questions.append(
            Question(
                id=new_id(),
                position=q.position,
                type=q.type,
                title=q.title,
                description=q.description,
                required=q.required,
                settings_json=dict(q.settings_json or {}),
                options=[QuestionOption(id=new_id(), position=o.position, label=o.label) for o in q.options],
                logic_json=[],  # rules reference old ids; remapped below
            )
        )
    # Copy logic jumps, pointing them at the new question and option ids.
    id_map = {old.id: new.id for old, new in zip(form.questions, copy.questions)}
    for old, new in zip(form.questions, copy.questions):
        id_map.update({o.id: n.id for o, n in zip(old.options, new.options)})
    for old, new in zip(form.questions, copy.questions):
        new.logic_json = [
            {**r, "goto": id_map.get(r["goto"], r["goto"]), "value": id_map.get(r["value"], r["value"]) if isinstance(r["value"], str) else r["value"]}
            for r in old.logic_json or []
        ]
    db.add(copy)
    db.commit()
    return copy


def delete_form(db: Session, form: Form) -> None:
    from app.services.uploads import delete_files_for_form

    files = delete_files_for_form(db, form.id)
    # DB-level ON DELETE CASCADE removes questions, versions, submissions, answers and upload rows.
    db.delete(form)
    db.commit()
    for path in files:  # only after the commit succeeded
        path.unlink(missing_ok=True)


def latest_version(db: Session, form_id: str) -> FormVersion | None:
    return db.scalar(
        select(FormVersion).where(FormVersion.form_id == form_id).order_by(FormVersion.version_number.desc()).limit(1)
    )
