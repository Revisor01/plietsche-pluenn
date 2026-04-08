---
phase: 01-foundation
plan: 02
subsystem: backend
tags: [express5, drizzle, postgresql, typescript, multi-tenant]
dependency_graph:
  requires: []
  provides:
    - backend/src/db/schema.ts (stores, users, items mit store_id)
    - backend/src/db/client.ts (Drizzle-Instanz)
    - backend/src/app.ts (Express 5 App)
    - backend/src/config.ts (Zod-validierte Env-Vars)
    - backend/docker-compose.yml (PostgreSQL 16 lokal)
  affects:
    - Plan 03 (Auth-Module baut auf diesem Fundament auf)
tech_stack:
  added:
    - express@5.2.1
    - drizzle-orm@0.45.2
    - drizzle-kit@0.31.10
    - pg@8.20.0
    - zod@4.3.6
    - helmet@8.1.0
    - typescript@6.0.2
  patterns:
    - Router → Service → Repository (Verzeichnisstruktur vorbereitet)
    - Shared Schema Multi-Tenancy via store_id UUID FK
    - Zod-Env-Validierung mit process.exit(1) bei ungültigen Variablen
key_files:
  created:
    - backend/src/config.ts
    - backend/src/app.ts
    - backend/src/server.ts
    - backend/src/db/schema.ts
    - backend/src/db/client.ts
    - backend/src/db/seed.ts
    - backend/drizzle.config.ts
    - backend/tsconfig.json
    - backend/docker-compose.yml
    - backend/.env.example
    - backend/.gitignore
  modified:
    - backend/package.json (Express 4+SQLite → Express 5+PostgreSQL)
    - backend/.env (aktualisiert auf PostgreSQL-Credentials)
decisions:
  - "Drizzle generate+migrate statt push für reproduzierbare Migration-History"
  - ".gitignore added zur Absicherung von .env (Threat T-02-02)"
metrics:
  completed_date: "2026-04-07"
  tasks_completed: 2
  tasks_total: 3
  files_created: 11
  files_modified: 2
---

# Phase 01 Plan 02: Express 5 Backend + PostgreSQL + Drizzle ORM Summary

**One-liner:** Express 5 TypeScript-Backend mit Drizzle ORM Schema (stores/users/items mit store_id Multi-Tenant-Basis) auf PostgreSQL.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Backend TypeScript-Struktur und Express 5 App einrichten | 975826f | Done |
| 2 | Drizzle-Schema definieren (stores, users, items mit store_id) | d4f8b79 | Done |
| 3 | Drizzle-Migration ausführen und Health-Endpoint prüfen | — | Requires Docker |

## What Was Built

### Task 1: Express 5 App

- `backend/src/config.ts` — Zod-validierte Env-Vars (DATABASE_URL min 1 char, JWT_SECRET min 32 chars, PORT coerced, NODE_ENV enum)
- `backend/src/app.ts` — Express 5 App mit helmet, cors, JSON-Middleware, `/api/health` Endpoint, globalem ZodError-Handler
- `backend/src/server.ts` — Entry Point mit `app.listen(config.port)`
- `backend/tsconfig.json` — TypeScript 6 mit ES2022 target, strict mode
- `backend/docker-compose.yml` — PostgreSQL 16-alpine mit healthcheck
- `backend/.env.example` — Template mit allen benötigten Variablen
- `backend/.gitignore` — Schützt `.env`, `dist/`, `node_modules/`, `*.sqlite` (neu erstellt)

### Task 2: Drizzle Schema

- `backend/src/db/schema.ts` — stores, users, items Tabellen
  - stores: id (uuid PK), name, address, lat/lng, checkinRadiusMeters, createdAt
  - users: id (uuid PK), storeId (FK→stores), username, email, passwordHash, role enum, plietschPoints, createdAt
  - items: id (uuid PK), storeId (FK→stores), title, category, size, condition enum, color, status enum, qrToken (uuid), createdAt
- `backend/src/db/client.ts` — Drizzle mit pg Pool über `config.databaseUrl`
- `backend/drizzle.config.ts` — Migration-Config mit `./src/db/migrations` als Output-Dir
- `backend/src/db/seed.ts` — Seed-Daten: 1 Store + 1 Admin-User

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] .gitignore erstellt**
- **Found during:** Task 1
- **Issue:** Kein `.gitignore` vorhanden — `.env` mit JWT_SECRET würde commitiert werden (Threat T-02-02)
- **Fix:** `.gitignore` mit `.env`, `dist/`, `node_modules/`, `*.sqlite`, `*.log` erstellt
- **Files modified:** backend/.gitignore (neu)
- **Commit:** 975826f

**2. [Rule 1 - Bug] .env auf PostgreSQL-Credentials aktualisiert**
- **Found during:** Task 3 Vorbereitung
- **Issue:** Bestehende `.env` enthielt alte SQLite-Config (`DB_PATH`, kurzes JWT_SECRET) — würde bei Serverstart zu Zod-Validierungsfehler und `process.exit(1)` führen
- **Fix:** `.env` auf PostgreSQL-Connection-String und 32-Zeichen-JWT_SECRET aktualisiert
- **Files modified:** backend/.env

## Task 3: Manuell auszuführen

Task 3 konnte nicht automatisch ausgeführt werden, da Docker nicht verfügbar war (Colima nicht gestartet).

**Schritte zum Abschließen:**

```bash
# 1. Colima/Docker starten
colima start

# 2. PostgreSQL Container starten
cd /Users/simonluthe/Documents/plietsche-pluenn/backend
docker-compose up -d
docker-compose ps  # postgres sollte "healthy" zeigen

# 3. Drizzle Migration generieren und ausführen
npm run db:generate
npm run db:migrate

# 4. Migrations-Dateien commitieren
git add src/db/migrations/
git commit -m "feat(01-02): Drizzle initial migration (stores, users, items)"

# 5. Backend starten und Health-Endpoint prüfen
npm run dev &
sleep 3
curl -s http://localhost:3000/api/health
# Erwartete Antwort: {"status":"OK","timestamp":"..."}

# 6. DB-Tabellen verifizieren
docker exec plietsche-postgres psql -U plietsche -d plietschepluenn -c "\dt"

# 7. Optional: Seed-Daten einspielen
npm run db:seed
```

## Known Stubs

Keine — alle Komponenten haben echte Implementierungen. Die `src/middleware/` und `src/modules/auth/` Verzeichnisse wurden angelegt aber noch nicht befüllt (für Plan 03 vorgesehen).

## Threat Flags

Keine neuen Threat-Surfaces über den Plan hinaus.

## Self-Check: PARTIAL

### Created Files Exist
- backend/src/config.ts: FOUND
- backend/src/app.ts: FOUND
- backend/src/server.ts: FOUND
- backend/src/db/schema.ts: FOUND
- backend/src/db/client.ts: FOUND
- backend/src/db/seed.ts: FOUND
- backend/drizzle.config.ts: FOUND
- backend/tsconfig.json: FOUND
- backend/docker-compose.yml: FOUND
- backend/.env.example: FOUND
- backend/.gitignore: FOUND

### Commits Exist
- 975826f (Task 1): FOUND
- d4f8b79 (Task 2): FOUND

### Task 3 Status: BLOCKED — Docker nicht verfügbar
Migration-SQL-Dateien fehlen noch. Health-Endpoint-Verifikation steht aus.
