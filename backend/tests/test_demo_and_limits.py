import pytest

from app.core import rate_limit
from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models import Form
from app.services.seed import DEMO_FORMS, restore_demo
from tests.conftest import make_form, publish, qid, submit


def _demo_forms(client) -> dict[str, dict]:
    forms = client.get("/api/v1/forms").json()
    return {f["title"]: f for f in forms}


def test_restore_recreates_deleted_and_republishes_unpublished_demo_forms(client):
    with SessionLocal() as db:
        assert len(restore_demo(db)) == len(DEMO_FORMS)  # empty DB: all three created
    own = make_form(client, [{"id": qid(), "type": "short_text", "title": "Mine"}], title="My own form")

    forms = _demo_forms(client)
    assert forms["Event Registration"]["response_count"] == 24
    # Visitors can delete and unpublish demo forms like any other form...
    assert client.delete(f"/api/v1/forms/{forms['Event Registration']['id']}").status_code == 204
    assert client.post(f"/api/v1/forms/{forms['Product Feedback']['id']}/unpublish").status_code == 200

    # ...and the next restore repairs the demo without touching other forms.
    with SessionLocal() as db:
        assert sorted(restore_demo(db)) == ["recreated event_registration", "republished product_feedback"]
        assert db.get(Form, own["id"]) is not None
    forms = _demo_forms(client)
    assert forms["Event Registration"]["status"] == "published"
    assert forms["Event Registration"]["response_count"] == 24
    assert forms["Product Feedback"]["status"] == "published"
    with SessionLocal() as db:
        assert restore_demo(db) == []  # nothing left to repair


@pytest.fixture
def rate_limits_on():
    settings = get_settings()
    settings.rate_limit_enabled = True
    rate_limit.SUBMISSIONS.reset()
    yield
    settings.rate_limit_enabled = False
    rate_limit.SUBMISSIONS.reset()


def test_public_submissions_are_rate_limited_per_ip(client, rate_limits_on):
    q = qid()
    form = make_form(client, [{"id": q, "type": "short_text", "title": "Name"}])
    slug = publish(client, form["id"])["slug"]
    codes = [submit(client, slug, {q: "x"}).status_code for _ in range(rate_limit.SUBMISSIONS.limit + 1)]
    assert codes[:-1] == [201] * rate_limit.SUBMISSIONS.limit
    assert codes[-1] == 429
    # A different client IP has its own budget.
    other = client.post(
        f"/api/v1/public/forms/{slug}/submissions",
        json={"client_submission_id": qid(), "answers": {q: "y"}},
        headers={"x-forwarded-for": "203.0.113.9"},
    )
    assert other.status_code == 201


def test_upload_storage_cap(client):
    q = qid()
    form = make_form(client, [{"id": q, "type": "file_upload", "title": "File"}])
    slug = publish(client, form["id"])["slug"]
    settings = get_settings()
    settings.upload_storage_limit_mb, saved = 0, settings.upload_storage_limit_mb
    try:
        res = client.post(
            f"/api/v1/public/forms/{slug}/uploads",
            data={"question_id": q},
            files={"file": ("a.txt", b"hi", "text/plain")},
        )
        assert res.status_code == 507
    finally:
        settings.upload_storage_limit_mb = saved


def test_old_upload_limit_is_capped_not_rejected(client):
    form = make_form(client, [{"id": qid(), "type": "file_upload", "title": "File", "settings": {"max_size_mb": 10}}])
    assert form["questions"][0]["settings"]["max_size_mb"] == 5
