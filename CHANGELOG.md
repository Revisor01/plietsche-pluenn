# Changelog

Alle nennenswerten Änderungen an Plietsche Plünn (App + Backend) werden hier festgehalten.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/).
Versionierung: `App-Version (Build)` — TestFlight-Builds fortlaufend nummeriert.

## [Unreleased]

### Neu
- **Neuer Tab „Laden":** Alle Nutzer sehen das gesamte verfügbare Angebot im Laden, mit Filtern nach Kleidungsart und Größe. Teile sind antippbar und öffnen eine Detailansicht.
- **„Neu im Laden" antippbar:** Die Teile auf der Startseite führen jetzt direkt zur Detailansicht; „Alles ansehen" springt in den Laden-Tab.
- **Schnell-Vorlagen + Push im Aushang:** Im Aushang-Editor gibt es Vorlagen-Buttons (z.B. „Wir haben jetzt geöffnet", „Heute geschlossen", „Neue Ware ist da"). Beim Anlegen kann optional direkt eine Push-Benachrichtigung an alle gesendet werden.
- **Einreichen mit klarer Wahl:** Beim Vorschlagen eines Teils wählt man jetzt ausdrücklich „Bringe ich in den Laden" oder „Verbleibt bei mir". Bei „Verbleibt bei mir" ist die Standortangabe Pflicht.
- **Aktions-Bonus sichtbar:** Auf der Startseite zeigt jede laufende Aktion gut sichtbar, was sie bringt (z.B. „Doppelte Punkte", „Dreifach-Punkte"). Im Admin-Editor sieht man die Vorschau direkt beim Einstellen des Faktors.
- **Doppelte Punkte während einer Aktion:** Ordnet ein Helfer beim Freigeben ein gebrachtes Teil einer laufenden Aktion zu, bekommt der Einsteller die Bring-Punkte mit dem Aktions-Faktor (×1,5/×2/×3). Ohne Aktion bleibt es bei den normalen Bring-Punkten. Der Faktor steht zur Klarheit in der Punkte-History.
- **Aktions-Badges mit Fortschritt.** Ein Badge für eine Aktion kann jetzt Einzel-Abzeichen ODER Stufen sein (z.B. „Winterkinder": Bronze ab 2 Teilen, Silber ab 4). Das Badge wird im Badge-Editor direkt mit der Aktion verknüpft.
- **Helfer ordnet Teile einer Aktion zu:** Beim Freigeben fragt die App, zu welcher laufenden Aktion ein Teil zählt — das treibt die Fortschritts-Badges. Vergabe läuft laufend, sobald die Schwelle erreicht ist.

### Neu
- **„Bringen" zählt jetzt:** Wenn ein Besucher ein Teil einstellt und ein Helfer es freigibt, bekommt der Einsteller Bring-Punkte (einmalig pro Teil). Das Bringer-Badge zählt freigegebene Einreichungen.

### Behoben
- **SKU-Vergabe kollisionssicher** (leitet sich aus der höchsten bestehenden Nummer ab, nicht mehr aus der Anzahl — Löschungen verursachen keine Doppel-SKU mehr).
- **E-Mail-Format wird geprüft**, bevor eine Änderung abgeschickt wird.

### Behoben (Welle 3 — Datenfluss)
- **Punkte-History zeigte allen Admins ALLE Nutzer-Punkte** („mega viele Punkte"). Jetzt sieht jeder nur seine eigenen — auch Admins. Gleiches bei der Badge-Sammlung.
- **Rolle (Helfer/Admin) wird überall konsistent erkannt** — der „Teile"-Tab und Admin-Funktionen erscheinen jetzt zuverlässig, auch direkt nach dem Start.

### Geändert
- **Aushang zusammengefasst:** Laufende Aktionen und freie Ankündigungen erscheinen auf der Startseite gemeinsam unter „Aushang". „Bedarf" ist jetzt „Aushang & Ankündigungen" — für alles vom Laden (z.B. „2 Tage geschlossen").
- **Aktionen mit echtem Datums-Picker** (Format TT.MM.JJJJ), Zeitzone korrekt berücksichtigt.
- **Admin-Erklärtexte** in Badges, Aktionen und Ränge-Verwaltung; Teilnahme-Badge-Verknüpfung in Aktionen erklärt.

### Neu (Welle 2 — zeitgesteuerte Logik)
- **Push-Benachrichtigungen funktionieren jetzt.** Server versendet geplante Nachrichten (Aktionen, Hinweise) an die App; die App registriert ihr Gerät automatisch. Tote Geräte-Token werden selbst aufgeräumt. Zielgruppen (alle / nach Rolle / Streak / inaktiv) werden berücksichtigt.
- **Streak verfällt korrekt** bei Inaktivität: Wer länger als eine Woche nicht da war, verliert seinen Streak (täglicher Job) — vorher blieb er für immer stehen.
- **Jahres-Treue-Badges** werden am 31.12. rückwirkend vergeben (für jedes aktive Jahr).
- **Aktions-Teilnahme-Badges** werden nach Aktionsende an alle Teilnehmer vergeben.
- **Aktions-Zielgruppen wirken:** Eine Aktion „nur für Inaktive/nach Rolle/Streak" gilt jetzt wirklich nur für diese — vorher für alle.

### Behoben (Logik-Review Welle 1)
- **Noch nicht freigegebene Teile waren scanbar** — ein Besucher konnte sein eigenes eingereichtes Teil sofort scannen und Punkte kassieren. Jetzt zählt nur, was ein Helfer freigegeben hat.
- **Standort-Check beim Item-Scan** ergänzt (galt vorher nur beim Tür-Check-in).
- **„Teile"-Tab reagierte nicht** auf Antippen — jetzt öffnet er das Inventar zuverlässig.
- **Profil-Namensfeld blieb leer** — zeigt jetzt den aktuellen Namen.
- **Doppelter Check-in** bei schnellem Doppeltippen verhindert (kein doppelter Bonus mehr).

### Geändert
- **Bronze-Rang muss verdient werden:** Unter 150 Punkten hat man noch keinen Rang (vorher startete Bronze bei 0). Schwellen bleiben im Admin frei einstellbar.
- **Verwaltungs-Menü entschlackt:** Teile und Badges nicht mehr doppelt (über Tab bzw. Zahnrad erreichbar).

### Neu
- **Icon-Picker für Badges.** Statt FA6-Namen zu tippen, wählt man das Badge-Icon aus einem Raster.
- **Diamant** als 5. Stufe — bei Badges (zusätzlich zu Bronze/Silber/Gold/Platin) und bei den globalen Punkte-Rängen.
- **Punkte-Ränge selbst einstellen.** Neuer Admin-Bereich „Punkte-Ränge": die Punktgrenzen für Bronze→Diamant (Startseiten-Ring) frei konfigurierbar.

### Neu (vorherige Runde)
- **Teil antippen → Detailseite zum Bearbeiten.** Alle Felder änderbar (Titel, Größe, Punkte, Standort, Kategorie, Foto), Schaufenster-Schalter, archivieren, freigeben und großer QR-Code zum Drucken.
- **Aktionen mit Doppelpunkten.** Admin legt Aktionszeiträume an (z.B. „Winterkleidung 1.–31.12., ×2 Punkte"). In dem Zeitraum zählt jeder Scan/Check-in mehrfach. Optional ein Teilnahme-Badge koppeln.
- **Bedarf-Aushang.** „Das suchen wir gerade" auf der Startseite — Helfer/Admin tragen ein, was der Laden braucht (z.B. „Winterjacken Gr. 140").
- **Flexibleres Badge-System.** Zwei Arten: Stufen-Badges (Bronze→Platin, wie bisher) und Einzel-Abzeichen (ein Award mit optionalem Bonus) — z.B. für Jahres-Treue („1. Jahr aktiv", rückwirkend) oder Aktions-Teilnahme. Badge-Editor entsprechend erweitert und klarer beschriftet.
- **Verwaltungs-Bereich** im Profil bündelt Inventar, Badges, Aktionen und Bedarf für Helfer/Admins.

### Behoben
- **Gesamtpunkte aktualisierten sich nicht** nach Check-In/Scan. Die Anzeige hing am zwischengespeicherten Login-Stand; jetzt wird der Punktestand nach jedem Scan sofort frisch geladen und in den Login-Speicher zurückgeschrieben.
- **Tastatur schloss sich nach jedem Buchstaben** in allen Formularen (Profil, Teil einstellen, Badge-Editor). Ursache war ein Render-Bug im Screen-Grundgerüst — behoben, der Fokus bleibt jetzt erhalten.

### Neu
- **Teile-Übersicht (eigener Tab für Helfer/Admin).** Vollständiges Inventar mit Bildern, Filtern (Alle / Schaufenster / Zu prüfen / Vergeben), QR-Code je Teil und Aktionen pro Teil: freigeben, ins/aus dem Schaufenster, archivieren.
- **Schaufenster direkt beim Einstellen** festlegen (nur Helfer/Admin) — ein Schalter im Einstell-Formular.
- **„Neu im Laden" auf der Startseite** zeigt die neuesten eingestellten Teile mit Foto.
- **Badge-Verwaltung für Admins.** Voller Editor: Badges anlegen/bearbeiten/löschen mit Name, Icon, Auslöser (Besuche/Teile/Streak), Tier-Schwellen (Bronze/Silber/Gold/Platin) und Belohnungspunkten je Stufe. Erreichbar über das Zahnrad im Badges-Tab.

## [1.0.0 (4)] – 2026-06-27

### Neu
- **Teile einstellen.** Neuer Screen, um Kleidungsstücke einzustellen — mit Foto, Kategorie, Zustand, Größe, Standort und einem Schalter „verbleibt beim Besitzer" (für große Teile, die nicht im Laden stehen). Admin/Volunteer stellen direkt freigegeben ein; normale Besucher reichen Vorschläge ein, die geprüft werden müssen.
- **Freigabe-Bereich für Helfer.** Staff sieht eingereichte Vorschläge mit QR-Code-Vorschau und kann sie freigeben, ins Schaufenster heben oder ablehnen.
- **Automatische QR-Codes** je Teil (SKU-basiert), in der Freigabe-Ansicht direkt sichtbar.

### Geändert
- **Schriften app-weit vergrößert** (globaler Skalierungsfaktor, wirkt jetzt auf alle Texte — auch die, die vorher fest verdrahtet waren).

### Behoben
- **Abmelden-Button lag unter der Menüleiste** und war teils verdeckt — Abstand auf allen Unterseiten korrigiert.

## [1.0.0 (3)] – 2026-06-27

### Behoben
- **App hing beim Start ewig auf dem Lade-Spinner.** Ursache: das PocketBase-JS-SDK war Version 0.26, der Server läuft aber 0.22 — der Versions-Mismatch ließ die Auth-Initialisierung hängen. SDK auf 0.22.1 gepinnt. Zusätzlich entscheidet der Start-Screen jetzt selbst über das Ziel (Login/Onboarding/App), statt passiv auf den Navigations-Guard zu warten, und der Auth-Status wird zuverlässiger erkannt.

## [1.0.0 (2)] – 2026-06-26

### Behoben
- **Punkte-Berechnung korrigiert.** `points_total` wurde inkrementell hochgezählt und konnte dauerhaft von der Wahrheit abweichen (Test-User zeigte 120 statt korrekter 450). `awardPoints()` berechnet `points_total` jetzt immer neu als Summe aller `points_log`-Einträge — selbstheilend, kann nicht mehr divergieren. (Backend: `pb_hooks/lib/points.js`)

### Neu
- **Profil-/Konto-Menü.** Eigener Screen zum Ändern von Anzeigename, E-Mail (mit Bestätigungsmail) und Passwort, plus Abmelden. Erreichbar über Tipp auf den Avatar oben links im Home-Screen.
- **Schaufenster „Alles ansehen".** Der Button öffnet jetzt einen eigenen Screen mit allen Schaufenster-Artikeln im 2-Spalten-Raster (vorher ohne Funktion).

### Geändert
- **Größere Schriften** in der ganzen App (Schriftgrößen-Tokens zentral um ~12–15 % angehoben) für bessere Lesbarkeit.

## [1.0.0 (1)] – 2026-06-26

### Neu
- Erster TestFlight-Build der neugebauten App (Expo SDK 54 + PocketBase).
- Liquid-Glass-Tab-Bar (iOS 26), gamifizierte Punkte-Card mit Gradient-Ring, Tab-Struktur Home / Check-In / Badges / Punkte.
