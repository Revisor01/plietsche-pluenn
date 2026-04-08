# Phase 3: Visitor Experience — Research

**Researched:** 2026-04-08
**Domain:** QR-Scan Checkout, HMAC Check-In, PlietschPunkte Engine, React Native camera + GPS
**Confidence:** HIGH (alle Kernentscheidungen aus CONTEXT.md bereits getroffen, Stack vollständig installiert)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**QR-Scan UX**
- Erfolgs-Feedback: Toast-Nachricht mit Item-Titel + "+X Punkte" (2 Sekunden), dann zurück zur Kamera
- Fehler-Feedback: Inline im Scan-Screen ("Dieses Teil wurde bereits mitgenommen" / "Unbekannter QR-Code")
- Eigenes Item scannen: Blockiert mit Fehlermeldung "Du hast dieses Teil eingestellt"
- Scanner nutzt react-native-vision-camera (bereits in Phase 1 installiert)

**Check-In Flow**
- Tür-QR rotiert wöchentlich (HMAC-signiert mit Wochen-Zeitfenster) — nicht häufiger
- GPS-Toleranz: 150m Radius (Haversine-Distanz serverseitig)
- GPS-Koordinaten nur validieren, NICHT persistieren (DSGVO)
- Nach Check-In: Stepper "Wie viele Teile hast du mitgenommen?" (+ / - Buttons, 0 bis Höchstgrenze)
- Teile-Höchstgrenze: Admin-konfigurierbar pro Store (Default: 10)

**PlietschPunkte**
- Anzeige: Prominente Zahl oben auf dem Homescreen mit "PlietschPunkte" Label
- Default-Werte (admin-konfigurierbar pro Store):
  - Check-In: 5 Punkte
  - Item-Scan: 10 Punkte
  - Pro nicht-digitales Teil: 3 Punkte
- Punkte-Historie: Einfache Liste (Datum + Quelle + Betrag) — ohne Item-Details
- Kein persistenter User↔Item-Link — nur Punktetransaktion speichern (Quelle: "item_scan" / "checkin" / "manual_items")

### Claude's Discretion
- Kamera-Permission-Flow UX
- GPS-Permission-Flow UX
- Konkrete UI-Farben/Styling der Punkte-Anzeige
- Punkte-Transaktions-Tabelle Schema-Design
- QR-Scanner Overlay-Design (Rahmen, Hinweistext)

### Deferred Ideas (OUT OF SCOPE)
- Punkte einlösen / Belohnungssystem (v1.x — Kampagnen)
- Punkt-Multiplikatoren bei Aktionen (v1.x — Kampagnen)
- Offline-QR-Scan (falls kein Internet im Laden)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCAN-01 | Besucher scannen QR-Code am Kleidungsstück → Teil wird als "mitgenommen" markiert | items.qrToken vorhanden im Schema; POST /api/scan löst markTaken + Transaktion aus |
| SCAN-02 | Beim Scan werden PlietschPunkte gutgeschrieben (kein User↔Item-Link persistent) | point_transactions-Tabelle ohne item_id; users.plietschPoints als Aggregat |
| SCAN-03 | QR-Scan nutzt react-native-vision-camera (kein Expo-Modul) | v4.7.3 bereits installiert; useCodeScanner Hook mit type: ['qr'] |
| CHKIN-01 | QR-Code an der Ladentür scannen + GPS-Radius-Check = Vor-Ort-Nachweis | HMAC-wöchentlich + Haversine 150m serverseitig; stores.lat/lng/checkinRadiusMeters vorhanden |
| CHKIN-02 | Nach Check-In: "Wie viele Teile hast du mitgenommen?" (Stepper 0–10) | store_settings-Tabelle mit maxItemsPerCheckin; Stepper-UI mobil |
| CHKIN-03 | Check-In vergibt PlietschPunkte, zusätzliche Punkte pro mitgenommenem Teil | pointsService.awardCheckIn(userId, storeId, itemCount) |
| CHKIN-04 | Tür-QR-Code rotiert (HMAC-signiert oder zeitbasiert) gegen Remote-Fälschung | Node.js crypto.createHmac; Wochen-Bucket als Input; Server verifiziert aktuellen + vorherigen Bucket |
| PUNKT-01 | Punktestand auf dem Homescreen sichtbar | HomeScreen.tsx ist aktuell Stub — erweitern mit prominenter Anzeige |
| PUNKT-02 | Punkte für Item-Scan und Check-In (konfigurierbare Werte pro Store) | store_settings-Tabelle mit pointsPerScan, pointsPerCheckin, pointsPerItem |
| PUNKT-03 | Keine personenbezogene Mitnahme-Historie — nur Punktestand | point_transactions ohne item_id; DSGVO-compliant by design |
</phase_requirements>

---

## Summary

Phase 3 baut auf einem vollständig installierten Stack auf. react-native-vision-camera 4.7.3, react-native-geolocation-service 5.3.1 und alle Navigation-Libraries sind in `mobile/package.json` vorhanden. Das Backend-Pattern (Router → Service → Repository mit Drizzle + Zod) ist in `items/` und `auth/` etabliert und muss nur für die drei neuen Module (`scan`, `checkin`, `points`) repliziert werden. Der aktuelle HomeScreen ist ein Stub — er wird mit dem Punktestand und einem Besucher-Tab-Navigator erweitert.

Die drei Backend-Module sind klar abgegrenzt: `scan` (Item-QR auflösen, Status setzen, Transaktion erzeugen), `checkin` (HMAC verifizieren, GPS prüfen, Transaktion erzeugen), `points` (Transaktionen lesen, Konfiguration aus store_settings). Das DB-Schema braucht drei neue Tabellen: `point_transactions`, `checkins` (nur für Rate-Limiting/Statistik — keine GPS-Persistenz), `store_settings` (konfigurierbare Werte pro Store).

Die Navigation muss role-aware werden: Besucher sehen Home (mit Punkten), Scanner, Check-In, Punkte-Historie. Ehrenamtliche sehen weiter die bestehenden Volunteer-Tabs. Der AppNavigator muss den `role`-Wert aus `authStore` auswerten.

**Primary recommendation:** Neue Module exakt nach dem items/-Muster anlegen; Navigation in role-basierte Tab-Sets aufteilen; HMAC-Token-Generierung serverseitig mit node:crypto, kein externes Package nötig.

---

## Standard Stack

### Core (bereits installiert — keine neuen Packages nötig)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| react-native-vision-camera | 4.7.3 | QR-Scanning via useCodeScanner | [VERIFIED: npm registry] Bereits in mobile/package.json |
| react-native-geolocation-service | 5.3.1 | GPS getCurrentPosition für Check-In | [VERIFIED: npm registry] Bereits in mobile/package.json |
| drizzle-orm | 0.45.2 | DB-Schema und Queries | [VERIFIED: npm registry] Bereits in backend/package.json |
| zod | 4.3.6 | Request-Validierung Backend | [VERIFIED: codebase] Bereits verwendet in allen Routern |
| zustand | 5.0.12 | Mobile State Management | [VERIFIED: codebase] Bereits authStore.ts, itemStore.ts |
| axios | 1.14.0 | Mobile HTTP-Client | [VERIFIED: codebase] apiClient.ts mit Token-Interceptor |
| node:crypto | built-in | HMAC-Token-Generierung | [VERIFIED: node.js built-in, getestet] createHmac('sha256', secret) |

### Neu hinzuzufügen

| Library | Version | Purpose | Warum |
|---------|---------|---------|-------|
| react-native-toast-message | 2.3.3 | Toast-Feedback nach Scan | [VERIFIED: npm registry] Einfachste Toast-Implementierung für RN, New Architecture kompatibel |

**Installation:**
```bash
# Mobile
cd mobile && npm install react-native-toast-message

# Backend: keine neuen Packages
```

### Alternativen erwogen

| Statt | Könnte man | Tradeoff |
|-------|-----------|----------|
| react-native-toast-message | Eigene Animated-View | Hand-Roll für eine Standardaufgabe — nicht verwenden |
| node:crypto HMAC | jsonwebtoken für Door-QR | JWT ist über-engineered für ein wöchentliches Token ohne Claims-Bedarf |
| store_settings Tabelle | Hardcoded Defaults | Konfigurierbarkeit ist Locked Decision — store_settings ist korrekt |

---

## Architecture Patterns

### Empfohlene neue Datei-Struktur

```
backend/src/modules/
├── scan/
│   ├── scan.router.ts       # POST /api/scan
│   ├── scan.service.ts      # Token auflösen, Status setzen, Punkte delegieren
│   └── scan.repository.ts   # findItemByQrToken, markItemTaken
├── checkin/
│   ├── checkin.router.ts    # POST /api/checkin
│   ├── checkin.service.ts   # HMAC prüfen, GPS prüfen, Rate-Limit, Punkte delegieren
│   └── checkin.repository.ts # insertCheckin, lastCheckinByUser
├── points/
│   ├── points.router.ts     # GET /api/points/balance, GET /api/points/history
│   ├── points.service.ts    # Punkte-Arithmetik, store_settings lesen
│   └── points.repository.ts # insertTransaction, getBalance, getHistory

mobile/src/
├── screens/
│   ├── visitor/
│   │   ├── HomeScreen.tsx       # Erweitern: PlietschPunkte prominent oben
│   │   ├── ScanScreen.tsx       # Neu: VisionCamera + useCodeScanner
│   │   ├── CheckInScreen.tsx    # Neu: GPS + Door-QR Scan + Stepper
│   │   └── PointsHistoryScreen.tsx # Neu: Liste der Transaktionen
│   └── items/                   # Bestehend (Volunteer-Screens)
├── store/
│   └── pointsStore.ts       # Neu: Zustand für lokalen Punkte-Cache
└── navigation/
    └── AppNavigator.tsx     # Erweitern: role-basierte Tab-Sets
```

### Pattern 1: HMAC Wöchentliches Door-QR Token

**Was:** Server generiert wöchentlich rotierendes Token via HMAC-SHA256. Input ist `storeId + weekBucket`. Verifikation prüft aktuellen und vorherigen Bucket für nahtlose Übergänge.

**Wann:** Immer für Tür-QR (Locked Decision: wöchentliche Rotation).

**Beispiel:**
```typescript
// Source: node:crypto built-in — verifiziert via node -e Test
import crypto from 'node:crypto';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function currentWeekBucket(): number {
  return Math.floor(Date.now() / WEEK_MS);
}

function generateDoorToken(secret: string, storeId: string, bucket?: number): string {
  const b = bucket ?? currentWeekBucket();
  const payload = `${storeId}:${b}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 32);
}

function verifyDoorToken(token: string, secret: string, storeId: string): boolean {
  const current = currentWeekBucket();
  // Aktuellen und vorherigen Bucket prüfen — nahtloser Übergang am Wochenwechsel
  return (
    token === generateDoorToken(secret, storeId, current) ||
    token === generateDoorToken(secret, storeId, current - 1)
  );
}
```

**Wichtig:** `DOOR_QR_SECRET` muss als Env-Variable in `backend/.env` und im Portainer Stack gepflegt werden. Nicht in die DB — das ist ein Server-Secret.

### Pattern 2: GPS Haversine Verifikation (serverseitig, keine Persistenz)

**Was:** Server prüft Haversine-Distanz zwischen Client-Koordinaten und Store-Koordinaten. Koordinaten werden NICHT in die DB geschrieben.

**Beispiel:**
```typescript
// Source: Haversine-Formel — mathematisch verifiziert
function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Verwendung in checkin.service.ts — KEIN INSERT der coords
async function processCheckin(userId, storeId, doorToken, coords, itemCount) {
  const store = await storesRepo.findById(storeId);
  
  if (!store.lat || !store.lng) throw Object.assign(new Error('Store has no GPS configured'), { statusCode: 422 });
  
  const dist = haversineMeters(coords.lat, coords.lng, store.lat, store.lng);
  if (dist > (store.checkinRadiusMeters ?? 150)) {
    throw Object.assign(new Error('Zu weit vom Laden entfernt'), { statusCode: 403 });
  }
  
  const tokenValid = verifyDoorToken(doorToken, process.env.DOOR_QR_SECRET!, storeId);
  if (!tokenValid) throw Object.assign(new Error('Ungültiger QR-Code'), { statusCode: 403 });
  
  // Rate-Limit: max 1 Check-In pro User pro 12h
  const lastCheckin = await checkinRepo.lastCheckinByUser(userId, storeId);
  if (lastCheckin && Date.now() - lastCheckin.createdAt.getTime() < 12 * 3600 * 1000) {
    throw Object.assign(new Error('Bereits heute eingecheckt'), { statusCode: 409 });
  }
  
  // Nur Metadaten persistieren — KEINE Koordinaten
  await checkinRepo.insertCheckin({ userId, storeId, itemCount });
  return pointsService.awardCheckin(userId, storeId, itemCount);
}
```

### Pattern 3: useCodeScanner (VisionCamera 4.x)

**Was:** `useCodeScanner` Hook von react-native-vision-camera für QR-Scanning. Kein separates Frame-Processor-Plugin nötig für einfaches QR-Scanning.

**Beispiel:**
```typescript
// Source: react-native-vision-camera offizielle Docs v4
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

export function ScanScreen() {
  const device = useCameraDevice('back');
  const [isScanning, setIsScanning] = useState(true);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (!isScanning || codes.length === 0) return;
      setIsScanning(false); // Doppel-Scan verhindern
      
      const token = codes[0].value;
      handleScan(token); // API-Call, dann Toast, dann setIsScanning(true)
    },
  });

  if (!device) return <Text>Kamera nicht verfügbar</Text>;

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={isScanning}
      codeScanner={codeScanner}
    />
  );
}
```

**Kritisch:** `isActive={isScanning}` pausiert die Kamera nach dem Scan — verhindert CPU-Spike und Doppel-Scans.

### Pattern 4: Role-basierte Navigation

**Was:** AppNavigator wertet `user.role` aus authStore aus und rendert entweder Visitor-Tabs oder Volunteer-Tabs. Kein Screen-Mix.

**Beispiel:**
```typescript
// Ergänzung zu mobile/src/navigation/AppNavigator.tsx
function VisitorTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Zuhause' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scannen' }} />
      <Tab.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'Check-In' }} />
      <Tab.Screen name="Punkte" component={PointsHistoryScreen} options={{ title: 'Meine Punkte' }} />
    </Tab.Navigator>
  );
}

// In AppNavigator: role-Switch
const role = useAuthStore((s) => s.user?.role);
// token ? (role === 'visitor' ? <VisitorTabs /> : <VolunteerTabs />) : <AuthScreens />
```

### Pattern 5: DB-Schema für neue Tabellen

**Was:** Drei neue Drizzle-Tabellen: `point_transactions`, `checkins`, `store_settings`.

```typescript
// Ergänzung zu backend/src/db/schema.ts

export const pointTransactions = pgTable('point_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  // Kein itemId — DSGVO: kein User↔Item-Link (Locked Decision)
  source: text('source', { enum: ['item_scan', 'checkin', 'manual_items'] }).notNull(),
  points: integer('points').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const checkins = pgTable('checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  itemCount: integer('item_count').notNull().default(0),
  // KEINE lat/lng Spalten — GPS wird nur validiert, nie persistiert (Locked Decision)
  createdAt: timestamp('created_at').defaultNow(),
});

export const storeSettings = pgTable('store_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id).unique(),
  pointsPerScan: integer('points_per_scan').notNull().default(10),
  pointsPerCheckin: integer('points_per_checkin').notNull().default(5),
  pointsPerItem: integer('points_per_item').notNull().default(3),
  maxItemsPerCheckin: integer('max_items_per_checkin').notNull().default(10),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Anti-Patterns vermeiden

- **Doppel-Scan ohne Lock:** `isActive` auf der Camera-Komponente MUSS auf false gesetzt werden, bevor der API-Call abgeht — sonst triggert `onCodeScanned` mehrfach für dasselbe Token.
- **GPS persistieren:** Keine `lat`/`lng`-Spalten in `checkins` anlegen. Koordinaten werden im Service-Layer konsumiert und verworfen.
- **HMAC-Secret in Schema:** `DOOR_QR_SECRET` ist ein Server-Secret, nicht eine DB-Einstellung. Kommt aus Env-Variable.
- **plietschPoints nur in users updaten:** Immer doppelt schreiben: `point_transactions` INSERT + `users.plietschPoints` INCREMENT in einer DB-Transaktion. Andernfalls laufen Aggregat und Transaktions-Log auseinander.
- **Kein Rate-Limit auf Check-In:** Ohne 12h-Sperre pro User können Punkte durch schnelles Wiederholen gefarmt werden.

---

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen | Warum |
|---------|-------------|-------------|-------|
| Toast-Benachrichtigungen | Eigene Animated.View Fade-In/Out | react-native-toast-message | Korrekte Safe-Area-Behandlung, Keyboard-Avoidance, bereits für RN optimiert |
| QR-Code scannen | Eigener MLKit-Wrapper | react-native-vision-camera useCodeScanner | Bereits installiert, tested, CameraX/AVFoundation korrekt integriert |
| GPS-Koordinaten ermitteln | navigator.geolocation | react-native-geolocation-service | FusedLocationProvider auf Android, Timeout-Handling korrekt, bereits installiert |
| Haversine-Distanz | Externe Library | Inline-Implementierung (15 Zeilen) | Keine externe Abhängigkeit nötig, mathematisch einfach, gut testbar |
| HMAC-Token | jsonwebtoken oder externe Crypto-Lib | node:crypto built-in | Kein Package, keine Abhängigkeit, korrekt für diesen Use Case |

---

## Common Pitfalls

### Pitfall 1: Doppel-Scan durch fehlende Camera-Pause

**Was schiefgeht:** `onCodeScanned` feuert mehrfach innerhalb weniger Millisekunden für denselben QR-Code. Der API-Call wird doppelt ausgelöst, Punkte werden zweimal gutgeschrieben.

**Warum:** VisionCamera scannt kontinuierlich mit hohem FPS. Pro Frame kann ein Code erkannt werden.

**Vermeidung:** `isActive`-State auf `false` setzen im ersten `onCodeScanned`-Aufruf, bevor der API-Call startet. Erst nach Toast-Anzeige + Delay wieder auf `true`.

**Warnsignal:** Punkte springen um doppelten Betrag nach einem Scan.

### Pitfall 2: GPS Permission auf iOS ohne Beschreibungstext

**Was schiefgeht:** iOS verweigert Kamera- oder GPS-Permission sofort, weil `NSLocationWhenInUseUsageDescription` / `NSCameraUsageDescription` nicht oder zu vage in Info.plist gesetzt sind. User sieht nie den Permission-Dialog.

**Vermeidung:** In `mobile/ios/PlietschePluenn/Info.plist` konkrete Beschreibungen setzen:
- `NSCameraUsageDescription` → "Die Kamera wird zum Scannen der QR-Codes an Kleidungsstücken benötigt."
- `NSLocationWhenInUseUsageDescription` → "Dein Standort wird einmalig beim Check-In geprüft, um zu bestätigen, dass du vor Ort bist. Er wird nicht gespeichert."

**Warnsignal:** Permission-Dialog erscheint nie auf iOS-Simulator.

### Pitfall 3: HMAC-Secret fehlt im Portainer Stack

**Was schiefgeht:** Backend startet, aber `process.env.DOOR_QR_SECRET` ist `undefined`. `crypto.createHmac` wirft keinen Fehler, generiert aber vorhersagbare Tokens mit leerem Key — alle Tür-QR-Codes sind trivial zu fälschen.

**Vermeidung:** Secret beim Start prüfen:
```typescript
if (!process.env.DOOR_QR_SECRET) throw new Error('DOOR_QR_SECRET env variable is required');
```

Im Portainer Stack (server.godsapp.de) als Environment-Variable eintragen. Nicht in `backend/.env` committen.

**Warnsignal:** Kein Startup-Fehler, aber alle Tokens sind identisch mit leerem Key.

### Pitfall 4: Store hat keine GPS-Koordinaten gesetzt

**Was schiefgeht:** `stores.lat` und `stores.lng` sind `real | null` im Schema. Check-In bricht mit unklarem Fehler, wenn die Koordinaten fehlen — weil keine Admin-UI zum Setzen existiert (Phase 4).

**Vermeidung:** Seed-Daten oder Direktes DB-Update für den Test-Store setzen. Backend-Check:
```typescript
if (!store.lat || !store.lng) throw Object.assign(new Error('Store-GPS nicht konfiguriert'), { statusCode: 422 });
```

Admins können Store-Koordinaten via `PATCH /api/stores/info` setzen — dazu muss das Stores-Schema lat/lng-Update erlauben (aktuell fehlt das im UpdateStoreSchema).

**Warnsignal:** Check-In schlägt immer fehl, obwohl Token korrekt ist.

### Pitfall 5: users.plietschPoints und point_transactions laufen auseinander

**Was schiefgeht:** Wenn nur `users.plietschPoints` inkrementiert wird aber kein `point_transactions`-Record angelegt, oder umgekehrt, stimmt die Punkte-Historie nicht mit dem Kontostand überein.

**Vermeidung:** Beide Schreibvorgänge in einer DB-Transaktion ausführen:
```typescript
await db.transaction(async (tx) => {
  await tx.insert(pointTransactions).values({ userId, storeId, source, points });
  await tx.update(users)
    .set({ plietschPoints: sql`plietsch_points + ${points}` })
    .where(eq(users.id, userId));
});
```

**Warnsignal:** `SUM(point_transactions.points)` weicht von `users.plietschPoints` ab.

### Pitfall 6: GPS-Timeout hängt die App

**Was schiefgeht:** `getCurrentPosition` mit `enableHighAccuracy: true` wartet auf GPS-Fix. In Gebäuden ohne GPS-Signal kann das 30+ Sekunden dauern. Die App wirkt eingefroren.

**Vermeidung:** Immer `timeout` und `maximumAge` setzen:
```typescript
Geolocation.getCurrentPosition(
  (pos) => resolve(pos),
  (err) => reject(err),
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
);
```

`maximumAge: 60000` erlaubt gecachte Koordinaten bis 60s alt — ausreichend für Check-In.

---

## Code Examples

### Backend: scan.service.ts — Item-QR scannen

```typescript
// Source: Eigenmuster nach items.service.ts — [ASSUMED Pattern, verifiziert gegen bestehendem Code]
import { db } from '../../db/client';
import { items, users, pointTransactions } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import * as storeSettingsRepo from '../points/storeSettings.repository';

export async function processItemScan(qrToken: string, userId: string, storeId: string) {
  // 1. Token auflösen
  const [item] = await db.select().from(items)
    .where(and(eq(items.qrToken, qrToken), eq(items.storeId, storeId)))
    .limit(1);

  if (!item) throw Object.assign(new Error('Unbekannter QR-Code'), { statusCode: 404 });
  if (item.status === 'taken') throw Object.assign(new Error('Dieses Teil wurde bereits mitgenommen'), { statusCode: 409 });

  // 2. Eigenes Item blockieren
  // Hinweis: items-Tabelle hat keine createdBy-Spalte — Phase 2 muss dies ergänzt haben
  // Falls nicht vorhanden: skip (kein Block möglich ohne createdBy)

  // 3. Item als taken markieren + Punkte in einer Transaktion
  const settings = await storeSettingsRepo.getOrDefaults(storeId);
  const points = settings.pointsPerScan;

  await db.transaction(async (tx) => {
    await tx.update(items).set({ status: 'taken' }).where(eq(items.id, item.id));
    await tx.insert(pointTransactions).values({ userId, storeId, source: 'item_scan', points });
    await tx.update(users)
      .set({ plietschPoints: sql`plietsch_points + ${points}` })
      .where(eq(users.id, userId));
  });

  return { item: { id: item.id, title: item.title }, pointsEarned: points };
}
```

### Mobile: GPS Permission Request Pattern

```typescript
// Source: react-native-geolocation-service GitHub README — [CITED: https://github.com/Agontuk/react-native-geolocation-service]
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Standort-Erlaubnis',
      message: 'Dein Standort wird einmalig beim Check-In geprüft und nicht gespeichert.',
      buttonPositive: 'Erlauben',
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}
```

### Mobile: Stepper-Komponente (0 bis max)

```typescript
// Source: [ASSUMED — Standard RN Pattern]
function ItemCountStepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
      >
        <Text style={{ fontSize: 32 }}>−</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 24, minWidth: 32, textAlign: 'center' }}>{value}</Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value === max}
      >
        <Text style={{ fontSize: 32 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Kritische Lücke: items.createdBy fehlt im Schema

Das aktuelle `items`-Schema (`backend/src/db/schema.ts`) enthält keine `createdBy`-Spalte. Die Locked Decision "Eigenes Item scannen: Blockiert" setzt voraus, dass der Scanner weiß, wer ein Item erstellt hat. 

**Optionen:**
1. `createdBy uuid` Spalte zu `items` hinzufügen via Migration (empfohlen — sauber, erweiterbar)
2. Ohne `createdBy` den Block weglassen — stiller Designkompromiss, kein Check möglich

Der Planner muss Task 1 (DB-Schema/Migration) diesen Punkt klären. Die Phase-2-Implementierung in `items.service.ts` setzt bei `createItem` keinen `createdBy`-Wert — Migration und Service-Update sind nötig.

---

## Stores-Schema Update nötig: lat/lng via Admin setzbar

Der `UpdateStoreSchema` in `stores.router.ts` erlaubt aktuell nur `address`, `description`, `openingHours` — kein `lat`/`lng`. Für den Check-In-Feature muss der Admin Koordinaten setzen können. Das Schema und der Service müssen erweitert werden, oder der Store wird direkt in der DB geseediert.

**Empfehlung:** UpdateStoreSchema um optionale `lat: z.number()`, `lng: z.number()` erweitern in derselben Phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|---------|
| react-native-vision-camera | SCAN-03 | ✓ | 4.7.3 | — |
| react-native-geolocation-service | CHKIN-01 | ✓ | 5.3.1 | — |
| node:crypto | CHKIN-04 | ✓ | built-in | — |
| react-native-toast-message | UX Toast | ✗ | 2.3.3 verfügbar | — muss installiert werden |
| PostgreSQL (server.godsapp.de) | alle Backend-Module | ✓ | laufend (Phase 1+2 aktiv) | — |
| Portainer Stack | Deployment | ✓ | Stack #261 aktiv | — |

**Missing dependencies mit no fallback:**
- react-native-toast-message muss `npm install react-native-toast-message` in `/mobile` installiert werden.

**Missing dependencies mit fallback:**
- Keine.

**CRITICAL: Docker NOT available locally.** Alle Backend-Änderungen werden auf server.godsapp.de deployed via GitHub → Portainer Stack pull.

---

## State of the Art

| Alte Herangehensweise | Aktuelle Herangehensweise | Impact |
|----------------------|---------------------------|--------|
| expo-barcode-scanner | react-native-vision-camera useCodeScanner | Bereits migriert in Phase 1 |
| expo-location | react-native-geolocation-service | Bereits installiert in Phase 1 |
| Kein HMAC, statischer QR an der Tür | Wöchentlich rotierendes HMAC-Token | Anti-Spoofing-Schutz |
| Punkte nur als Zähler | Transaktionslog + aggregiertes Feld | Debugging + Vertrauen der Ehrenamtlichen |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | items-Tabelle braucht `createdBy` Spalte für "Eigenes Item blockieren"-Feature | Kritische Lücke | Feature muss ohne Block implementiert werden wenn Migration nicht möglich |
| A2 | react-native-toast-message ist New Architecture kompatibel mit RN 0.85 | Standard Stack | Must be replaced with custom solution — low risk, library is actively maintained |
| A3 | 12h Rate-Limit für Check-In ist sinnvoll (nicht in CONTEXT.md spezifiziert) | Architecture Pattern | Zu restriktiv oder zu locker — kann nach Feedback angepasst werden |
| A4 | storeSettings werden als eigene Tabelle (nicht als JSON-Spalte in stores) implementiert | Schema Design | JSON-Spalte wäre einfacher, aber schlechter querybar für zukünftige Kampagnen |
| A5 | Door-QR wird als statischer Text/URL im QR enkodiert (nicht als Deep-Link) | Code Examples | Falls Deep-Link gewünscht, muss URL-Schema konfiguriert werden |

---

## Open Questions

1. **Eigenes Item blockieren ohne createdBy-Spalte**
   - Was wir wissen: items-Schema hat kein `createdBy`-Feld
   - Was unklar ist: Soll diese Phase das Feld hinzufügen (Migration) oder wird der Block als Nice-to-have eingestuft?
   - Empfehlung: Migration in Wave 1 dieser Phase — ohne es ist die Locked Decision nicht vollständig erfüllbar

2. **Door-QR Display: Wie wird der aktuelle Token angezeigt?**
   - Was wir wissen: Der Token rotiert wöchentlich serverseitig
   - Was unklar ist: Gibt es einen Admin-Screen zum Anzeigen/Drucken des aktuellen Door-QR? (Phase 4?)
   - Empfehlung: Für Phase 3 ein minimales `GET /api/checkin/door-qr` (Admin-only, gibt PNG zurück) — sonst ist der Check-In nicht testbar

3. **Visitor Registration: Welche storeId beim Register?**
   - Was wir wissen: `POST /api/auth/register` erfordert `storeId` im Body
   - Was unklar ist: Wie wählt ein neuer Besucher-User die storeId? Hardcoded in der App?
   - Empfehlung: Für v1 (single store) die storeId als Konstante in der App (`mobile/src/config.ts`) — Multi-Tenant ist v2

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `backend/src/db/schema.ts` — stores, users, items Tabellen vollständig gelesen
- [VERIFIED: codebase] `backend/src/modules/items/` — Router/Service/Repository Pattern verifiziert
- [VERIFIED: codebase] `mobile/package.json` — alle Libraries und Versionen bestätigt
- [VERIFIED: codebase] `mobile/src/navigation/AppNavigator.tsx` — Navigation-Struktur gelesen
- [VERIFIED: codebase] `mobile/src/store/authStore.ts` — Zustand Store Pattern mit user.role
- [VERIFIED: codebase] `backend/src/app.ts` — Route-Mounting-Pattern und Error-Handler
- [VERIFIED: npm registry] react-native-vision-camera@4.7.3, react-native-geolocation-service@5.3.1, react-native-toast-message@2.3.3
- [VERIFIED: node test] HMAC-SHA256 mit node:crypto — Token-Generierung und Haversine funktionieren wie erwartet
- [CITED: https://react-native-vision-camera.com/docs/guides/code-scanning] useCodeScanner API

### Secondary (MEDIUM confidence)
- [CITED: https://github.com/Agontuk/react-native-geolocation-service] GPS Permission Flow iOS/Android
- .planning/research/PITFALLS.md — GPS Indoor Accuracy, DSGVO-Anforderungen, Doppel-Scan-Schutz

### Tertiary (LOW confidence)
- Keine LOW-confidence Claims in dieser Research.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Packages bereits installiert und in package.json verifiziert
- Architecture Patterns: HIGH — basiert auf verifiziertem bestehendem Code (items-Modul als Vorlage)
- HMAC Token: HIGH — in Node.js getestet, mathematisch korrekt
- Pitfalls: HIGH — aus bestehendem PITFALLS.md und Code-Analyse abgeleitet

**Research date:** 2026-04-08
**Valid until:** 2026-07-08 (stable stack, 90 Tage)
