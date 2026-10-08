"""Server-side answer validation. This is the authoritative check; the
frontend repeats the same rules only to give instant feedback."""

import math
from collections.abc import Callable
from typing import Any

from email_validator import EmailNotValidError, validate_email

from app.schemas.definition import QuestionDef
from app.validators.logic import next_index


class AnswerError(ValueError):
    pass


def is_empty(value: Any) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == "") or value == []


def _text(q: QuestionDef, value: Any) -> str:
    if not isinstance(value, str):
        raise AnswerError("Expected text.")
    value = value.strip()
    max_length = q.settings.get("max_length")
    if max_length and len(value) > max_length:
        raise AnswerError(f"Must be at most {max_length} characters.")
    return value


def _email(_q: QuestionDef, value: Any) -> str:
    if not isinstance(value, str):
        raise AnswerError("Expected an email address.")
    try:
        # Format check only; we don't do DNS lookups for form answers.
        return validate_email(value.strip(), check_deliverability=False).normalized
    except EmailNotValidError:
        raise AnswerError("Hmm... that email doesn't look right.") from None


def _number(q: QuestionDef, value: Any) -> int | float:
    # bool is a subclass of int in Python, so exclude it explicitly.
    if isinstance(value, bool) or not isinstance(value, int | float) or not math.isfinite(value):
        raise AnswerError("Numbers only please.")
    lo, hi = q.settings.get("min"), q.settings.get("max")
    if lo is not None and value < lo:
        raise AnswerError(f"Must be at least {lo:g}.")
    if hi is not None and value > hi:
        raise AnswerError(f"Must be at most {hi:g}.")
    return value


def _option_ids(q: QuestionDef) -> set[str]:
    return {o.id for o in q.options}


def _multiple_choice(q: QuestionDef, value: Any) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise AnswerError("Expected a list of choices.")
    if len(set(value)) != len(value):
        raise AnswerError("Choices must not repeat.")
    if not set(value) <= _option_ids(q):
        raise AnswerError("Unknown choice.")
    if len(value) > 1 and not q.settings.get("allow_multiple"):
        raise AnswerError("Only one choice is allowed.")
    return value


def _dropdown(q: QuestionDef, value: Any) -> str:
    if not isinstance(value, str) or value not in _option_ids(q):
        raise AnswerError("Please select an option from the list.")
    return value


def _yes_no(_q: QuestionDef, value: Any) -> bool:
    if not isinstance(value, bool):
        raise AnswerError("Expected yes or no.")
    return value


def _file_upload(_q: QuestionDef, value: Any) -> str:
    # Only the shape is checked here; submissions.py checks the upload exists for this form/question.
    if not isinstance(value, str) or not 1 <= len(value) <= 36:
        raise AnswerError("Please upload a file.")
    return value


def _rating(q: QuestionDef, value: Any) -> int:
    steps = q.settings.get("steps", 5)
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= steps:
        raise AnswerError(f"Rating must be between 1 and {steps}.")
    return value


ANSWER_VALIDATORS: dict[str, Callable[[QuestionDef, Any], Any]] = {
    "short_text": _text,
    "long_text": _text,
    "email": _email,
    "number": _number,
    "multiple_choice": _multiple_choice,
    "dropdown": _dropdown,
    "yes_no": _yes_no,
    "rating": _rating,
    "file_upload": _file_upload,
}


def validate_answers(questions: list[QuestionDef], answers: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str]]:
    """Returns (clean answers, field errors).

    Walks the respondent's path through the form (following logic jumps), so
    only questions they actually reached are validated and stored. Answers to
    questions a jump skipped are dropped; empty optional answers too.
    """
    by_id = {q.id: q for q in questions}
    errors: dict[str, str] = {question_id: "Unknown question." for question_id in answers.keys() - by_id.keys()}
    clean: dict[str, Any] = {}

    index: int | None = 0 if questions else None
    while index is not None:
        q = questions[index]
        value = answers.get(q.id)
        if is_empty(value):
            if q.required:
                errors[q.id] = "Please fill this in."
        else:
            try:
                clean[q.id] = ANSWER_VALIDATORS[q.type](q, value)
            except AnswerError as exc:
                errors[q.id] = str(exc)
            else:
                if q.required and is_empty(clean[q.id]):
                    errors[q.id] = "Please fill this in."
        # Route on the validated value; an invalid answer simply follows the default path.
        index = next_index(questions, index, clean.get(q.id))

    return clean, errors
