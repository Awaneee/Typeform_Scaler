import type { Metadata } from "next";
import { Suspense } from "react";
import { PreviewFormView } from "@/components/respondent/preview-form";
import { LoadingScreen } from "@/components/respondent/public-form";

export const metadata: Metadata = { title: "Preview · Formflow" };

export default function PreviewPage({ params }: PageProps<"/forms/[id]/preview">) {
  return <Suspense fallback={<LoadingScreen />}>{params.then(({ id }) => <PreviewFormView formId={id} />)}</Suspense>;
}
