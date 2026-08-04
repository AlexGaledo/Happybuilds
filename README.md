# Fickles — website + lead dashboard

Next.js 16 (App Router, Turbopack), React 19, Tailwind v4. Two surfaces in one
app, split by route group:

- `src/app/(marketing)` — the public site. Navbar, footer, Lenis smooth scroll.
- `src/app/(dashboard)` — the internal lead console at `/dashboard`. Its own
  chrome, and deliberately no smooth scrolling: it fights the sticky table
  header and adds latency to a screen that should feel instant.

The root layout holds only the document shell (fonts, metadata, base colours),
which is what lets the two groups differ.

## Running it

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build && pnpm start
pnpm lint
pnpm test:e2e       # Playwright, see below
```

Copy `.env.example` to `.env.local`:

| Variable | Who reads it |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | the browser — public contact form only |
| `API_INTERNAL_URL` | the **server** — every dashboard read |

`API_INTERNAL_URL` must not be `NEXT_PUBLIC_*`; that would ship the internal
address in the client bundle. On the VPS the lead API binds to loopback, so the
Next server reaches it directly — no public `api.` hostname and no CORS. Locally,
tunnel it:

```bash
ssh -N -L 8000:127.0.0.1:8000 crm-agency
```

## Dashboard design notes

**Filter state lives in the URL.** `src/lib/dashboard/filters.ts` is the only
place the query string is parsed and re-serialised, and it clamps out-of-range
values rather than forwarding them for the API to reject. Because state is in
the URL, the table can be a server component, every view is shareable, and back
/ reload restore exactly what you were looking at.

**Links in repeated rows set `prefetch={false}`.** `/dashboard/leads` is
`force-dynamic`, so each prefetch is a full server render plus two API calls.
With a link per row, Next queued ~50 of them on load and the navigation the user
actually asked for sat behind the lot.

**Below `md` the table becomes cards.** The table needs ~44rem before columns
collide; on a phone it would be a horizontal scroller showing one truncated
column. Cards use a different `data-testid` so the two never double-count.

**`client` and `email` start empty on every scraped row.** onlinejobs.ph hides
employer identity and contact details from anonymous visitors — see
`../fickles-automated-lead/docs/scraping-notes.md`. The Leads table says so
rather than leaving cells mysteriously blank. The processing agent recovers an
address when the post's own text contains one; the rest stay empty, which is
what routes their drafts to the send-by-hand column.

**Pipeline, Drafts and Templates are the outreach half.** `/dashboard/pipeline`
shows the unprocessed queue and the processed table side by side — side by side
rather than as tabs because the point is watching work move left to right.
`/dashboard/drafts` has three columns: replies received, drafts with an address
to send to, and drafts with none (those carry a link to the original post).
`/dashboard/templates` is the pool the drafting agent picks from. Backend detail
lives in `../fickles-automated-lead/docs/processing.md`.

**Reads go through `server.ts`, writes through `actions.ts`.** Server Actions
rather than a folder of route handlers, for the same reason
`/api/dashboard/scrape` is narrow rather than a catch-all proxy: each one
exposes exactly the operation it names, so the loopback-only backend never gains
a general public surface. `/api/dashboard/process` is the one exception — a GET
route handler, because the client polls it on a timer while a batch runs and an
action would revalidate the whole route tree on every tick.

**Selection is React state, not URL state.** Everything else on these pages is
URL-driven and shareable; a selection is momentary and per-person. A shared link
arriving with twelve rows pre-ticked next to a Send button is a trap.

**Touch sizing keys off `pointer-fine:`, not `sm:`.** A landscape phone is
812px wide, so any target sized by a width breakpoint silently reverts to
desktop density on a device still being operated with a thumb — which is
exactly what the first pass got wrong. Controls are 44px by default and only
shrink where `(pointer: fine)` matches. Checkboxes stay 16px visually and get
their target from a padded label with a negative margin, so the hit area costs
no layout space.

**Dense tables become cards below `md`.** Both the leads table and the pipeline
queue need ~30–44rem before columns collide; on a phone that is a horizontal
scroller showing one truncated column. The card list uses a different
`data-testid` from the table so the two renderings never double-count.

**`e2e/mobile.spec.ts` guards both.** It asserts no horizontal overflow and no
sub-44px targets across every dashboard route, in portrait and landscape, and
first asserts the emulated device actually reports a coarse pointer — without
that check the suite would pass by applying the compact desktop sizing.

**Outreach and the AI assistant are locked.** Their previews are `aria-hidden`,
`inert` and `pointer-events-none`, so nothing behind the veil is clickable,
focusable, or reachable by a screen reader — a blur alone would leave a keyboard
user tabbing through dead controls.

## End-to-end tests

`e2e/` runs Playwright against a real production build talking to a **real lead
API** — no mocked routes, no fixtures. Each assertion compares the rendered page
against a direct call to the same endpoint, so a filter that silently fails to
reach the backend fails the test instead of quietly returning everything. A
suite built on stubs would keep passing after the API contract changed.

```bash
ssh -N -L 8000:127.0.0.1:8000 crm-agency     # in another terminal
pnpm test:e2e
pnpm test:e2e -- --grep-invert "@screenshot" # skip the reference captures
```

The suite is read-only. Nothing in it triggers a scrape or mutates a row.
