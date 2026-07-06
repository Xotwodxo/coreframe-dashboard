# Coreframe Dashboard

A reusable business performance dashboard for small service businesses.
Owners track revenue, leads, and jobs via manual entry or CSV upload, and see
KPI cards, 12-month trend charts, and a monthly breakdown table.

Built by Coreframe Digital.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS 4
- Supabase (magic link auth, Postgres, RLS)
- Recharts, PapaParse

## Routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/demo` | Public | Full dashboard populated with fictional data (Bright Spark Electrical) |
| `/login` | Public | Magic link sign-in |
| `/auth/callback` | Public | Auth callback, routes new users to onboarding |
| `/dashboard` | Required | KPI cards, revenue/leads charts, service donut, monthly table |
| `/dashboard/data` | Required | Entries table, add entry, CSV import |
| `/dashboard/settings` | Required | Business details, brand colour, monthly goals |

Route protection lives in `proxy.ts` (Next 16's replacement for middleware).

## Local development

```
npm install
npm run dev
```

Environment variables (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://dashboard.coreframedigital.co.uk
```

## Supabase configuration

The database schema (businesses, metric_entries, goals + RLS policies) is
applied as the `initial_schema` migration.

In the Supabase dashboard under Authentication > URL Configuration:

- For production, set Site URL to `https://dashboard.coreframedigital.co.uk`
- Add redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://dashboard.coreframedigital.co.uk/auth/callback`

If a redirect URL is not on the allow-list, Supabase falls back to the Site
URL; the proxy forwards any auth code landing on `/` to `/auth/callback`, so
sign-in still completes either way.

The built-in Supabase SMTP has low rate limits (a few emails per hour).
Configure custom SMTP before putting real clients on this.

## Deployment (Vercel)

1. Push this repo to GitHub and import it in Vercel
2. Set the four environment variables above in the Vercel project
3. Point `dashboard.coreframedigital.co.uk` at the Vercel project
4. Update the Supabase Site URL as described above
