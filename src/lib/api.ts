/**
 * Thin client for the Happy Builds lead backend (happybuilds-automated-lead).
 * The frontend ONLY talks to these endpoints — it never touches Supabase directly.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface LeadPayload {
  name: string;
  email: string;
  company?: string;
  service?: string;
  budget?: string;
  message: string;
}

export interface Lead extends LeadPayload {
  id: string;
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  created_at: string;
}

export interface LeadCreatedResponse {
  success: boolean;
  lead: Lead;
}

/** Submit a contact-form lead to the backend. Throws on non-2xx. */
export async function createLead(
  payload: LeadPayload,
): Promise<LeadCreatedResponse> {
  const res = await fetch(`${API_BASE_URL}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = JSON.stringify(data.detail);
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }

  return res.json();
}
