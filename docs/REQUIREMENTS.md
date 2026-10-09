# Requirements → implementation → proof

Every line of the assignment, where it is implemented, and the automated test that proves it works.

- **E2E** = Playwright test in `frontend/e2e/` (drives the real app in a browser; the test is named after the requirement).
- **API** = pytest test in `backend/tests/`.
- Run them with `npm run test:e2e` (frontend) and `python -m pytest` (backend). Both run in CI on every push.

Paths: `fe/` = `frontend/src/`, `be/` = `backend/app/`.

---

## Technical stack

| Requirement | Implementation |
|---|---|
| Frontend: Next.js (TypeScript) | Next.js 16 App Router, TypeScript strict (`frontend/`) |
| Backend: Python with FastAPI | FastAPI + Pydantic v2 (`backend/app/`), OpenAPI docs at `/docs` |
| Database: SQLite, own schema | SQLAlchemy 2 models (`be/models/`) + Alembic migrations (`backend/alembic/versions/0001`–`0004`) |
| Public form is a real, shareable experience, no auth | `/to/[slug]` (`fe/app/to/[slug]/page.tsx`) backed by `/api/v1/public/*` (`be/api/v1/public.py`) |

## 1. Form Builder

| Requirement | Implementation | Proof |
|---|---|---|
| Create a form with a title and ordered list of questions | `/forms/new` → builder; ordered `questions.position` rewritten on every save (`be/services/definitions.py`) | E2E "Create a form with a title and ordered list of questions" · API `test_draft_save_adds_reorders_and_removes_questions` |
| Add questions | Question picker modal (`fe/components/builder/question-picker.tsx`), inserts after the selected question (`fe/store/builder-store.ts`) | E2E "Add questions (…)" |
| Edit questions | Inline editing on the canvas (`fe/components/builder/canvas.tsx`, `choice-editor.tsx`) + settings panel (`settings-panel.tsx`) | E2E "Edit questions (…)" |
| Reorder (drag-and-drop) | dnd-kit sortable list with mouse and keyboard (`fe/components/builder/question-list.tsx`) | E2E "Reorder questions (…)" |
| Delete questions | Question menu → Delete (and Duplicate) | E2E "Delete questions (and duplicate)" |
| Types: short text, long text, multiple choice, dropdown, email, number, yes/no, rating | Type registries (`fe/components/questions/registry.ts`, `be/validators/question_types.py`) + answer components (`fe/components/questions/answers/*`) | E2E "Question types in the builder: …" · API `test_valid_submission` |
| Per-question settings: required toggle | Settings panel switch; asterisk on canvas and form | E2E "Per-question settings: required toggle" |
| Per-question settings: description / help text | Editable description on the canvas, shown on the public form | E2E "Per-question settings: description / help text" |
| Live preview of the form | Canvas renders the same components respondents see (desktop/mobile toggle); Preview page runs the real flow without saving (`fe/components/respondent/preview-form.tsx`) | E2E "Live preview of the form (…)" |

## 2. Form Management (CRUD)

| Requirement | Implementation | Proof |
|---|---|---|
| List of forms with status (draft/published) and response count | Workspace list/grid (`fe/components/workspace/*`), `GET /api/v1/forms` | E2E "List of the creator's forms with status (…)" · API `test_create_list_rename_delete`, `test_search_and_sort` |
| Create, rename, duplicate, delete | Workspace actions menu + dialogs; `be/services/forms.py` | E2E "Create a form …", "Rename a form", "Duplicate a form", "Delete a form (with confirmation)" · API `test_duplicate_copies_structure_not_responses` |
| Publish / unpublish, shareable public link | Immutable version snapshots + stable slug (`be/services/publishing.py`); Share tab + Copy link | E2E "Publish / unpublish", "Shareable public link generated (…)" · API `test_publish_creates_snapshot_and_public_form`, `test_unpublish_blocks_submissions_but_keeps_responses` |
| All form definitions persist | SQLite via SQLAlchemy; whole-draft autosave with revision check (`be/services/forms.py:save_draft`) | E2E "All form definitions persist (SQLite)" · API `test_stale_draft_revision_is_rejected` |

## 3. Respondent Flow

| Requirement | Implementation | Proof |
|---|---|---|
| One question at a time, full-screen | `fe/components/respondent/form-runner.tsx` | E2E "One question at a time, full-screen" |
| Smooth transitions | Motion `AnimatePresence`, direction-aware, reduced-motion aware | E2E "Smooth transitions between questions (…)" |
| Keyboard navigation (Enter/arrow) | Enter / ↓ next, ↑ back, letter keys, Y/N, number keys (`form-runner.tsx`, `answers/*`) | E2E "Keyboard navigation (…)" |
| Progress indicator | Top progress bar (`role="progressbar"`) | E2E "Progress indicator (…)" |
| Client validation | `fe/lib/validation.ts` (same rules and messages as the server) | E2E "Validation: client side (…)" |
| Server validation (required, email, number, …) | `be/validators/answers.py`, validated against the published version | E2E "Validation: server side (…)" · API `test_invalid_answers_are_rejected` (14 cases), `test_unknown_question_is_rejected` |
| Submit stores the response; thank-you screen | `POST /public/forms/{slug}/submissions` (idempotent); themed ending screen | E2E "Submit stores the response (…)", "Thank-you screen (…)" · API `test_duplicate_submit_is_idempotent` |
| No login required | Public routes need no auth | E2E "No login required to fill a published form" |

## 4. Results / Responses

| Requirement | Implementation | Proof |
|---|---|---|
| Responses table / list | Results → Responses (`fe/components/results/responses-tab.tsx`), paginated | E2E "Per-form responses view (…)" · API `test_submissions_pagination_and_csv` |
| View an individual response in full | Side panel, shown against the version the respondent answered (`response-drawer.tsx`) | E2E "View an individual response in full (…)" · API `test_old_responses_survive_question_deletion` |
| Summary stats per question | Results → Response summary (`summary-tab.tsx`, `be/services/results.py`) | E2E "Basic summary stats per question (…)" · API `test_analytics_counts_and_stats` |
| All responses persist | `submissions` + `answers` tables | E2E "All responses persist" |

## 5. Typeform Experience

| Requirement | Implementation | Proof |
|---|---|---|
| Conversational one-at-a-time UI with transitions | Respondent flow (above), styled after Typeform's current UI | E2E "Conversational, one-at-a-time fill UI with transitions" |
| Clean builder layout with live preview | Three-panel builder (`fe/components/builder/builder.tsx`) | E2E "Clean builder layout with live preview" |
| Forms, modals, inline editing | Radix dialogs/menus (`fe/components/ui/*`), inline canvas editing | E2E "Forms, modals and inline editing" |
| Notifications / toasts | Sonner toasts on every action | E2E "Notifications / toasts" |
| Settings placeholders (theme, thank-you screen) | Design popover with 6 themes; editable thank-you screen | E2E "Settings placeholders (…)" |
| (extra) Works on phones | Respondent flow is mobile-first; builder and results stack panels and scroll tabs below 768 px | E2E "Responsive: every main screen fits a phone without sideways scrolling" |

## Mocked / placeholder sections

| Requirement | Implementation | Proof |
|---|---|---|
| Logic jumps / branching | Implemented (see bonus) | E2E "Logic jumps / conditional branching (…)" |
| Integrations / webhooks | "Coming soon" (workspace header, Connect tab, row integrations button) | E2E "Integrations / webhooks (…)" |
| Team collaboration & sharing | "Coming soon" (Invite, workspaces) | E2E "Team collaboration & sharing (…)" |
| Payment / file-upload types | Payment "coming soon"; file upload implemented (see bonus) | E2E "Payment / file-upload question types (…)" |
| Simplified creator auth | One default creator (`be/api/deps.py:current_creator`); ownership checked on every creator request | E2E "Simplified auth (one default logged-in creator)" |
| (extra) AI form generation | "Coming soon" on the create screen and AI panel | E2E "AI form generation (…)" |

## Bonus (all implemented)

| Bonus | Implementation | Proof |
|---|---|---|
| Logic jumps / conditional branching | Rules in `questions.logic_json`; same algorithm in `be/validators/logic.py` and `fe/lib/logic.ts`; Workflow tab editor | E2E "Logic jumps / conditional branching (…)" · API `test_jump_to_end_skips_required_questions` and 5 more |
| Custom themes (colours, fonts, background) | 6 presets (`fe/lib/themes.ts`), snapshot per published version | E2E "Custom themes (…)" |
| Export responses as CSV | `GET /forms/{id}/export.csv`, Download CSV button | E2E "Export responses as CSV (…)" |
| Partial-response tracking / completion rate | `response_sessions` (views, starts, partial answers, time to complete) | E2E "Partial-response tracking / completion rate (…)" · API `test_partial_answers_are_saved_and_listed`, `test_completion_rate_from_sessions` |
| File-upload question type | Streamed to disk with size + storage caps (`be/services/uploads.py`) | E2E "File-upload question type (…)" · API `test_upload_submit_and_download` and 4 more |
| Dark mode | `[data-theme="dark"]` tokens, no-flash inline script (`fe/lib/color-mode.ts`) | E2E "Dark mode (…)" |

## Important notes and deliverables

| Item | Where | Proof |
|---|---|---|
| Seed data (published forms, mixed types, existing responses) | `be/services/seed.py` (3 forms, 42 responses, partials); demo forms self-restore if deleted/unpublished | E2E "Seed data: …" · API `test_restore_recreates_deleted_and_republishes_unpublished_demo_forms` |
| Database design | 10 tables, FKs with cascade/set-null rules, unique constraints, ER diagram in the README | API `test_all_tables_exist`, `test_foreign_keys_and_delete_rules`, `test_unique_constraints`, `test_foreign_keys_are_enforced` |
| README (setup, stack, architecture, schema, API, assumptions) | [`README.md`](../README.md) | — |
| Public GitHub repo with `frontend/` and `backend/` | <https://github.com/Awaneee/Typeform_Scaler> | — |
| Hosted demo | <https://typeform-scaler.vercel.app> | Full E2E suite passes against it |
| Original work | All code written for this project; no external repository copied | — |
