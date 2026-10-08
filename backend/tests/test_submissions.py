import pytest

from tests.conftest import make_form, publish, qid, submit

Q = {k: qid() for k in ("name", "email", "age", "pick", "multi", "drop", "yes", "rate")}


@pytest.fixture
def slug(client):
    form = make_form(client, [
        {"id": Q["name"], "type": "short_text", "title": "Name", "required": True, "settings": {"max_length": 10}},
        {"id": Q["email"], "type": "email", "title": "Email"},
        {"id": Q["age"], "type": "number", "title": "Age", "settings": {"min": 0, "max": 120}},
        {"id": Q["pick"], "type": "multiple_choice", "title": "Pick one",
         "options": [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]},
        {"id": Q["multi"], "type": "multiple_choice", "title": "Pick many", "settings": {"allow_multiple": True},
         "options": [{"id": "c", "label": "C"}, {"id": "d", "label": "D"}]},
        {"id": Q["drop"], "type": "dropdown", "title": "Drop", "options": [{"id": "e", "label": "E"}]},
        {"id": Q["yes"], "type": "yes_no", "title": "Yes?"},
        {"id": Q["rate"], "type": "rating", "title": "Rate", "settings": {"steps": 5}},
    ])
    return publish(client, form["id"])["slug"]


def test_valid_submission(client, slug):
    res = submit(client, slug, {
        Q["name"]: "Ada", Q["email"]: "ada@example.com", Q["age"]: 36, Q["pick"]: ["a"],
        Q["multi"]: ["c", "d"], Q["drop"]: "e", Q["yes"]: True, Q["rate"]: 4,
    })
    assert res.status_code == 201, res.text


def test_optional_answers_may_be_blank(client, slug):
    assert submit(client, slug, {Q["name"]: "Ada", Q["email"]: "", Q["multi"]: []}).status_code == 201


@pytest.mark.parametrize(("question", "value"), [
    ("name", None),           # required missing
    ("name", "   "),          # required whitespace only
    ("name", "x" * 11),       # too long
    ("email", "not-an-email"),
    ("age", "12"),            # string, not number
    ("age", 121),             # out of range
    ("age", True),            # bool is not a number
    ("pick", ["zzz"]),        # unknown option id
    ("pick", ["a", "b"]),     # multiple not allowed
    ("multi", ["c", "c"]),    # duplicates
    ("drop", "a"),            # option from another question
    ("yes", "yes"),
    ("rate", 6),
    ("rate", 0),
])
def test_invalid_answers_are_rejected(client, slug, question, value):
    answers = {Q["name"]: "Ada", Q[question]: value}
    res = submit(client, slug, answers)
    assert res.status_code == 422
    assert Q[question] in res.json()["error"]["fields"]


def test_unknown_question_is_rejected(client, slug):
    res = submit(client, slug, {Q["name"]: "Ada", "not-a-question": "x"})
    assert res.status_code == 422 and "not-a-question" in res.json()["error"]["fields"]


def test_duplicate_submit_is_idempotent(client, slug):
    sid = qid()
    first = submit(client, slug, {Q["name"]: "Ada"}, submission_id=sid)
    second = submit(client, slug, {Q["name"]: "Ada"}, submission_id=sid)
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_old_responses_survive_question_deletion(client):
    keep, gone = qid(), qid()
    form = make_form(client, [
        {"id": keep, "type": "short_text", "title": "Keep"},
        {"id": gone, "type": "dropdown", "title": "Gone", "options": [{"id": "o", "label": "Orange"}]},
    ])
    slug = publish(client, form["id"])["slug"]
    sub_id = submit(client, slug, {keep: "hi", gone: "o"}).json()["id"]

    current = client.get(f"/api/v1/forms/{form['id']}").json()
    client.put(f"/api/v1/forms/{form['id']}/draft", json={
        "revision": current["revision"], "title": "Test form", "settings": {}, "questions": [current["questions"][0]]})
    publish(client, form["id"])

    detail = client.get(f"/api/v1/forms/{form['id']}/submissions/{sub_id}").json()
    assert detail["version_number"] == 1
    assert [(a["title"], a["display"]) for a in detail["answers"]] == [("Keep", "hi"), ("Gone", "Orange")]

    page = client.get(f"/api/v1/forms/{form['id']}/submissions").json()
    removed = {c["id"]: c["removed"] for c in page["columns"]}
    assert removed == {keep: False, gone: True}
    assert page["items"][0]["answers"][gone] == "Orange"
