"""Converting between the normalized draft rows (questions, question_options)
and the FormDefinition document used by the API and published snapshots."""

from app.models import Form, Question, QuestionOption
from app.schemas.definition import FormDefinition, FormSettings, OptionDef, QuestionDef


def read_settings(form: Form) -> FormSettings:
    return FormSettings.model_validate(form.settings_json or {})


def question_to_def(q: Question) -> QuestionDef:
    return QuestionDef(
        id=q.id,
        type=q.type,
        title=q.title,
        description=q.description,
        required=q.required,
        settings=q.settings_json or {},
        options=[OptionDef(id=o.id, label=o.label) for o in q.options],
    )


def draft_definition(form: Form) -> FormDefinition:
    return FormDefinition(
        title=form.title,
        settings=read_settings(form),
        questions=[question_to_def(q) for q in form.questions],
    )


def apply_definition(form: Form, definition: FormDefinition) -> None:
    """Make the form's rows match `definition`, keeping ids stable.

    Rows are updated in place (not deleted and re-created) so created_at survives
    and the ORM never has to insert and delete the same primary key in one flush.
    Positions are rewritten as 0..n-1, so the order can never have gaps or duplicates.
    """
    form.title = definition.title
    form.settings_json = definition.settings.model_dump()

    existing = {q.id: q for q in form.questions}
    ordered: list[Question] = []
    for position, qdef in enumerate(definition.questions):
        question = existing.get(qdef.id) or Question(id=qdef.id)
        question.position = position
        question.type = qdef.type
        question.title = qdef.title
        question.description = qdef.description
        question.required = qdef.required
        question.settings_json = qdef.settings
        _apply_options(question, qdef.options)
        ordered.append(question)

    # Assigning the list lets delete-orphan remove questions that are gone.
    form.questions = ordered


def _apply_options(question: Question, options: list[OptionDef]) -> None:
    existing = {o.id: o for o in question.options}
    ordered: list[QuestionOption] = []
    for position, odef in enumerate(options):
        option = existing.get(odef.id) or QuestionOption(id=odef.id)
        option.position = position
        option.label = odef.label
        ordered.append(option)
    question.options = ordered
