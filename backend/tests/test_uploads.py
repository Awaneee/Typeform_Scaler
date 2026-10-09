from pathlib import Path

from app.core.config import get_settings
from tests.conftest import make_form, publish, qid, submit


def _file_form(client, max_mb=1):
    q = qid()
    form = make_form(
        client,
        [{"id": q, "type": "file_upload", "title": "Your CV", "required": True, "settings": {"max_size_mb": max_mb}}],
    )
    return form, publish(client, form["id"])["slug"], q


def _upload(client, slug, question_id, content=b"hello", name="cv.pdf"):
    return client.post(
        f"/api/v1/public/forms/{slug}/uploads",
        data={"question_id": question_id},
        files={"file": (name, content, "application/pdf")},
    )


def test_upload_submit_and_download(client):
    form, slug, q = _file_form(client)
    up = _upload(client, slug, q, name="../../etc/cv.pdf")
    assert up.status_code == 201, up.text
    assert up.json()["filename"] == "cv.pdf"  # directory parts stripped

    sub = submit(client, slug, {q: up.json()["id"]})
    assert sub.status_code == 201, sub.text

    detail = client.get(f"/api/v1/forms/{form['id']}/submissions/{sub.json()['id']}").json()
    answer = detail["answers"][0]
    assert answer["display"] == "cv.pdf"
    file = client.get(answer["file_url"])
    assert file.status_code == 200 and file.content == b"hello"
    assert "attachment" in file.headers["content-disposition"]


def test_upload_must_belong_to_question_and_be_unused(client):
    _form, slug, q = _file_form(client)
    upload_id = _upload(client, slug, q).json()["id"]
    assert submit(client, slug, {q: "not-a-real-upload"}).status_code == 422
    assert submit(client, slug, {q: upload_id}).status_code == 201
    second = submit(client, slug, {q: upload_id})  # already claimed by another submission
    assert second.status_code == 422 and q in second.json()["error"]["fields"]


def _stored_files() -> set[Path]:
    return set(Path(get_settings().upload_dir).iterdir())


def test_rejects_too_large_and_wrong_question(client):
    _form, slug, q = _file_form(client, max_mb=1)
    before = _stored_files()
    too_big = _upload(client, slug, q, content=b"x" * (1024 * 1024 + 1))
    assert too_big.status_code == 413
    assert _stored_files() == before  # the partial file was removed
    assert _upload(client, slug, qid()).status_code == 422


def test_deleting_form_removes_files(client):
    form, slug, q = _file_form(client)
    before = _stored_files()
    _upload(client, slug, q)
    new_files = _stored_files() - before
    assert len(new_files) == 1
    client.delete(f"/api/v1/forms/{form['id']}")
    assert not _stored_files() & new_files
