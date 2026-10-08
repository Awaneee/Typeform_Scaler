"use client";

import { Monitor, Plus, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ComingSoon } from "@/components/layout/coming-soon";
import { buttonStyles } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { formsApi } from "@/lib/api/forms";
import { cn } from "@/lib/utils";
import { flushSave, hasUnsavedChanges, useBuilder } from "@/store/builder-store";
import { BuilderTopBar, type BuilderTab } from "./builder-top-bar";
import { Canvas, type Device } from "./canvas";
import { DesignPopover } from "./design-popover";
import { LogicEditor } from "./logic-editor";
import { QuestionList } from "./question-list";
import { QuestionPicker } from "./question-picker";
import { SettingsDrawerButton, SettingsPanel } from "./settings-panel";
import { SharePanel, ShareLinkBox } from "./share-panel";

export function Builder({ formId }: { formId: string }) {
  const router = useRouter();
  const loaded = useBuilder((s) => s.loaded && s.formId === formId);
  const hydrate = useBuilder((s) => s.hydrate);
  const applyServerForm = useBuilder((s) => s.applyServerForm);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<BuilderTab>("content");
  const [device, setDevice] = useState<Device>("desktop");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  useEffect(() => {
    formsApi.get(formId).then(hydrate, (e) => setLoadError(e instanceof ApiError ? e.message : "Couldn't load this form."));
  }, [formId, hydrate]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /** Save pending edits before leaving the builder or showing the saved form elsewhere. */
  const withSaved = useCallback(async (next: () => void) => {
    if (await flushSave()) next();
    else toast.error("Your latest changes aren't saved yet. Please try again.");
  }, []);

  async function publish() {
    setPublishing(true);
    try {
      if (!(await flushSave())) {
        toast.error("Couldn't save your latest changes, so the form wasn't published.");
        return;
      }
      const form = await formsApi.publish(formId);
      applyServerForm(form);
      useBuilder.getState().setPublishErrors({});
      setJustPublished(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.fields) {
        const { questions: general, ...perQuestion } = e.fields;
        useBuilder.getState().setPublishErrors(perQuestion);
        const first = Object.keys(perQuestion)[0];
        if (first) {
          useBuilder.getState().select(first);
          setTab(/logic/i.test(perQuestion[first]) ? "workflow" : "content");
        }
        toast.error(general ?? `${e.message} Fix the highlighted questions.`);
      } else {
        toast.error(e instanceof ApiError ? e.message : "Couldn't publish.");
      }
    } finally {
      setPublishing(false);
    }
  }

  async function unpublish() {
    try {
      applyServerForm(await formsApi.unpublish(formId));
      toast.success("Form unpublished. It no longer accepts responses.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't unpublish.");
    }
  }

  function changeTab(next: BuilderTab) {
    if (next === "results") void withSaved(() => router.push(`/forms/${formId}/results`));
    else setTab(next);
  }

  if (loadError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">{loadError}</p>
        <Link href="/workspace" className={buttonStyles()}>
          Back to workspace
        </Link>
      </div>
    );
  }

  if (!loaded) return <BuilderSkeleton />;

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <p className="bg-lavender px-4 py-2 text-center text-xs text-ink md:hidden">
        The builder works best on a larger screen. Your form itself works great on phones.
      </p>
      <BuilderTopBar
        tab={tab}
        onTab={changeTab}
        onBack={() => void withSaved(() => router.push("/workspace"))}
        onPreview={() => void withSaved(() => window.open(`/forms/${formId}/preview`, "_blank"))}
        onPublish={publish}
        publishing={publishing}
      />

      {tab === "content" && (
        <div className="flex min-h-0 flex-1">
          <QuestionList onAdd={() => setPickerOpen(true)} />
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-6">
              <div className="flex items-center gap-2">
                <button onClick={() => setPickerOpen(true)} className={cn(buttonStyles({ size: "sm" }), "h-8")}>
                  <Plus size={15} /> Add content
                </button>
                <DesignPopover />
                <SettingsDrawerButton onOpenLogic={() => setTab("workflow")} />
              </div>
              <div className="flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Preview device">
                {(["desktop", "mobile"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    aria-pressed={device === d}
                    aria-label={`${d} preview`}
                    className={cn("rounded-md p-1.5", device === d ? "bg-selected text-ink" : "text-muted hover:text-ink")}
                  >
                    {d === "desktop" ? <Monitor size={15} /> : <Smartphone size={15} />}
                  </button>
                ))}
              </div>
            </div>
            <Canvas device={device} onAdd={() => setPickerOpen(true)} />
          </main>
          <SettingsPanel onOpenLogic={() => setTab("workflow")} />
        </div>
      )}
      {tab === "share" && <SharePanel publishing={publishing} onPublish={publish} onUnpublish={unpublish} />}
      {tab === "workflow" && <LogicEditor />}
      {tab === "connect" && <ComingSoon title="Integrations" description="Webhooks and app integrations are on the way." />}

      <QuestionPicker open={pickerOpen} onOpenChange={setPickerOpen} />
      <PublishedDialog open={justPublished} onOpenChange={setJustPublished} onShare={() => setTab("share")} />
    </div>
  );
}

function PublishedDialog({ open, onOpenChange, onShare }: { open: boolean; onOpenChange: (o: boolean) => void; onShare: () => void }) {
  const slug = useBuilder((s) => s.slug);
  if (!slug) return null;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Your form is live! 🎉" description="Share this link to start collecting responses." className="max-w-lg">
      <ShareLinkBox slug={slug} />
      <button
        onClick={() => {
          onOpenChange(false);
          onShare();
        }}
        className="mt-4 text-sm font-medium text-teal hover:underline"
      >
        More sharing options
      </button>
    </Modal>
  );
}

function BuilderSkeleton() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true" aria-label="Loading builder">
      <div className="h-14 border-b border-line bg-surface" />
      <div className="flex flex-1">
        <div className="w-[280px] space-y-2 border-r border-line bg-surface p-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
