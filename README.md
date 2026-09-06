# Coreframe Admin

Private admin system for Coreframe Digital. Phase 1: enquiries from
coreframedigital.co.uk stop living in Formspree and start living in a database
Charlie owns, on the same pattern already proven for Floor Fitter Wales.

Brief: `Business/04-Operations/brief-coreframe-admin-enquiries.md`
Design: `Business/02-Strategy/coreframe-admin-system-design.md`
Shell it copies: `../floor-fitter-wales-admin`

The previous contents of this repo, a manual-entry KPI dashboard, are preserved
on the `archive/kpi-dashboard` branch.

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind v4 · shadcn/ui
(`base-nova`, on `@base-ui/react`) · Supabase (Postgres, Auth, RLS) · Vercel.

Three things about this stack that will bite you if you assume otherwise:

- **`proxy.ts`, not `middleware.ts`.** Next 16 renamed it and the rename is
  silent. A file called `middleware.ts` simply never runs. `next build` prints
  `Proxy (Middleware)` when it is wired correctly.
- **`Button` has no `asChild`.** `base-nova` wraps `@base-ui/react`, not Radix,
  so there is no `Slot`. For a link styled as a button use `buttonVariants()`
  on `next/link`.
- **Buttons, inputs and selects are overridden to `h-11`.** Kept for
  consistency with the Floor Fitter Wales codebase. The components in
  `src/components/ui` were copied from there by hand, not generated. Do not
  run `shadcn add` over them without checking the `h-11` overrides survived.

## Routes

| Route | Purpose |
|---|---|
| `/` | Today. Enquiries at `new`, newest first, flagged after 24 hours |
| `/enquiries` | Full list, filterable by status |
| `/enquiries/[id]` | Everything submitted, call and email, status change |
| `/clients` | Care plan clients, allowance left, add a client |
| `/clients/[id]` | Plan, allowance ledger, change requests, edit |
| `/quotes/[id]` | Build, send, and decide a quote; branded PDF in a private bucket |
| `/kit` | Reply wording, document shelf, payment links, review ask, price list, quote wording |
| `/todo` | A short to-do list; dated items surface on Today when due |
| `/login` | Email and password, one user, no sign-up |
| `/api/enquiries` | Intake from the website, shared secret |
| `/api/webhooks/stripe` | Plan status, renewals and monthly allowance credits |

Eleven routes. The client-facing half of the client dashboard design is parked
until the second care plan is sold. Resist adding anything else here.

## Getting it running

```bash
cp .env.example .env.local   # then fill it in - see the file's comments
npm install
npm run dev
```

Supabase project: "coreframe admin", in Charlie's org. Migrations live in
`supabase/migrations` and were applied through the Supabase MCP with the same
names, so the project's migration history matches the files. Every schema
change is a checked-in migration. Never a change made only in the dashboard.

Charlie's account is created once in the Supabase dashboard
(Authentication > Users > Add user, with a password). There is deliberately no
sign-up route.

## Security model

Three gates, in this order:

1. **`src/proxy.ts`** refreshes the session cookie and bounces logged-out
   visitors. Optimistic only. Not the authorisation boundary.
2. **`src/lib/dal.ts`** `requireUser()` verifies the token with Supabase on
   every server component and server action that touches data.
3. **RLS.** `anon` can read and write nothing; `authenticated` has full access.
   With one account those are the same set.

`SUPABASE_SERVICE_ROLE_KEY` bypasses all of that and is used on exactly two
paths, neither of which has a session: `/api/enquiries`, guarded by
`x-cf-intake-key`, and `/api/webhooks/stripe`, guarded by Stripe's signature.

**If a second user is ever added**, the RLS policy must be rewritten to scope
by user first. Adding an account without doing that gives them everything.

## How the website connects

`../coreframe-website/src/app/api/enquire/route.ts` receives both site forms
(`/contact` and `/start`), validates and rate-limits them, then:

1. POSTs to `{ADMIN_INTAKE_URL}/api/enquiries` with `x-cf-intake-key`.
   **Deliberately non-fatal.** If this app is unreachable the visitor is still
   told their enquiry went through.
2. Sends the notification email through Resend.

Set in the **website** project: `ADMIN_INTAKE_URL`, `ADMIN_INTAKE_SECRET`.
Set here: `ADMIN_INTAKE_SECRET` (same value), `SUPABASE_SERVICE_ROLE_KEY`.

## Care plans and allowance

Money is integer pence, time is integer minutes, everywhere. Tier defaults
live in `src/lib/tiers.ts` and come from `Business/02-Strategy/packages.md`.

The allowance ledger is append only and every row carries the balance after
it. Minutes only move through one Postgres function, `apply_allowance`, which
locks the client, writes the row, and applies the three-month cap in the same
transaction. The Stripe webhook calls it on `invoice.paid`; marking a request
done calls it with the minutes spent. That minutes field is the one manual
entry in the system.

Stripe: create a webhook endpoint in the Stripe dashboard pointing at
`/api/webhooks/stripe` for `invoice.paid`, `invoice.payment_failed`,
`customer.subscription.updated` and `customer.subscription.deleted`, and set
its signing secret as `STRIPE_WEBHOOK_SECRET`. No Stripe secret key is needed:
everything the app has to know arrives inside the signed event. The client's
`stripe_customer_id` is what links an event to a row; an event for an unknown
customer is logged and ignored.

## The reply kit

Reply on an enquiry opens the phone's mail app with the first response filled
in and marks the enquiry replied in the same tap. The wording lives in the
`settings` table and is edited on `/kit`, with placeholders for the first
name, the service, the booking link and the guide. The guide is the first
document on the shelf whose "offered for" list matches the enquiry's service
or page; `*` marks the fallback.

Documents are PDFs in the public `documents` bucket. Replacing a file uploads
a new one and leaves the old in place, so links already sent keep working.
Payment links are in `src/lib/payment-links.ts` on purpose: a wrong link takes
money to the wrong place, so changing one is a reviewed commit.

## Quotes

Quotes are numbered QTE-003 onwards by a trigger. Lines are copied from the
price list when added, so a price change never rewrites a sent quote. Totals
are derived, never stored; one-off and monthly total separately. Send renders
the PDF with `@react-pdf/renderer` to the brand style, stores it in the
private `quotes` bucket, and emails it with the PDF attached when
`RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set on this app. Without them it
opens the mail app with a 30-day signed link instead. Either way the quote is
marked sent and the enquiry quoted.

## Enquiry lifecycle

```
new -> replied -> quoted -> won
                         -> lost   (lost is reachable from any open stage)
```

Forward only, enforced in the server action against the row's current status.
Every change writes `status_changed_at`.

## Colour

Palette from `Business/01-Business-Identity/document-brand-style.md`, and only
that palette. `#007A80` (`--cyan-action`) for anything interactive or small.
`#00C4CC` (`--cyan`) for large headings, rules and fills only: it measures
2.15:1 on white and fails WCAG AA for text. The comment block in
`src/app/globals.css` explains the split so nobody undoes it.
