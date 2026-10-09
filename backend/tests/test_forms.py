from tests.conftest import make_form, publish, qid


def test_create_list_rename_delete(client):
    created = client.post("/api/v1/forms", json={"title": "Survey"})
    assert created.status_code == 201
    form = created.json()
    assert form["status"] == "draft" and form["questions"] == []

    renamed = client.patch(f"/api/v1/forms/{form['id']}", json={"title": "Renamed"}).json()
    assert renamed["title"] == "Renamed"
    assert renamed["revision"] == form["revision"] + 1

    listing = client.get("/api/v1/forms").json()
    assert [f["title"] for f in listing] == ["Renamed"]
    assert listing[0]["response_count"] == 0

    assert client.delete(f"/api/v1/forms/{form['id']}").status_code == 204
    assert client.get(f"/api/v1/forms/{form['id']}").status_code == 404


def test_search_and_sort(client):
    for title in ("Banana", "apple", "Cherry"):
        client.post("/api/v1/forms", json={"title": title})
    titles = [f["title"] for f in client.get("/api/v1/forms", params={"sort": "title"}).json()]
    assert titles == ["apple", "Banana", "Cherry"]
    found = client.get("/api/v1/forms", params={"q": "an"}).json()
    assert [f["title"] for f in found] == ["Banana"]


def test_draft_save_adds_reorders_and_removes_questions(client):
    a, b, c = qid(), qid(), qid()
    form = make_form(
        client,
        [
            {"id": a, "type": "short_text", "title": "A"},
            {"id": b, "type": "multiple_choice", "title": "B", "options": [{"id": "o1", "label": "One"}]},
            {"id": c, "type": "rating", "title": "C"},
        ],
    )
    assert [q["id"] for q in form["questions"]] == [a, b, c]
    assert form["questions"][2]["settings"] == {"steps": 5, "shape": "star"}  # defaults applied

    res = client.put(
        f"/api/v1/forms/{form['id']}/draft",
        json={
            "revision": form["revision"],
            "title": "T",
            "settings": {"theme": "ocean"},
            "questions": [form["questions"][2], form["questions"][0]],
        },
    )
    assert res.status_code == 200
    after = client.get(f"/api/v1/forms/{form['id']}").json()
    assert [q["id"] for q in after["questions"]] == [c, a]
    assert after["settings"]["theme"] == "ocean"
    assert after["revision"] == res.json()["revision"]


def test_stale_draft_revision_is_rejected(client):
    form = make_form(client, [{"id": qid(), "type": "short_text", "title": "A"}])
    body = {"revision": form["revision"] - 1, "title": "Stale", "settings": {}, "questions": []}
    res = client.put(f"/api/v1/forms/{form['id']}/draft", json=body)
    assert res.status_code == 409
    assert res.json()["error"]["current_revision"] == form["revision"]
    assert client.get(f"/api/v1/forms/{form['id']}").json()["title"] == "Test form"


def test_invalid_question_config_is_rejected(client):
    form = client.post("/api/v1/forms", json={"title": "x"}).json()
    res = client.put(
        f"/api/v1/forms/{form['id']}/draft",
        json={
            "revision": form["revision"],
            "title": "x",
            "settings": {},
            "questions": [{"id": qid(), "type": "number", "title": "N", "settings": {"min": 5, "max": 1}}],
        },
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "invalid_request"


def test_duplicate_copies_structure_not_responses(client):
    form = make_form(
        client,
        [
            {
                "id": qid(),
                "type": "dropdown",
                "title": "Pick",
                "required": True,
                "options": [{"id": "x", "label": "X"}],
            },
        ],
    )
    publish(client, form["id"])
    slug = client.get(f"/api/v1/forms/{form['id']}").json()["slug"]
    client.post(
        f"/api/v1/public/forms/{slug}/submissions",
        json={"client_submission_id": qid(), "answers": {form["questions"][0]["id"]: "x"}},
    )

    copy = client.post(f"/api/v1/forms/{form['id']}/duplicate").json()
    assert copy["title"] == "Test form (copy)"
    assert copy["status"] == "draft" and copy["slug"] is None and copy["response_count"] == 0
    assert copy["questions"][0]["id"] != form["questions"][0]["id"]
    assert copy["questions"][0]["options"][0]["label"] == "X"
    assert copy["questions"][0]["options"][0]["id"] != "x"


def test_error_shape_for_unknown_form(client):
    res = client.get("/api/v1/forms/does-not-exist")
    assert res.status_code == 404
    assert res.json() == {"error": {"code": "not_found", "message": "Form not found.", "fields": None}}


def test_list_includes_completion_rate(client):
    q = qid()
    form = make_form(client, [{"id": q, "type": "short_text", "title": "Name"}])
    slug = publish(client, form["id"])["slug"]
    sessions = [qid(), qid()]
    for s in sessions:
        client.post(f"/api/v1/public/forms/{slug}/sessions", json={"client_session_id": s, "event": "start"})
    client.post(
        f"/api/v1/public/forms/{slug}/submissions",
        json={"client_submission_id": qid(), "client_session_id": sessions[0], "answers": {q: "x"}},
    )
    row = next(f for f in client.get("/api/v1/forms").json() if f["id"] == form["id"])
    assert row["completion_rate"] == 50.0
    draft = client.post("/api/v1/forms", json={"title": "Fresh"}).json()
    assert next(f for f in client.get("/api/v1/forms").json() if f["id"] == draft["id"])["completion_rate"] is None
