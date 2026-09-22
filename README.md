# PlanetPulse

PlanetPulse is a lightweight climate-tech activity ledger. Log everyday travel,
home energy, and food choices, see the CO2 calculation immediately, track a
Monday-to-Sunday weekly target, and filter the full history.

## Required Hackathon ID

`REQUIRED HACKATHON ID: AZIS-KQ7ZFC`

This is the Hackathon ID for Hardiwar Team 14.

## Stack

- Next.js 16 App Router, React 19, and the React Compiler
- Supabase for the optional shared persistence layer
- LocalStorage fallback for offline or unconfigured deployments
- CSS and semantic HTML; no authentication, ML, workers, or heavy runtime

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npm run build
```

## Persistence and deployment

PlanetPulse is configured for the project Supabase instance in Vercel
Production. Run [`supabase/schema.sql`](supabase/schema.sql) once in the
Supabase SQL Editor to create the `activities` and `settings` tables with RLS
policies and indexes.

For a new local setup, add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Copy [`.env.local.example`](.env.local.example) to `.env.local` before adding
these values. Never commit `.env.local` or secret credentials.

Deploy the project to Vercel or any Node host that supports Next.js:

```bash
npm run build
npm run start
```

The live deployment uses small Supabase queries with
indexes on `created_at` and `(type, created_at)`. It does not load a database
into memory and has no background processing. Supabase remains optional; local
fallback is explicit in the UI as `Browser saved` if the remote database cannot
be reached.

## Public submission URL

`PUBLIC URL: https://planetpulse-two.vercel.app`

This is the public Vercel production URL for the deployed app. The GitHub
repository is connected to Vercel for future production deployments.

## CO2 factors

| Activity | Factor |
| --- | ---: |
| Car | 0.20 kg/km |
| Bus | 0.08 kg/km |
| Flight | 0.25 kg/km |
| Electricity | 0.80 kg/kWh |
| Veg meal | 0.5 kg/meal |
| Non-veg meal | 2.0 kg/meal |

## Product decisions

See [`DECISIONS.md`](DECISIONS.md) for the three required decision points:
non-blocking target nudges, suspicious-input confirmation, and Monday-to-Sunday
week boundaries.

## Submission checklist

- Five required features are visible: Log Activity, CO2 Calculation, Dashboard,
  Weekly Target, and History + filters.
- No authentication, login, signup, or account creation is required.
- DP1 allows logging after the target is exceeded and shows a constructive nudge.
- DP2 shows **Edit value** and **Log anyway** for suspicious quantities.
- DP3 uses Monday 00:00 through Sunday 23:59:59 local time.
- Standard API: not implemented; the browser uses Supabase directly with a
  LocalStorage fallback.
- Demo flow: log an activity, set a target, trigger `500000`, filter History,
  clear filters, export CSV, and refresh to verify persistence.

## Calculation contract

The fixed factors are implemented in `app/lib/calculateCO2.js` and documented
above. CO2 is calculated before saving, stored with the activity, and never
silently changed by the UI.
