"""The shape of a form's content. Used for the builder draft, published
snapshots (FormVersion.definition_json) and the public form payload."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.validators.question_types import QUESTION_TYPES, QuestionType, normalize_settings

ThemeName = Literal["classic", "lavender", "ocean", "midnight"]
ID = Field(min_length=1, max_length=36, pattern=r"^[A-Za-z0-9_-]+$")


class OptionDef(BaseModel):
    id: str = ID
    label: str = Field("", max_length=500)


class QuestionDef(BaseModel):
    id: str = ID
    type: QuestionType
    title: str = Field("", max_length=1000)
    description: str = Field("", max_length=2000)
    required: bool = False
    settings: dict[str, Any] = Field(default_factory=dict)
    options: list[OptionDef] = Field(default_factory=list, max_length=200)

    @model_validator(mode="after")
    def _normalize(self):
        self.settings = normalize_settings(self.type, self.settings)
        if not QUESTION_TYPES[self.type].has_options:
            self.options = []
        elif len({o.id for o in self.options}) != len(self.options):
            raise ValueError("option ids must be unique within a question")
        return self


class ThankYouScreen(BaseModel):
    title: str = Field("Thanks for completing this form", max_length=500)
    description: str = Field("", max_length=1000)
    button_text: str = Field("Create a typeform", max_length=60)


class WelcomeScreen(BaseModel):
    enabled: bool = False
    title: str = Field("", max_length=500)
    description: str = Field("", max_length=1000)
    button_text: str = Field("Start", max_length=60)


class FormSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")

    theme: ThemeName = "classic"
    welcome: WelcomeScreen = Field(default_factory=WelcomeScreen)
    thank_you: ThankYouScreen = Field(default_factory=ThankYouScreen)


class FormDefinition(BaseModel):
    title: str = Field(max_length=255)
    settings: FormSettings = Field(default_factory=FormSettings)
    questions: list[QuestionDef] = Field(default_factory=list, max_length=200)

    @field_validator("questions")
    @classmethod
    def _unique_ids(cls, questions: list[QuestionDef]) -> list[QuestionDef]:
        if len({q.id for q in questions}) != len(questions):
            raise ValueError("question ids must be unique")
        return questions
