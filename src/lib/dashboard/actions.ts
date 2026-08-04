"use server";

import { revalidatePath } from "next/cache";
import {
  ApiError,
  createTemplate,
  deleteDraft,
  deleteTemplate,
  markDraftSent,
  markReplyRead,
  sendDrafts,
  setProcessed,
  startProcessing,
  syncReplies,
  updateDraft,
  updateTemplate,
} from "./server";
import type { TargetKind, TemplateInput } from "./types";

/**
 * Mutations, as Server Actions.
 *
 * Reads go through `server.ts` during render; writes come back here. Actions
 * rather than a folder of route handlers for the same reason `/api/dashboard/
 * scrape` is narrow rather than a catch-all proxy: each one exposes exactly the
 * operation it names, so the loopback-only backend never gains a general
 * public surface. They also revalidate the page they affect, which a fetch from
 * a client component would have to do by hand.
 *
 * Every action returns `{ ok }` instead of throwing. A thrown error in an
 * action surfaces as an unhandled rejection in the client with no message in
 * production, which is a dead end for the person looking at the screen.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Present on send: partial success is normal, so counts come back too. */
  sent?: number;
  failed?: number;
  detail?: string;
}

function fail(err: unknown): ActionResult {
  if (err instanceof ApiError) return { ok: false, error: err.message };
  return {
    ok: false,
    error: err instanceof Error ? err.message : "Something went wrong",
  };
}

// ------------------------------------------------------------------ pipeline

export async function processLeadsAction(input: {
  targets?: { kind: TargetKind; id: string }[];
  kind?: TargetKind;
  limit?: number;
}): Promise<ActionResult> {
  try {
    await startProcessing(input);
    revalidatePath("/dashboard/pipeline");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { ok: false, error: "A processing batch is already running." };
    }
    return fail(err);
  }
}

export async function setProcessedAction(
  kind: TargetKind,
  id: string,
  processed: boolean,
): Promise<ActionResult> {
  try {
    await setProcessed(kind, id, processed);
    revalidatePath("/dashboard/pipeline");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// -------------------------------------------------------------------- drafts

export async function sendDraftsAction(draftIds: string[]): Promise<ActionResult> {
  if (draftIds.length === 0) return { ok: false, error: "Nothing selected." };
  try {
    const result = (await sendDrafts(draftIds)) as {
      sent: number;
      failed: number;
      results: { error: string | null }[];
    };
    revalidatePath("/dashboard/drafts");
    revalidatePath("/dashboard/pipeline");
    // Partial success is the normal outcome of "send all", so it is reported
    // as a success carrying counts rather than as a failure.
    const firstError = result.results.find((r) => r.error)?.error ?? undefined;
    return {
      ok: result.sent > 0 || result.failed === 0,
      sent: result.sent,
      failed: result.failed,
      error: result.sent === 0 ? (firstError ?? "Nothing was sent.") : undefined,
      detail: result.failed > 0 ? firstError : undefined,
    };
  } catch (err) {
    return fail(err);
  }
}

export async function updateDraftAction(
  id: string,
  patch: { subject?: string; body?: string; recipient_email?: string },
): Promise<ActionResult> {
  try {
    await updateDraft(id, patch);
    revalidatePath("/dashboard/drafts");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function markDraftSentAction(id: string): Promise<ActionResult> {
  try {
    await markDraftSent(id);
    revalidatePath("/dashboard/drafts");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteDraftAction(id: string): Promise<ActionResult> {
  try {
    await deleteDraft(id);
    revalidatePath("/dashboard/drafts");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ------------------------------------------------------------------- replies

export async function syncRepliesAction(): Promise<ActionResult> {
  try {
    const result = await syncReplies();
    revalidatePath("/dashboard/drafts");
    return { ok: true, sent: result.stored, detail: `${result.stored} new` };
  } catch (err) {
    return fail(err);
  }
}

export async function markReplyReadAction(
  id: string,
  read: boolean,
): Promise<ActionResult> {
  try {
    await markReplyRead(id, read);
    revalidatePath("/dashboard/drafts");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ----------------------------------------------------------------- templates

export async function saveTemplateAction(
  id: string | null,
  payload: TemplateInput,
): Promise<ActionResult> {
  try {
    if (id) await updateTemplate(id, payload);
    else await createTemplate(payload);
    revalidatePath("/dashboard/templates");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { ok: false, error: `A template named "${payload.name}" already exists.` };
    }
    return fail(err);
  }
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  try {
    await deleteTemplate(id);
    revalidatePath("/dashboard/templates");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
