import type { Metadata } from "next";
import { getConfig, getInstruction, getTemplates, safe } from "@/lib/dashboard/server";
import { TemplateManager } from "@/components/dashboard/TemplateManager";
import { ErrorState, PageHeader } from "@/components/dashboard/primitives";

export const metadata: Metadata = { title: "Message templates" };
export const dynamic = "force-dynamic";

/**
 * The outreach pool.
 *
 * The drafting agent is shown every active template on every batch and picks
 * one per lead, so this page is the whole of its stylistic range — adding a
 * template here is how you teach it a new angle.
 */
export default async function TemplatesPage() {
  // The instruction and agent status only decorate the Generate panel, so both
  // are read through `safe` and a failure degrades that panel rather than
  // taking down a page whose actual job is listing templates.
  const [templates, instruction, config] = await Promise.all([
    safe(getTemplates()),
    safe(getInstruction()),
    safe(getConfig()),
  ]);

  if (templates.error) {
    return (
      <>
        <PageHeader title="Message templates" />
        <ErrorState
          title="Can't load templates"
          message={templates.error}
          hint="The dashboard reads the backend over loopback. Check the API and its Postgres/Redis containers."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Message templates"
        description="The pool the drafting agent chooses from. It picks one template per lead using its “when to use”, then fills the placeholders from that lead's own details."
      />
      <TemplateManager
        templates={templates.data?.items ?? []}
        hasInstruction={Boolean(instruction.data?.instruction?.trim())}
        agentAvailable={
          config.data?.checks.find((c) => c.key === "agent")?.ok ?? true
        }
      />
    </>
  );
}
