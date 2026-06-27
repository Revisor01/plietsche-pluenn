# Plietsche Plünn — Claude Code Handoff

Vollständiges Briefing für die Umsetzung. Designs liegen in `Plietsche Plünn.html`.

---

## 1. Was ist das

Mobile App (iOS + Android) für den Kleidertausch-Laden **Plietsche Plünn** der Kirchengemeinde Lokstedt. Drei Nutzergruppen:

- **Besucher** — kommt vor Ort, checkt ein, scannt Teile mit QR, sammelt PlietschPunkte
- **Ehrenamtliche** — pflegt Bestand, klebt QR-Codes auf Teile
- **Admins** — Dashboard, Kampagnen, Badges, Push, User-Management

### Privacy als Feature

**Bewusst KEIN Tracking wer-was-mitnimmt.** Das ist kritisch und wirkt sich aufs Datenmodell aus:

- `points_log` enthält `user_id` + Punkte + Source-Label (z.B. "Wollpullover, S") — aber **kein Foreign Key auf items**
- `items.taken_at` wird auf Scan gesetzt — aber **kein User-Verweis am Item**
- Admin-Dashboard zeigt Aggregate ("Item #084 wurde 8× mitgenommen"), nie wer

---

## 2. Tech-Stack (entschieden)

| Layer | Wahl | Begründung |
|---|---|---|
| Mobile | **Expo SDK 51+** (React Native, TypeScript) | Hot reload, EAS Build, OTA via expo-updates. Eure Features (QR, GPS, Push, Camera) sind alle vom SDK abgedeckt — kein Grund für Bare RN. |
| Navigation | `expo-router` | File-based, Deep Links für Push-Navigation gratis. |
| State (lokal) | `zustand` | Null-Boilerplate-Store. Reicht für Auth + UI-State. |
| State (server) | `@tanstack/react-query` | Caching + Optimistic Updates für PocketBase-Daten. |
| Backend | **PocketBase 0.22+** | Auth, Realtime, Files, Admin-UI, JS-Hooks — eine Go-Binary. Concurrent: SQLite WAL hält parallele Reads + queuet Writes. Reicht locker für eure Größe. |
| Push | `expo-notifications` + Expo Push Service | Server-seitig: PocketBase Hook ruft Expo Push API auf, die routet zu APNs/FCM. Kein direkter APN-/FCM-Setup nötig. |
| QR (lesen) | `expo-camera` mit `barcodeScannerSettings` | Eingebaut, kein extra Modul. |
| QR (erzeugen) | `react-native-qrcode-svg` | Reines SVG, druckbar. |
| GPS | `expo-location` | Geofence-Check 150 m. |
| Icons | `@expo/vector-icons` → Font Awesome 6 Pro Light (oder Free Solid wenn Pro nicht im Budget) | Spec sagt Line-Icons, nie Emojis. |
| Schrift | **Work Sans** via `expo-google-fonts` | `npx expo install @expo-google-fonts/work-sans` |

### Folder-Layout (Vorschlag)

```
app/                          # expo-router screens (file-based)
  (auth)/login.tsx
  (auth)/register.tsx
  (onboarding)/welcome.tsx
  (onboarding)/how.tsx
  (onboarding)/permissions.tsx
  (visitor)/_layout.tsx       # Tab-Bar
  (visitor)/index.tsx         # Home
  (visitor)/checkin.tsx
  (visitor)/scan.tsx
  (visitor)/badges.tsx
  (visitor)/points.tsx
  (visitor)/settings/push.tsx
  (visitor)/settings/store.tsx
  (staff)/_layout.tsx         # Volunteer + Admin gated
  (staff)/items/index.tsx
  (staff)/items/new.tsx
  (staff)/items/[id].tsx
  (staff)/admin/index.tsx     # dashboard
  (staff)/admin/badges/index.tsx
  (staff)/admin/badges/[id].tsx
  (staff)/admin/push.tsx
  (staff)/admin/users.tsx
  (staff)/admin/store.tsx
components/
  ui/                         # Card, Button, Pill, GradientRing, ProgressBar, BadgeMedallion...
  TabBar.tsx
  GlassCard.tsx
  ImgSlot.tsx                 # platzhalter
lib/
  pb.ts                       # PocketBase client singleton
  theme.ts                    # tokens (siehe §3)
  icons.tsx                   # FA6 wrapper, named icon set
  hooks/
    useAuth.ts
    usePoints.ts
    useBadges.ts
    useCheckin.ts
pb/                           # PocketBase project (deployed separately)
  pb_hooks/                   # JS hooks
    badges.pb.js
    checkin.pb.js
    push.pb.js
    streak.pb.js
  pb_migrations/
  pb_public/                  # static assets, qr-print stylesheet
```

---

## 3. Design-Tokens (1:1 aus dem Mockup)

```ts
// lib/theme.ts
export const PP = {
  // brand
  teal: '#27b092',
  mint: '#79c4b0',
  sky:  '#80b4e2',
  gradient: ['#27b092', '#79c4b0', '#80b4e2'] as const,
  gradientAngle: 135,

  // surface
  bg:        '#F4F7F4',
  surface:   '#FFFFFF',
  sand:      '#F4EFE6',
  sandDeep:  '#EBE3D2',
  hairline:  '#E5EDEB',

  // text
  ink:   '#1A2E2C',
  ink2:  '#5A6B6A',
  ink3:  '#9AA8A7',

  // semantic
  warn:  '#E8A93B',
  err:   '#D9534F',
  ok:    '#27b092',

  // badge tiers
  bronze: '#CD7F32',
  silver: '#B8B8B8',
  gold:   '#E8B923',

  // radii
  rCard:  22,
  rTile:  18,
  rPill:  999,
  rField: 14,
  rBtn:   16,

  // type
  font: 'WorkSans_400Regular',
  fontSizes: { xs: 10.5, sm: 11.5, base: 13.5, md: 15, lg: 17, xl: 22, xxl: 28, hero: 32 },

  // shadows (use expo-blur for glass cards)
  shadowCard: {
    shadowColor: '#1A2E2C', shadowOpacity: 0.06, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
};
```

**Sieh dir das Mockup an** (`Plietsche Plünn.html`) für: Header-Layouts, Spacing-Rhythmus (vertikale Abstände meist 14/22px), Card-Padding (16-22px), Tab-Bar-Liquid-Glass-Recipe.

---

## 4. PocketBase Schema

### Collections

#### `users` (extends built-in)
```
- email (text, unique)
- password (passwordHash)
- name (text)
- role (select: "visitor"|"volunteer"|"admin", default "visitor")
- avatar (file, single, max 2MB)
- points_total (number, default 0)
- streak_weeks (number, default 0)
- streak_last_visit (date, nullable)
- streak_grace_until (date, nullable)     # bis wann ist Streak gerettet
- onboarding_complete (bool, default false)
- push_streak_enabled (bool, default true)
- push_campaign_enabled (bool, default true)
- push_badge_enabled (bool, default true)
- push_other_enabled (bool, default false)
- created (date, auto)
```

#### `items`
```
- sku (text, unique, auto-gen: "PP-{shortid}")
- title (text, max 80)
- category (select: "damen-oberteil"|"damen-hose"|"damen-kleid"|"herren-oberteil"|... )
- size (text, e.g. "S", "38", "116")
- condition (select: "neu"|"sehr-gut"|"gut"|"gebraucht")
- photo (file, single, max 4MB, auto-thumbnail 400x400)
- points (number, default 30)
- qr_code (text, indexed)                 # printed on the tag
- is_showcase (bool, default false)       # admin-pinned on home
- showcase_position (number, nullable)
- note (text, max 200)
- taken_at (date, nullable)               # set on scan, NO user ref
- archived_at (date, nullable)
- created_by (relation users)             # WHO created (volunteer), allowed
- created (date, auto)
```

#### `visits`
```
- user (relation users)
- checkin_at (date, auto)
- items_count (number)                    # stepper value
- gps_lat (number, nullable)
- gps_lng (number, nullable)
- gps_distance_m (number, nullable)
- campaign (relation campaigns, nullable)
- points_awarded (number)
```

#### `points_log`  ⚠ kein Item-FK
```
- user (relation users)
- points (number, can be negative)
- kind (select: "checkin"|"scan"|"badge"|"streak"|"campaign"|"adjustment")
- label (text, max 80)                    # frei, z.B. "Wollpullover, S" — Klartext, kein FK
- ref_id (text, nullable)                 # optional: visit.id, badge.id (NIE item.id für scans)
- created (date, auto)
```

#### `campaigns`
```
- name (text)
- multiplier (number, default 2.0)
- starts_at (date)
- ends_at (date)
- target_role (select: "all"|"visitor"|"streak2plus"|"inactive14d")
- created_by (relation users)
- created (date, auto)
```

#### `badges`
```
- slug (text, unique)
- name (text)
- description (text)
- category (select: "bringer"|"holer"|"besucher"|"saison"|"streak"|"meilenstein")
- tier (select: "bronze"|"silver"|"gold")
- icon (text)                             # FA6 icon name
- trigger_type (select: "visits"|"scans"|"streak_weeks"|"season_window"|"items_in_period")
- trigger_value (number)
- season_start (text, nullable, format "MM-DD")
- season_end (text, nullable, format "MM-DD")
- points_reward (number, default 50)
- is_visible (bool, default true)         # zeigen vor Freischaltung
- created (date, auto)
```

#### `user_badges`
```
- user (relation users)
- badge (relation badges)
- unlocked_at (date, nullable)
- progress (number, default 0)            # 0..trigger_value
- INDEX: unique(user, badge)
```

#### `push_devices`
```
- user (relation users)
- expo_token (text, unique)
- platform (select: "ios"|"android")
- last_seen (date, auto on upsert)
```

#### `push_messages` (audit log + scheduled queue)
```
- title (text)
- body (text)
- target_segment (select: "all"|"streak2plus"|"inactive14d"|"by_role")
- target_role (select, nullable)
- scheduled_at (date, nullable)           # null = immediate
- sent_at (date, nullable)
- deep_link (text, nullable)              # e.g. "pp://campaigns/123"
- sent_by (relation users)
- created (date, auto)
```

#### `store` (singleton, max 1 record)
```
- name (text, default "Plietsche Plünn")
- address (text)
- lat (number)
- lng (number)
- phone (text)
- hours_json (json)                       # { mo:null, di:"15-18", mi:null, ... }
- cover_photo (file, single)
- geofence_radius_m (number, default 150)
- checkin_qr_secret (text)                # rotates, signed in Türen-QR
```

### API-Rules (PocketBase Access Rules)

```
items                  list/view: @request.auth.id != ""   create/update: role in ("volunteer","admin")
visits                 list/view: user = @request.auth.id || role = "admin"
                       create: user = @request.auth.id
points_log             list/view: user = @request.auth.id  (admin: alle)
                       create: server-only (per Hook)
campaigns              list/view: all auth   create/update: role = "admin"
badges                 list/view: all auth   create/update: role = "admin"
user_badges            list/view: user = @request.auth.id || role = "admin"
push_devices           upsert by user
push_messages          create/list: role = "admin"
store                  view: all   update: role = "admin"
```

---

## 5. Business Logic (PocketBase Hooks)

### `pb_hooks/checkin.pb.js`

```js
// onRecordAfterCreateRequest(visits): award checkin points + update streak
onRecordAfterCreateRequest((e) => {
  const v = e.record;
  const userId = v.get("user");
  const user = $app.dao().findRecordById("users", userId);

  // 1. Find active campaign
  const now = new Date();
  const camp = findActiveCampaignFor(user, now);
  const multiplier = camp ? camp.get("multiplier") : 1.0;

  // 2. Award checkin points
  const checkinPts = Math.round(10 * multiplier);
  awardPoints(user, checkinPts, "checkin", "Check-In im Laden", v.id);

  // 3. Award stepper-implied "took N items" — visitor said they took N teile.
  //    Only used if not all teile had QR. We award a flat 5 pts per item
  //    NOT linked to specific items (privacy).
  const stepperPts = Math.round((v.get("items_count") || 0) * 5 * multiplier);
  if (stepperPts > 0) {
    awardPoints(user, stepperPts, "checkin", `${v.get("items_count")} Teile mitgenommen`, v.id);
  }

  // 4. Update streak
  updateStreak(user, new Date(v.get("checkin_at")));

  // 5. Re-check badges
  checkBadges(user);
}, "visits");
```

### `pb_hooks/scan.pb.js`

```js
// scans don't have their own collection — instead, a custom route at
// POST /api/scan accepts {qr_code}, validates, awards points to caller,
// and sets items.taken_at = now() with NO user reference.
routerAdd("POST", "/api/scan", (c) => {
  const auth = c.get("authRecord");
  if (!auth) throw new ApiError(401);

  const { qr_code } = c.requestData();
  const item = $app.dao().findFirstRecordByData("items", "qr_code", qr_code);
  if (!item) throw new ApiError(404, "Unbekannter QR-Code");
  if (item.get("taken_at")) throw new ApiError(409, "Schon mitgenommen");

  const camp = findActiveCampaignFor(auth, new Date());
  const pts = Math.round((item.get("points") || 30) * (camp ? camp.get("multiplier") : 1.0));

  // Award points with PLAIN-TEXT label only (no FK to item)
  const label = `${item.get("title")}, ${item.get("size")}`;
  awardPoints(auth, pts, "scan", label, null);

  // Mark item taken WITHOUT user reference
  item.set("taken_at", new Date());
  $app.dao().saveRecord(item);

  checkBadges(auth);
  return c.json(200, { points: pts, label });
});
```

### Badge Engine (`pb_hooks/badges.pb.js`)

```js
function checkBadges(user) {
  const badges = $app.dao().findRecordsByExpr("badges", $dbx.exp("1=1"));

  for (const badge of badges) {
    const ub = upsertUserBadge(user, badge);
    if (ub.get("unlocked_at")) continue;

    const progress = computeProgress(user, badge);
    ub.set("progress", progress);

    if (progress >= badge.get("trigger_value")) {
      ub.set("unlocked_at", new Date());
      $app.dao().saveRecord(ub);
      awardPoints(user, badge.get("points_reward"), "badge", `Badge: ${badge.get("name")}`, badge.id);
      schedulePush(user, {
        title: `Watt'n schönes Stück!`,
        body: `${badge.get("name")} freigeschaltet · +${badge.get("points_reward")} Punkte`,
        deep_link: `pp://badges/${badge.id}`,
      });
    } else {
      $app.dao().saveRecord(ub);
    }
  }
}

function computeProgress(user, badge) {
  switch (badge.get("trigger_type")) {
    case "visits":       return $app.dao().findRecordsByExpr("visits",  $dbx.exp("user = {:u}", { u: user.id })).length;
    case "scans":        return $app.dao().findRecordsByExpr("points_log", $dbx.exp("user = {:u} && kind = 'scan'", { u: user.id })).length;
    case "streak_weeks": return user.get("streak_weeks");
    case "season_window":
      // count visits where checkin_at falls in season_start..season_end of current year
      return countVisitsInSeason(user, badge.get("season_start"), badge.get("season_end"));
    case "items_in_period":
      // scans in last 30d
      return countScansInLast(user, 30);
  }
}
```

### Streak-Logik

- `streak_last_visit` = letzter Check-In
- Wenn neuer Check-In in derselben **ISO-Woche** → streak unverändert
- Wenn neuer Check-In in **direkt folgender** ISO-Woche → `streak_weeks += 1`
- Wenn ≥ 2 Wochen Lücke → `streak_weeks = 1` (Reset)
- `streak_grace_until` = Sonntag der aktuellen Woche; wenn überschritten ohne Visit → Reset auf nächsten Check-In

### Cronjob: Streak-Erinnerung (`pb_hooks/cron.pb.js`)

```js
cronAdd("streak-reminder", "0 18 * * 5", () => {  // Freitag 18:00
  // Alle User mit streak_weeks >= 1 UND ohne Visit in dieser ISO-Woche
  const users = findUsersAtRiskOfStreakLoss();
  for (const u of users) {
    if (!u.get("push_streak_enabled")) continue;
    schedulePush(u, {
      title: "Watt'n knappes Ding!",
      body: `Noch 2 Tage, dann reißt dein ${u.get("streak_weeks")}-Wochen-Streak. Komm Samstag vorbei?`,
      deep_link: "pp://home",
    });
  }
});

cronAdd("season-badges", "0 4 * * *", () => {
  // täglich 04:00 — markiert Saison-Badges sichtbar/unsichtbar je nach Datum
  recomputeSeasonBadgeVisibility();
});
```

---

## 6. Screen → Daten Mapping

| Screen | Reads | Writes |
|---|---|---|
| `(onboarding)/*`      | `store` (für Adresse) | `users.onboarding_complete = true` am Ende |
| `(auth)/login`        | — | PocketBase native auth |
| `(visitor)/index`     | `users` (self), `items?is_showcase=true`, `campaigns?active=true`, latest 3 `points_log` | — |
| `(visitor)/checkin`   | `store.checkin_qr_secret`, GPS-Permission | `POST /api/checkin` (validates QR + GPS + creates `visits`) |
| `(visitor)/scan`      | — | `POST /api/scan` (siehe oben) |
| `(visitor)/badges`    | `badges` + `user_badges` (self, joined) | — |
| `(visitor)/points`    | `points_log?user=self`, grouped by date | — |
| `(visitor)/settings/push` | `users` (self push prefs) | `users` patch |
| `(staff)/items`       | `items?archived_at=null` paginated | — |
| `(staff)/items/new`   | — | `items` create (auto-generates `sku` + `qr_code`) |
| `(staff)/admin`       | aggregated counts: `visits` last 30d, `points_log` sum, `items` count, `user_badges` count this week | — |
| `(staff)/admin/badges/:id` | `badges` | `badges` patch + Hook re-runs `checkBadges` for all |
| `(staff)/admin/push`  | targeting segments computed live | `push_messages` create → Hook fans out to `push_devices` via Expo Push API |
| `(staff)/admin/users` | `users` paginated, filter by role | `users.role` patch |
| `(staff)/admin/store` | `store` | `store` patch |

### Push fan-out

```js
// pb_hooks/push.pb.js
onRecordAfterCreateRequest((e) => {
  const msg = e.record;
  if (msg.get("scheduled_at")) return;        // cron handles scheduled
  sendPushImmediate(msg);
}, "push_messages");

function sendPushImmediate(msg) {
  const targets = resolveTargets(msg);         // returns array of users
  const tokens = $app.dao().findRecordsByFilter(
    "push_devices",
    `user.id ?~ "${targets.map(u => u.id).join('|')}"`
  );

  // chunk to 100, POST to Expo Push API
  const chunks = chunk(tokens, 100);
  for (const c of chunks) {
    $http.send({
      url: "https://exp.host/--/api/v2/push/send",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c.map(t => ({
        to: t.get("expo_token"),
        title: msg.get("title"),
        body: msg.get("body"),
        data: { deep_link: msg.get("deep_link") },
        sound: "default",
      }))),
    });
  }
  msg.set("sent_at", new Date());
  $app.dao().saveRecord(msg);
}
```

---

## 7. Phasen-Plan

### P0 — Foundation (1 Tag)
- [ ] Expo project init, TypeScript, expo-router
- [ ] Work Sans laden, theme.ts mit allen Tokens aus §3
- [ ] PocketBase lokal hochziehen (Docker oder Binary), Collections per Migration anlegen
- [ ] `pb.ts` client singleton, env vars (`EXPO_PUBLIC_PB_URL`)
- [ ] Auth-Flow: Login + Register Screens (Design siehe Section 02)

### P1 — Visitor MVP (2-3 Tage)
- [ ] Tab-Bar (Glass-Variante, siehe Section 08)
- [ ] Home cozy layout (Section 03 · A): GradientRing für Punkte, Streak-Pill, Showcase, Kampagnen-Banner
- [ ] Check-In Flow: Kamera → QR-Validation (Tür-Secret) → GPS-Check → Stepper → `POST /api/checkin`
- [ ] Item-Scan: Kamera → `POST /api/scan` → Toast-Animation
- [ ] Points History: gruppiert nach Tag, Filter-Chips, Mini-Chart
- [ ] Settings: Push-Toggles, Store-Info

### P2 — Volunteer (1-2 Tage)
- [ ] Items-Liste mit Suche/Filter, Grid-Layout (Section 09)
- [ ] Items-Form mit Foto (`expo-image-picker`), Auto-QR-Generation (Section 10)
- [ ] QR-Print: `react-native-qrcode-svg` → A4-PDF Layout für Aufkleberbögen

### P3 — Admin (2 Tage)
- [ ] Dashboard mit Datepicker + KPIs + Sparkline (Section 11)
- [ ] Badge-Editor mit lesbarer Trigger-Regel (Section 12)
- [ ] Push-Composer mit Live-Vorschau (Section 13)
- [ ] User-Verwaltung mit Rollen-Switch (Section 14)
- [ ] Store-Info-Editor mit Öffnungszeiten-Editor (Section 15)

### P4 — Gamification + Push (2 Tage)
- [ ] Badge-Engine in `pb_hooks/badges.pb.js`
- [ ] Streak-Logik in `pb_hooks/streak.pb.js`
- [ ] Cronjobs (Friday Reminder + Daily Season Recompute)
- [ ] Expo Push Setup: `push_devices` Registration auf Login, Fan-out Hook
- [ ] Badge-Übersicht (Liste-Variante — Section 06 · B)
- [ ] Toast-Animation für Badge-Freischaltung (Reanimated 3)

### P5 — Polish (1 Tag)
- [ ] Onboarding 3-Step-Flow (Section 01)
- [ ] Dark Mode skip (nicht im Scope)
- [ ] iOS + Android Build via EAS, TestFlight + Internal Testing
- [ ] Crash-Reporting via Sentry (optional)

**Geschätzte Gesamtdauer:** 9-11 Arbeitstage für 1 Entwickler:in.

---

## 8. Design-System Inventar

Alle Komponenten existieren im Mockup (`Plietsche Plünn.html`) — port sie 1:1 nach RN.

| Komponente | Mockup-File | Notes |
|---|---|---|
| `<Card>`, `<GradientCard>`, `<GlassCard>` | `ui.jsx` | GlassCard nutzt `expo-blur` BlurView |
| `<GradientRing progress={0..1}>` | `ui.jsx` | Skia für saubere Gradient-Strokes, oder SVG mit `react-native-svg` |
| `<ProgressBar value tier>` | `ui.jsx` | Tier-Farben für Bronze/Silver/Gold |
| `<Pill icon color>` | `ui.jsx` | — |
| `<PPButton variant icon iconRight>` | `ui.jsx` | Primary = LinearGradient |
| `<TabBar variant active>` | `ui.jsx` | `variant="glass"` (default) |
| `<BadgeMedallion icon tier earned>` | `screens-visitor.jsx` | — |
| `<Stepper value onChange>` | `screens-visitor.jsx` | — |
| `<ImgSlot>` (placeholder) | `ui.jsx` | **Nur in Mockup** — in echter App durch `<Image>` ersetzen |
| `<Icon name>` Set | `theme.jsx` | 50+ Stroke-Icons — kannst du als SVG-Komponenten extrahieren ODER FA6 via `@expo/vector-icons` ziehen (Mapping in der Datei) |

### Wichtige Layouts
- **Home Cozy** (Section 03 · A): Hero-Card mit GradientRing + Streak-Pill + Hinweis-Text
- **Badges Liste** (Section 06 · B): horizontale Cards mit Medaille + ProgressBar inline
- **Tab-Bar Glass** (Section 08 · A): floating, 12px Margin, `blur(24px) saturate(180%)`, weiße Surface-Tint

---

## 9. Offene Entscheidungen

Vor Start kurz mit dem Team klären:

1. **Check-In QR-Secret-Rotation** — täglich? wöchentlich? statisch? (Empfehlung: monatlich, Druck-Aufkleber an Tür)
2. **Item-SKU-Format** — `PP-{shortid}` (random) oder `PP-{counter}` (lesbar)? (Empfehlung: counter, ehrenamtsfreundlich)
3. **Foto-Größenlimit** — 4MB oder kleiner? (Empfehlung: clientseitig auf 1600px Kante runter)
4. **Punkte pro Aktion** — Spec sagt nur "Check-In + Mitnahme = Punkte". Vorschlag im Hook: 10/Check-In, 30/QR-Scan, 5/Item via Stepper, 50/Badge. Anpassbar in `campaigns.multiplier`.
5. **Privacy-Reset** — User kann eigenen Account löschen? DSGVO sagt ja. (Empfehlung: `users.deleted_at` Soft-Delete + Cronjob anonymisiert `points_log` nach 30 Tagen)
6. **iOS Liquid Glass** — der Tab-Bar-Glass-Effekt nutzt schon Blur. Brauchst du explizites iOS 26 `UIGlassEffect`? (Empfehlung: nein, `expo-blur` reicht und ist platform-konsistent)

---

## 10. Quickstart-Befehle

```bash
# Mobile
npx create-expo-app plietsche-pluenn -t expo-template-blank-typescript
cd plietsche-pluenn
npx expo install expo-router expo-camera expo-location expo-notifications expo-blur expo-linear-gradient expo-image-picker @expo-google-fonts/work-sans react-native-svg react-native-qrcode-svg
npm i zustand @tanstack/react-query pocketbase

# Backend
mkdir pb && cd pb
curl -L https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip -o pb.zip && unzip pb.zip
./pocketbase serve --http=0.0.0.0:8090
# Admin UI: http://localhost:8090/_/

# EAS Build (wenn live)
npm i -g eas-cli
eas login
eas build --platform all --profile preview
```

### .env
```
EXPO_PUBLIC_PB_URL=https://pb.plietschepluenn.de
```

---

**Designs:** `Plietsche Plünn.html` — öffnen, durch die 17 Sektionen scrollen, oder einzelne Artboards fullscreen öffnen (Click auf Label oder Expand-Icon).

**Default-Varianten (entschieden):** Home **Cozy** · Tab-Bar **Glass** · Badges **Liste**.

---

## 11. JSX → React Native Porting

⚠ **Wichtig:** die mitgelieferten `screens-*.jsx` und `ui.jsx` Dateien sind **React DOM** (Web-Mockups), nicht React Native. Sie sind als **visuelle Referenz + Struktur-Vorlage** gedacht, nicht zum direkten Kopieren.

### Mapping-Tabelle

| Web (im Mockup) | React Native |
|---|---|
| `<div>` | `<View>` |
| Text in JSX (z.B. `<div>Moin</div>`) | `<Text>Moin</Text>` |
| `<span>` | `<Text>` (kein style="inline") |
| `<button>` | `<Pressable>` oder `<TouchableOpacity>` |
| `style={{}}` mit CSS-Strings | `StyleSheet.create({})` mit RN-Properties |
| `background:` | `backgroundColor:` |
| `gap:` (flex) | RN 0.71+ supported `gap`, sonst manuelle Margins |
| `linear-gradient(...)` | `<LinearGradient>` aus `expo-linear-gradient` |
| `backdrop-filter: blur(...)` | `<BlurView>` aus `expo-blur` |
| `box-shadow:` | `shadowColor/Offset/Opacity/Radius` (iOS) + `elevation` (Android) |
| `overflow: hidden` | `overflow: 'hidden'` + ggf. `<MaskedView>` |
| `transform: rotate(...)` | `transform: [{ rotate: '90deg' }]` |
| Inline SVG (`<svg>`) | `react-native-svg` mit `<Svg><Path/></Svg>` |
| `font-family` String | `fontFamily: 'WorkSans_400Regular'` (geladen via expo-google-fonts) |
| `position: 'absolute'` | identisch, aber RN versteht nur Pixel, keine `%` für inset |
| CSS-Vars `var(--x)` | nicht supported — Konstanten oder Context nutzen |
| `cursor:` | weglassen (mobile, kein Cursor) |
| Hover-States | weglassen oder `Pressable` mit `pressed` Style |

### Konkrete Beispiele

**Web (Mockup):**
```jsx
<div style={{ padding: 16, background: '#fff', borderRadius: 18 }}>
  <span style={{ fontSize: 14, color: PP.ink }}>Moin!</span>
</div>
```

**React Native:**
```tsx
<View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 18 }}>
  <Text style={{ fontSize: 14, color: PP.ink, fontFamily: 'WorkSans_500Medium' }}>
    Moin!
  </Text>
</View>
```

**Gradient (Web → RN):**
```tsx
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['#27b092', '#79c4b0', '#80b4e2']}
  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
  style={{ borderRadius: 22, padding: 18 }}
>
  …
</LinearGradient>
```

**Glass Tab-Bar (Web → RN):**
```tsx
import { BlurView } from 'expo-blur';

<BlurView intensity={80} tint="light" style={{
  position: 'absolute', bottom: 12, left: 12, right: 12,
  height: 64, borderRadius: 26, overflow: 'hidden',
  flexDirection: 'row', alignItems: 'center',
}}>
  {/* tab items */}
</BlurView>
```

**Gradient-Ring (Web SVG → RN):**
```tsx
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';

<Svg width={132} height={132}>
  <Defs>
    <SvgGrad id="ring" x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor="#27b092" />
      <Stop offset="1" stopColor="#80b4e2" />
    </SvgGrad>
  </Defs>
  <Circle cx={66} cy={66} r={60} stroke="rgba(26,46,44,0.06)" strokeWidth={12} fill="none" />
  <Circle cx={66} cy={66} r={60} stroke="url(#ring)" strokeWidth={12} fill="none"
    strokeDasharray={2 * Math.PI * 60} strokeDashoffset={…} strokeLinecap="round"
    transform="rotate(-90 66 66)" />
</Svg>
```

### Was du 1:1 übernehmen kannst

- **Alle Werte:** Farben (`#27b092`), Radien (22, 18, 14), Padding-Größen, Font-Sizes — die sind identisch in Web und RN
- **Struktur:** Wie ein Screen aufgebaut ist (Header → ScrollView → Sections → TabBar)
- **Icon-Mapping:** Namen aus `theme.jsx` `Icon`-Komponente decken sich mit FA6-Namen (`house`, `medal`, `qr-scan`, etc.) — direkt mit `<FontAwesome6 name="house" />` aus `@expo/vector-icons` ersetzen

### Empfohlener Porting-Workflow für Claude Code

1. Erst alle Tokens aus §3 in `lib/theme.ts` übernehmen
2. UI-Primitives in `components/ui/` portieren (Card, Button, Pill, GradientRing, ProgressBar, BadgeMedallion, TabBar) — eines pro Datei
3. Pro Screen: das entsprechende `screens-*.jsx`-File aufmachen, Layout-Struktur abschauen, in RN umsetzen
4. iPhone-Live-Test via `npx expo start` + Expo Go App scannen

Tach. Los geht's.
