# Pitfalls Research

**Domain:** Community clothing exchange app — React Native bare, QR scanning, GPS check-in, multi-tenant, DSGVO
**Researched:** 2026-04-07
**Confidence:** MEDIUM (architecture pitfalls HIGH, DSGVO specifics MEDIUM, GPS indoor LOW without device testing)

---

## Critical Pitfalls

### Pitfall 1: React Native New Architecture — Library Audit skipped before migration

**What goes wrong:**
Die Migration von Expo zu React Native bare + New Architecture läuft scheinbar durch, aber bestimmte native Libraries crashen oder rendern ein leeres Screen ("Blank Screen of Doom"). Besonders Libraries, die `setNativeProps` verwenden oder legacy Bridge-Pattern nutzen, versagen still.

**Why it happens:**
Entwickler migrieren den App-Code, prüfen aber nicht jede native Dependency einzeln auf New Architecture-Kompatibilität. Die Interop-Layer (seit RN 0.74 automatisch aktiv) schlägt bei bestimmten UI-manipulierenden Modulen ohne klare Fehlermeldung fehl.

**How to avoid:**
Vor der Migration eine vollständige Audit-Liste aller nativen Dependencies erstellen. Für jede Library prüfen: (1) unterstützt New Architecture, (2) nutzt `setNativeProps` (deprecated), (3) nutzt JavaScriptCore-spezifisches Verhalten (Hermes ist Pflicht). Kritische Libraries: `react-native-vision-camera`, `react-native-geolocation-service`, QR-Code-Generierung.

**Warning signs:**
- Leerer Screen nach Migration ohne JS-Error
- `setNativeProps`-Aufrufe in Library-Code (grep vor Migration)
- Library-Repo hat kein "New Architecture" Badge oder offenes Issue dazu

**Phase to address:** Migration-Phase (Expo → Bare) — vor dem ersten Build

---

### Pitfall 2: GPS-Verifikation als alleiniger Sicherheitsmechanismus

**What goes wrong:**
Der Vor-Ort-Check-In basiert auf GPS + Tür-QR. Indoor ist GPS-Genauigkeit 12–60 Meter — ein Nutzer auf der gegenüberliegenden Straßenseite oder im Nachbargebäude kann als "vor Ort" gelten. Schlimmer: GPS-Spoofing-Apps (Android: Mock Location; iOS: Jailbreak-Tools) ermöglichen beliebige Koordinaten.

**Why it happens:**
GPS wurde für Outdoor-Navigation entwickelt, nicht für Raumverifikation. Indoor-Signale werden durch Wände gedämpft, der Empfänger fällt auf WLAN/Mobilfunk-Triangulation zurück, die deutlich ungenauer ist.

**How to avoid:**
GPS ist Soft-Check, nicht Hard-Check. Kombination aus: (1) QR-Code an der Tür (notwendige Bedingung), (2) GPS als zusätzlicher Indikator mit großzügigem Radius (z.B. 200m), (3) server-seitig Plausibilitätsprüfung (Check-in-Frequenz). Den QR-Code-Scan als primären Mechanismus behandeln, GPS nur als zweite Schicht. Der Wert des Check-in-Systems ist sozial (Anreiz, nicht Pflicht), daher ist perfekte Verifikation nicht nötig — akzeptable Fehlerrate einplanen.

**Warning signs:**
- `enableHighAccuracy: true` ohne Timeout-Fallback → App hängt bei GPS-Suche
- Radius unter 100m im Deployment → hohe False-Negative-Rate
- Kein Rate-Limiting für Check-ins → Spammer ohne GPS-Spoofing

**Phase to address:** Check-In-Feature-Phase — Entscheidung über Toleranzradius muss vor Implementierung getroffen werden

---

### Pitfall 3: DSGVO — GPS-Standortdaten sind personenbezogen, kein Opt-out möglich

**What goes wrong:**
Standortdaten (GPS-Koordinaten) sind nach Art. 4 DSGVO personenbezogene Daten, sobald sie einem Account zugeordnet werden. Wer GPS für Check-in nutzt, erhebt zwingend personenbezogene Daten — auch wenn die App "kein Tracking" verspricht. Ohne explizite Rechtsgrundlage (Art. 6 DSGVO) ist das illegal.

**Why it happens:**
"Wir tracken nicht wer was mitnimmt" ist richtig für Item-Tracking, aber das GPS-Check-in ist selbst ein Standort-Ereignis, das mit einem Nutzer-Account verknüpft ist. Viele Entwickler trennen diese Konzepte nicht sauber.

**How to avoid:**
Rechtsgrundlage vor Implementierung klären: Am einfachsten Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung, da Check-in zur Punktevergabe nötig ist) oder informierte Einwilligung (lit. a). Datenschutzerklärung muss GPS-Zweck explizit nennen. Standortdaten dürfen nur für den Check-in-Zweck verwendet werden, nicht gespeichert oder ausgewertet. Minimalprinzip: nur bestätigen "Nutzer war im Umkreis von X", keine genauen Koordinaten serverseitig speichern.

**Warning signs:**
- GPS-Koordinaten werden in DB gespeichert (sollten nur validiert, nicht persistiert werden)
- Datenschutzerklärung erwähnt GPS nicht
- Kein expliziter Hinweis im Check-in-Flow "Wir prüfen deinen Standort einmalig"

**Phase to address:** Auth/Onboarding-Phase — Datenschutzerklärung und Einwilligungsflow vor GPS-Feature

---

### Pitfall 4: Multi-Tenant — fehlende Tenant-Isolation auf DB-Ebene

**What goes wrong:**
Ohne Row Level Security (RLS) in PostgreSQL oder konsequentes `tenant_id`-Filtering im ORM kann ein Request eines Tenants auf Daten eines anderen Tenants zugreifen. Besonders gefährlich bei generischen Abfragen ohne explizites WHERE-Clause.

**Why it happens:**
Entwickler filtern tenant-bezogen im Application-Code, vergessen aber eine Query oder ein neues Endpoint. Ohne datenbankebene Absicherung ist ein einziger vergessener Filter ein Datenleck.

**How to avoid:**
PostgreSQL RLS als Defense-in-Depth: Application-Code verbindet sich als nicht-Owner-Rolle, RLS-Policies erzwingen `tenant_id`-Filter automatisch. Alternativ Schema-per-Tenant bei wirklich starker Isolation (höherer Overhead). NIEMALS als DB-Owner connecten. Context-Variable `app.current_tenant` setzen beim Connection-Pool-Checkout, nicht ad-hoc per Query.

**Warning signs:**
- Application verbindet sich als `postgres` oder table-owner Role
- ORM-Queries haben kein automatisches tenant_id-Scoping
- Kein Test, der explizit Cross-Tenant-Access versucht und ablehnt

**Phase to address:** Backend/Datenbankschema-Phase — RLS von Anfang an, nicht nachrüsten

---

### Pitfall 5: SQLite → PostgreSQL Datenmigration — stille Typ-Inkonsistenzen

**What goes wrong:**
SQLite ist typflex: Booleans werden als 0/1 gespeichert, Datumsfelder als TEXT oder INTEGER. PostgreSQL ist strikt. Die Migration wirft keine Fehler, aber `WHERE active = true` findet keine Rows, die als `1` migriert wurden. Timestamp-Parsing bricht.

**Why it happens:**
Das bestehende SQLite-Schema hat vermutlich kein striktes Typing. Wenn Daten via CSV-Export/Import oder pgloader migriert werden, werden Werte übernommen, aber als falscher Typ interpretiert.

**How to avoid:**
Vor Migration: SQLite-Schema und echte Datenwerte inventarisieren (besonders boolean- und datetime-Felder). Migrationsskript schreiben das explizit konvertiert: `CAST(active AS BOOLEAN)`, ISO-8601-Timestamps normalisieren. Nach Migration: Row-Count-Vergleich und Stichproben-Queries in beiden DBs.

**Warning signs:**
- Boolean-Felder im Schema als `INTEGER` deklariert
- Datums-Queries liefern falsche Ergebnisse nach Migration
- Row-Count stimmt, aber App-Verhalten ändert sich subtil

**Phase to address:** Migrations-Phase — eigenes Migrations-Skript mit Validierung, kein blindes Tool-basiertes Dump-Restore

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| GPS-Koordinaten serverseitig speichern statt nur validieren | Einfacher Debug, spätere Auswertung | DSGVO-Verstoß, Bußgeld, Vertrauensverlust | Never |
| App-Code-Only Tenant-Filtering ohne RLS | Schnellere Implementierung | Ein vergessenes WHERE = Datenleck | Never für Produktion |
| `enableHighAccuracy: false` für GPS-Check-in | Schnellere Standortermittlung | Zu ungenau, Check-in versagt indoor | Akzeptabel als Fallback nach Timeout |
| SQLite im Client für Offline-Queue behalten | Kein Sync-Aufwand | Conflict-Resolution fehlt, Datenverlust bei Merge | Akzeptabel wenn Queue-only (kein Sync-State) |
| React Native Interop Layer für legacy Libraries | Schnellere Migration | Unerwartetes Verhalten, Performance-Overhead | Nur temporär, Library-Update planen |
| Alle Punkte-Transaktionen ohne Audit-Log | Weniger Tabellen | Unmöglich Fehler nachzuvollziehen, Vertrauen der Ehrenamtlichen | Nie für Points-System |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| react-native-vision-camera (QR) | `useCodeScanner` ohne Frame-Drop-Logic → CPU-Spike | `fps`-Limit setzen, Scanning pausieren nach Erfolg |
| react-native-vision-camera (QR) | Kein Cooldown nach erfolgreichem Scan → Doppel-Scan | 1–2s Lock nach erstem Treffer, visuelles Feedback |
| Geolocation auf Android | `getCurrentPosition` ohne Timeout → App hängt | Immer `timeout: 10000` + `maximumAge: 60000` als Fallback |
| Geolocation auf iOS | Keine Erklärung im Permission-Dialog → User lehnt ab | `NSLocationWhenInUseUsageDescription` präzise formulieren |
| PostgreSQL RLS | Als DB-Owner connecten → RLS wird ignoriert | Separate App-Rolle ohne BYPASSRLS-Privileg |
| JWT Multi-Tenant | `tenant_id` im Token fehlt oder wird nicht geprüft | `tenant_id` im JWT-Payload erzwingen, Middleware validiert |
| QR-Code-Generierung | QR-Code-Inhalt ist lesbare UUID → einfach zu fälschen | HMAC-signierte Payload oder kurze TTL-Tokens im QR |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 Queries bei Item-Listing mit Tenant-Filter | Inventory-Screen wird langsam | Eager-Load mit JOIN, Pagination | Ab ~500 Items pro Tenant |
| Zu breite RLS-Policies ohne Index auf `tenant_id` | Alle Queries langsam nach erstem Tenant | `CREATE INDEX` auf `tenant_id` in jeder Tabelle | Ab 2. Tenant im System |
| Camera-Frame-Processing ohne Throttle | Überhitzung, Akku-Drain | Max 15fps für Code-Scanner, pause on background | Sofort auf älteren Geräten |
| GPS `watchPosition` ohne `remove()` beim Unmount | Memory Leak, Batterie-Drain | Cleanup in `useEffect` Return | Sofort nach Navigation |
| Punkte-Berechnung im Client | Manipulierbar, inkonsistent | Nur server-seitig berechnen | Sobald App veröffentlicht |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| QR-Code an der Tür enthält nur statische Store-ID | Jeder kann die ID abfotografieren und remote "einchecken" | QR rotiert täglich oder enthält zeitgestempelten HMAC |
| GPS-Koordinaten im Client-Request nicht validiert | GPS-Spoofing-Apps liefern beliebige Koordinaten | Server-seitig Radius prüfen, Rate-Limiting pro User/Tag |
| `tenant_id` nur im App-Code gesetzt | SQL-Injection oder direkter API-Aufruf umgeht Tenant-Grenze | RLS in DB als zusätzliche Schicht |
| Punkte-Gutschrift ohne Idempotenz-Key | Netz-Retry verdoppelt Punkte | Idempotenz-Key pro Scan-Event, server-seitig deduplizieren |
| Item-QR-Code nach Entnahme weiter gültig | Gleicher Code kann mehrfach gescannt werden | Status-Check beim Scan: `active` Items scanbar, `taken` returns 409 |
| Kein Rate-Limit auf Check-in-Endpoint | Punkte farmen ohne Vor-Ort-Presence | Max 1 Check-in pro User pro X Stunden serverseitig |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| GPS-Permission-Dialog ohne Erklärung | Ehrenamtliche und Besucher lehnen ab, Check-in funktioniert nie | Vor Permission-Request: Screen "Wir prüfen einmalig deinen Standort für den Check-in" |
| Kamera-Permission beim ersten Start | Abschreckend ohne Kontext | Permission erst beim ersten Scan anfordern, mit Erklärung |
| Fehler beim QR-Scan ohne Feedback | User weiß nicht ob Scan geklappt hat | Visuelles + haptisches Feedback (Vibration) bei Erfolg und Fehler |
| Ehrenamtliche müssen QR-Code generieren ohne Drucker | Kleidung kann nicht ausgezeichnet werden | QR-Code als PDF exportierbar, auch als Bildschirmausdruck zeigbar |
| Punkte-Stand nicht prominent sichtbar | Gamification-Anreiz verfehlt seinen Zweck | Punkte im Header/Homescreen immer sichtbar |
| Komplexer Onboarding-Flow für Ehrenamtliche | Ehrenamtliche brechen ab, App wird nicht genutzt | Max 3 Schritte bis zum ersten Item anlegen, Rest optional |
| Offline-Fehler ohne Erklärung | "App funktioniert nicht" — Nutzung bricht ein | Connectivity-Banner + "Wird synchronisiert sobald Verbindung da" |

---

## "Looks Done But Isn't" Checklist

- [ ] **QR-Scanner:** Nur implementiert für einfache Bedingungen — testen auf: Kratzern auf Etiketten, schlechtem Licht, kleinem Etikett, Winkel >30 Grad
- [ ] **GPS-Check-in:** Funktioniert auf dem Entwicklungs-Smartphone — testen auf: altem Android-Gerät, Indoor ohne Fenster, iOS mit reduzierter Genauigkeit
- [ ] **Multi-Tenant RLS:** Policies definiert — verifizieren: Cross-Tenant-Access-Test mit zwei Tenants, direkter DB-Query als App-Rolle
- [ ] **Punkte-System:** Punkte werden gutgeschrieben — verifizieren: Doppel-Scan, Netz-Timeout-Retry, Rollback bei Fehler
- [ ] **DSGVO-Compliance:** App läuft — verifizieren: Datenschutzerklärung vorhanden, GPS-Zweck erklärt, Datenlöschung möglich (Recht auf Vergessenwerden)
- [ ] **SQLite-Migration:** Daten sind in PostgreSQL — verifizieren: Row-Count, Boolean-Werte, Timestamp-Queries, Foreign-Key-Constraints
- [ ] **Offline-Szenario:** Check-in schlägt fehl — verifizieren: Was sieht der User? Werden Aktionen in Queue gespeichert? Sync beim Reconnect?
- [ ] **Item-Status nach Scan:** Kleidungsstück als "taken" markiert — verifizieren: Zweiter Scan desselben Codes gibt 409, Item verschwindet aus Bestand

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Falsche Library ohne New Architecture Support entdeckt | MEDIUM | Ersatz-Library evaluieren; Interop Layer temporär nutzen; Library-Fork als letztes Mittel |
| Cross-Tenant Datenleck entdeckt | HIGH | Sofort alle betroffenen Tenants informieren (DSGVO: 72h-Meldepflicht); RLS nachrüsten; forensische Analyse welche Daten betroffen |
| GPS-Verifikation wird systematisch umgangen | LOW | Toleranzradius anpassen; QR-Code an der Tür täglich rotieren; soziale Kontrolle reicht für Community-App |
| SQLite-Migration mit falschen Boolean-Werten | MEDIUM | Korrekturs-Skript auf PostgreSQL; betroffene Rows identifizieren via `WHERE active NOT IN (true, false)` |
| Punkte-Duplikation durch Netz-Retry | LOW | Idempotenz-Keys nachträglich einführen; falsch gutgeschriebene Punkte manuell korrigieren via Admin-UI |
| DSGVO-Beschwerde wegen GPS-Speicherung | HIGH | Koordinaten aus DB löschen; Prozess auf "nur validieren, nicht speichern" umstellen; Datenschutzerklärung aktualisieren |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Library Audit New Architecture | Phase 1: Migration Setup | Alle nativen Dependencies auf NA-Support geprüft, Test-Build läuft |
| GPS als alleiniger Mechanismus | Phase 2: Check-In-Feature | Toleranzradius dokumentiert, QR als primärer Trigger |
| DSGVO GPS-Speicherung | Phase 2: Check-In-Feature | Keine GPS-Koordinaten in DB, Datenschutzerklärung vorhanden |
| Multi-Tenant RLS | Phase 3: Multi-Tenant | Cross-Tenant-Test schlägt erwartungsgemäß fehl |
| SQLite-Migration Typ-Inkonsistenz | Phase 1: DB-Migration | Row-Count-Vergleich + Boolean/Timestamp-Queries bestehen |
| QR-Code-Fälschung | Phase 2: QR-Feature | HMAC oder rotierende Codes implementiert |
| Punkte-Duplikation | Phase 2: Punkte-System | Idempotenz-Test: selber Request 2x → 1x Punkte |
| Volunteer UX Komplexität | Alle Feature-Phasen | Usability-Test mit echten Ehrenamtlichen vor Release |

---

## Sources

- React Native New Architecture migration pitfalls: [Shopify Engineering](https://shopify.engineering/react-native-new-architecture) | [reactwg Discussion #68](https://github.com/reactwg/react-native-new-architecture/discussions/68)
- Vision Camera edge cases: [VisionCamera Code Scanning Docs](https://react-native-vision-camera.com/docs/guides/code-scanning) | [Scanbot comparison](https://scanbot.io/blog/popular-open-source-react-native-barcode-scanners/)
- GPS indoor accuracy: [geolocation-service accuracy docs](https://github.com/Agontuk/react-native-geolocation-service/blob/master/docs/accuracy.md) | [Issue #421](https://github.com/Agontuk/react-native-geolocation-service/issues/421)
- DSGVO Standortdaten: [DGD Deutsche Gesellschaft für Datenschutz](https://dg-datenschutz.de/dsgvo_und_standortdaten/) | [GDPRWise GPS Data](https://gdprwise.eu/questions-and-answers/gps-data-gdpr-implications/)
- PostgreSQL RLS pitfalls: [AWS Multi-Tenant RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) | [Permit.io RLS Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)
- SQLite → PostgreSQL Migration: [Render Migration Guide](https://render.com/articles/how-to-migrate-from-sqlite-to-postgresql) | [Open-WebUI Discussion](https://github.com/open-webui/open-webui/discussions/21609)
- QR Security: [QR Code Contact Tracing Security](https://www.sine.co/blog/implement-secure-qr-code/)

---
*Pitfalls research for: Plietsche Plünn — Community Clothing Exchange App*
*Researched: 2026-04-07*
