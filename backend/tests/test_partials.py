from tests.conftest import make_form, publish, qid


def _save(client, slug, session_id, answers):
    return client.put(f"/api/v1/public/forms/{slug}/sessions/{session_id}/answers", json={"answers": answers})


def test_partial_answers_are_saved_and_listed(client):
    name, email, pick = qid(), qid(), qid()
    form = make_form(
        client,
        [
            {"id": name, "type": "short_text", "title": "Name", "required": True},
            {"id": email, "type": "email", "title": "Email", "required": True},
            {"id": pick, "type": "dropdown", "title": "City", "options": [{"id": "pune", "label": "Pune"}]},
        ],
    )
    slug = publish(client, form["id"])["slug"]
    session = qid()
    # Invalid email and unknown question are dropped; nothing is "required" yet.
    assert _save(client, slug, session, {name: "Ada", email: "not-an-email", "ghost": "x"}).status_code == 204
    assert _save(client, slug, session, {name: "Ada", pick: "pune"}).status_code == 204  # later save replaces

    page = client.get(f"/api/v1/forms/{form['id']}/partials").json()
    assert page["total"] == 1
    row = page["items"][0]
    assert row["answers"] == {name: "Ada", pick: "Pune"} and row["answered"] == 2 and row["version_number"] == 1

    analytics = client.get(f"/api/v1/forms/{form['id']}/analytics").json()
    assert (analytics["partials"], analytics["starts"], analytics["submissions"]) == (1, 1, 0)


def test_submitting_clears_the_partial(client):
    name = qid()
    form = make_form(client, [{"id": name, "type": "short_text", "title": "Name"}])
    slug = publish(client, form["id"])["slug"]
    session = qid()
    _save(client, slug, session, {name: "Ada"})
    res = client.post(
        f"/api/v1/public/forms/{slug}/submissions",
        json={"client_submission_id": qid(), "client_session_id": session, "answers": {name: "Ada"}},
    )
    assert res.status_code == 201
    assert client.get(f"/api/v1/forms/{form['id']}/partials").json()["total"] == 0
    # A late autosave after submitting must not resurrect it.
    _save(client, slug, session, {name: "Ada again"})
    assert client.get(f"/api/v1/forms/{form['id']}/partials").json()["total"] == 0


def test_partials_only_for_published_forms(client):
    form = make_form(client, [{"id": qid(), "type": "short_text", "title": "Name"}])
    assert _save(client, "nope", qid(), {}).status_code == 404
    slug = publish(client, form["id"])["slug"]
    client.post(f"/api/v1/forms/{form['id']}/unpublish")
    assert _save(client, slug, qid(), {}).status_code == 404
