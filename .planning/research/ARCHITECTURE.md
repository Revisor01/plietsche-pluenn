# Architecture Research

**Domain:** Multi-tenant community clothing exchange app (mobile + backend)
**Researched:** 2026-04-07
**Confidence:** HIGH (core patterns), MEDIUM (gamification engine design)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Clients                           │
│  ┌──────────────────────┐  ┌───────────────────────────────┐    │
│  │  Visitor App         │  │  Volunteer App (same binary)  │    │
│  │  - Browse items      │  │  - Item management            │    │
│  │  - Scan item QR      │  │  - QR label print preview     │    │
│  │  - Scan door QR      │  │  - Campaign management        │    │
│  │  - Points dashboard  │  │  - Store statistics           │    │
│  └──────────┬───────────┘  └──────────────┬────────────────┘    │
└─────────────┼────────────────────────────-┼────────────────────-┘
              │  HTTPS / REST                │
┌─────────────┼─────────────────────────────┼────────────────────-┐
│             │        API Gateway Layer     │                     │
│  ┌──────────▼──────────────────────────────▼──────────────────┐ │
│  │  Express Router                                             │ │
│  │  Tenant Resolution Middleware → Auth Middleware → Routes    │ │
│  └──┬──────────────┬───────────────────┬──────────────────────┘ │
│     │              │                   │                         │
│  ┌──▼──────┐  ┌────▼────────┐  ┌──────▼────────┐               │
│  │ Items   │  │ Check-In /  │  │ Points /       │               │
│  │ Service │  │ Location    │  │ Campaigns      │               │
│  │         │  │ Service     │  │ Service        │               │
│  └──┬──────┘  └────┬────────┘  └──────┬────────┘               │
│     │              │                   │                         │
│  ┌──▼──────────────▼───────────────────▼──────────────────────┐ │
│  │                   Repository Layer                          │ │
│  │  (tenant_id scoping enforced here, PostgreSQL RLS backup)   │ │
│  └──────────────────────────────┬──────────────────────────────┘ │
│                                 │                                │
│  ┌──────────────────────────────▼──────────────────────────────┐ │
│  │                    PostgreSQL                               │ │
│  │  Shared DB, Shared Schema — tenant_id on all tables         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  QR Code Generator (server-side, qrcode npm)                │ │
│  │  - Generates SVG/PNG at item creation time                  │ │
│  │  - Stored as URL token, rendered printable on demand        │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| React Native App | UI, camera scanning, GPS reading, local navigation state | React Navigation, react-native-vision-camera or react-native-scanner, react-native-geolocation-service |
| API Gateway / Router | HTTP routing, tenant resolution, auth verification | Express + custom middleware chain |
| Tenant Middleware | Extracts store slug from JWT or subdomain, attaches to req | Custom Express middleware, sets `req.tenantId` |
| Items Service | Create items, generate QR tokens, update status | Business logic layer, calls QR generator and Repository |
| Check-In Service | Validate GPS coordinates + door QR token, record visit | Haversine distance check, prevents replay attacks |
| Points / Campaigns Service | Calculate points (base + active multipliers), record events | Rule engine pattern, campaign time-window evaluation |
| Repository Layer | Database queries, all scoped by tenant_id | Node-postgres (pg) with explicit tenant_id in every query |
| QR Code Generator | Server-side SVG/PNG generation for printable labels | `qrcode` npm package |
| PostgreSQL | Persistent storage with Row-Level Security as defense-in-depth | Shared schema, tenant_id column on all tenant-specific tables |

## Recommended Project Structure

```
backend/
├── src/
│   ├── middleware/
│   │   ├── auth.ts          # JWT verification, attaches req.user
│   │   ├── tenant.ts        # Resolves tenantId from JWT claim or subdomain
│   │   └── roles.ts         # requireRole('volunteer') guard
│   ├── modules/
│   │   ├── items/
│   │   │   ├── items.router.ts
│   │   │   ├── items.service.ts    # Business logic
│   │   │   ├── items.repository.ts # DB queries (always tenant-scoped)
│   │   │   └── items.types.ts
│   │   ├── checkin/
│   │   │   ├── checkin.router.ts
│   │   │   ├── checkin.service.ts  # GPS validation + door-QR verification
│   │   │   └── checkin.repository.ts
│   │   ├── points/
│   │   │   ├── points.service.ts   # Point calculation with campaign multipliers
│   │   │   ├── campaigns.repository.ts
│   │   │   └── points.repository.ts
│   │   ├── qr/
│   │   │   ├── qr.service.ts       # Generates QR tokens + renders SVG/PNG
│   │   │   └── qr.router.ts        # GET /qr/:token.png for printable labels
│   │   ├── stores/
│   │   │   ├── stores.router.ts    # Admin: create/manage stores (tenants)
│   │   │   └── stores.repository.ts
│   │   └── auth/
│   │       ├── auth.router.ts
│   │       └── auth.service.ts
│   ├── db/
│   │   ├── client.ts        # pg Pool setup
│   │   ├── migrations/      # SQL migration files
│   │   └── seed.ts
│   └── app.ts               # Express app wiring
mobile/
├── src/
│   ├── screens/
│   │   ├── visitor/
│   │   │   ├── BrowseScreen.tsx
│   │   │   ├── ScanItemScreen.tsx   # Camera + QR scan
│   │   │   ├── CheckInScreen.tsx    # GPS + door QR scan
│   │   │   └── PointsScreen.tsx
│   │   └── volunteer/
│   │       ├── InventoryScreen.tsx
│   │       ├── AddItemScreen.tsx
│   │       ├── PrintQRScreen.tsx    # Shows printable QR label
│   │       └── CampaignsScreen.tsx
│   ├── api/
│   │   └── client.ts        # Axios instance with auth token injection
│   ├── store/               # Zustand or React Query cache
│   └── navigation/
│       └── AppNavigator.tsx # Role-based navigation tree
```

### Structure Rationale

- **modules/ (backend):** Feature-grouped modules with their own router/service/repository trio. Enables parallel development and makes each module independently testable. Avoids a flat `routes/` folder where logic sprawls across files.
- **middleware/ (backend):** Tenant and auth concerns isolated from business logic. Every request gets `req.tenantId` and `req.user` before touching any module.
- **screens/visitor vs. screens/volunteer:** Role-split screen trees prevent UI logic bleed-through and make it clear which features belong to which persona.
- **api/client.ts (mobile):** Single Axios instance with token injection and base URL config — no scattered fetch() calls.

## Architectural Patterns

### Pattern 1: Shared Schema Multi-Tenancy with tenant_id

**What:** All stores (tenants) share the same PostgreSQL tables. Every tenant-scoped table has a `store_id` column. The application layer enforces scoping; PostgreSQL Row-Level Security is a defense-in-depth backup.

**When to use:** Always, for this project. The number of stores will stay in the dozens to low hundreds — separate schemas or separate databases would add operational overhead with no benefit at this scale.

**Trade-offs:**
- Pro: Single schema migration to maintain, trivial onboarding of new stores, simple infrastructure
- Pro: Cross-store aggregate statistics possible (opt-in, for super-admin)
- Con: Missing `WHERE store_id = $1` in one query leaks data — mitigated by repository pattern and RLS
- Con: A misbehaving store can load-pressure shared tables — acceptable at this scale

**Example:**
```typescript
// items.repository.ts — tenant isolation always at repository boundary
async function findActiveItems(storeId: string, limit = 20) {
  const { rows } = await db.query(
    `SELECT * FROM items WHERE store_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT $2`,
    [storeId, limit]
  );
  return rows;
}
```

### Pattern 2: QR Token Lifecycle (generate → store → print → scan → process)

**What:** QR codes encode an opaque server-side token (UUID), not the item ID directly. The server owns the mapping. Printing happens server-side (SVG/PNG rendered by `qrcode` npm package), accessible via a signed URL.

**When to use:** Always for item QR codes. Decouples the physical label from any internal ID scheme — items can be reassigned or tokens rotated without reprinting (with care).

**Trade-offs:**
- Pro: No internal IDs exposed in physical labels
- Pro: Token can be invalidated server-side without touching the label
- Con: Scanning requires network connectivity (by design — status update is server-authoritative)

**Example:**
```typescript
// qr.service.ts
import QRCode from 'qrcode';
import { randomUUID } from 'crypto';

async function generateItemQR(itemId: string, storeId: string) {
  const token = randomUUID();
  const url = `https://api.plietschepluenn.de/scan/${token}`;
  const svgBuffer = await QRCode.toBuffer(url, { type: 'png', width: 400 });

  await db.query(
    `INSERT INTO qr_tokens (token, item_id, store_id, created_at) VALUES ($1, $2, $3, NOW())`,
    [token, itemId, storeId]
  );
  return { token, svgBuffer };
}
```

### Pattern 3: Check-In Dual Verification (GPS + Door QR)

**What:** A visit is verified by two independent signals: GPS coordinates must be within a configured radius of the store's lat/lng, AND the user must scan the door QR code (which encodes a store-specific static token). Both must pass within a time window (e.g., 10 minutes of each other) to award check-in points.

**When to use:** This pattern is specific to this app's privacy-preserving model. It allows rewarding presence without tracking individual item take history.

**Trade-offs:**
- Pro: Hard to fake remotely — GPS spoofing and QR spoofing together is high effort
- Pro: No personal item tracking required — only "was here, took N items (self-reported)"
- Con: GPS accuracy indoors varies — use a generous radius (e.g., 200m) plus the QR scan as primary signal
- Con: If QR scan is primary, GPS is a soft guard — decide on enforcement strictness per store

**Example:**
```typescript
// checkin.service.ts
function isWithinRadius(userLat: number, userLng: number, storeLat: number, storeLng: number, radiusMeters: number): boolean {
  // Haversine formula
  const R = 6371000;
  const dLat = toRad(storeLat - userLat);
  const dLng = toRad(storeLng - userLng);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(userLat)) * Math.cos(toRad(storeLat)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= radiusMeters;
}

async function processCheckIn(userId: string, storeId: string, doorToken: string, coords: {lat: number, lng: number}, itemCount: number) {
  const store = await storesRepo.findById(storeId);
  const tokenValid = await qrRepo.verifyDoorToken(doorToken, storeId);
  const locationValid = isWithinRadius(coords.lat, coords.lng, store.lat, store.lng, store.checkin_radius_meters);

  if (!tokenValid || !locationValid) throw new CheckInVerificationError();

  await checkInRepo.record({ userId, storeId, itemCount });
  await pointsService.awardCheckIn(userId, storeId, itemCount);
}
```

## Data Flow

### Request Flow

```
Mobile Action (e.g., scan item QR)
    ↓
React Native CameraView captures QR
    ↓
API Call: POST /api/scan  { token: "uuid" }  + Bearer JWT
    ↓
tenant.ts middleware: extracts storeId from JWT → req.tenantId
auth.ts middleware:   verifies JWT → req.user
    ↓
items.router.ts → items.service.ts
    ↓
qrRepo.resolveToken(token, req.tenantId)  → item record
itemsRepo.markTaken(itemId, req.tenantId) → UPDATE
pointsService.awardScan(userId, storeId)  → INSERT points_events
    ↓
Response: { success: true, item: { title }, pointsEarned: 5 }
    ↓
Mobile: show confirmation, refresh item list + points balance
```

### Check-In Data Flow

```
User scans door QR → gets doorToken
User's GPS captured → coords
    ↓
POST /api/checkin { doorToken, coords, itemCount }
    ↓
checkin.service:
  1. Verify doorToken belongs to store (DB lookup)
  2. Verify GPS within store radius (Haversine)
  3. Check no duplicate check-in within cooldown window (24h)
  4. INSERT check_ins record (no item IDs — privacy by design)
  5. Award points: base + itemCount * pointsPerItem + active campaign multipliers
    ↓
Response: { pointsEarned: N, totalPoints: M }
```

### Points Calculation Flow

```
pointsService.award(userId, storeId, eventType, metadata)
    ↓
campaignsRepo.findActive(storeId, now)
    → returns any active campaigns with their multiplier rules
    ↓
basePoints = POINTS_CONFIG[eventType]       (e.g., SCAN=5, CHECKIN=10, ITEM_COUNT=2)
multiplier = campaign?.multiplierFor(eventType) ?? 1.0
total = Math.round(basePoints * multiplier + metadata.itemCount * POINTS_CONFIG.PER_ITEM * multiplier)
    ↓
INSERT INTO points_events (user_id, store_id, event_type, points, campaign_id, created_at)
UPDATE users SET total_points = total_points + total WHERE id = user_id AND store_id = store_id
```

### State Management (Mobile)

```
React Query (server state):
  - items list (invalidated on scan)
  - user points balance (invalidated on any award event)
  - active campaigns (cached 5 min)

Zustand (local UI state):
  - auth token + user profile
  - current store context (storeId, store name)
  - check-in flow intermediate state (doorToken received, awaiting GPS)
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 stores, <500 users | Current monolith is fine. Single PostgreSQL instance, single Express process in Docker. |
| 5-50 stores, 500-10k users | Add connection pooling (PgBouncer). Separate QR image storage to object store (S3/MinIO) to avoid serving binary from DB. Add Redis for points event deduplication. |
| 50+ stores, 10k+ users | Add read replica for item browsing queries. Consider extracting points/campaigns into separate service if calculation becomes a bottleneck. Add job queue (BullMQ) for async points processing. |

### Scaling Priorities

1. **First bottleneck:** Database connections. Express creates many concurrent connections — PgBouncer in transaction pooling mode solves this without code changes.
2. **Second bottleneck:** QR image generation and serving. Generating PNG on every print request is CPU-bound — cache generated QR images keyed by token, serve from CDN or MinIO.

## Anti-Patterns

### Anti-Pattern 1: Leaking tenant context through business logic

**What people do:** Pass `tenantId` as a parameter deep into service functions and sometimes forget it, or build queries without it in utility functions.

**Why it's wrong:** One missing `WHERE store_id = $1` exposes all tenant data. It's invisible until exploited.

**Do this instead:** Enforce tenant scoping at the repository layer only. Every repository method accepts and requires `storeId`. Middleware guarantees `req.tenantId` is set before any handler runs. Add a PostgreSQL RLS policy as defense-in-depth so even raw DB access can't bypass isolation.

### Anti-Pattern 2: Encoding internal IDs in QR codes

**What people do:** Put `itemId = 42` directly in the QR code payload to simplify scanning.

**Why it's wrong:** Internal IDs are now frozen in printed physical labels. Renumbering items, migrating databases, or rotating tokens requires reprinting all labels. Also exposes sequential IDs to scanning.

**Do this instead:** Encode an opaque UUID token that maps to item + store on the server. The QR code URL is `https://api.example.com/scan/{token}` — the server resolves the mapping.

### Anti-Pattern 3: GPS as the sole check-in verification

**What people do:** Award check-in points on GPS signal alone.

**Why it's wrong:** GPS coordinates can be spoofed trivially via developer mode on Android. A user sitting at home can fake being at the store.

**Do this instead:** Require the door QR scan as the primary gate. GPS is a secondary soft-validation. The door QR code changes periodically (weekly/monthly rotation) so it cannot be easily shared remotely.

### Anti-Pattern 4: Tracking item-level take history per user

**What people do:** Store `taken_by_user_id` on the items table for analytics.

**Why it's wrong:** Contradicts the explicit privacy requirement. Even if anonymized later, the raw data exists and can be subpoenaed or breached.

**Do this instead:** Record only aggregate events: `check_ins (store_id, item_count, timestamp)` and `qr_scans (store_id, item_id, timestamp)` — no user ID linked to specific items. Points awarded from scan events but user↔item link is not persisted.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| `qrcode` npm | Server-side PNG/SVG generation at item creation | Cache output by token UUID; no external API dependency |
| `react-native-vision-camera` or `react-native-scanner` | Native camera module, New Architecture compatible | react-native-scanner (Fabric + Turbo) preferred for bare RN New Architecture |
| `react-native-geolocation-service` | One-shot getCurrentPosition() on check-in flow | Not continuous tracking — single snapshot per check-in action |
| PostgreSQL (Hetzner Docker) | Direct TCP via `pg` node-postgres | PgBouncer in front recommended for production, not required initially |
| Docker / Traefik (existing) | Backend container behind existing Traefik reverse proxy | Use existing Hetzner server infrastructure |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Mobile ↔ Backend | REST over HTTPS, JSON | No WebSockets needed — item status refresh is pull-based (React Query polling or refetch on focus) |
| Items Service ↔ Points Service | Direct function call within monolith | If ever split, convert to internal event queue (BullMQ) |
| Items Service ↔ QR Service | Function call: itemsService calls qrService.generate() at item creation | QR token stored in DB; PNG rendered lazily on print request |
| Check-In Service ↔ Points Service | Direct function call: checkin.service calls pointsService.awardCheckIn() | Points awarded transactionally with check-in record INSERT |
| Backend ↔ PostgreSQL | `pg` Pool with explicit tenant_id in all queries | RLS as secondary enforcement layer |

## Suggested Build Order

Dependencies drive this order — each phase builds on verified foundations:

1. **Database schema + tenant model** — Define `stores` table, add `store_id` to all tables, write migrations. This is the foundation everything else touches.
2. **Auth + tenant middleware** — JWT with `storeId` claim, middleware that populates `req.tenantId`. No feature works correctly without this.
3. **Items CRUD + QR generation** — Core volunteer workflow: create item → generate QR token → return printable label. Validates the QR lifecycle end-to-end.
4. **QR scan + item status update** — Visitor scans item QR → item marked taken. First visitor-facing feature; validates mobile↔backend QR flow.
5. **Check-in flow** — Door QR + GPS → visit recorded. Depends on QR token pattern (step 3) and location validation logic.
6. **Points engine + campaigns** — Award points on scan and check-in events. Depends on steps 4 and 5 providing the event triggers. Campaigns layer on top of base points.
7. **Volunteer dashboard + statistics** — Read-only aggregation over existing data. Depends on all write paths being complete.
8. **Showcase / Schaufenster** — Curated item presentation. Isolated feature; can be deferred without blocking any core flow.

## Sources

- Multi-tenant PostgreSQL strategies: [Crunchy Data — Designing Your Postgres Database for Multi-tenancy](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy), [Simplyblock — Row-Level Security for Multi-Tenant Applications](https://www.simplyblock.io/blog/underated-postgres-multi-tenancy-with-row-level-security/), [AWS — Multi-tenant data isolation with PostgreSQL Row Level Security](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- Layered architecture Node.js: [Bulletproof Node.js architecture — DEV Community](https://dev.to/santypk4/bulletproof-node-js-project-architecture-4epf), [Controller-Service-Repository Pattern — w3tutorials](https://www.w3tutorials.net/blog/controller-service-repository-pattern-nodejs/)
- QR code generation: [react-native-qrcode-svg — npm](https://www.npmjs.com/package/react-native-qrcode-svg), [react-native-scanner — GitHub](https://github.com/pushpender-singh-ap/react-native-scanner)
- GPS location in React Native: [react-native-geolocation-service — GitHub](https://github.com/Agontuk/react-native-geolocation-service), [Build a GPS Tracking App in React Native 2025 — CoderCrafter](https://codercrafter.in/blogs/react-native/build-a-gps-tracking-app-in-react-native-the-2025-ultimate-guide)
- Gamification architecture: [Gamification Architecture Best Practices — Smartico](https://www.smartico.ai/blog-post/gamification-architecture-best-practices)

---
*Architecture research for: Plietsche Plünn — multi-tenant community clothing exchange app*
*Researched: 2026-04-07*
