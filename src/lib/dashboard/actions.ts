"use server";

import { revalidatePath } from "next/cache";
import {
  ApiError,
  createTemplate,
  deleteDraft,
  deleteTemplate,
  dryRunPrefilter,
  generateTemplate,
  markDraftSent,
  markReplyRead,
  resetPrefilter,
  saveAutoProcess,
  saveInstruction,
  savePrefilter,
  sendDrafts,
  setProcessed,
  startProcessing,
  syncReplies,
  updateDraft,
  updateTemplate,
} from "./server";
import type {
  AutoProcessConfig,
  AutoProcessConfigUpdate,
  GeneratedTemplate,
  PrefilterConfig,
  PrefilterConfigUpdate,
  PrefilterDryRun,
  TargetKind,
  TemplateInput,
} from "./types";

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

/**
 * Record a manual draft as delivered. `POST /drafts/{id}/mark-sent`.
 *
 * One-way: the backend has no unmark route, and this stamps `sent_at` on a row
 * nothing else will ever revisit. Callers are expected to gate it on some
 * evidence the message actually went out — focused send mode arms it only after
 * the source post has been opened — because there is no undo to offer, only an
 * after-the-fact "this is what you just marked".
 *
 * Revalidates the pipeline as well as the drafts board: `PipelineItem` carries
 * `draft_status`, and the processed table renders "sent" from it, so leaving
 * that path stale shows a row as still-to-send after it was marked.
 */
export async function markDraftSentAction(id: string): Promise<ActionResult> {
  try {
    await markDraftSent(id);
    revalidatePath("/dashboard/drafts");
    revalidatePath("/dashboard/pipeline");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Deleted from another tab, or the id never existed. Distinguished so a
      // walkthrough doesn't report a vanished row as a server fault.
      return { ok: false, error: "That draft no longer exists." };
    }
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

/**
 * Generate a template and hand it back for review.
 *
 * Deliberately does not revalidate: nothing was written. The caller drops the
 * result into the editor, and `saveTemplateAction` is what creates the row.
 */
export async function generateTemplateAction(
  brief: string,
): Promise<ActionResult & { template?: GeneratedTemplate }> {
  try {
    const template = await generateTemplate(brief);
    return { ok: true, template };
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      // The agent ran but returned something unusable — worth retrying, and
      // saying so, rather than reporting it as a server fault.
      return { ok: false, error: `${err.message} Try rewording the brief.` };
    }
    if (err instanceof ApiError && err.status === 503) {
      return { ok: false, error: "The drafting agent is not available on the server." };
    }
    return fail(err);
  }
}

// ------------------------------------------------------- special instruction

export async function saveInstructionAction(payload: {
  instruction: string;
  applies_to_drafting: boolean;
}): Promise<ActionResult> {
  try {
    await saveInstruction(payload);
    revalidatePath("/dashboard/configuration");
    // Generation reads it live, but the Templates tab shows whether one is set.
    revalidatePath("/dashboard/templates");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------- keyword prefilter

/**
 * Save actions hand the stored config back.
 *
 * The backend normalises the lists on write, so what it returns is not always
 * byte-for-byte what was sent. The editor reloads from this rather than
 * assuming its own text survived, which is what stops a save from looking like
 * it half-worked.
 */
export type PrefilterResult = ActionResult & { config?: PrefilterConfig };

export async function savePrefilterAction(
  payload: PrefilterConfigUpdate,
): Promise<PrefilterResult> {
  try {
    const config = await savePrefilter(payload);
    revalidatePath("/dashboard/configuration");
    // The prefilter decides which posts ever reach the agent, so the queue on
    // the pipeline tab is a different queue the moment this changes.
    revalidatePath("/dashboard/pipeline");
    return { ok: true, config };
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      return { ok: false, error: `The API rejected the lists: ${err.message}` };
    }
    return fail(err);
  }
}

export async function resetPrefilterAction(): Promise<PrefilterResult> {
  try {
    const config = await resetPrefilter();
    revalidatePath("/dashboard/configuration");
    revalidatePath("/dashboard/pipeline");
    return { ok: true, config };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Grade a candidate keyword list against posts the agent already judged.
 *
 * Deliberately does not revalidate: nothing was written, and this is run
 * repeatedly while tuning the lists. `savePrefilterAction` is what commits.
 */
export async function dryRunPrefilterAction(
  payload: PrefilterConfigUpdate,
): Promise<ActionResult & { report?: PrefilterDryRun }> {
  try {
    const report = await dryRunPrefilter(payload);
    return { ok: true, report };
  } catch (err) {
    return fail(err);
  }
}

// -------------------------------------------------- automatic lead processing

/**
 * Save the schedule, and hand the stored config back.
 *
 * Same reason `savePrefilterAction` returns one: the response carries the
 * observed budget counters, which move on their own. Adopting the returned
 * config is what keeps the meter honest after a save instead of leaving it
 * showing figures measured against the previous cap.
 */
export type AutoProcessResult = ActionResult & { config?: AutoProcessConfig };

export async function saveAutoProcessAction(
  payload: AutoProcessConfigUpdate,
): Promise<AutoProcessResult> {
  try {
    const config = await saveAutoProcess(payload);
    revalidatePath("/dashboard/configuration");
    // The scheduled runs drain the same queue the Pipeline tab shows, and its
    // manual Process control shares this budget — both read differently the
    // moment this changes.
    revalidatePath("/dashboard/pipeline");
    return { ok: true, config };
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      return { ok: false, error: `The API rejected the settings: ${err.message}` };
    }
    return fail(err);
  }
}
