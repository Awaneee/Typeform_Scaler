"""Demo data so the app is usable on first launch. Deterministic (fixed RNG seed)."""

import logging
import random
from datetime import timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.types import new_id, utcnow
from app.models import Creator, Form, ResponseSession
from app.schemas.definition import FormDefinition
from app.services.creators import ensure_creator, get_default_workspace
from app.services.definitions import apply_definition
from app.services.publishing import publish
from app.services.submissions import create_submission

logger = logging.getLogger(__name__)


def _q(type_: str, title: str, *, required: bool = False, description: str = "", settings: dict | None = None,
       options: list[str] | None = None, logic: list[dict] | None = None) -> dict[str, Any]:
    return {
        "logic": logic or [],
        "id": new_id(),
        "type": type_,
        "title": title,
        "description": description,
        "required": required,
        "settings": settings or {},
        "options": [{"id": new_id(), "label": label} for label in options or []],
    }


def _event_registration() -> dict:
    return {
        "title": "Event Registration",
        "settings": {
            "theme": "classic",
            "thank_you": {"title": "You're on the list! 🎉", "description": "We'll email your ticket a week before the event."},
        },
        "questions": [
            _q("short_text", "Let's start with your full name", required=True, settings={"placeholder": "Type your answer here..."}),
            _q("email", "What's your email address?", required=True, description="We'll send your ticket here.",
               settings={"placeholder": "name@example.com"}),
            _q("dropdown", "Which department are you in?", required=True,
               options=["Engineering", "Design", "Product", "Marketing", "Sales", "Operations"]),
            _q("multiple_choice", "Which sessions are you interested in?", description="Choose as many as you like.",
               settings={"allow_multiple": True},
               options=["Keynote talks", "Hands-on workshops", "Panel discussions", "Networking mixer"]),
            # Logic jump: people who won't attend skip the last question.
            _q("yes_no", "Will you attend in person?", required=True,
               logic=[{"op": "is", "value": False, "goto": "end"}]),
            _q("rating", "How excited are you about this event?", settings={"steps": 5}),
        ],
    }


def _product_feedback() -> dict:
    return {
        "title": "Product Feedback",
        "settings": {
            "theme": "lavender",
            "thank_you": {"title": "Thanks for the feedback!", "description": "Our product team reads every response."},
        },
        "questions": [
            _q("rating", "Overall, how would you rate our product?", required=True, settings={"steps": 5}),
            _q("multiple_choice", "Which feature do you use the most?", required=True,
               options=["Dashboards", "Integrations", "Mobile app", "Reporting", "Automations"]),
            _q("long_text", "What's one thing we could do better?", description="Be as honest as you like.",
               settings={"placeholder": "Type your answer here..."}),
            _q("number", "On a scale of 0 to 10, how likely are you to recommend us to a friend?", required=True,
               settings={"min": 0, "max": 10}),
            _q("email", "Can we follow up with you? Leave your email if so.", settings={"placeholder": "name@example.com"}),
        ],
    }


def _job_application() -> dict:
    return {
        "title": "Job Application",
        "settings": {"theme": "ocean", "welcome": {"enabled": True, "title": "Join our team",
                     "description": "This takes about 3 minutes.", "button_text": "Apply now"}},
        "questions": [
            _q("short_text", "What's your name?", required=True),
            _q("email", "And your email?", required=True),
            _q("number", "How many years of professional experience do you have?", settings={"min": 0, "max": 50}),
            _q("dropdown", "Which role are you applying for?", required=True,
               options=["Frontend Engineer", "Backend Engineer", "Product Designer", "Data Analyst"]),
            _q("long_text", "Why do you want to work with us?", required=True),
            _q("file_upload", "Upload your CV", description="PDF or Word, up to 10 MB.", settings={"max_size_mb": 10}),
        ],
    }


FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ananya", "Ishaan", "Sara", "Vikram", "Priya", "Arjun", "Nisha",
         "Leo", "Maya", "Noah", "Zara", "Dev", "Tara", "Omar", "Lina"]
LAST = ["Sharma", "Patel", "Kapoor", "Iyer", "Singh", "Mehta", "Rao", "Khan", "Gupta", "Das", "Fernandes", "Nair"]
IMPROVEMENTS = [
    "Faster load times on the dashboard would be great.",
    "More export formats, especially Excel.",
    "Dark mode please!",
    "The mobile app sometimes logs me out.",
    "Better onboarding for new team members.",
    "Keyboard shortcuts for power users.",
    "Cheaper plan for small teams.",
    "Honestly it's great, keep it up.",
]


def _answer(q: dict, rng: random.Random, person: tuple[str, str]) -> Any:
    first, last = person
    opts = [o["id"] for o in q["options"]]
    match q["type"]:
        case "short_text":
            return f"{first} {last}"
        case "email":
            return f"{first.lower()}.{last.lower()}@example.com"
        case "dropdown":
            return rng.choice(opts)
        case "multiple_choice":
            if q["settings"].get("allow_multiple"):
                return rng.sample(opts, rng.randint(1, len(opts)))
            return [rng.choices(opts, weights=range(len(opts), 0, -1))[0]]
        case "yes_no":
            return rng.random() < 0.75
        case "rating":
            return rng.choices(range(1, q["settings"]["steps"] + 1), weights=[1, 2, 4, 8, 6])[0]
        case "number":
            return rng.choices(range(0, 11), weights=[1, 1, 1, 1, 2, 3, 4, 6, 9, 8, 6])[0]
        case "long_text":
            return rng.choice(IMPROVEMENTS)
    return None


def _seed_responses(db: Session, form: Form, definition: dict, count: int, rng: random.Random) -> None:
    now = utcnow()
    for _ in range(count):
        when = now - timedelta(days=rng.uniform(0, 20), minutes=rng.randint(0, 600))
        person = (rng.choice(FIRST), rng.choice(LAST))
        answers = {}
        for q in definition["questions"]:
            if q["required"] or rng.random() < 0.8:
                answers[q["id"]] = _answer(q, rng, person)
        session_id = new_id()
        db.add(ResponseSession(form_id=form.id, client_session_id=session_id, viewed_at=when, started_at=when))
        create_submission(db, form, form.published_version, answers, new_id(), client_session_id=session_id,
                          submitted_at=when)
    # Visitors who looked but didn't finish, so the completion rate is realistic.
    # Those who started leave a partial response (their first answers).
    for _ in range(count // 2):
        when = now - timedelta(days=rng.uniform(0, 20))
        if rng.random() < 0.5:
            db.add(ResponseSession(form_id=form.id, client_session_id=new_id(), viewed_at=when))
            continue
        person = (rng.choice(FIRST), rng.choice(LAST))
        first = definition["questions"][: rng.randint(1, 2)]
        db.add(ResponseSession(
            form_id=form.id,
            client_session_id=new_id(),
            viewed_at=when,
            started_at=when,
            form_version_id=form.published_version_id,
            partial_answers_json={q["id"]: _answer(q, rng, person) for q in first},
            last_activity_at=when + timedelta(minutes=rng.randint(1, 5)),
        ))
    db.commit()


def _create(db: Session, workspace_id: str, data: dict) -> Form:
    form = Form(workspace_id=workspace_id, title=data["title"], settings_json={})
    db.add(form)
    apply_definition(form, FormDefinition.model_validate(data))
    db.commit()
    return form


def seed(db: Session) -> None:
    rng = random.Random(42)
    creator = ensure_creator(db, "Alex Morgan", get_settings().default_creator_email)
    workspace = get_default_workspace(db, creator)

    for data, responses in ((_event_registration(), 24), (_product_feedback(), 18)):
        form = _create(db, workspace.id, data)
        publish(db, form)
        _seed_responses(db, form, data, responses, rng)

    _create(db, workspace.id, _job_application())
    logger.info("Seeded demo data")


def seed_if_empty(db: Session) -> bool:
    if db.scalar(select(Creator.id).limit(1)) is not None:
        return False
    seed(db)
    return True
