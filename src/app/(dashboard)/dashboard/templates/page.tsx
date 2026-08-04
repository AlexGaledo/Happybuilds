import type { Metadata } from "next";
import { getTemplates, safe } from "@/lib/dashboard/server";
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
  const templates = await safe(getTemplates());

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
      <TemplateManager templates={templates.data?.items ?? []} />
    </>
  );
}
