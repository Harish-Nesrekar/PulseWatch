# PulseWatch

**Website and API uptime monitoring platform**

PulseWatch monitors websites and APIs, tracks uptime and downtime, records incidents, and provides status information.

## Tech Stack

### Frontend
- Next.js 15
- React
- JavaScript / TypeScript
- npm

### Backend
- Node.js
- Express.js
- MySQL
- MySQL2
- JWT authentication

### Infrastructure
- **Frontend:** Vercel
- **Backend:** Render
- **Database:** TiDB Cloud Starter

---

## 1. Project Structure

```text
PulseWatch/
├── client/                 # Next.js frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── package-lock.json
│
├── server/                 # Express backend
│   ├── src/
│   ├── migrations/
│   ├── scripts/
│   ├── tests/
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```

## 2. Prerequisites

Install the following before running the project:

- Node.js 22.x
- npm
- Git
- TiDB Cloud or a compatible MySQL database

Verify installations:

```bash
node --version
npm --version
git --version
```

## 3. Clone the Repository

```bash
git clone https://github.com/Harish-Nesrekar/PulseWatch.git

cd PulseWatch
```

## 4. Frontend Setup

Navigate to the frontend:

```bash
cd client
```

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Frontend Build Commands

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Start production server:

```bash
npm start
```

TypeScript validation:

```bash
npx tsc --noEmit
```

Frontend configuration tests:

```bash
npm run test:config
```

Frontend security tests:

```bash
npm run test:security
```

## 5. Backend Setup

Open another terminal and navigate to the backend:

```bash
cd PulseWatch/server
```

Install dependencies:

```bash
npm ci
```

Start the backend:

```bash
npm start
```

### Backend Validation Commands

JavaScript syntax validation:

```bash
npm run check
```

Monitor unit tests:

```bash
npm run test:monitor
```

Run both:

```bash
npm run check && npm run test:monitor
```

## 6. Environment Configuration

Do not commit `.env`, `.env.local`, database passwords, JWT secrets, API keys, or private keys.

Create environment files using the supplied example files:

```bash
cp client/.env.example client/.env.local
cp server/.env.example server/.env
```

Configure the required values in the respective files.

### Backend Production Environment

The production backend requires configuration for:

- `NODE_ENV`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL_CA_FILE`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SESSION_COOKIE_MAX_AGE_MS`
- `CLIENT_ORIGIN`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`

Use the actual values from your deployment environment. Never put credentials in this README.

For TiDB Cloud, configure the database host, port, username, password, and TLS certificate according to your TiDB instance.

## 7. Database Commands

The backend includes database migration and administration scripts.

Inspect available scripts:

```bash
cd server
npm run
```

Database migration and backup/restore utilities are located in:

```text
server/scripts/
server/migrations/
```

Use the project's migration scripts and production database configuration when applying migrations. Do not manually modify production schema without a backup and migration plan.

## 8. Production Build

### Frontend

```bash
cd client

npm ci
npm run build
```

### Backend

```bash
cd server

npm ci
npm run check
npm run test:monitor
```

The backend is a Node.js service and does not require a separate compilation step.

## 9. Deployment

### Frontend — Vercel

1. Import the GitHub repository into Vercel.
2. Set the Root Directory to `client`.
3. Use the following build command:

```bash
npm run build
```

4. Configure the frontend environment variables.
5. Deploy the application.

### Backend — Render

1. Create a new Web Service.
2. Connect the GitHub repository.
3. Set the Root Directory to `server`.
4. Configure:

**Runtime:** Node

**Build Command:**

```bash
npm ci
```

**Start Command:**

```bash
npm start
```

**Node Version:** 22.x

5. Add the production environment variables.
6. Upload the TiDB CA certificate as a Render Secret File.
7. Set `DB_SSL_CA_FILE` to the uploaded certificate's path.
8. Set `CLIENT_ORIGIN` to the deployed frontend's HTTPS origin.
9. Deploy the service.

### Database — TiDB Cloud

PulseWatch uses TiDB Cloud Starter as its MySQL-compatible cloud database.

Configure the database connection using the production environment variables and TLS certificate.

---

## 10. Git Commands

Check repository changes:

```bash
git status
```

Stage changes:

```bash
git add .
```

Commit:

```bash
git commit -m "Describe your changes"
```

Push:

```bash
git push origin main
```

Pull latest changes:

```bash
git pull origin main
```

---

## 11. Troubleshooting

### Dependency installation issues

```bash
rm -rf node_modules
npm ci
```

Run this separately inside `client` or `server`.

### Frontend build errors

```bash
cd client
npm run build
```

Check the build output for missing dependencies, environment variables, and TypeScript errors.

### Backend startup errors

```bash
cd server
npm run check
npm start
```

Check database connectivity and required environment variables.

### Database connection errors

Verify:
- Database host and port.
- Username and password.
- Database name.
- TLS certificate configuration.
- Database availability and network access.

---

## 12. Important Notes

- Use Node.js 22.x for the backend.
- Use `npm ci` for reproducible installations.
- Keep environment files and credentials private.
- Run tests before pushing production changes.
- Render's free web services can sleep after inactivity. Continuous background monitoring may require a different hosting arrangement.
- Keep database migrations version-controlled.

---


### Additional Backend Commands

Start backend in development mode:

```bash
npm run dev
```

Start the monitoring worker separately:

```bash
npm run worker
```

Start frontend and backend development servers together:

```bash
npm run dev:all
```

### Database Management

Run database migrations:

```bash
npm run db:migrate
```

Initialize or baseline the database:

```bash
npm run db:baseline
```

Create a database backup:

```bash
npm run db:backup
```

Test database backup restoration:

```bash
npm run db:restore-test
```

**Important:** Review the database configuration and target environment before running migration, baseline, or restore commands. Never run destructive database operations against production without a verified backup.

**Maintained by:** Harish  
**Repository:** https://github.com/Harish-Nesrekar/PulseWatch
