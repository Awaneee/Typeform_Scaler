# Implementation notes (interview guide)

How each part works, where the code lives, and short answers to likely interview questions.
Paths are relative to the repo root.

---

## 1. The big picture in one minute

- The **browser only talks to Next.js**. `frontend/next.config.ts` rewrites `/api/*` to the FastAPI server, so there
  are no CORS issues and no backend URL in client code.
- **FastAPI** has three layers: routes (`backend/app/api/v1`) → services (`backend/app/services`) → models
  (`backend/app/models`). Routes only parse input and call a service; services hold the rules and commit transactions.
- **SQLite** is managed by **Alembic migrations** (`backend/alembic/versions`), never by `create_all`.
- A form has a **draft** (editable rows in `questions` / `question_options`) and **published versions**
  (immutable JSON in `form_versions`). Respondents only ever see a published version.

---

## 2. Database

| Table | One-line purpose |
|---|---|
| `creators`, `workspaces` | Who owns forms. One default creator for now. |
| `forms` | The draft's title/settings, publish status, slug, `draft_revision`, pointer to the live version |
| `questions`, `question_options` | The draft content, one row per question / choice, ordered by `position` |
| `form_versions` | Snapshot of the whole form (JSON) at each publish |
| `submissions`, `answers` | Responses; each submission points at the version it answered |
| `response_sessions` | One row per visit: viewed / started / submitted times + partial answers |
| `file_uploads` | Metadata of uploaded files; the bytes live on disk under a random name |

**Q: Why store both normalised rows and a JSON snapshot?**
Rows are best for editing (reorder, validate one question, cascade deletes). A snapshot is best for publishing:
it can never change, it loads in one query, and old responses keep their meaning.

**Q: Why isn't `answers.question_id` a foreign key?**
Because answers belong to a *version*. A creator may delete a question from the draft later; the answer must
survive, and the question still exists inside the version snapshot. Results mark such questions "removed".

**Q: How do you keep question order consistent?**
On every save, `apply_definition` (`backend/app/services/definitions.py`) rewrites positions as 0..n-1 from the
order the client sent. There can't be gaps or duplicates.

**Q: Cascades?** Deleting a form cascades (ON DELETE CASCADE) to questions, options, versions, submissions, answers,
sessions and upload rows. `published_version_id` uses SET NULL. SQLite needs `PRAGMA foreign_keys=ON` on every
connection (`backend/app/core/db.py`). `backend/tests/test_schema.py` checks all of this.

**Q: Timestamps?** Stored as UTC. `UTCDateTime` (`backend/app/core/types.py`) refuses naive datetimes on write and
adds the UTC timezone on read, because SQLite has no timezone type.

---

## 3. Builder and autosave

Files: `frontend/src/store/builder-store.ts`, `frontend/src/components/builder/*`.

- The Zustand store holds the draft. Every change goes through `edit()`, which updates state, increments
  `editVersion` and schedules a save.
- **Autosave algorithm:** wait 800 ms after the last edit → send the *whole* draft with
  `PUT /forms/{id}/draft` plus the `revision` the server last returned → at most one request in flight → if edits
  happened meanwhile, send one more save → on success store the new revision.
- **409 conflict:** if the revision is stale (the form changed in another tab), the server refuses and the builder
  shows "Changed elsewhere · Reload" instead of overwriting.
- `flushSave()` runs before preview, publish and navigation; `beforeunload` warns about unsaved edits.

**Q: Why send the whole draft instead of one request per change?** Requests can't arrive out of order and
half-apply, the API stays tiny, and conflicts are easy to detect with one number.

**Q: How does drag-and-drop work?** `question-list.tsx` uses dnd-kit's `SortableContext`. On drop we get the dragged
id and the id it was dropped on, compute both indexes and call `moveQuestion(from, to)`, which reorders the array;
autosave then persists the new order. A 5 px activation distance keeps normal clicks working as "select", and the
keyboard sensor allows Space / arrows / Space.

**Q: How is the preview "live"?** The canvas renders the selected question with the same answer components the public
form uses (`components/questions/answers/*`) in `preview` mode, and the title/description/choices are editable in place.
The Preview button opens `/forms/[id]/preview`, which runs the real respondent flow on the draft but never submits.

---

## 4. Question types

- Backend registry: `backend/app/validators/question_types.py` (settings model + allowed logic operators per type).
- Answer validation: `backend/app/validators/answers.py` (one function per type).
- Frontend registry: `frontend/src/components/questions/registry.ts` (label, icon, colours, defaults).
- Answer UI: `frontend/src/components/questions/answers/*`, chosen by `answer-field.tsx`.

**Q: How would you add a new question type?** Add it to both registries, write its answer validator, write one answer
component, and add it to the `QuestionType` lists. Nothing else changes.

---

## 5. Publishing

`backend/app/services/publishing.py`:
1. Check the draft can be published (titles, non-empty choices, logic only jumps forward to existing targets).
2. Insert a `form_versions` row with `version_number = last + 1` and the draft as JSON, remembering `source_revision`.
3. Point `forms.published_version_id` at it, set `status = published`, create the slug once.

**Q: How do you know there are unpublished changes?** `draft_revision != published_version.source_revision`.

**Q: What does unpublish do?** Sets `status = draft`. Versions and responses stay; the public URL returns "closed";
republishing reuses the same slug.

---

## 6. Respondent flow

Files: `frontend/src/hooks/use-form-runner.ts` (logic) and `frontend/src/components/respondent/form-runner.tsx` (view).

- State: current screen, direction, answers, errors, back-history.
- **Next:** validate the current answer (`lib/validation.ts`) → work out the next question with the logic rules
  (`lib/logic.ts`) → animate to it, or submit if the form ends.
- **Transitions:** Motion's `AnimatePresence` with `mode="wait"`; the direction decides whether the question slides
  up or down; with "reduce motion" it only fades.
- **Keyboard:** Enter / ↓ next, ↑ back (single-line fields too), letter keys for choices, Y/N, number keys for ratings,
  Shift+Enter for a new line in long text. Arrow keys are left alone inside long text and the dropdown.
- **Auto-advance:** picking a single choice / yes-no / rating / dropdown option moves on after 350 ms.

**Q: What if someone double-clicks Submit or the network retries?** The browser creates a `client_submission_id`
once per fill. The column is unique; the server returns the existing submission when the id repeats.

**Q: What if submitting fails?** Answers stay in state and the error is shown; pressing Submit again retries with the
same id, so it can't create a duplicate.

**Q: Client and server validation, why both?** Client = instant feedback; server = the source of truth (anyone can
call the API directly). They use the same rules and messages. The server validates against the published version.

---

## 7. Logic jumps (bonus)

A rule: `{op: is | is_not | gt | lt, value, goto: <later question id> | "end"}` stored in `questions.logic_json`.

- Algorithm (same in `backend/app/validators/logic.py` and `frontend/src/lib/logic.ts`): check the current question's
  rules in order; the first match decides where to go; otherwise go to the next question.
- Jumps can **only go forward**, so a path always ends (no loops). Publishing rejects backward jumps.
- The server **walks the path** when validating a submission: questions that were skipped aren't required, and
  answers to them are dropped.
- The builder's Workflow tab edits rules (`components/builder/logic-editor.tsx`).

---

## 8. Results and analytics

`backend/app/services/results.py`:
- `build_catalog` merges questions from all published versions (latest wording wins) so every answer can be shown
  with a label, even for removed questions or choices.
- Analytics: choice counts and percentages, rating average and distribution, number average/min/max, recent text
  answers, daily submissions for 14 days.
- Completion rate = submissions ÷ sessions that started. Sessions come from `POST /public/forms/{slug}/sessions`.
- Partial responses: the form autosaves answers so far to `response_sessions.partial_answers_json`; they are cleared
  when the person submits and listed under Results → Responses → Partial.

---

## 9. File uploads (bonus)

`backend/app/services/uploads.py`: the file is uploaded as soon as it is picked, streamed to disk in 1 MB chunks
(rejected with 413 when over the limit), stored under a random name, and returned as an upload id. The answer is that
id; on submit, the upload must belong to the same form and question and not be used yet. Downloads are always sent
as attachments (so an uploaded HTML file can't run in our site). Deleting a form deletes its files.

---

## 10. Frontend structure

- Pages are thin; logic lives in components and hooks. Dynamic routes read `params` inside `<Suspense>`
  (required by Next.js 16 Cache Components).
- `lib/api/*` is a typed API client; `ApiError` mirrors the backend error shape.
- `components/ui/*` are small Radix-based primitives (button, modal, menu, popover, switch).
- Dark mode: CSS variables switched by `data-theme` on `<html>`, set by an inline script before first paint
  (no flash), managed by `lib/color-mode.ts`.

---

## 11. Likely questions

**Why FastAPI rather than Django?** The app is an API plus a separate Next.js frontend; FastAPI gives typed
Pydantic models, automatic OpenAPI docs and very little boilerplate. Django's admin/templates weren't needed.

**Why Zustand?** The builder has one shared state used by three panels; Zustand is a tiny store with plain functions,
no providers, and works well with the autosave logic outside React.

**How would you add real authentication?** Add a login (sessions or OAuth), set a cookie, and replace
`current_creator` in `backend/app/api/deps.py` to read the user from it. Every creator endpoint already checks that
the form belongs to the current creator.

**How would you scale it?** PostgreSQL instead of SQLite, S3 for uploads, several API instances behind a load balancer,
caching published versions, background jobs for CSV export, and moving rate-limit counters to Redis.

**What happens when two tabs edit the same form?** The second save has an old revision → 409 → that tab asks to reload.

**How are old responses kept correct after edits?** They point at the version they answered; the builder edits only the draft.

**What did you test?** 57 pytest tests (CRUD, autosave conflicts, publishing, every validation rule, logic paths,
uploads, partial responses, analytics, rate limits, demo restore, schema, migrations) and 47 Playwright tests that drive
the real app in a browser, one per requirement. CI runs everything, plus lint and formatting, on every push.

**How do you stop visitors from breaking the public demo?** Deleting and unpublishing are features being evaluated,
so they're never blocked. Instead the seeded forms carry a `demo_key`, and a background task (startup + every 30 min)
re-creates deleted demo forms and republishes unpublished ones (`backend/app/services/seed.py:restore_demo`).
Public endpoints are rate limited per IP (`backend/app/core/rate_limit.py`), and uploads have per-file and total caps.

**A bug you found and fixed?** SQLite can't alter tables in place, so Alembic rebuilds them (copy, drop old, rename).
With foreign keys switched on, dropping the old `forms` table cascade-deleted every question and response. The fix
switches foreign-key enforcement off while migrating and checks integrity afterwards (`backend/alembic/env.py`), and
`backend/tests/test_migrations.py` migrates a database with data and asserts nothing is lost.
