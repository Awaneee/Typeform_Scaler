"use client";

import { Dialog } from "radix-ui";
import { ChevronDown, GitBranch, ImagePlus, Plus, SlidersHorizontal, X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { toast } from "sonner";
import { QuestionTypeBadge } from "@/components/questions/question-icon";
import { LOGIC_OPS, QUESTION_REGISTRY } from "@/components/questions/registry";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { useBuilder } from "@/store/builder-store";
import { QUESTION_TYPES, type Question } from "@/types/form";

/** Right-hand panel on desktop. */
export function SettingsPanel({ onOpenLogic }: { onOpenLogic: () => void }) {
  return (
    <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-line bg-surface lg:block" aria-label="Question settings">
      <SettingsContent onOpenLogic={onOpenLogic} />
    </aside>
  );
}

/** Below the lg breakpoint the same settings open in a side drawer. */
export function SettingsDrawerButton({ onOpenLogic }: { onOpenLogic: () => void }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm hover:bg-selected lg:hidden">
        <SlidersHorizontal size={15} /> Settings
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 w-[320px] max-w-[90vw] overflow-y-auto bg-surface shadow-2xl outline-none data-[state=open]:animate-[slide-in_200ms_ease-out]"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <Dialog.Title className="text-sm font-semibold">Settings</Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-muted hover:bg-selected hover:text-ink" aria-label="Close settings">
              <X size={16} />
            </Dialog.Close>
          </div>
          <SettingsContent onOpenLogic={onOpenLogic} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SettingsContent({ onOpenLogic }: { onOpenLogic: () => void }) {
  const selected = useBuilder((s) => s.selected);
  const question = useBuilder((s) => s.questions.find((q) => q.id === s.selected));
  if (selected === "ending") return <EndingSettings />;
  return question ? <QuestionSettings key={question.id} question={question} onOpenLogic={onOpenLogic} /> : null;
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-line px-5 py-4">
      {title && <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</h3>}
      {children}
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const fieldClass =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-plum focus:ring-1 focus:ring-plum";

/** Optional number setting: a toggle that reveals an input. */
function OptionalNumber({
  label, value, onChange, min, placeholder,
}: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; min?: number; placeholder: string }) {
  return (
    <div className="space-y-2">
      <ToggleRow label={label} checked={value !== undefined} onChange={(on) => onChange(on ? (min ?? 0) : undefined)} />
      {value !== undefined && (
        <input
          type="number"
          value={value}
          min={min}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={fieldClass}
        />
      )}
    </div>
  );
}

function QuestionSettings({ question, onOpenLogic }: { question: Question; onOpenLogic: () => void }) {
  const updateQuestion = useBuilder((s) => s.updateQuestion);
  const updateSettings = useBuilder((s) => s.updateQuestionSettings);
  const changeType = useBuilder((s) => s.changeQuestionType);
  const s = question.settings;
  const set = (patch: Partial<Question["settings"]>) => updateSettings(question.id, patch);
  const meta = QUESTION_REGISTRY[question.type];

  return (
    <>
      <Section>
        <Menu>
          <MenuTrigger className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line px-3 text-sm hover:bg-bg">
            <QuestionTypeBadge type={question.type} />
            <span className="flex-1 text-left font-medium">{meta.label}</span>
            <ChevronDown size={16} className="text-muted" />
          </MenuTrigger>
          <MenuContent align="start" className="w-[260px]">
            {QUESTION_TYPES.map((type) => (
              <MenuItem key={type} onSelect={() => type !== question.type && changeType(question.id, type)}>
                <QuestionTypeBadge type={type} />
                {QUESTION_REGISTRY[type].label}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      </Section>

      <Section title="Settings">
        <ToggleRow label="Required" checked={question.required} onChange={(required) => updateQuestion(question.id, { required })} />

        {(question.type === "short_text" || question.type === "long_text") && (
          <OptionalNumber
            label="Max characters"
            value={s.max_length}
            min={1}
            placeholder="e.g. 250"
            onChange={(max_length) => set({ max_length: max_length && max_length > 0 ? max_length : undefined })}
          />
        )}

        {question.type === "number" && (
          <>
            <OptionalNumber label="Min number" value={s.min} placeholder="0" onChange={(min) => set({ min })} />
            <OptionalNumber label="Max number" value={s.max} placeholder="100" onChange={(max) => set({ max })} />
            {s.min !== undefined && s.max !== undefined && s.min > s.max && (
              <p className="text-xs text-danger">Min must be less than or equal to max.</p>
            )}
          </>
        )}

        {question.type === "multiple_choice" && (
          <ToggleRow label="Multiple selection" checked={!!s.allow_multiple} onChange={(allow_multiple) => set({ allow_multiple })} />
        )}

        {question.type === "file_upload" && (
          <label className="flex items-center justify-between gap-3 text-sm">
            Max file size
            <select
              value={s.max_size_mb ?? 10}
              onChange={(e) => set({ max_size_mb: Number(e.target.value) })}
              className="h-9 rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-plum"
            >
              {[1, 2, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n} MB
                </option>
              ))}
            </select>
          </label>
        )}

        {question.type === "rating" && (
          <label className="flex items-center justify-between gap-3 text-sm">
            Steps
            <select
              value={s.steps ?? 5}
              onChange={(e) => set({ steps: Number(e.target.value) })}
              className="h-9 rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-plum"
            >
              {Array.from({ length: 8 }, (_, i) => i + 3).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {["short_text", "long_text", "email", "number", "dropdown"].includes(question.type) && (
          <label className="block space-y-1.5 text-sm">
            <span>Placeholder text</span>
            <input
              value={s.placeholder ?? ""}
              onChange={(e) => set({ placeholder: e.target.value || undefined })}
              maxLength={200}
              placeholder="Type your answer here..."
              className={fieldClass}
            />
          </label>
        )}
      </Section>

      {question.type === "dropdown" && <DropdownOptions question={question} />}

      <Section title="Media">
        <button
          onClick={() => toast("Images and videos are coming soon")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line py-3 text-sm text-muted hover:bg-bg"
        >
          <ImagePlus size={16} /> Add image or video
        </button>
      </Section>

      <Section title="Logic">
        {LOGIC_OPS[question.type] ? (
          <button onClick={onOpenLogic} className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-sm hover:text-teal">
            <GitBranch size={16} />
            {question.logic.length ? `${question.logic.length} logic jump${question.logic.length > 1 ? "s" : ""}` : "Add logic jump"}
            <span className="ml-auto text-xs text-muted">Workflow →</span>
          </button>
        ) : (
          <p className="text-xs text-muted">Logic jumps work with choice, yes/no, rating and number questions.</p>
        )}
      </Section>
    </>
  );
}

function DropdownOptions({ question }: { question: Question }) {
  const addOption = useBuilder((s) => s.addOption);
  const updateOption = useBuilder((s) => s.updateOption);
  const removeOption = useBuilder((s) => s.removeOption);

  return (
    <Section title="Choices">
      <ul className="space-y-1.5">
        {question.options.map((o, i) => (
          <li key={o.id} className="flex items-center gap-1.5">
            <input
              value={o.label}
              onChange={(e) => updateOption(question.id, o.id, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOption(question.id)}
              placeholder={`Option ${i + 1}`}
              aria-label={`Option ${i + 1}`}
              className={fieldClass}
            />
            <button
              onClick={() => removeOption(question.id, o.id)}
              disabled={question.options.length <= 1}
              className="rounded p-1.5 text-muted hover:bg-selected hover:text-ink disabled:opacity-30"
              aria-label={`Remove option ${i + 1}`}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => addOption(question.id)} className="flex items-center gap-1 text-sm font-medium text-teal hover:underline">
        <Plus size={14} /> Add option
      </button>
    </Section>
  );
}

function EndingSettings() {
  const thankYou = useBuilder((s) => s.settings.thank_you);
  const updateSettings = useBuilder((s) => s.updateSettings);

  return (
    <>
      <Section>
        <p className="text-sm font-semibold">Thank you screen</p>
        <p className="text-xs text-muted">Shown after a respondent submits. Edit the text right on the canvas.</p>
      </Section>
      <Section title="Button">
        <label className="block space-y-1.5 text-sm">
          <span>Button text</span>
          <input
            value={thankYou.button_text}
            maxLength={60}
            onChange={(e) => updateSettings({ thank_you: { ...thankYou, button_text: e.target.value } })}
            className={fieldClass}
          />
        </label>
      </Section>
    </>
  );
}
