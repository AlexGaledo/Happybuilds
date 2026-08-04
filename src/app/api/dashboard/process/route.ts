import { NextResponse } from "next/server";
import { ApiError, getProcessStatus } from "@/lib/dashboard/server";

/**
 * Read-only status poll for the processing batch.
 *
 * A route handler rather than a Server Action because the client polls this on
 * a timer while a batch runs; an action would revalidate the route tree on
 * every tick and re-render the whole page for a progress number.
 *
 * The trigger itself is `processLeadsAction` — this endpoint is GET only.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getProcessStatus());
  } catch (err) {
    const status = err instanceof ApiError && err.status ? err.status : 502;
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Upstream error" },
      { status },
    );
  }
}
