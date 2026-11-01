# PulseWatch Backend Starter

A TypeScript modular-monolith backend foundation for PulseWatch.

## Included
- Express 5 API with health/readiness endpoints and centralized error handling
- PostgreSQL + Prisma schema for users, sessions, organizations, memberships, monitors, checks and incidents
- Redis + BullMQ queue definitions
- Independent monitoring worker
- Initial SSRF URL validation (IP literal and DNS checks)
- Shared Zod contracts
- Docker Compose for PostgreSQL and Redis

## Important limitations
This is a **starter foundation, not a production-ready monitoring service**.
- Authentication endpoints and session issuance are intentionally not implemented. Protected monitor routes fail closed until real authentication middleware is added.
- SSRF validation here is a first layer only. Production execution must pin the validated DNS address to the actual socket connection, revalidate every redirect, and enforce outbound network controls. Do not expose the worker to untrusted monitor URLs until that is implemented and tested.
- Email/webhook delivery, billing, public status pages, invitations, and AI investigation are not implemented.
- The worker currently has a basic execution processor and persistence flow. Review its network safeguards before using it with arbitrary public input.

## Requirements
- Node.js 22 LTS or newer
- pnpm 9+
- Docker Desktop

## Setup
1. Copy `.env.example` to `.env` and set local values.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start PostgreSQL and Redis:
   ```bash
   docker compose up -d
   ```
4. Generate Prisma client and apply the initial migration:
   ```bash
   pnpm db:generate
   pnpm db:push
   ```
5. Start API and worker in separate terminals:
   ```bash
   pnpm dev:api
   pnpm dev:worker
   ```

API health:
- `GET http://localhost:3001/health`
- `GET http://localhost:3001/ready`

## Repository layout
- `apps/api`: HTTP API
- `apps/worker`: background check processor
- `packages/contracts`: shared schemas
- `packages/database`: Prisma client and schema
- `packages/queue`: BullMQ queue definitions
- `packages/ssrf-guard`: initial URL validation

## Before production
Implement real authentication and authorization; complete SSRF connection pinning and redirect protections; add migrations, integration tests, rate limiting, observability, retention, notification delivery, and deployment hardening.
