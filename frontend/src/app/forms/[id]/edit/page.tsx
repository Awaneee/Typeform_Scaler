import type { Metadata } from "next";
import { Suspense } from "react";
import { Builder } from "@/components/builder/builder";

export const metadata: Metadata = { title: "Edit form | Typeform Clone" };

// With Cache Components, route params are runtime data: read them inside <Suspense>.
export default function EditFormPage({ params }: PageProps<"/forms/[id]/edit">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => (
        <Builder formId={id} />
      ))}
    </Suspense>
  );
}
