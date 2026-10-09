"use client";

import { create } from "zustand";
import { ApiError } from "@/lib/api/client";
import { formsApi } from "@/lib/api/forms";
import { createQuestion, hasOptions, newId } from "@/components/questions/registry";
import type { FormDetail, FormSettings, LogicRule, Question, QuestionSettings, QuestionType } from "@/types/form";

type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";
/** A question id, or "ending" for the thank-you screen. */
type Selection = string | "ending" | null;

interface BuilderState {
  formId: string;
  loaded: boolean;
  title: string;
  settings: FormSettings;
  questions: Question[];
  selected: Selection;
  // Server state
  revision: number;
  status: FormDetail["status"];
  slug: string | null;
  publishedVersion: number | null;
  hasUnpublishedChanges: boolean;
  responseCount: number;
  // Autosave bookkeeping: every edit bumps editVersion; savedVersion is the last one the server has.
  editVersion: number;
  savedVersion: number;
  saveStatus: SaveStatus;
  saveError: string | null;
  /** question id -> problem, from the last failed publish attempt. */
  publishErrors: Record<string, string>;
}

interface BuilderActions {
  hydrate: (form: FormDetail) => void;
  applyServerForm: (form: FormDetail) => void;
  select: (selection: Selection) => void;
  setTitle: (title: string) => void;
  updateSettings: (patch: Partial<FormSettings>) => void;
  addQuestion: (type: QuestionType) => void;
  updateQuestion: (id: string, patch: Partial<Omit<Question, "id" | "settings">>) => void;
  updateQuestionSettings: (id: string, patch: Partial<QuestionSettings>) => void;
  changeQuestionType: (id: string, type: QuestionType) => void;
  duplicateQuestion: (id: string) => void;
  deleteQuestion: (id: string) => void;
  moveQuestion: (fromIndex: number, toIndex: number) => void;
  addOption: (questionId: string) => string;
  updateOption: (questionId: string, optionId: string, label: string) => void;
  removeOption: (questionId: string, optionId: string) => void;
  setPublishErrors: (errors: Record<string, string>) => void;
  setLogic: (questionId: string, logic: LogicRule[]) => void;
}

type BuilderStore = BuilderState & BuilderActions;

const DEFAULT_SETTINGS: FormSettings = {
  theme: "pearl",
  welcome: { enabled: false, title: "", description: "", button_text: "Start" },
  thank_you: {
    title: "Thanks for completing this typeform",
    description: "Now create your own — it's free, easy & beautiful",
    button_text: "Create a typeform",
  },
};

export const useBuilder = create<BuilderStore>()((set, get) => {
  /** Every content change goes through here: apply it, mark dirty, schedule a save. */
  function edit(updater: (s: BuilderState) => Partial<BuilderState>) {
    set((s) => ({
      ...updater(s),
      editVersion: s.editVersion + 1,
      saveStatus: s.saveStatus === "conflict" ? "conflict" : "unsaved",
    }));
    scheduleSave();
  }

  function mapQuestion(id: string, fn: (q: Question) => Question) {
    edit((s) => {
      // Editing a question clears its "can't publish" marker.
      const publishErrors = { ...s.publishErrors };
      delete publishErrors[id];
      return { questions: s.questions.map((q) => (q.id === id ? fn(q) : q)), publishErrors };
    });
  }

  return {
    formId: "",
    loaded: false,
    title: "",
    settings: DEFAULT_SETTINGS,
    questions: [],
    selected: null,
    revision: 0,
    status: "draft",
    slug: null,
    publishedVersion: null,
    hasUnpublishedChanges: false,
    responseCount: 0,
    editVersion: 0,
    savedVersion: 0,
    saveStatus: "saved",
    saveError: null,
    publishErrors: {},

    hydrate: (form) => {
      resetAutosave();
      set({
        formId: form.id,
        loaded: true,
        title: form.title,
        settings: form.settings,
        questions: form.questions,
        selected: form.questions[0]?.id ?? null,
        editVersion: 0,
        savedVersion: 0,
        saveStatus: "saved",
        saveError: null,
        publishErrors: {},
      });
      get().applyServerForm(form);
    },

    applyServerForm: (form) =>
      set({
        revision: form.revision,
        status: form.status,
        slug: form.slug,
        publishedVersion: form.published_version_number,
        hasUnpublishedChanges: form.has_unpublished_changes,
        responseCount: form.response_count,
      }),

    select: (selected) => set({ selected }),

    setTitle: (title) => edit(() => ({ title })),

    updateSettings: (patch) => edit((s) => ({ settings: { ...s.settings, ...patch } })),

    addQuestion: (type) => {
      const question = createQuestion(type);
      edit((s) => {
        // Insert after the selected question (Typeform behaviour), else at the end.
        const index = s.questions.findIndex((q) => q.id === s.selected);
        const at = index === -1 ? s.questions.length : index + 1;
        return { questions: [...s.questions.slice(0, at), question, ...s.questions.slice(at)], selected: question.id };
      });
    },

    updateQuestion: (id, patch) => mapQuestion(id, (q) => ({ ...q, ...patch })),

    updateQuestionSettings: (id, patch) => mapQuestion(id, (q) => ({ ...q, settings: { ...q.settings, ...patch } })),

    changeQuestionType: (id, type) =>
      mapQuestion(id, (q) => {
        const fresh = createQuestion(type);
        return {
          ...fresh,
          id: q.id,
          title: q.title,
          description: q.description,
          required: q.required,
          // Keep existing choices when switching between choice types.
          options: hasOptions(type) && q.options.length ? q.options : fresh.options,
        };
      }),

    duplicateQuestion: (id) => {
      const source = get().questions.find((q) => q.id === id);
      if (!source) return;
      const optionIds = new Map(source.options.map((o) => [o.id, newId()]));
      const copy: Question = {
        ...structuredClone(source),
        id: newId(),
        options: source.options.map((o) => ({ ...o, id: optionIds.get(o.id)! })),
        logic: source.logic.map((r) => ({ ...r, value: optionIds.get(r.value as string) ?? r.value })),
      };
      edit((s) => {
        const at = s.questions.findIndex((q) => q.id === id) + 1;
        return { questions: [...s.questions.slice(0, at), copy, ...s.questions.slice(at)], selected: copy.id };
      });
    },

    deleteQuestion: (id) =>
      edit((s) => {
        const index = s.questions.findIndex((q) => q.id === id);
        const questions = s.questions
          .filter((q) => q.id !== id)
          .map((q) => (q.logic.some((r) => r.goto === id) ? { ...q, logic: q.logic.filter((r) => r.goto !== id) } : q));
        const neighbour = questions[Math.min(index, questions.length - 1)];
        return { questions, selected: s.selected === id ? (neighbour?.id ?? null) : s.selected };
      }),

    moveQuestion: (from, to) =>
      edit((s) => {
        const questions = [...s.questions];
        const [moved] = questions.splice(from, 1);
        questions.splice(to, 0, moved);
        return { questions };
      }),

    addOption: (questionId) => {
      const id = newId();
      mapQuestion(questionId, (q) => ({ ...q, options: [...q.options, { id, label: "" }] }));
      return id;
    },

    updateOption: (questionId, optionId, label) =>
      mapQuestion(questionId, (q) => ({
        ...q,
        options: q.options.map((o) => (o.id === optionId ? { ...o, label } : o)),
      })),

    removeOption: (questionId, optionId) =>
      mapQuestion(questionId, (q) => ({
        ...q,
        options: q.options.filter((o) => o.id !== optionId),
        logic: q.logic.filter((r) => r.value !== optionId),
      })),

    setPublishErrors: (publishErrors) => set({ publishErrors }),

    setLogic: (questionId, logic) => mapQuestion(questionId, (q) => ({ ...q, logic })),
  };
});

// ---------------------------------------------------------------------------
// Autosave
//
// Edits update the store instantly. A save is sent 800ms after the last edit,
// with at most ONE request in flight: edits made while saving are picked up by
// a follow-up save when it finishes. Each save sends the whole draft plus the
// revision the server last gave us; a 409 means the form changed elsewhere, so
// we stop saving rather than overwrite it. Requests can therefore never be
// applied out of order.
// ---------------------------------------------------------------------------

const SAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 4000;
let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<void> | null = null;

function resetAutosave() {
  clearTimeout(timer);
  inFlight = null;
}

function scheduleSave(delay = SAVE_DELAY_MS) {
  clearTimeout(timer);
  timer = setTimeout(() => void runSave(), delay);
}

const isDirty = () => {
  const s = useBuilder.getState();
  return s.editVersion !== s.savedVersion;
};

async function runSave(): Promise<void> {
  clearTimeout(timer);
  if (inFlight) return inFlight; // the running save re-checks for newer edits when it ends
  const s = useBuilder.getState();
  if (!s.loaded || !isDirty() || s.saveStatus === "conflict") return;

  const version = s.editVersion;
  useBuilder.setState({ saveStatus: "saving" });
  let retry = false;

  inFlight = (async () => {
    try {
      const res = await formsApi.saveDraft(s.formId, {
        revision: s.revision,
        title: s.title.trim() || "Untitled form",
        settings: s.settings,
        questions: s.questions,
      });
      useBuilder.setState({
        revision: res.revision,
        savedVersion: version,
        hasUnpublishedChanges: res.has_unpublished_changes,
        saveError: null,
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        useBuilder.setState({ saveStatus: "conflict", saveError: e.message });
      } else {
        retry = !(e instanceof ApiError && e.status === 422);
        useBuilder.setState({ saveStatus: "error", saveError: e instanceof ApiError ? e.message : "Couldn't save." });
      }
    } finally {
      inFlight = null;
    }
  })();
  await inFlight;

  const after = useBuilder.getState();
  if (after.saveStatus === "conflict") return;
  if (after.saveStatus === "error") {
    if (retry) scheduleSave(RETRY_DELAY_MS);
    return;
  }
  if (isDirty()) return runSave(); // more edits arrived while we were saving
  useBuilder.setState({ saveStatus: "saved" });
}

/** Save any pending edits now. Resolves true when the server has everything. */
export async function flushSave(): Promise<boolean> {
  clearTimeout(timer);
  if (useBuilder.getState().saveStatus === "error") useBuilder.setState({ saveStatus: "unsaved" });
  await runSave();
  while (inFlight) await inFlight;
  return !isDirty() && useBuilder.getState().saveStatus === "saved";
}

export const hasUnsavedChanges = isDirty;
