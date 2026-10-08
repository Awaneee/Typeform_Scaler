"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CircleCheckBig, Copy, Ellipsis, GripVertical, Plus, Trash2 } from "lucide-react";
import { QuestionTypeBadge } from "@/components/questions/question-icon";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/store/builder-store";
import type { Question } from "@/types/form";

export function QuestionList({ onAdd }: { onAdd: () => void }) {
  const questions = useBuilder((s) => s.questions);
  const selected = useBuilder((s) => s.selected);
  const select = useBuilder((s) => s.select);
  const moveQuestion = useBuilder((s) => s.moveQuestion);
  const thankYouTitle = useBuilder((s) => s.settings.thank_you.title);

  const sensors = useSensors(
    // A small distance threshold keeps plain clicks working as "select".
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = questions.findIndex((q) => q.id === active.id);
    const to = questions.findIndex((q) => q.id === over.id);
    if (from !== -1 && to !== -1) moveQuestion(from, to);
  }

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-semibold">Questions</span>
        <button
          onClick={onAdd}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-selected hover:bg-hover-strong"
          aria-label="Add content"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {questions.length === 0 ? (
          <button
            onClick={onAdd}
            className="mx-2 mt-2 w-[calc(100%-16px)] rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted hover:bg-bg"
          >
            Add your first question
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-1" aria-label="Questions">
                {questions.map((q, i) => (
                  <SortableQuestion key={q.id} question={q} index={i} selected={selected === q.id} onSelect={() => select(q.id)} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="border-t border-line px-2 py-3">
        <p className="px-2 pb-1.5 text-xs font-semibold text-muted">Endings</p>
        <button
          onClick={() => select("ending")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm",
            selected === "ending" ? "bg-selected" : "hover:bg-bg",
          )}
        >
          <span className="inline-flex h-6 items-center rounded-md bg-selected px-1.5 text-muted">
            <CircleCheckBig size={14} />
          </span>
          <span className="truncate">{thankYouTitle || "Thank you screen"}</span>
        </button>
      </div>
    </aside>
  );
}

interface SortableQuestionProps {
  question: Question;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

function SortableQuestion({ question, index, selected, onSelect }: SortableQuestionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const duplicate = useBuilder((s) => s.duplicateQuestion);
  const remove = useBuilder((s) => s.deleteQuestion);
  const error = useBuilder((s) => s.publishErrors[question.id]);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group relative", isDragging && "z-10")}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={onSelect}
        aria-label={`Question ${index + 1}: ${question.title || "untitled"}`}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-lg py-2 pr-9 pl-2 text-sm outline-none select-none",
          "focus-visible:ring-2 focus-visible:ring-plum",
          selected ? "bg-selected" : "hover:bg-bg",
          isDragging && "bg-surface shadow-lg ring-1 ring-line",
        )}
      >
        <GripVertical size={14} className="-ml-1 shrink-0 text-muted/0 group-hover:text-muted" aria-hidden />
        <QuestionTypeBadge type={question.type} number={index + 1} />
        <span className={cn("min-w-0 flex-1 truncate", !question.title && "text-muted")}>{question.title || "..."}</span>
        {error && <span className="h-2 w-2 shrink-0 rounded-full bg-danger" title={error} />}
      </div>
      <Menu>
        <MenuTrigger
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-muted opacity-0 group-hover:opacity-100 hover:bg-hover-strong focus-visible:opacity-100 data-[state=open]:opacity-100"
          aria-label={`Question ${index + 1} actions`}
        >
          <Ellipsis size={16} />
        </MenuTrigger>
        <MenuContent>
          <MenuItem icon={<Copy size={15} />} onSelect={() => duplicate(question.id)}>
            Duplicate
          </MenuItem>
          <MenuItem icon={<Trash2 size={15} />} destructive onSelect={() => remove(question.id)}>
            Delete
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  );
}
