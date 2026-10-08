"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { publicApi } from "@/lib/api/public";
import type { PublicForm } from "@/types/form";
import { FormRunner } from "./form-runner";

/** /to/[slug]: the shareable, no-login form. */
export function PublicFormView({ slug }: { slug: string }) {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [error, setError] = useState<{ title: string; text: string } | null>(null);

  useEffect(() => {
    publicApi.getForm(slug).then(
      (f) => {
        setForm(f);
        document.title = f.title;
      },
      (e) => {
        const closed = e instanceof ApiError && e.extra.reason === "closed";
        setError(
          closed
            ? { title: "This form is closed", text: "It's no longer accepting responses." }
            : e instanceof ApiError && e.status === 404
              ? { title: "Form not found", text: "Check the link and try again." }
              : { title: "Something went wrong", text: "We couldn't load this form. Please refresh the page." },
        );
      },
    );
  }, [slug]);

  if (error) return <StatusScreen title={error.title} text={error.text} />;
  if (!form) return <LoadingScreen />;
  return <FormRunner form={form} mode={{ kind: "live", slug }} />;
}

export function StatusScreen({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-white px-6 text-center">
      <h1 className="text-2xl text-[#191919]">{title}</h1>
      <p className="text-[#5e5e5e]">{text}</p>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex h-dvh items-center justify-center bg-white" aria-busy="true" aria-label="Loading form">
      <div className="h-1 w-40 overflow-hidden rounded-full bg-[#e6ecf7]">
        <div className="h-full w-1/3 animate-[loading_1s_ease-in-out_infinite] rounded-full bg-[#0445AF]" />
      </div>
    </div>
  );
}
