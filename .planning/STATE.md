---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-04-08T10:00:00.000Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 9
  completed_plans: 9
  percent: 75
---

# Project State: Plietsche Plünn

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-08)

**Core value:** Besucher haben Anreiz regelmäßig zu kommen, Ehrenamtliche sehen was passiert — ohne Personen-Tracking.
**Current focus:** Phase 3 complete — ready for Phase 4

## Current Phase

**Phase 3: Visitor Experience** ✅ COMPLETE

- Status: Complete
- Goal: QR-Scan, Check-In, PlietschPunkte
- Plans: 3/3 complete
- APIs: POST /api/scan, POST /api/checkin, GET /api/checkin/door-qr, GET /api/points/balance, GET /api/points/history, PATCH /api/points/settings

## Milestone Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation | ✅ Complete | 3/3 |
| 2 | Volunteer Core | ✅ Complete | 3/3 |
| 3 | Visitor Experience | ✅ Complete | 3/3 |
| 4 | Dashboard & Polish | ○ Pending | 0/2 |

Progress: ███████░░░ 75%

## Key Decisions Log

| Decision | Phase | Date |
|----------|-------|------|
| React Native bare statt Expo | Init | 2026-04-07 |
| React Native statt Flutter | Init | 2026-04-07 |
| PostgreSQL statt SQLite | Init | 2026-04-07 |
| Express 5 + Drizzle ORM | Research | 2026-04-08 |
| Multi-Tenant via store_id + RLS (v2) | Research | 2026-04-08 |
| Server-Deployment statt lokal | Phase 1 | 2026-04-08 |
| Portainer für Stack-Management | Phase 1 | 2026-04-08 |

## Deployment

- **Backend:** https://plietsche-pluenn.godsapp.de
- **Stack:** Portainer Stack #261 (plietsche-pluenn)
- **Repo:** https://github.com/Revisor01/plietsche-pluenn (private)
- **Server-Pfad:** /opt/stacks/plietsche-pluenn/
- **Store UUID:** 6a0fb86e-d795-4fd3-87fa-a21143f830b3

---
*Last updated: 2026-04-08 after Phase 1 completion + server deployment*
