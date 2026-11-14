# PulseWatch Frontend

Next.js 15 App Router frontend for PulseWatch.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API URL configuration

Development uses `http://localhost:5001/api` when `NEXT_PUBLIC_API_URL` is unset. Copy the non-secret development example in `.env.example` to the client project root if you want to configure it explicitly.

Production builds require `NEXT_PUBLIC_API_URL` to be set explicitly to an HTTPS API URL with a non-local hostname. Set it in the frontend provider's build environment before running `npm run build`; changing it after the build does not update the browser bundle. `NEXT_PUBLIC_*` values are public and must never contain tokens, passwords, or other secrets.

Run isolated API URL configuration tests with:

```bash
npm run test:config
```

## Browser tests

Install the Playwright Chromium browser once with `npx playwright install chromium`, then run `npm run test:e2e`. The browser suite requires the local MySQL credentials in `server/.env`; it creates and drops a uniquely named test database and never uses the configured application database.
