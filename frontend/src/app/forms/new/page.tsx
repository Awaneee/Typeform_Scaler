import type { Metadata } from "next";
import { NewFormView } from "@/components/workspace/new-form-view";

export const metadata: Metadata = { title: "Create a form | Typeform Clone" };

export default function NewFormPage() {
  return <NewFormView />;
}
