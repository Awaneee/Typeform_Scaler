import type { Metadata } from "next";
import { WorkspaceView } from "@/components/workspace/workspace-view";

export const metadata: Metadata = { title: "My workspace · Formflow" };

export default function WorkspacePage() {
  return <WorkspaceView />;
}
