"""Registry of supported question types.

Each type declares:
  * a settings model: validates and fills defaults for the type-specific config
  * whether it uses answer options (multiple_choice, dropdown)
  * an answer validator (in validators/answers.py)

Adding a new question type means adding one entry here and one validator.
"""

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

QuestionType = Literal[
    "short_text", "long_text", "multiple_choice", "dropdown", "email", "number", "yes_no", "rating"
]


class _Settings(BaseModel):
    # Unknown keys are dropped instead of rejected, so the client can evolve independently.
    model_config = ConfigDict(extra="ignore")


class TextSettings(_Settings):
    placeholder: str | None = Field(None, max_length=200)
    max_length: int | None = Field(None, ge=1, le=10_000)


class EmailSettings(_Settings):
    placeholder: str | None = Field(None, max_length=200)


class NumberSettings(_Settings):
    placeholder: str | None = Field(None, max_length=200)
    min: float | None = None
    max: float | None = None

    @model_validator(mode="after")
    def _min_le_max(self):
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("min must be less than or equal to max")
        return self


class MultipleChoiceSettings(_Settings):
    allow_multiple: bool = False


class DropdownSettings(_Settings):
    placeholder: str | None = Field(None, max_length=200)


class YesNoSettings(_Settings):
    pass


class RatingSettings(_Settings):
    steps: int = Field(5, ge=3, le=10)
    shape: Literal["star"] = "star"


@dataclass(frozen=True)
class QuestionTypeSpec:
    settings_model: type[_Settings]
    has_options: bool = False


QUESTION_TYPES: dict[str, QuestionTypeSpec] = {
    "short_text": QuestionTypeSpec(TextSettings),
    "long_text": QuestionTypeSpec(TextSettings),
    "email": QuestionTypeSpec(EmailSettings),
    "number": QuestionTypeSpec(NumberSettings),
    "multiple_choice": QuestionTypeSpec(MultipleChoiceSettings, has_options=True),
    "dropdown": QuestionTypeSpec(DropdownSettings, has_options=True),
    "yes_no": QuestionTypeSpec(YesNoSettings),
    "rating": QuestionTypeSpec(RatingSettings),
}


def normalize_settings(question_type: str, raw: dict) -> dict:
    """Validate type-specific settings and return them with defaults applied."""
    return QUESTION_TYPES[question_type].settings_model.model_validate(raw).model_dump(exclude_none=True)
