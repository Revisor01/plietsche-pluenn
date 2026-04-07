# Phase 1: Foundation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Produktionsreifer Tech-Stack steht — React Native bare App baut auf iOS + Android, Express 5 Backend mit PostgreSQL + Drizzle ORM läuft, JWT-Auth mit Rollen funktioniert. Basis-Navigation in der App (Login → Homescreen).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and research findings (STACK.md, ARCHITECTURE.md) to guide decisions.

Key research-backed decisions:
- React Native 0.82+ with New Architecture (mandatory NA)
- Express 5 (async error handling built-in)
- Drizzle ORM with drizzle-kit for migrations
- PostgreSQL with store_id in all tables (Multi-Tenant ready)
- JWT auth with bcrypt, three roles: admin, volunteer, visitor
- Router → Service → Repository backend layering

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing `backend/server.js` has JWT auth logic and bcrypt — patterns can be referenced but code will be rewritten
- Existing database schema concepts (users, items) — table design to be expanded with store_id

### Established Patterns
- Express route handler patterns in existing code
- JWT token flow (register → hash password → generate token)

### Integration Points
- New React Native bare app replaces `mobile/` (Expo)
- New Express 5 backend replaces `backend/server.js` (monolithic)
- PostgreSQL replaces SQLite

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

Research stack recommendations:
- react-native-vision-camera v4 for QR (install in Phase 1, use in Phase 3)
- @react-navigation/native v7 for navigation
- react-native-geolocation-service for GPS (install in Phase 1, use in Phase 3)
- Drizzle ORM 0.45.x for PostgreSQL

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
