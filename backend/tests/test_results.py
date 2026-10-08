from tests.conftest import make_form, publish, qid, submit


def test_analytics_counts_and_stats(client):
    choice, yes, rate, num, text = qid(), qid(), qid(), qid(), qid()
    form = make_form(client, [
        {"id": choice, "type": "multiple_choice", "title": "Color",
         "options": [{"id": "r", "label": "Red"}, {"id": "g", "label": "Green"}]},
        {"id": yes, "type": "yes_no", "title": "Yes?"},
        {"id": rate, "type": "rating", "title": "Rate"},
        {"id": num, "type": "number", "title": "Num"},
        {"id": text, "type": "short_text", "title": "Text"},
    ])
    slug = publish(client, form["id"])["slug"]
    submit(client, slug, {choice: ["r"], yes: True, rate: 5, num: 10, text: "first"})
    submit(client, slug, {choice: ["r"], yes: False, rate: 3, num: 20, text: "second"})
    submit(client, slug, {choice: ["g"], yes: True})

    data = client.get(f"/api/v1/forms/{form['id']}/analytics").json()
    assert data["submissions"] == 3
    by_id = {q["question_id"]: q for q in data["questions"]}

    assert [(c["label"], c["count"], c["percent"]) for c in by_id[choice]["choices"]] == [
        ("Red", 2, 66.7), ("Green", 1, 33.3)]
    assert [(c["label"], c["count"]) for c in by_id[yes]["choices"]] == [("Yes", 2), ("No", 1)]
    assert by_id[rate]["average"] == 4 and by_id[rate]["answered"] == 2 and by_id[rate]["skipped"] == 1
    assert (by_id[num]["average"], by_id[num]["minimum"], by_id[num]["maximum"]) == (15, 10, 20)
    assert by_id[text]["recent"] == ["second", "first"]


def test_completion_rate_from_sessions(client):
    q = qid()
    form = make_form(client, [{"id": q, "type": "short_text", "title": "Q"}])
    slug = publish(client, form["id"])["slug"]
    sessions = [qid() for _ in range(4)]
    for s in sessions:
        client.post(f"/api/v1/public/forms/{slug}/sessions", json={"client_session_id": s, "event": "view"})
    for s in sessions[:2]:
        client.post(f"/api/v1/public/forms/{slug}/sessions", json={"client_session_id": s, "event": "start"})
    client.post(f"/api/v1/public/forms/{slug}/submissions",
                json={"client_submission_id": qid(), "client_session_id": sessions[0], "answers": {q: "x"}})

    data = client.get(f"/api/v1/forms/{form['id']}/analytics").json()
    assert (data["views"], data["starts"], data["submissions"], data["completion_rate"]) == (4, 2, 1, 50.0)


def test_submissions_pagination_and_csv(client):
    q = qid()
    form = make_form(client, [{"id": q, "type": "short_text", "title": "Name"}])
    slug = publish(client, form["id"])["slug"]
    for name in ("a", "b", "c"):
        submit(client, slug, {q: name})

    page = client.get(f"/api/v1/forms/{form['id']}/submissions", params={"page_size": 2}).json()
    assert page["total"] == 3 and len(page["items"]) == 2
    assert [i["number"] for i in page["items"]] == [3, 2]

    csv = client.get(f"/api/v1/forms/{form['id']}/export.csv")
    assert csv.headers["content-type"].startswith("text/csv")
    lines = csv.text.strip().splitlines()
    assert lines[0] == "#,Submitted at (UTC),Version,Name" and len(lines) == 4
