import { Suspense } from "react";
import { LoadingScreen, PublicFormView } from "@/components/respondent/public-form";

// Public, no login. Params are runtime data under Cache Components, so read them inside <Suspense>.
export default function PublicFormPage({ params }: PageProps<"/to/[slug]">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      {params.then(({ slug }) => (
        <PublicFormView slug={slug} />
      ))}
    </Suspense>
  );
}
