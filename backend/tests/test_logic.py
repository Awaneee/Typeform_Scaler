from tests.conftest import make_form, publish, qid, submit


def _branching_form(client):
    """Q1 yes/no: "No" jumps to the end. Q2 rating > 3 skips to Q4. Q3 and Q4 are required."""
    q1, q2, q3, q4 = qid(), qid(), qid(), qid()
    form = make_form(
        client,
        [
            {
                "id": q1,
                "type": "yes_no",
                "title": "Attending?",
                "required": True,
                "logic": [{"op": "is", "value": False, "goto": "end"}],
            },
            {
                "id": q2,
                "type": "rating",
                "title": "Excited?",
                "required": True,
                "logic": [{"op": "gt", "value": 3, "goto": q4}],
            },
            {"id": q3, "type": "short_text", "title": "Why not?", "required": True},
            {"id": q4, "type": "short_text", "title": "Anything else?", "required": True},
        ],
    )
    return form, publish(client, form["id"])["slug"], (q1, q2, q3, q4)


def test_jump_to_end_skips_required_questions(client):
    form, slug, (q1, _q2, _q3, _q4) = _branching_form(client)
    res = submit(client, slug, {q1: False})
    assert res.status_code == 201, res.text


def test_jump_skips_middle_question(client):
    form, slug, (q1, q2, q3, q4) = _branching_form(client)
    # Rating 5 jumps over Q3; an answer sent for Q3 anyway is dropped, not stored.
    res = submit(client, slug, {q1: True, q2: 5, q3: "stale answer", q4: "done"})
    assert res.status_code == 201, res.text
    detail = client.get(f"/api/v1/forms/{form['id']}/submissions/{res.json()['id']}").json()
    answered = {a["question_id"] for a in detail["answers"] if a["display"] is not None}
    assert answered == {q1, q2, q4}


def test_default_path_still_requires_visited_questions(client):
    _form, slug, (q1, q2, q3, _q4) = _branching_form(client)
    res = submit(client, slug, {q1: True, q2: 2})  # low rating: Q3 and Q4 are on the path
    assert res.status_code == 422
    assert set(res.json()["error"]["fields"]) == {q3, _q4}


def test_backward_jump_cannot_be_published(client):
    q1, q2 = qid(), qid()
    form = make_form(
        client,
        [
            {"id": q1, "type": "short_text", "title": "First"},
            {"id": q2, "type": "yes_no", "title": "Again?", "logic": [{"op": "is", "value": True, "goto": q1}]},
        ],
    )
    res = client.post(f"/api/v1/forms/{form['id']}/publish")
    assert res.status_code == 422 and q2 in res.json()["error"]["fields"]


def test_logic_on_unsupported_type_is_dropped(client):
    q1 = qid()
    form = make_form(
        client,
        [{"id": q1, "type": "short_text", "title": "Name", "logic": [{"op": "is", "value": "x", "goto": "end"}]}],
    )
    assert form["questions"][0]["logic"] == []


def test_duplicate_remaps_logic_targets(client):
    q1, q2, q3 = qid(), qid(), qid()
    form = make_form(
        client,
        [
            {
                "id": q1,
                "type": "dropdown",
                "title": "Pick",
                "options": [{"id": "opt", "label": "A"}],
                "logic": [{"op": "is", "value": "opt", "goto": q3}],
            },
            {"id": q2, "type": "short_text", "title": "Middle"},
            {"id": q3, "type": "short_text", "title": "Last"},
        ],
    )
    copy = client.post(f"/api/v1/forms/{form['id']}/duplicate").json()
    rule = copy["questions"][0]["logic"][0]
    assert rule["goto"] == copy["questions"][2]["id"]
    assert rule["value"] == copy["questions"][0]["options"][0]["id"]
