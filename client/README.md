# PulseWatch Frontend

Next.js App Router frontend starter for PulseWatch.

## Stack
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 3
- Lucide icons
- Recharts

## Setup
```bash
pnpm install
cp .env.example .env.local
pnpm dev
```
Open http://localhost:3000.

Set `NEXT_PUBLIC_API_URL` to the backend origin, e.g. `http://localhost:3001`.

## Backend integration status
- The monitor list and create form call `GET /api/v1/monitors` and `POST /api/v1/monitors`.
- The backend starter currently keeps monitor routes fail-closed because authentication has not yet been implemented. You will therefore see an explicit API/authentication error until that backend phase is complete.
- Dashboard metrics are derived from the monitor list response; no fabricated analytics are shown.
- Incidents and authentication are clearly marked as not yet wired to backend endpoints.

This is a frontend foundation, not a complete authenticated SaaS application. Do not deploy it as a finished product before implementing auth, organization selection, incident APIs, notification APIs, and end-to-end tests.
