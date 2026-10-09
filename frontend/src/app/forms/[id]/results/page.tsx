import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsView } from "@/components/results/results-view";

export const metadata: Metadata = { title: "Results | Typeform Clone" };

export default function ResultsPage({ params }: PageProps<"/forms/[id]/results">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => (
        <ResultsView formId={id} />
      ))}
    </Suspense>
  );
}
