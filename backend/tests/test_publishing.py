from tests.conftest import make_form, publish, qid, submit


def test_publish_creates_snapshot_and_public_form(client):
    q = qid()
    form = make_form(client, [{"id": q, "type": "short_text", "title": "Name?"}])
    published = publish(client, form["id"])
    assert published["status"] == "published" and published["published_version_number"] == 1
    assert published["has_unpublished_changes"] is False

    public = client.get(f"/api/v1/public/forms/{published['slug']}").json()
    assert public["title"] == "Test form" and public["questions"][0]["id"] == q


def test_draft_edits_do_not_change_public_form_until_republish(client):
    form = make_form(client, [{"id": qid(), "type": "short_text", "title": "Old title"}])
    published = publish(client, form["id"])
    edited = dict(form["questions"][0], title="New title")
    client.put(
        f"/api/v1/forms/{form['id']}/draft",
        json={"revision": published["revision"], "title": "Test form", "settings": {}, "questions": [edited]},
    )

    detail = client.get(f"/api/v1/forms/{form['id']}").json()
    assert detail["has_unpublished_changes"] is True
    assert client.get(f"/api/v1/public/forms/{published['slug']}").json()["questions"][0]["title"] == "Old title"

    republished = publish(client, form["id"])
    assert republished["slug"] == published["slug"]  # link is stable
    assert republished["published_version_number"] == 2
    assert client.get(f"/api/v1/public/forms/{published['slug']}").json()["questions"][0]["title"] == "New title"


def test_cannot_publish_empty_or_incomplete_form(client):
    empty = client.post("/api/v1/forms", json={"title": "Empty"}).json()
    res = client.post(f"/api/v1/forms/{empty['id']}/publish")
    assert res.status_code == 422 and "questions" in res.json()["error"]["fields"]

    q = qid()
    no_choices = make_form(client, [{"id": q, "type": "multiple_choice", "title": "Pick", "options": []}])
    res = client.post(f"/api/v1/forms/{no_choices['id']}/publish")
    assert res.status_code == 422 and q in res.json()["error"]["fields"]


def test_unpublish_blocks_submissions_but_keeps_responses(client):
    q = qid()
    form = make_form(client, [{"id": q, "type": "short_text", "title": "Name?"}])
    slug = publish(client, form["id"])["slug"]
    assert submit(client, slug, {q: "Ada"}).status_code == 201

    assert client.post(f"/api/v1/forms/{form['id']}/unpublish").json()["status"] == "draft"
    assert client.get(f"/api/v1/public/forms/{slug}").status_code == 404
    assert submit(client, slug, {q: "Bob"}).status_code == 404
    assert client.get(f"/api/v1/forms/{form['id']}/submissions").json()["total"] == 1


def test_draft_form_is_not_public(client):
    form = make_form(client, [{"id": qid(), "type": "short_text", "title": "Name?"}])
    assert form["slug"] is None
    assert client.get("/api/v1/public/forms/nonexistent").status_code == 404
