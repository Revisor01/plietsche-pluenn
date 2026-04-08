# Phase 3: Visitor Experience - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Besucher scannen QR-Codes an Kleidungsstücken (Item-Checkout) und an der Ladentür (Check-In), sammeln PlietschPunkte, und geben an wie viele nicht-digitale Teile sie mitgenommen haben. Punktestand prominent auf dem Homescreen.

</domain>

<decisions>
## Implementation Decisions

### QR-Scan UX
- Erfolgs-Feedback: Toast-Nachricht mit Item-Titel + "+X Punkte" (2 Sekunden), dann zurück zur Kamera
- Fehler-Feedback: Inline im Scan-Screen ("Dieses Teil wurde bereits mitgenommen" / "Unbekannter QR-Code")
- Eigenes Item scannen: Blockiert mit Fehlermeldung "Du hast dieses Teil eingestellt"
- Scanner nutzt react-native-vision-camera (bereits in Phase 1 installiert)

### Check-In Flow
- Tür-QR rotiert wöchentlich (HMAC-signiert mit Wochen-Zeitfenster) — nicht häufiger, das reicht
- GPS-Toleranz: 150m Radius (Haversine-Distanz serverseitig)
- GPS-Koordinaten nur validieren, NICHT persistieren (DSGVO)
- Nach Check-In: Stepper "Wie viele Teile hast du mitgenommen?" (+ / - Buttons, 0 bis Höchstgrenze)
- Teile-Höchstgrenze: Admin-konfigurierbar pro Store (Default: 10)

### PlietschPunkte
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/modules/items/` — Items-Modul (Router, Service, Repository) als Pattern
- `backend/src/modules/auth/` — Auth-Modul als Pattern
- `backend/src/middleware/auth.ts` — authenticateToken
- `backend/src/middleware/requireRole.ts` — Rollen-Guard
- `backend/src/db/schema.ts` — stores + items Tabellen
- `mobile/src/api/client.ts` — apiClient mit Token-Interceptor
- `mobile/src/store/authStore.ts` — Zustand Store Pattern
- `mobile/src/navigation/AppNavigator.tsx` — Bottom-Tabs Navigation
- react-native-vision-camera bereits installiert (Phase 1)
- react-native-geolocation-service bereits installiert (Phase 1)

### Established Patterns
- Backend: Router → Service → Repository
- Mobile: Zustand Stores, apiClient für API-Calls
- Validation: Zod auf Backend

### Integration Points
- Neues scan-Modul im Backend (QR-Scan Checkout)
- Neues checkin-Modul im Backend (Tür-Check-In + GPS)
- Neues points-Modul im Backend (Punkte-Engine)
- Scanner-Screen in Mobile Navigation
- HomeScreen erweitern mit Punktestand
- Neue DB-Tabellen: point_transactions, checkins, store_settings (für konfigurierbare Werte)

</code_context>

<specifics>
## Specific Ideas

- Tür-QR wöchentlich rotieren — nicht häufiger (User-Feedback: "Das ist absurd, wöchentlich reicht")
- GPS 150m — nicht 200m
- Teile-Höchstgrenze admin-konfigurierbar, Default 10
- Alle Punkte-Werte admin-konfigurierbar

</specifics>

<deferred>
## Deferred Ideas

- Punkte einlösen / Belohnungssystem (v1.x — Kampagnen)
- Punkt-Multiplikatoren bei Aktionen (v1.x — Kampagnen)
- Offline-QR-Scan (falls kein Internet im Laden)

</deferred>
