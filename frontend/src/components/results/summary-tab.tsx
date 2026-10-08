"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { QuestionTypeBadge } from "@/components/questions/question-icon";
import { QUESTION_REGISTRY } from "@/components/questions/registry";
import type { QuestionType } from "@/types/form";
import type { FormAnalytics, QuestionAnalytics } from "@/types/results";

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

const formatDuration = (seconds: number | null) => {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return m ? `${m}:${String(sec).padStart(2, "0")}` : `0:${String(sec).padStart(2, "0")}`;
};

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-line pb-6">
      <h1 className="text-2xl">{title}</h1>
      <p className="mt-1 text-muted">{subtitle}</p>
    </div>
  );
}

/** "Form performance": at-a-glance numbers and responses over time. */
export function PerformanceTab({ data }: { data: FormAnalytics }) {
  return (
    <div className="space-y-6">
      <PageHeading title="Form performance" subtitle="Key metrics that show how your form is doing." />
      <h2 className="text-xl">At a glance</h2>
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5" aria-label="Overview">
        <Stat label="Views" value={data.views} />
        <Stat label="Starts" value={data.starts} />
        <Stat label="Submissions" value={data.submissions} />
        <Stat label="Completion rate" value={data.completion_rate === null ? "—" : `${data.completion_rate}%`} />
        <Stat label="Time to complete" value={formatDuration(data.avg_completion_seconds)} />
      </section>

      <section className="rounded-xl bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">Responses over the last 14 days</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily} margin={{ left: -20, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--tf-teal)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--tf-teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--tf-border)" />
              <XAxis dataKey="date" tickFormatter={(d: string) => shortDate.format(new Date(d))} tick={{ fontSize: 12, fill: "var(--tf-muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--tf-muted)" }} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={(d) => shortDate.format(new Date(String(d)))}
                formatter={(v) => [v, "Responses"]}
                contentStyle={{ borderRadius: 8, border: "1px solid var(--tf-border)", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="count" stroke="var(--tf-teal)" strokeWidth={2} fill="url(#fill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

/** "Response summary": one card per question. */
export function SummaryTab({ data }: { data: FormAnalytics }) {
  return (
    <div className="space-y-6">
      <PageHeading title="Response summary" subtitle="A breakdown of form responses and key takeaways for each question." />
      {data.questions.length === 0 ? (
        <div className="rounded-xl bg-surface p-16 text-center">
          <p className="text-2xl">Waiting for responses</p>
          <p className="mt-2 text-muted">Your data will appear here.</p>
        </div>
      ) : (
        data.questions.map((q, i) => <QuestionSummary key={q.question_id} q={q} number={i + 1} />)
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex h-28 flex-col justify-between rounded-xl bg-surface p-3">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-3xl tabular-nums">{value}</p>
    </div>
  );
}

function QuestionSummary({ q, number }: { q: QuestionAnalytics; number: number }) {
  const type = q.type as QuestionType;
  const color = QUESTION_REGISTRY[type]?.fg ?? "var(--tf-plum)";
  const total = q.answered + q.skipped;

  return (
    <section className="rounded-xl bg-surface p-6">
      <div className="flex items-start gap-3">
        <QuestionTypeBadge type={type} number={number} />
        <div className="min-w-0">
          <h3 className="text-xl">
            {q.title || "Untitled question"}
            {q.removed && <span className="ml-2 rounded bg-selected px-1.5 py-0.5 text-[11px] font-medium text-muted">Removed from form</span>}
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            {q.answered} out of {total} {total === 1 ? "person" : "people"} answered this question
          </p>
        </div>
      </div>

      <div className="mt-5">
        {q.kind === "choices" && q.choices && <ChoiceBars choices={q.choices} color={color} />}
        {q.kind === "rating" && q.choices && (
          <div className="space-y-4">
            <p className="text-3xl font-semibold tabular-nums">
              {q.average ?? "–"}
              <span className="ml-1 text-sm font-normal text-muted">average rating</span>
            </p>
            <ChoiceBars choices={[...q.choices].reverse().map((c) => ({ ...c, label: `${c.label} ★` }))} color={color} />
          </div>
        )}
        {q.kind === "number" && (
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["Average", q.average],
                ["Lowest", q.minimum],
                ["Highest", q.maximum],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-bg px-4 py-3">
                <p className="text-xs text-muted">{label}</p>
                <p className="text-xl font-semibold tabular-nums">{value ?? "–"}</p>
              </div>
            ))}
          </div>
        )}
        {q.kind === "text" &&
          (q.recent?.length ? (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {q.recent.map((text, i) => (
                <li key={i} className="px-4 py-2.5 text-sm whitespace-pre-line">
                  {text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No answers yet.</p>
          ))}
      </div>
    </section>
  );
}

function ChoiceBars({ choices, color }: { choices: { label: string; count: number; percent: number }[]; color: string }) {
  return (
    <ul className="space-y-2.5">
      {choices.map((c) => (
        <li key={c.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 text-sm">
          <span className="truncate">{c.label}</span>
          <span className="text-right text-muted tabular-nums">
            {c.percent}% <span className="text-xs">({c.count})</span>
          </span>
          <div className="col-span-2 h-2.5 overflow-hidden rounded-full bg-selected">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${c.percent}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
