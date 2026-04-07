# Stack Research

**Domain:** Community item-sharing app — React Native bare + Express + PostgreSQL
**Researched:** 2026-04-07
**Confidence:** MEDIUM-HIGH (core stack HIGH, some peripheral libs MEDIUM due to rapid ecosystem churn)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React Native (bare) | 0.82+ | Mobile framework (iOS + Android) | 0.82 is the first version where New Architecture is mandatory and cannot be disabled — aligns exactly with the migration goal. Use `npx react-native@latest init` to scaffold bare project. |
| React | 19.x | UI rendering | Ships with RN 0.78+; required for New Architecture. Do not pin to 18.x. |
| Express | 5.x | HTTP API server | Released stable October 2024. Async error propagation built-in (no `try/catch` wrappers around every route). Node.js 18+ required — use this constraint to enforce modern Node. |
| PostgreSQL | 16 | Primary database | Production-grade, multi-user safe. Row-Level Security built-in — directly relevant for multi-tenant architecture. SQLite was acceptable for an MVP but not for concurrent writes from multiple volunteer devices. |
| Node.js | 20 LTS | Server runtime | LTS until April 2026. Express 5 requires >=18; 20 is the safe choice for Hetzner Docker deployment. |
| TypeScript | 5.x | Type safety (backend + mobile) | Both codebases. Drizzle ORM and React Native's new arch tooling are TypeScript-first. |

### Database Layer

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| drizzle-orm | 0.45.x (stable) | ORM / query builder | Tiny bundle, zero binary dependencies, TypeScript-native schema definition, SQL-like query API. Outperforms Prisma on cold starts and bundle size. Correct choice for a focused Express API (not a heavyweight NestJS setup). |
| drizzle-kit | latest | Schema migrations (CLI) | Paired with drizzle-orm. Generates SQL migration files that can be reviewed and committed — safe for a volunteer-operated production environment. |
| pg | 8.20.x | PostgreSQL driver | The canonical Node.js Postgres driver. Drizzle uses it under the hood for PostgreSQL. Actively maintained, 13k+ dependents. |

### Mobile Navigation

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| @react-navigation/native | 7.x | Navigation core | Industry standard, React Native New Architecture compatible. Uses native dependencies listed below. |
| @react-navigation/bottom-tabs | 7.x | Tab bar navigation | Already used in existing app — retains UX continuity. |
| @react-navigation/stack | 7.x | Stack/screen navigation | Existing app uses it. v7 released Nov 2024. |
| react-native-screens | 4.x | Native screen containers | Required by react-navigation. Fully supports New Architecture. v4.25+ drops legacy arch support — good signal that it's properly NA-native. |
| react-native-safe-area-context | 5.7.x | Safe area insets | Required by react-navigation. Latest version (5.7.0) has experimental New Architecture support. |

### QR Code — Server-Side Generation (printable labels)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| qrcode | latest (1.5.x) | QR code generation on Express server | The standard Node.js QR library. Outputs PNG buffer, SVG string, or data URL. `qrcode.toBuffer()` returns a PNG that can be streamed to the browser for printing or saved to disk. Zero dependencies after build. |

Usage pattern: `GET /api/items/:id/qr` returns a PNG image. Volunteer prints it, attaches it to clothing item. The QR payload encodes item ID (UUID), not URLs — keeps the app offline-capable.

### QR Code — Mobile Scanning

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-native-vision-camera | 4.7.x | Camera + QR scanning | The only high-quality camera library for bare React Native in 2025. Uses CameraX on Android (reliable, not Camera2). Built-in `useCodeScanner` hook supports `qr` type natively via MLKit/AVFoundation — no separate frame processor plugin needed for basic QR. Actively maintained (v5 in development). |

Note: The `expo-barcode-scanner` used in the current app is Expo-specific and must be replaced. `react-native-vision-camera` v4 requires iOS 13+ and Android API 26+. Permissions must be handled manually in bare workflow (no Expo permission abstraction).

### Location / GPS Verification

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-native-geolocation-service | 5.x | GPS coordinates for check-in verification | Drop-in replacement for the deprecated RN Geolocation API. Uses FusedLocationProvider on Android (Google Play Services — far more accurate and battery-efficient than raw GPS). iOS uses CoreLocation. Correctly handles the timeout bugs present in RN's built-in implementation. |

Check-in flow: user scans door QR + app reads GPS → backend verifies (a) QR token matches the store, (b) GPS within N meters of store's registered lat/lng. Two-factor presence verification without invasive tracking.

### Animation / Gestures

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-native-reanimated | 4.x | Animations | Reanimated 4 is New Architecture only. Reanimated 3 is in maintenance mode and will not receive new features. For a New Architecture bare app started in 2026, use v4 directly. Requires `react-native-worklets` as a peer dep. |
| react-native-gesture-handler | 2.x (stable) | Gesture recognition | v2 is the current stable release; v3 (New Architecture native) is in beta. Use v2 for production stability now — watch for v3 GA. |

### Authentication (Backend)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| jsonwebtoken | 9.x | JWT generation/verification | Already used in existing app. Keep it — no reason to change. |
| bcrypt | 5.x | Password hashing | Already used. bcrypt is correct for passwords (intentionally slow). Keep it. |

### Supporting Backend Libraries

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| cors | 2.x | CORS headers for mobile client | Already used. Keep. |
| dotenv | 16.x | Environment variable loading | Already used. Keep. |
| helmet | 8.x | HTTP security headers | ADD — not in current app. Essential for any production API. |
| zod | 3.x | Input validation | ADD — not in current app. Validates request bodies before they hit the DB. Pairs naturally with TypeScript. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| nodemon | Dev server restart | Already used. Keep for Express development. |
| @types/pg | TypeScript types for pg driver | Required when using drizzle-orm with pg in TypeScript. |
| @types/express | TypeScript types for Express | Required for typed route handlers. |
| @types/jsonwebtoken | TypeScript types for JWT | Required. |

---

## Installation

```bash
# --- Backend ---

# Core
npm install express@5 pg drizzle-orm

# Auth + security
npm install jsonwebtoken bcrypt cors dotenv helmet zod

# Dev
npm install -D drizzle-kit nodemon typescript @types/express @types/pg @types/jsonwebtoken @types/bcrypt

# --- Mobile (bare React Native) ---

# Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context

# QR scanning + camera
npm install react-native-vision-camera

# Location
npm install react-native-geolocation-service

# Animation + gestures
npm install react-native-reanimated react-native-worklets react-native-gesture-handler
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| drizzle-orm | Prisma | If team prefers GUI-driven schema exploration (Prisma Studio) or if the project has complex polymorphic relations. Prisma's cold start overhead (binary engine) is irrelevant in a persistent Express server but matters for serverless. For this project: no reason to choose Prisma. |
| drizzle-orm | Knex.js | If you want raw SQL control with a thin query builder. Knex has no TypeScript schema definitions — you lose type safety on insert/select shapes. |
| react-native-vision-camera | react-native-camera | react-native-camera is abandoned (last meaningful commit 2022). Do not use. |
| react-native-geolocation-service | @react-native-community/geolocation | The community package is maintained but thinner; does not use FusedLocationProvider on Android. Geolocation-service is the better Android implementation. |
| Express 5 | Fastify | Fastify is faster and has built-in schema validation. Valid alternative if performance becomes a concern. For this project: team already knows Express, the API surface is small, and Express 5's async error handling closes the main productivity gap. |
| PostgreSQL RLS for multi-tenant | Schema-per-tenant | Schema-per-tenant requires dynamic schema routing, complicates migrations, and adds operational overhead. For 5-20 stores (expected scale), RLS with a `tenant_id` column on every table is simpler and sufficient. Migrate to schema-per-tenant only if enterprise isolation requirements emerge. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Expo (any managed/bare Expo SDK) | Explicitly out of scope per PROJECT.md. Adds abstraction layer the team is specifically migrating away from. | React Native bare (`npx react-native@latest init`) |
| expo-barcode-scanner / expo-camera | Expo SDK — will not work in a non-Expo bare project without Expo config plugins. | react-native-vision-camera |
| expo-location | Same — Expo SDK. | react-native-geolocation-service |
| react-native-camera | Abandoned. No updates since 2022, does not support New Architecture. | react-native-vision-camera |
| SQLite (sqlite3, better-sqlite3) | Single-file, single-writer database. Correct for a prototype; wrong for a multi-tenant, multi-device production app. | PostgreSQL 16 |
| TypeORM | Known issues with New Architecture, decorator-heavy, brittle migrations, poor performance at scale. Ecosystem has largely moved past it. | drizzle-orm |
| Sequelize | Older generation ORM, verbose, limited TypeScript support. New projects avoid it. | drizzle-orm |
| react-native-reanimated v3 | In maintenance mode as of 2025. No new features. New Architecture support incomplete. | react-native-reanimated v4 |
| Express 4 | Missing automatic async error propagation (the biggest Express pain point). Every async route needs a `try/catch` or `express-async-errors` wrapper. Express 5 fixes this natively. | Express 5 |

---

## Stack Patterns by Variant

**Multi-tenant isolation (shared schema with RLS):**
- Add `tenant_id UUID NOT NULL` to every table (items, users, events, etc.)
- Create PostgreSQL RLS policies: `USING (tenant_id = current_setting('app.current_tenant')::UUID)`
- Set `app.current_tenant` in Express middleware per request via `SET LOCAL app.current_tenant = $1`
- Drizzle does not auto-apply RLS — the Express middleware owns this
- Do NOT use connection pooling with `SET` (use `SET LOCAL` which scopes to transaction)

**QR code generation for printing:**
- Server generates QR → returns PNG via `Content-Type: image/png` response
- Volunteer opens URL in browser, browser print dialog, prints label
- Alternatively: generate PNG, embed in HTML label template, return as PDF via `pdfkit`
- QR payload: `{"itemId": "uuid-here", "storeId": "uuid-here"}` — minimal, scannable offline

**GPS check-in verification:**
- Client sends `{ lat, lng, qrToken }` to `POST /api/checkins`
- Backend: (1) verify QR token matches store, (2) calculate Haversine distance from store lat/lng, (3) reject if > configurable radius (e.g. 200m)
- Do NOT trust client-side distance calculation — always verify server-side

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react-native-reanimated@4.x | react-native >= 0.82, New Architecture only | Requires `react-native-worklets` peer dep. Not compatible with legacy arch. |
| react-native-vision-camera@4.7.x | react-native >= 0.71, iOS 13+, Android API 26+ | Works on New Architecture. v5 in active development — may require migration in ~12 months. |
| react-native-screens@4.25+ | react-native >= 0.82, New Architecture only | v4.25+ drops legacy arch support by design. |
| drizzle-orm@0.45.x | pg@8.x, Node.js >= 18 | v1.0.0 beta exists but avoid for production — 0.45.x is stable. |
| Express@5.x | Node.js >= 18 | Drop-in upgrade from 4.x for most Express 4 code, but check removed deprecated methods. |
| react-native-gesture-handler@2.x | react-native >= 0.70, compatible with New Architecture | v3 (beta) is New Architecture native — migrate when stable. |

---

## Sources

- [React Native New Architecture — mandatory from 0.82](https://www.callstack.com/blog/react-native-wrapped-2025-a-month-by-month-recap-of-the-year) — MEDIUM confidence (community recap)
- [react-native-vision-camera QR scanning docs](https://react-native-vision-camera.com/docs/guides/code-scanning) — HIGH confidence (official docs)
- [VisionCamera v4.7.3 npm](https://www.npmjs.com/package/react-native-vision-camera) — HIGH confidence (npm registry)
- [Drizzle ORM 0.45.x — latest stable](https://www.npmjs.com/package/drizzle-orm) — HIGH confidence (npm registry)
- [pg 8.20.0 — latest](https://www.npmjs.com/package/pg) — HIGH confidence (npm registry)
- [Express 5 stable release Oct 2024](https://expressjs.com/2024/10/15/v5-release.html) — HIGH confidence (official announcement)
- [react-native-reanimated v4 — New Architecture only](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/) — HIGH confidence (official docs)
- [react-native-screens New Architecture, drops legacy from 4.25](https://github.com/software-mansion/react-native-screens/releases) — HIGH confidence (official releases)
- [PostgreSQL RLS for multi-tenant Node.js 2026](https://dev.to/1xapi/how-to-build-a-multi-tenant-api-in-nodejs-with-postgresql-row-level-security-2026-guide-3ane) — MEDIUM confidence (community article, pattern is well-established)
- [react-native-geolocation-service — FusedLocationProvider](https://github.com/Agontuk/react-native-geolocation-service) — HIGH confidence (official GitHub)
- [qrcode npm — server-side PNG/SVG generation](https://www.npmjs.com/package/qrcode) — HIGH confidence (npm registry)
- [react-native-gesture-handler 2.31.0, v3 in beta](https://www.npmjs.com/package/react-native-gesture-handler) — HIGH confidence (npm registry)
- [react-native-safe-area-context 5.7.0](https://www.npmjs.com/package/react-native-safe-area-context) — HIGH confidence (npm registry)
- [Drizzle vs Prisma comparison 2025](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/) — MEDIUM confidence (community guide)

---

*Stack research for: Plietsche Plünn — community clothing exchange app*
*Researched: 2026-04-07*
