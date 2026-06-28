# Changelog

Alle nennenswerten Änderungen an Plietsche Plünn (App + Backend) werden hier festgehalten.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/).
Versionierung: `App-Version (Build)` — TestFlight-Builds fortlaufend nummeriert.

## [Unreleased]

### Neu
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
