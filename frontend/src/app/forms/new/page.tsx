import type { Metadata } from "next";
import { NewFormView } from "@/components/workspace/new-form-view";

export const metadata: Metadata = { title: "Create a form · Formflow" };

export default function NewFormPage() {
  return <NewFormView />;
}
