import { NextResponse } from "next/server";
import { ApiError, getScrapeStatus, triggerScrape } from "@/lib/dashboard/server";

/**
 * Narrow proxy so the browser only ever talks to this origin.
 *
 * The lead API binds to loopback on the VPS and has no public hostname; rather
 * than exposing it, the two endpoints the dashboard genuinely needs from the
 * client are forwarded here. Deliberately not a catch-all `[...path]` route —
 * that would be an open proxy to the whole backend.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getScrapeStatus());
  } catch (err) {
    const status = err instanceof ApiError && err.status ? err.status : 502;
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Upstream error" },
      { status },
    );
  }
}

export async function POST() {
  try {
    return NextResponse.json(await triggerScrape(), { status: 202 });
  } catch (err) {
    if (err instanceof ApiError) {
      // 409 means the cron run holds the Redis lock. Pass it through verbatim
      // so the UI can say "already running" instead of "failed".
      return NextResponse.json(
        { detail: err.message },
        { status: err.status || 502 },
      );
    }
    return NextResponse.json({ detail: "Upstream error" }, { status: 502 });
  }
}
