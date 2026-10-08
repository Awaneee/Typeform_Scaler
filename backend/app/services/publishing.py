"""Publishing creates an immutable FormVersion snapshot of the current draft."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ValidationFailedError
from app.core.types import new_slug, utcnow
from app.models import Form, FormVersion
from app.schemas.definition import FormDefinition
from app.services.definitions import draft_definition
from app.validators.question_types import QUESTION_TYPES


def check_publishable(definition: FormDefinition) -> None:
    errors: dict[str, str] = {}
    if not definition.questions:
        errors["questions"] = "Add at least one question before publishing."
    for q in definition.questions:
        if not q.title.strip():
            errors[q.id] = "Every question needs a title."
        elif QUESTION_TYPES[q.type].has_options:
            labels = [o.label.strip() for o in q.options]
            if not labels or not all(labels):
                errors[q.id] = "Choice questions need at least one choice, and no empty choices."
    if errors:
        raise ValidationFailedError("This form isn't ready to publish yet.", fields=errors)


def _unique_slug(db: Session) -> str:
    while True:
        slug = new_slug()
        if db.scalar(select(Form.id).where(Form.slug == slug)) is None:
            return slug


def publish(db: Session, form: Form) -> FormVersion:
    definition = draft_definition(form)
    check_publishable(definition)

    last_number = db.scalar(select(func.max(FormVersion.version_number)).where(FormVersion.form_id == form.id)) or 0
    version = FormVersion(
        form_id=form.id,
        version_number=last_number + 1,
        source_revision=form.draft_revision,
        definition_json=definition.model_dump(),
        published_at=utcnow(),
    )
    db.add(version)
    db.flush()

    form.published_version_id = version.id
    form.published_version = version
    form.status = "published"
    form.slug = form.slug or _unique_slug(db)
    form.updated_at = utcnow()
    db.commit()
    return version


def unpublish(db: Session, form: Form) -> None:
    # Keep the slug and versions: responses stay readable and republishing reuses the link.
    form.status = "draft"
    form.updated_at = utcnow()
    db.commit()
