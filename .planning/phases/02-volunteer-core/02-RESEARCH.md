# Phase 2: Volunteer Core - Research

**Researched:** 2026-04-08
**Domain:** Item-Management (CRUD), QR-Code-Generierung, Mobile Navigation (Bottom Tabs), Store-Info
**Confidence:** HIGH

## Summary

Phase 2 baut auf dem in Phase 1 etablierten Auth-Modul-Muster auf. Die Hauptarbeit besteht aus vier parallelen Strängen: (1) Backend-Modul `items` analog zu `auth` (Router/Service/Repository), (2) Schema-Anpassungen weil das bestehende `items`-Schema nicht mit den CONTEXT-Entscheidungen übereinstimmt, (3) Mobile-Screens für Item-Anlage und -Liste mit Bottom-Tab-Navigation, (4) QR-Code-Generierung server-seitig als PNG.

Ein kritisches Problem: Das existierende `items`-Schema hat `condition` als enum `('neu', 'gut', 'okay')`. Die CONTEXT-Entscheidung lautet jedoch "Admin-konfigurierbare Tags" — das ist ein reines Freitext-Feld, kein Enum. Die Schema-Migration ist zwingend nötig. Zusätzlich fehlen `description` und `openingHours` im `stores`-Schema für STORE-01.

**Primäre Empfehlung:** Schema-Migrations als Wave 0, dann Backend-Module, dann Mobile. `qrcode` npm-Paket (v1.5.4, server-seitig) für PNG-Generierung, `reanimated-color-picker` (v4.2.0) für Farbpicker, Bottom-Tab-Navigation mit `@react-navigation/bottom-tabs` (bereits installiert).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Kategorien:** Feste Liste (Oberteil, Hose, Jacke, Schuhe, Kleid, Accessoire) — erweiterbar durch Admin
- **Zustand:** Admin-konfigurierbare Tags statt fester Stufen — flexibel pro Store, Freitext
- **Größen:** Vordefinierte Presets mit Freitext-Option
  - Erwachsene Kleidung: XS, S, M, L, XL, XXL, 3XL + numerisch 34-48
  - Kindergrößen: 56, 62, 68, 74, 80, 86, 92, 98, 104, 110, 116, 122, 128, 134, 140, 146, 152, 158, 164, 170, 176
  - Schuhgrößen: 18-48
  - Plus Freitext-Eingabe für Sonderfälle
- **Farbe:** Farbpicker (keine vordefinierten Chips)
- **Schnelleingabe:** Defaults vom vorherigen Eintrag übernehmen
- **QR-Code:** UUID-Token (nicht interne ID), Label zeigt QR + Titel + Größe, PNG-Download, Format ca. 5x3cm, 4 pro Reihe auf A4
- **Listen-UX:** Kompakte Listenansicht (Farbpunkt + Titel + Kategorie + Größe), Filter-Chips oben + Suchfeld, Neueste zuerst
- **Store-Info:** Admin kann Öffnungszeiten, Adresse, Beschreibung bearbeiten

### Claude's Discretion
- API-Endpunkt-Design (REST Conventions)
- Konkrete UI-Farben und Styling
- Pagination-Strategie für Item-Liste
- Validation-Regeln für Formularfelder

### Deferred Ideas (OUT OF SCOPE)
- Foto-Upload für Items
- Batch-QR-Druck (mehrere Labels auf einer Seite)
- Item-Bearbeitung nach Erstellung (erstmal nur Anlegen)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ITEM-01 | Ehrenamtliche können Kleidungsstücke anlegen (Titel, Kategorie, Größe, Zustand, Farbe) | Router/Service/Repository-Muster aus auth-Modul direkt übertragbar; Schema-Migration für condition-Feld nötig |
| ITEM-02 | Bei Item-Erstellung wird automatisch QR-Code generiert (UUID-Token, druckbar als PNG) | `qrcode` v1.5.4 server-seitig verfügbar; qrToken-Spalte bereits im Schema; separater GET-Endpoint für PNG |
| ITEM-03 | Items-Liste mit Filter nach Kategorie, Status, Datum | Drizzle WHERE + ORDER BY; mobile FlatList mit Filter-State in Zustand Store |
| ITEM-04 | Schnelleingabe-Modus: Defaults vom vorherigen Eintrag übernehmen für Bulk-Erfassung | Zustand Store hält `lastItem` State, Formular initialisiert sich damit |
| STORE-01 | Store-Infoseite (Öffnungszeiten, Adresse, Beschreibung) | stores-Schema braucht `description` + `openingHours` Spalten; neues stores-Modul analog items |
</phase_requirements>

## Schema-Konflikt (KRITISCH)

Das bestehende Schema muss vor Implementation angepasst werden:

### items-Tabelle: condition-Enum entfernen

**Ist:**
```typescript
condition: text('condition', { enum: ['neu', 'gut', 'okay'] }),
```

**Soll:** [VERIFIED: codebase grep]
```typescript
condition: text('condition'),  // Freitext — Admin-konfigurierbare Tags
```

Drizzle-Migration: `ALTER TABLE items ALTER COLUMN condition TYPE text` (Enum-Constraint entfernen, Spalte bleibt text).

### stores-Tabelle: Fehlende Spalten für STORE-01

**Fehlen:**
- `description: text('description')` — Store-Beschreibung
- `openingHours: text('opening_hours')` — Öffnungszeiten (JSON-String oder einfacher Text)

**Empfehlung:** `openingHours` als `text` (JSON-kodiertes Array für strukturierte Zeiten) — bleibt flexibel, kein pgJSON-Overhead.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qrcode | 1.5.4 | Server-seitige QR-PNG-Generierung | Reifestes npm-Paket, Canvas + Datenbuffer, CONTEXT setzt server-seitig voraus |
| @types/qrcode | 1.5.6 | TypeScript-Types für qrcode | Offizielle Types, aktuell (2025-10) |
| reanimated-color-picker | 4.2.0 | Farbpicker Mobile | Nutzt react-native-reanimated + gesture-handler — beides bereits installiert |
| @react-navigation/bottom-tabs | 7.x | Tab-Navigation nach Login | Bereits installiert (package.json), Standard-Pattern für Volunteer-App |

[VERIFIED: npm registry — npm view qrcode version → 1.5.4, modified 2025-11-13]
[VERIFIED: npm registry — npm view reanimated-color-picker version → 4.2.0, peerDeps: react-native-reanimated >=2.0.0 + gesture-handler >=2.0.0 — beide im Projekt]
[VERIFIED: codebase — @react-navigation/bottom-tabs im mobile/package.json vorhanden]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.0.12 | Mobile State (itemStore) | Bereits installiert — gleich wie authStore |
| zod | 4.3.6 | Input-Validierung Backend | Bereits installiert — gleich wie auth.router.ts |
| drizzle-orm | 0.45.2 | DB-Queries (WHERE, ORDER) | Bereits installiert |

**Installation (nur neue Pakete):**
```bash
# Backend
cd backend && npm install qrcode && npm install --save-dev @types/qrcode

# Mobile
cd mobile && npm install reanimated-color-picker
```

## Architecture Patterns

### Empfohlene Struktur (Backend)

```
backend/src/
├── modules/
│   ├── auth/                    # Phase 1 — unveränderter Referenz-Code
│   ├── items/
│   │   ├── items.types.ts       # CreateItemBody, ItemRow, etc.
│   │   ├── items.repository.ts  # DB-Zugriff via Drizzle
│   │   ├── items.service.ts     # Business-Logik + QR-Token-Generierung
│   │   └── items.router.ts      # Routen + Zod-Validierung
│   └── stores/
│       ├── stores.types.ts
│       ├── stores.repository.ts
│       ├── stores.service.ts
│       └── stores.router.ts
├── db/
│   └── schema.ts                # items.condition zu text; stores + description/openingHours
```

### Empfohlene Struktur (Mobile)

```
mobile/src/
├── navigation/
│   └── AppNavigator.tsx         # Bottom-Tab hinzufügen nach Login
├── screens/
│   ├── auth/                    # Phase 1 — unverändert
│   ├── items/
│   │   ├── ItemCreateScreen.tsx # Formular + QR nach Anlage
│   │   └── ItemListScreen.tsx   # FlatList + Filter/Suche
│   └── store/
│       └── StoreInfoScreen.tsx  # Öffnungszeiten, Adresse
├── store/
│   ├── authStore.ts             # Phase 1 — unverändert
│   └── itemStore.ts             # items[] + lastItem für Schnelleingabe
└── api/
    ├── client.ts                # Phase 1 — unverändert
    └── items.api.ts             # API-Calls für Items-Modul
```

### Pattern 1: Router → Service → Repository (wie auth)

```typescript
// Source: [VERIFIED: codebase — backend/src/modules/auth/auth.router.ts]
// items.router.ts — Express 5 async ohne try/catch
router.post('/', authenticateToken, requireRole('volunteer', 'admin'), async (req, res) => {
  const body = CreateItemSchema.parse(req.body);
  const item = await itemsService.createItem(body, req.user.storeId);
  res.status(201).json(item);
});
```

### Pattern 2: QR-Code PNG-Generierung (server-seitig)

```typescript
// Source: [VERIFIED: npm registry — qrcode v1.5.4 API]
import QRCode from 'qrcode';

// Im Service: QR-PNG als Base64-Buffer
const qrToken = crypto.randomUUID();
const qrPngBuffer = await QRCode.toBuffer(qrToken, {
  type: 'png',
  width: 200,
  margin: 1,
});
```

QR-PNG als separater GET-Endpunkt:
```typescript
// GET /api/items/:id/qr → Content-Type: image/png
router.get('/:id/qr', authenticateToken, async (req, res) => {
  const { qrToken, title, size } = await itemsService.getItemForQr(req.params.id, req.user.storeId);
  const png = await QRCode.toBuffer(qrToken, { type: 'png', width: 400, margin: 2 });
  res.set('Content-Type', 'image/png');
  res.set('Content-Disposition', `attachment; filename="qr-${req.params.id}.png"`);
  res.send(png);
});
```

### Pattern 3: Bottom-Tab-Navigation (Mobile)

```typescript
// Source: [VERIFIED: codebase — @react-navigation/bottom-tabs in package.json]
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();
// AppNavigator: wenn token gesetzt → Tab.Navigator statt einzelnem HomeScreen
// Tabs: Items (Liste), Neu, Store-Info
```

### Pattern 4: Zustand itemStore mit Schnelleingabe-Support

```typescript
// Source: [ASSUMED — basiert auf Phase 1 authStore-Muster]
interface ItemStore {
  items: Item[];
  lastItem: Partial<CreateItemBody> | null;  // für ITEM-04 Defaults
  setItems: (items: Item[]) => void;
  setLastItem: (item: Partial<CreateItemBody>) => void;
}
```

### Pattern 5: Farbpicker-Integration

```typescript
// Source: [VERIFIED: npm registry — reanimated-color-picker v4.2.0]
import ColorPicker, { HueSlider, SaturationValuePicker } from 'reanimated-color-picker';

// Gibt hex-String zurück: '#RRGGBB'
// In DB gespeichert als text (color-Spalte in items)
```

### Anti-Patterns to Avoid

- **QR client-seitig generieren:** Würde react-native-qrcode-svg oder ähnliches erfordern. Server-seitig ist einfacher (kein nativer Code, direkter Download) und CONTEXT legt PNG-Download fest.
- **condition als Enum:** Bereits im Schema so — MUSS geändert werden. Enum verhindert Admin-konfigurierbare Tags.
- **items.router.ts ohne storeId-Filter:** Jede DB-Query muss `WHERE store_id = req.user.storeId` haben — Multi-Tenant-Readiness aus INFRA-03.
- **Navigation direkt auf HomeScreen ersetzen:** AppNavigator muss Bottom-Tabs einbauen, bestehender HomeScreen-Stack bleibt als Fallback.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR-Code-Generierung | Eigener QR-Algorithmus | `qrcode` npm | Reed-Solomon-Encoding, Versionsauswahl, Fehlerkorrektur — 1000 Zeilen Logik |
| Farbpicker | Eigenes Color-Wheel | `reanimated-color-picker` | HSV-Konversion, Touch-Handling, Alpha-Kanal — komplex |
| UUID für QR-Token | Eigener Token-Generator | `crypto.randomUUID()` | Node.js built-in, kryptografisch sicher, keine Dependencies |
| Pagination | Eigenes Cursor-System | Drizzle `.limit().offset()` | Standard SQL, ausreichend für v1 |
| Hex→Farbpunkt Mobile | Canvas/SVG | Inline `backgroundColor` mit hex-String | React Native unterstützt hex direkt in style |

**Key insight:** QR-Generierung ist scheinbar einfach aber hat ~20 Parameter (Fehlerkorrektur-Level, Version, Maske, Encoding). `qrcode` handhabt alles automatisch.

## Common Pitfalls

### Pitfall 1: storeId fehlt in WHERE-Klauseln
**What goes wrong:** Items aus anderen Stores werden angezeigt/bearbeitbar
**Why it happens:** Drizzle-Queries ohne Filter schreiben sich einfach — filter vergessen
**How to avoid:** Repository-Funktionen nehmen `storeId: string` als Pflicht-Parameter
**Warning signs:** TypeScript zeigt keine Warnung — manuell reviewen

### Pitfall 2: QR-PNG Response-Header fehlen
**What goes wrong:** Browser/Mobile zeigt PNG als Text oder lädt nicht korrekt
**Why it happens:** `res.send(buffer)` ohne `Content-Type: image/png`
**How to avoid:** Immer `res.set('Content-Type', 'image/png')` vor `res.send()`
**Warning signs:** Mobile fetch gibt leeren oder kaputten Response

### Pitfall 3: Bottom-Tab mit Stack-Navigator verschachteln
**What goes wrong:** Navigation-State korrupt, Back-Button-Verhalten falsch
**Why it happens:** `createBottomTabNavigator` und `createStackNavigator` brauchen klare Hierarchie
**How to avoid:** Tab-Navigator als Root nach Login; kein Stack innerhalb Tab ohne eigenen Stack-Navigator pro Tab
**Warning signs:** TypeScript-Fehler bei Navigationtypen

### Pitfall 4: condition-Spalte Enum-Constraint in laufender DB
**What goes wrong:** INSERT mit freiem Text schlägt fehl obwohl Code korrekt
**Why it happens:** Schema geändert, aber DB-Migration nicht ausgeführt
**How to avoid:** `drizzle-kit generate && drizzle-kit migrate` vor erstem INSERT-Test auf Server
**Warning signs:** HTTP 500 aus Drizzle mit "invalid input value for enum"

### Pitfall 5: Großen QR-PNG-Buffer direkt in JSON
**What goes wrong:** JSON-Response wird sehr groß (>50KB) wenn PNG als Base64 in Body
**Why it happens:** Versuchung, QR direkt im createItem-Response mitzuschicken
**How to avoid:** createItem gibt nur Item-Metadaten zurück; QR kommt via separaten GET /:id/qr Endpoint
**Warning signs:** Response-Size deutlich > 10KB für einen einzelnen Item-Create

### Pitfall 6: reanimated-color-picker ohne GestureHandlerRootView
**What goes wrong:** Touch-Events im Farbpicker funktionieren nicht
**Why it happens:** react-native-gesture-handler braucht `GestureHandlerRootView` als Root-Wrapper
**How to avoid:** In App.tsx (oder top-level) `GestureHandlerRootView` einbinden
**Warning signs:** Farbpicker rendert, reagiert aber nicht auf Touch

## Code Examples

### API-Design (Claude's Discretion)

```
POST   /api/items              → 201 { item }     [volunteer, admin]
GET    /api/items              → 200 { items, total, page }  [volunteer, admin]
GET    /api/items/:id/qr       → 200 PNG-Binary   [volunteer, admin]
GET    /api/stores/info        → 200 { store }    [public oder visitor+]
PATCH  /api/stores/info        → 200 { store }    [admin]
```

Query-Parameter für GET /api/items:
- `category` — Filter nach Kategorie
- `status` — 'active' | 'taken'
- `search` — ILIKE auf title
- `page`, `limit` — Pagination (default: limit=20)
- `sort` — 'createdAt' (default: desc)

### Drizzle WHERE mit mehreren Filtern

```typescript
// Source: [VERIFIED: codebase — Drizzle ORM v0.45.2 im Projekt]
import { and, eq, ilike, desc } from 'drizzle-orm';

async function findItems(storeId: string, filters: ItemFilters) {
  const conditions = [eq(items.storeId, storeId)];
  if (filters.category) conditions.push(eq(items.category, filters.category));
  if (filters.status) conditions.push(eq(items.status, filters.status));
  if (filters.search) conditions.push(ilike(items.title, `%${filters.search}%`));

  return db
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(desc(items.createdAt))
    .limit(filters.limit ?? 20)
    .offset((filters.page ?? 0) * (filters.limit ?? 20));
}
```

### QR-Token UUID — crypto.randomUUID()

```typescript
// Source: [ASSUMED — Node.js built-in crypto API, kein npm-Import nötig]
import crypto from 'crypto';

const qrToken = crypto.randomUUID();
// Spalte qr_token ist uuid + unique in der DB — Kollision theoretisch möglich aber praktisch ausgeschlossen
```

### itemStore Zustand (Schnelleingabe-Modus)

```typescript
// Source: [VERIFIED: codebase — zustand v5.0.12 Muster aus authStore.ts]
import { create } from 'zustand';

interface ItemStore {
  lastItem: Partial<CreateItemBody> | null;
  setLastItem: (item: Partial<CreateItemBody>) => void;
}

export const useItemStore = create<ItemStore>((set) => ({
  lastItem: null,
  setLastItem: (item) => set({ lastItem: item }),
}));

// In ItemCreateScreen: Formular initialisiert sich mit lastItem-Werten
// Nach erfolgreichem CREATE: setLastItem(formValues) aufrufen
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-native-qrcode (client) | qrcode server-seitig | — | Kein nativer Code, direkter PNG-Download, kein Recompile |
| Fixed condition enum | Freitext-Feld | CONTEXT-Entscheidung Phase 2 | Schema-Migration nötig, aber flexibler |
| Single Stack Navigator | Bottom Tabs nach Login | Phase 2 | Volunteer-UX mit Tab-basierter Navigation |

**Deprecated/outdated:**
- `condition` enum `('neu', 'gut', 'okay')` im bestehenden Schema — durch CONTEXT-Entscheidung überholt, Migration zwingend

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `crypto.randomUUID()` verfügbar in Node.js-Version des Servers (>=14.17) | Code Examples | Sehr gering — Node.js 22 Requirement im package.json |
| A2 | `GestureHandlerRootView` nicht bereits in App.tsx eingebunden | Common Pitfalls | Einfach zu prüfen — wenn bereits da, kein Problem |
| A3 | Drizzle-Enum für `condition` erfordert explizite Migration (nicht automatisch) | Schema-Konflikt | Wenn falsch: INSERT schlägt auf Server fehl — sichtbar beim ersten Test |

## Open Questions

1. **openingHours Datenformat**
   - Was wir wissen: STORE-01 braucht editierbare Öffnungszeiten
   - Was unklar: Strukturiertes Objekt (Mo-So mit Zeiten) vs. freier Text?
   - Empfehlung: Freitext als `text` (z.B. "Mo-Fr 10-17 Uhr, Sa 10-14 Uhr") — einfach, Admin-editierbar, kein Schema-Overhead. Kann in v1.x strukturiert werden.

2. **QR-Label-Format für Download**
   - Was wir wissen: PNG mit QR + Titel + Größe, ca. 5x3cm
   - Was unklar: Wird das Label als kombiniertes PNG (QR + Text) generiert oder nur der reine QR?
   - Empfehlung: Reiner QR als PNG (qrcode kann Text nicht einbetten). Titel+Größe auf dem Label werden im HTML/CSS beim Drucken unter den QR gesetzt — oder Mobile rendert View mit QR-Image + Text und nutzt react-native-view-shot für Export. Einfachster v1-Weg: Reiner QR-PNG, Mobile zeigt QR + Text nebeneinander, Drucken über Share-Sheet.

3. **Größen-Auswahl UX**
   - Was wir wissen: Drei Preset-Gruppen + Freitext
   - Was unklar: Wie wechselt der Nutzer zwischen Erwachsene/Kinder/Schuhe?
   - Empfehlung: Dropdown/Picker für Größen-Gruppe (Erwachsene/Kinder/Schuhe), dann Preset-Chips, plus Freitext-Feld immer sichtbar.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >=22 | Backend Build | ✓ | Aus package.json engines | — |
| PostgreSQL | Backend DB | ✓ | Deployed auf server.godsapp.de | — |
| Docker | Backend Deploy | ✓ (Server) | Portainer Stack #261 | — |
| Docker lokal | Lokaler Test | ✗ | — | Tests nur auf Server |
| qrcode npm | QR-Generierung | Installation nötig | 1.5.4 | — |
| reanimated-color-picker | Farbpicker Mobile | Installation nötig | 4.2.0 | Einfaches TextInput für Hex-Code |
| react-native-reanimated | Farbpicker Dep | ✓ | 4.3.0 (installiert) | — |
| react-native-gesture-handler | Farbpicker Dep | ✓ | 2.31.0 (installiert) | — |

**Missing dependencies mit no fallback:**
- Keine — alle Blocking-Dependencies sind vorhanden oder einfach installierbar.

**Missing dependencies mit fallback:**
- `reanimated-color-picker`: Bei Problemen alternativ Hex-TextInput (`#RRGGBB`) als primitives Fallback.

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] — backend/src/db/schema.ts, app.ts, modules/auth/*, mobile/package.json, backend/package.json
- [VERIFIED: npm registry] — `npm view qrcode version` → 1.5.4 (2025-11-13), `npm view reanimated-color-picker version` → 4.2.0

### Secondary (MEDIUM confidence)
- [CITED: npm qrcode README] — `QRCode.toBuffer(text, { type: 'png' })` API — Standard-Nutzung

### Tertiary (LOW confidence)
- Keine LOW-confidence Claims in dieser Research

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Pakete via npm registry verifiziert, Peer-Dependencies geprüft
- Architecture: HIGH — Direkt aus bestehendem Phase-1-Code abgeleitet
- Pitfalls: MEDIUM — Bekannte RN/Express-Muster, ein Punkt (Pitfall 4) codebase-verified
- Schema-Konflikt: HIGH — Direkt aus schema.ts vs. CONTEXT.md abgeleitet, keine Annahme

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stabile Libraries, npm-Pakete unverändert)
