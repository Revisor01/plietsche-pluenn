# Phase 1: Foundation - Research

**Researched:** 2026-04-07
**Domain:** React Native bare (New Architecture) + Express 5 + PostgreSQL + Drizzle ORM + JWT Auth
**Confidence:** HIGH (Stack-Versionen npm-verifiziert, Architektur aus vorheriger Projektrecherche)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- React Native 0.82+ with New Architecture (mandatory NA)
- Express 5 (async error handling built-in)
- Drizzle ORM with drizzle-kit for migrations
- PostgreSQL with store_id in all tables (Multi-Tenant-ready)
- JWT auth with bcrypt, three roles: admin, volunteer, visitor
- Router → Service → Repository backend layering
- react-native-vision-camera v4 for QR (install in Phase 1, use in Phase 3)
- @react-navigation/native v7 for navigation

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and research findings (STACK.md, ARCHITECTURE.md) to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | React Native bare (New Architecture) Projekt-Setup ohne Expo, iOS + Android Build-fähig | RN 0.85.0 aktuell; bare-Init via `npx react-native@latest init`; New Architecture ist ab 0.82 Pflicht und nicht deaktivierbar |
| INFRA-02 | Express 5 Backend mit Router → Service → Repository Layering | Express 5.2.1 aktuell; Modulstruktur mit `modules/{feature}/{feature}.router.ts` etc. |
| INFRA-03 | PostgreSQL-Datenbank mit Drizzle ORM, store_id-Spalte in allen Tabellen | Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 aktuell; pg 8.20.0 als Treiber |
| INFRA-04 | JWT-Authentifizierung mit Rollen (admin, volunteer, visitor) | jsonwebtoken 9.0.3 + bcrypt 6.0.0 aktuell; Rollen-Middleware als separater Guard |
</phase_requirements>

---

## Summary

Phase 1 richtet den gesamten Produktions-Stack ein: React Native bare App (Expo komplett ersetzt), Express 5 Backend mit TypeScript und Modular-Architektur, PostgreSQL mit Drizzle ORM, sowie JWT-Auth mit drei Rollen. Dies ist eine Greenfield-Neuimplementierung — der bestehende Code (`server.js` mit SQLite, `mobile/` mit Expo) dient nur als Referenz für Patterns und wird vollständig ersetzt.

Die bestehende `mobile/` App ist Expo-basiert (expo 53, react-native 0.79.5) und kann nicht direkt migriert werden. Ein neues bare React Native Projekt muss von Grund auf initialisiert werden. Das Backend `server.js` ist ein Express 4 Monolith mit SQLite — es liefert nützliche Auth-Pattern-Referenzen (JWT-Flow, bcrypt-Hashing), aber der gesamte Code wird in TypeScript mit Express 5 und Drizzle ORM neu geschrieben.

Die kritischen Erfolgsfaktoren für Phase 1 sind: (1) saubere New Architecture-Kompatibilität aller nativen Libraries von Anfang an — kein Interop-Layer, (2) Drizzle-Schema mit `store_id` UUID auf allen Tabellen sofort einrichten (nachrüsten ist aufwendiger), (3) JWT-Payload muss von Anfang an `storeId` und `role` enthalten damit spätere Middleware ohne Änderungen funktioniert.

**Primary recommendation:** Backend zuerst aufsetzen (PostgreSQL, Drizzle-Schema, Auth-Endpoints), dann React Native bare init, dann Navigation + Login-Screen als Integration-Smoke-Test.

---

## Standard Stack

### Core (verifizierte Versionen)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native | **0.85.0** | Mobile Framework | 0.82+ erzwingt New Architecture; 0.85 ist aktuell latest [VERIFIED: npm registry] |
| react | 19.0.0 | UI Rendering | Wird mit RN 0.85 mitgeliefert; New Architecture benötigt React 18+ [ASSUMED: peer dep] |
| express | **5.2.1** | HTTP API Server | Stabiler Release seit Okt 2024; async error propagation built-in [VERIFIED: npm registry] |
| typescript | **6.0.2** | Type Safety | Beide Codebases; Drizzle und RN New Architecture TypeScript-first [VERIFIED: npm registry] |
| drizzle-orm | **0.45.2** | ORM / Query Builder | TypeScript-native, zero binary deps, SQL-ähnliche API [VERIFIED: npm registry] |
| drizzle-kit | **0.31.10** | Schema Migrations CLI | Paart mit drizzle-orm, generiert reviewbare SQL-Migrations [VERIFIED: npm registry] |
| pg | **8.20.0** | PostgreSQL Treiber | Kanonischer Node.js Postgres-Treiber, 13k+ Dependents [VERIFIED: npm registry] |

### Auth & Security

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsonwebtoken | **9.0.3** | JWT generate/verify | Standard; bereits im bestehenden Backend verwendet [VERIFIED: npm registry] |
| bcrypt | **6.0.0** | Passwort-Hashing | Intentional slow, korrekt für Passwörter [VERIFIED: npm registry] |
| helmet | **8.1.0** | HTTP Security Headers | Pflicht für jede Produktions-API; fehlt im aktuellen Backend [VERIFIED: npm registry] |
| zod | **4.3.6** | Input Validation | Request bodies validieren vor DB-Zugriff; TypeScript-native [VERIFIED: npm registry] |
| cors | 2.x | CORS Headers | Bereits im Backend; behalten [ASSUMED] |
| dotenv | 16.x | Env-Variable-Loading | Bereits im Backend; behalten [ASSUMED] |

### Mobile — Navigation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-navigation/native | **7.2.2** | Navigation Core | Industry Standard, NA-kompatibel [VERIFIED: npm registry] |
| @react-navigation/stack | **7.8.9** | Stack Navigation | Screens übereinander [VERIFIED: npm registry] |
| @react-navigation/bottom-tabs | **7.15.9** | Tab Bar | Rolle-basierte Tabs [VERIFIED: npm registry] |
| react-native-screens | **4.24.0** | Native Screen Container | Required by react-navigation; NA-native ab 4.25 [VERIFIED: npm registry] |
| react-native-safe-area-context | **5.7.0** | Safe Area Insets | Required by react-navigation [VERIFIED: npm registry] |

### Mobile — Phase-3-Libraries (jetzt installieren, Phase 3 aktivieren)

| Library | Version | Purpose | Phase |
|---------|---------|---------|-------|
| react-native-vision-camera | **4.7.3** | Camera + QR Scanning | In Phase 1 installieren, erst Phase 3 verwenden [VERIFIED: npm registry] |
| react-native-geolocation-service | **5.3.1** | GPS für Check-In | In Phase 1 installieren, erst Phase 3 verwenden [VERIFIED: npm registry] |
| react-native-reanimated | **4.3.0** | Animations | NA-only; v3 in Maintenance Mode [VERIFIED: npm registry] |
| react-native-gesture-handler | **2.31.0** | Gestures | v3 (NA-native) noch Beta; v2 für Produktion [VERIFIED: npm registry] |

**Wichtig zu react-native-worklets:** Version **0.8.1** ist aktuell [VERIFIED: npm registry] — wird als Peer-Dependency von react-native-reanimated v4 benötigt.

### Installation

```bash
# Backend
cd backend
npm install express@5 pg drizzle-orm jsonwebtoken bcrypt cors dotenv helmet zod
npm install -D drizzle-kit nodemon typescript ts-node @types/express @types/pg @types/jsonwebtoken @types/bcrypt @types/cors

# Neue React Native App (ersetzt mobile/)
npx react-native@latest init PlietschePluenn --directory mobile-new

# Mobile — Navigation
cd mobile-new
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Mobile — Phase-3-Libraries (jetzt installieren)
npm install react-native-vision-camera react-native-geolocation-service
npm install react-native-reanimated react-native-worklets react-native-gesture-handler

# iOS Pods
cd ios && pod install
```

---

## Architecture Patterns

### Empfohlene Projektstruktur

```
backend/
├── src/
│   ├── app.ts               # Express app wiring, middleware chain
│   ├── server.ts            # Entry point, port listen
│   ├── middleware/
│   │   ├── auth.ts          # JWT verify → req.user
│   │   ├── requireRole.ts   # requireRole('volunteer') Guard
│   │   └── tenant.ts        # storeId aus JWT → req.storeId
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.router.ts
│   │       ├── auth.service.ts
│   │       └── auth.types.ts
│   ├── db/
│   │   ├── client.ts        # pg Pool Setup
│   │   ├── schema.ts        # Drizzle Schema (users, stores, items)
│   │   ├── migrations/      # drizzle-kit generierte SQL-Dateien
│   │   └── seed.ts          # Seed-Daten für Entwicklung
│   └── config.ts            # Env-Variablen typisiert via zod
mobile/                      # ERSETZT durch neue bare RN App
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   └── HomeScreen.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx  # Auth-State-basierte Navigation
│   └── api/
│       └── client.ts         # Axios-Instanz mit Token-Injection
```

### Pattern 1: Express 5 Router → Service → Repository

**Was:** Feature-Module mit klarer Schichtentrennung. Router validiert Input (zod), Service enthält Business Logic, Repository macht DB-Queries.

**Wann:** Immer. Ermöglicht unabhängige Tests jeder Schicht.

**Beispiel:**
```typescript
// auth.router.ts
import { Router } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';

const router = Router();

const RegisterSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  storeId: z.string().uuid(),
});

// Express 5: async Fehler propagieren automatisch — kein try/catch nötig
router.post('/register', async (req, res) => {
  const body = RegisterSchema.parse(req.body); // wirft ZodError bei Fehler
  const result = await authService.register(body);
  res.status(201).json(result);
});

export default router;
```

### Pattern 2: Drizzle Schema mit store_id von Anfang an

**Was:** Alle tenant-bezogenen Tabellen bekommen `store_id` als UUID NOT NULL-Spalte. Schema wird TypeScript-first in `db/schema.ts` definiert.

**Wann:** Sofort beim ersten Schema-Entwurf. Nachrüsten ist Migration-aufwendig.

**Beispiel:**
```typescript
// db/schema.ts
import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'volunteer', 'visitor'] }).notNull().default('visitor'),
  plietschPoints: integer('plietsch_points').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  title: text('title').notNull(),
  category: text('category').notNull(),
  status: text('status', { enum: ['active', 'taken'] }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Pattern 3: JWT mit storeId + role im Payload

**Was:** Token enthält `{ sub: userId, storeId, role }`. Auth-Middleware setzt `req.user` mit diesen Feldern. Role-Guard prüft `req.user.role`.

**Wann:** Von Anfang an — spätere Middleware-Änderungen erfordern sonst Token-Invalidierung aller aktiver Sessions.

**Beispiel:**
```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface AuthUser {
  sub: string;   // userId
  storeId: string;
  role: 'admin' | 'volunteer' | 'visitor';
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  
  const user = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
  (req as any).user = user;
  next();
  // Express 5: jwt.verify wirft → Express fängt automatisch, kein try/catch nötig
}

// middleware/requireRole.ts
export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

### Pattern 4: React Navigation auth-basiertes Root-Routing

**Was:** AppNavigator prüft Auth-State und rendert entweder AuthStack (Login) oder AppStack (Homescreen). Kein manuelles Redirect-Logic in Screens.

**Beispiel:**
```typescript
// navigation/AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';

const Stack = createStackNavigator();

export function AppNavigator() {
  const token = useAuthStore((s) => s.token);
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Anti-Patterns vermeiden

- **Expo-Abhängigkeiten behalten:** `expo-barcode-scanner`, `expo-camera`, `expo-location` funktionieren NICHT in einem bare RN Projekt ohne Expo Config Plugins. Vollständig entfernen.
- **Express 4 Error-Handling beibehalten:** Kein `express-async-errors` npm-Paket nötig; Express 5 fängt async Fehler nativ.
- **SQLite beibehalten:** `database.sqlite` im Root des Projekts ist das bestehende Dev-Artefakt. PostgreSQL von Tag 1.
- **JWT ohne storeId/role:** Token muss Rollen- und Tenant-Information von Anfang an enthalten.
- **Integer Primary Keys:** Bestehender Code nutzt `INTEGER PRIMARY KEY AUTOINCREMENT`. Neues Schema nutzt UUIDs (`uuid().primaryKey().defaultRandom()`).

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Verwende stattdessen | Warum |
|---------|-------------------|----------------------|-------|
| Request Body Validation | Custom type-checker | `zod` | Edge cases: verschachtelte Objekte, Typ-Coercion, TypeScript-Integration |
| Passwort-Hashing | `crypto.createHash('sha256')` | `bcrypt` | SHA256 ist zu schnell für Passwörter; bcrypt ist intentional slow mit Salt |
| JWT generieren/verifizieren | Eigene HMAC-Signatur | `jsonwebtoken` | Edge cases: exp-Validierung, algorithm-confusion attacks |
| DB-Schema-Migrations | Hand-geschriebene SQL-Dateien | `drizzle-kit generate + migrate` | Diffing, Rollback-Tracking, TypeScript-Schema als Source of Truth |
| HTTP Security Headers | Einzelne `res.setHeader()` Aufrufe | `helmet` | Helmet setzt ~15 Security-Header korrekt, inklusive CSP, HSTS, X-Content-Type |
| Navigation Auth-State | `if (token) navigate('Home')` in jedem Screen | React Navigation conditional stack | Race conditions, Deep-Link-Handling, Back-Button-Verhalten |

---

## Common Pitfalls

### Pitfall 1: Expo-Abhängigkeiten nicht vollständig entfernt

**Was schief geht:** Die bestehende `mobile/` App hat `expo`, `expo-barcode-scanner`, `expo-camera`, `expo-status-bar`. Ein neues bare RN Projekt, das diese Pakete enthält, bricht beim Build oder verhält sich unerwartet.

**Warum es passiert:** Neues Projekt wird neben dem alten aufgesetzt; alte `package.json` wird als Basis verwendet.

**Wie vermeiden:** Neues bare RN Projekt mit `npx react-native@latest init` erstellen — komplett von Null. Keine Dateien aus dem Expo-Projekt übernehmen außer explizit referenzierten Patterns.

**Warnsignal:** `expo` im `package.json` des neuen Projekts.

### Pitfall 2: react-native-screens Version und New Architecture

**Was schief geht:** react-native-screens < 4.25 hat unvollständigen NA-Support. Screens können blank bleiben oder Lifecycle-Events kommen falsch.

**Warum es passiert:** npm installiert kompatible Version, nicht zwingend die neueste NA-native Version.

**Wie vermeiden:** Explizit `react-native-screens@^4.24` pinnen (aktuell 4.24.0). Dokumentieren, dass v4.25+ vollständig NA-native wird wenn released.

**Warnsignal:** Leerer Screen nach Navigation ohne JS-Error.

### Pitfall 3: Drizzle-Kit Migrations-Flow verwechselt

**Was schief geht:** `drizzle-kit push` und `drizzle-kit generate` + `migrate` sind unterschiedliche Workflows. `push` modifiziert die DB direkt (für Prototyping), `generate` + `migrate` erstellt reviewbare SQL-Dateien (für Produktion). Wenn beide gemischt werden, ist der Migrations-Stand unklar.

**Warum es passiert:** Docs zeigen beide Flows ohne klare Empfehlung für welchen Use Case.

**Wie vermeiden:** Nur `drizzle-kit generate` + `drizzle-kit migrate` verwenden. Migrations-Dateien in git committen. `push` nie in Produktion.

**Warnsignal:** Keine SQL-Migrations-Dateien im Repository vorhanden.

### Pitfall 4: bcrypt Version und Node.js 25

**Was schief geht:** `bcrypt` v5.x (aus dem bestehenden Backend) hat bekannte Kompilierungsprobleme mit neueren Node.js-Versionen. Die lokale Node.js-Version ist **25.9.0** — signifikant neuer als der LTS-Bereich.

**Warum es passiert:** bcrypt nutzt ein native Addon (`node-gyp`). Bindings müssen für die jeweilige Node.js-Version kompiliert sein.

**Wie vermeiden:** `bcrypt` **6.0.0** verwenden (aktuell verifiziert). Alternativ `bcryptjs` (pure JS, keine native Deps) falls Kompilierungsprobleme auftreten.

**Warnsignal:** `npm install bcrypt` wirft Compiler-Fehler oder Bindings-Fehler beim Start.

### Pitfall 5: PostgreSQL-Verbindung in Docker lokal

**Was schief geht:** Backend läuft lokal, PostgreSQL läuft in Docker — Port-Mapping und Host-Konfiguration müssen stimmen. `localhost` funktioniert nicht immer wenn Docker auf macOS läuft.

**Warum es passiert:** macOS Docker Desktop nutzt eine VM, `host.docker.internal` statt `localhost`.

**Wie vermeiden:** `.env` mit `DATABASE_URL=postgresql://user:password@localhost:5432/plietschepluenn`. Docker Compose mit Port-Binding `5432:5432`. Verbindungstest vor erstem Drizzle-Migrate-Lauf.

**Warnsignal:** `ECONNREFUSED ::1:5432` beim Backend-Start.

### Pitfall 6: react-native-reanimated v4 Peer Dependency

**Was schief geht:** react-native-reanimated v4 benötigt `react-native-worklets` als Peer Dependency. Fehlt es, bricht Reanimated mit unklarem Fehler.

**Warum es passiert:** npm installiert keine Peer Dependencies automatisch.

**Wie vermeiden:** Immer gemeinsam installieren: `npm install react-native-reanimated react-native-worklets`

**Warnsignal:** `Cannot find native module 'RNWorklets'` beim App-Start.

---

## Code Examples

### Drizzle pg-Client Setup

```typescript
// db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

### drizzle.config.ts für Migrations

```typescript
// drizzle.config.ts (im backend root)
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### Express 5 App Setup mit Helmet + Zod Error Handler

```typescript
// app.ts
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ZodError } from 'zod';
import authRouter from './modules/auth/auth.router';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

// Globaler Error Handler (Express 5)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', issues: err.issues });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
```

### react-native-vision-camera: Minimale Installation (Phase 1 — nur einrichten)

```typescript
// Phase 1: Nur als Dependency vorhanden, noch keine Verwendung.
// Phase 3 aktiviert: import { Camera } from 'react-native-vision-camera'
// iOS Info.plist benötigt:
//   NSCameraUsageDescription
// Android Manifest benötigt:
//   <uses-permission android:name="android.permission.CAMERA" />
```

---

## State of the Art

| Alte Praxis | Aktuelle Praxis | Geändert | Impact |
|-------------|-----------------|----------|--------|
| Expo Managed Workflow | React Native bare, New Architecture | 2025 (0.82) | Expo explizit out-of-scope; NA ist Standard |
| Express 4 mit express-async-errors | Express 5 native async error propagation | Oktober 2024 (stable) | Kein `try/catch` in Route-Handlern nötig |
| Drizzle 0.3x–0.4x | Drizzle 0.45.2 (stable, kein v1 beta) | 2025 | v1.0.0 beta existiert — für Produktion 0.45.x verwenden |
| `INTEGER PRIMARY KEY AUTOINCREMENT` (SQLite) | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | Bei PostgreSQL-Migration | UUIDs verhindern ID-Enumeration, ermöglichen offline-generierte IDs |
| react-native-reanimated v3 | react-native-reanimated v4 (NA-only) | 2025 | v3 in Maintenance Mode, keine neuen Features |
| bcrypt v5 | bcrypt v6 | 2025 | Node.js Kompatibilität verbessert [VERIFIED: npm registry] |

**Deprecated:**
- `expo-barcode-scanner`: Expo SDK — nicht in bare RN verwendbar
- `expo-camera`: Ersetzt durch `react-native-vision-camera`
- `expo-location`: Ersetzt durch `react-native-geolocation-service`
- `react-native-camera`: Abandoned seit 2022, kein NA Support

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React Peer-Version 19.0.0 wird mit RN 0.85 mitgeliefert | Standard Stack | Falsche React-Version kann New Architecture Breaking Changes verursachen — vor Init prüfen |
| A2 | cors 2.x und dotenv 16.x sind zu behalten und kompatibel | Standard Stack | Unwahrscheinlich; beide sehr stabil |
| A3 | `npx react-native@latest init` erstellt 0.85.0 Projekt | Patterns | Könnte eine neue Version erstellen — kein Problem, Hauptsache 0.82+ |
| A4 | react-native-screens 4.24.0 hat ausreichend NA-Support für Phase 1 (Login+Nav) | Standard Stack | Blank Screen Bug möglich; v4.25 wäre besser wenn released |

**Alle anderen Stack-Versionen sind npm-verifiziert.**

---

## Open Questions

1. **PostgreSQL lokal vs. Docker für Entwicklung**
   - Was wir wissen: Hetzner-Server läuft PostgreSQL in Docker. Lokal ist Node.js 25.9.0 vorhanden.
   - Was unklar: Soll PostgreSQL lokal via Homebrew oder Docker laufen?
   - Empfehlung: Docker Compose für PostgreSQL (Konsistenz mit Produktionsumgebung). Plan soll `docker-compose.yml` für lokales Dev-Setup einschließen.

2. **Backend-Verzeichnis: Neues Projekt oder vorhandenes `backend/` umschreiben?**
   - Was wir wissen: Bestehendes `backend/` enthält `server.js` (CommonJS, kein TypeScript, Express 4, SQLite).
   - Empfehlung: Vorhandenes `backend/`-Verzeichnis in-place umschreiben — `src/` anlegen, TypeScript einrichten, `server.js` am Ende entfernen. Vermeidet Verwirrung durch zwei Backend-Verzeichnisse.

3. **Mobile: Altes Expo-Verzeichnis beibehalten oder ersetzen?**
   - Was wir wissen: `mobile/` ist Expo-basiert und wird vollständig ersetzt.
   - Empfehlung: Neues bare-Projekt IN `mobile/` initialisieren (Verzeichnis löschen, dann `init --directory mobile`). Kein Parallelbetrieb.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | ✓ | 25.9.0 | — |
| npm | Package management | ✓ | 11.12.1 | — |
| Xcode CLI | iOS Simulator Build | ✓ | 2416 | — |
| iOS Simulator (iPhone 16 Pro) | INFRA-01 iOS | ✓ | Shutdown | Starten mit `xcrun simctl boot` |
| adb | Android Build | ✓ | 37.0.0 | — |
| PostgreSQL | INFRA-03 | ✗ | — | Docker Compose (empfohlen) |
| Docker | PostgreSQL local | Nicht geprüft | — | Homebrew PostgreSQL |

**Fehlende Dependencies ohne Fallback:**
- Keine — PostgreSQL via Docker Compose ist Standard-Fallback.

**Fehlende Dependencies mit Fallback:**
- PostgreSQL: Nicht lokal installiert — Docker Compose oder `brew install postgresql@16`
- Android Device/Emulator: adb vorhanden, aber kein Emulator gestartet — Plan muss `emulator @device_name` oder physisches Gerät einschließen

**Hinweis Node.js 25.9.0:** Express 5 und Drizzle unterstützen Node.js >=18. Node 25 ist aktuell (April 2026) — kein LTS, aber stabil. Native Addons (bcrypt v6) müssen für Node 25 kompiliert werden. Bei Kompilierungsproblemen: `bcryptjs` (pure JS) als Drop-in-Ersatz.

---

## Sources

### Primary (HIGH confidence — npm-verifiziert 2026-04-07)
- npm registry — react-native 0.85.0, express 5.2.1, drizzle-orm 0.45.2, drizzle-kit 0.31.10, pg 8.20.0
- npm registry — jsonwebtoken 9.0.3, bcrypt 6.0.0, helmet 8.1.0, zod 4.3.6
- npm registry — @react-navigation/native 7.2.2, react-native-screens 4.24.0, react-native-safe-area-context 5.7.0
- npm registry — react-native-vision-camera 4.7.3, react-native-reanimated 4.3.0, react-native-gesture-handler 2.31.0, react-native-geolocation-service 5.3.1
- npm registry — react-native-worklets 0.8.1, typescript 6.0.2

### Secondary (MEDIUM confidence — STACK.md + ARCHITECTURE.md aus Projekt-Init, 2026-04-07)
- .planning/research/STACK.md — Vollständige Stack-Analyse mit Begründungen
- .planning/research/ARCHITECTURE.md — Module-Struktur, Middleware-Patterns, Drizzle-Schema-Patterns
- .planning/research/PITFALLS.md — RN New Architecture Pitfalls, bcrypt/GPS/RLS Gotchas

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Versionen npm-verifiziert
- Architecture: HIGH — aus Projekt-Init-Recherche mit verifizierten Quellen
- Pitfalls: HIGH für bekannte (STACK.md), MEDIUM für Node 25-spezifische bcrypt-Probleme

**Research date:** 2026-04-07
**Valid until:** 2026-07-07 (stabile Stack, npm-Versionen können sich ändern aber Patterns bleiben)
