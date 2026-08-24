# Changelog

Alle nennenswerten Änderungen an Plietsche Plünn (App + Backend) werden hier festgehalten.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/).
Versionierung: `App-Version (Build)` — TestFlight-Builds fortlaufend nummeriert.

## [Unreleased]

### Geändert (Erscheinungsbild)
- **Neues App-Symbol:** Auf dem Startbildschirm steht jetzt ein P² im Kreis — schlicht, in den Farben der App. Die Linien sind schmal gehalten und das Zeichen steht mit Luft im Feld, damit es ruhig wirkt.

### Neu (Etiketten & Abzeichen-Details)
- **QR-Etiketten zum Ausdrucken:** In der Teile-Übersicht erzeugt „QR-Etiketten drucken" einen A4-Bogen als PDF — vier Etiketten pro Reihe, je mit QR-Code, Name, Größe, Kategorie, Zustand, Nummer und Punktwert. Über den Teilen-Dialog geht er direkt an den Drucker oder per Mail weiter. Gedruckt wird immer die gerade gewählte Auswahl; bereits mitgenommene Teile bleiben außen vor. Die Codes stecken vollständig im Dokument, es braucht zum Drucken also kein Netz.
- **Abzeichen antippen zeigt die Beschreibung:** Beim Umbau auf das Raster hatte die Beschreibung keinen Platz mehr. Ein Tippen öffnet sie jetzt zusammen mit allen Stufen und dem Stand je Stufe. Geheime Abzeichen bleiben dabei verdeckt.
- **Eigene Farbe für Einzel-Abzeichen:** Ein besonderes Abzeichen kann eine eigene Farbe bekommen, statt immer im Gold der obersten Stufe zu leuchten. Gestufte Abzeichen behalten ihre Stufenfarben.

### Geändert
- **Teilnahme zählt, worauf es Bonus gibt:** Bisher zählte für Aktions-Abzeichen ausschließlich das Bringen — auch dann, wenn die Aktion darauf gar keinen Bonus gab, während Holen mit ×3 unberücksichtigt blieb. Jetzt zählt genau das, was die Aktion hervorhebt: Steht Bringen auf ×2, zählt jedes gebrachte Teil; steht Holen auf ×1, zählt Holen nicht.
- **Einzel-Abzeichen ohne Schwellenfeld:** Bei „Teilnahme" stand ein Feld „ab (Schwelle)", das der Server gar nicht auswertet — die Vergabe läuft über die Aktion selbst. Es ist entfernt.
- **Einzel-Abzeichen zeigen „Noch offen" statt eines Zählerstands** — „0/1 bis Gold" ergab dort keinen Sinn.

### Geändert (Abzeichen & Symbole)
- **Abzeichen-Stufen kommen aus „Punkte & Ränge":** Wie viele Stufen ein Abzeichen hat und wie sie heißen, richtet sich nach den dort gepflegten Rängen. Wer sie „Strandgut, Priel, Deich" nennt, sieht diese Namen auch am Abzeichen; pro Abzeichen trägst du nur noch das Ziel und den Bonus ein. Bis zu fünf Stufen — so viele hält ein Abzeichen vor.
- **Warum manche Abzeichen Diamant hatten und andere nicht:** Das lag nie an einer Einstellung, sondern an einem leeren Feld — bei „Bringer" war die fünfte Stufe gefüllt, bei den übrigen nicht. Jetzt ist sichtbar, welche Stufen es gibt, und leere entfallen bewusst.
- **Aktionsbadge klarer:** Bei Auslöser „Aktions-Teilnahme" heißt die Wahl jetzt „Teilnahme" (einmal im Zeitraum dabei) oder „Stufen" (nach Anzahl der Beiträge) statt „Einzel-Abzeichen / Gestuft".
- **Verknüpfung nur noch an einer Stelle:** Aktionsbadges werden im Abzeichen-Editor mit ihrer Aktion gekoppelt. Die zweite Auswahl in der Aktion ist entfallen — sie pflegte ein zweites Feld, das leicht auseinanderlief.
- **Symbole mit mehr Gefühl:** Der Vorrat für Abzeichen und Aktionen führte technische Zeichen (Diagramm, Lupe, Regler). Jetzt sind es 64 Symbole aus Auszeichnung, Jahreslauf, Küste, Miteinander, Gefühl und Laden — Krone, Muschel, helfende Hand, Anker, Kleeblatt statt Messinstrumente.

### Behoben
- **Aktionsbadges konnten stumm ausfallen:** Die Kopplung zwischen Aktion und Abzeichen steht in zwei Feldern — eines steuert den Fortschritt, das andere die Vergabe. Wurde nur eines gepflegt, zählte das Abzeichen mit, wurde aber nie vergeben (oder umgekehrt). Beide werden jetzt gemeinsam gesetzt.
- **Server vergab Stufen, die die App nicht zeigt:** Wer einen Rang entfernte, sah eine Stufe weniger — im Hintergrund wurde sie weiter verliehen. Die Vergabe hält sich jetzt an dieselbe Anzahl.

### Neu
- **Geheime Abzeichen:** Ein Abzeichen lässt sich als geheim markieren. Es steht dann grau und namenlos in der Sammlung — man sieht, dass es etwas zu holen gibt, aber nicht was. Mit der ersten Stufe klappt es auf. Auch nach Ende einer Aktion bleibt die Kachel stehen: Wer nicht dabei war, behält eine Leerstelle.
- **Abzeichen als Raster:** Die Sammlung steht in zwei Spalten statt untereinander — bei einem Abzeichen pro Aktion wurde die Liste zu lang zum Überblicken.
- **Fortschritt als Ring:** Jede Kachel trägt einen Ring in der Farbe der erreichten Stufe (Bronze bis Diamant), ungelöst grau.

### Geändert
- **Aushang: Ankündigungen zuerst:** Freie Ankündigungen stehen jetzt über den Aktionen — dort gehören Dinge wie Öffnungszeiten hin, die dauerhaft gelten. Befristete Aktionen folgen darunter.
- **Aushang-Farbe wirkt:** Die gewählte Farbe färbt jetzt die ganze Karte (Kante und getönte Fläche) statt nur des kleinen Symbols. Vorher war eine Farbwahl praktisch nicht zu erkennen.
- **„Watt's neu" vom Dashboard entfernt:** Der Verlauf stand dort ein zweites Mal. Stattdessen führt ein Tippen auf den Punktestand oben direkt in die Punkte-Übersicht.
- **Schlankeres Logo:** Die Kontur des P ist gleichmäßig ausgedünnt — der Strich war insgesamt zu fett. App-Symbole für iOS und Android neu abgeleitet.
- **Aktionsliste zeigt die Boni ausgeschrieben:** Zeitraum und Boni stehen in getrennten Zeilen; die Boni nennen den Anlass beim Namen (`Kommen ×2 · Mitnehmen ×3`) statt als Kürzel. In einer Zeile schnitt der Zeitraum sie regelmäßig ab.
- **„Aktionen" ohne Klammerzusatz:** Der Eintrag in den Einstellungen hieß „Aktionen (Doppelpunkte)".

### Behoben (Abzeichen zeigen jetzt die Wahrheit)
- **„Durchhalter" zeigte Fortschritt ohne Check-in:** Das Abzeichen stand auf „1/2 Wochen in Folge", obwohl seit Wochen niemand da war. Ursache waren zwei Fehler, die sich gegenseitig verdeckt haben: der Fortschritt lag als Kopie in der Abzeichen-Tabelle und wurde beim nächtlichen Zurücksetzen der Serie nicht mitgezogen — und die Serie selbst hing an einem Zählerfeld beim Nutzer statt an den tatsächlichen Besuchen.
- **Serie zählt jetzt aus den Besuchen:** Wie viele Wochen jemand in Folge da war, wird aus den echten Check-ins abgeleitet. Ohne Besuch gibt es keinen Fortschritt — auch dann nicht, wenn ein alter Zählerstand herumliegt.
- **Nächtliches Zurücksetzen zieht die Abzeichen mit:** Verfällt eine Serie, wird der angezeigte Fortschritt sofort mit korrigiert.
- **Punktestand und Serie sind schreibgeschützt:** Diese Felder konnten von der App aus verändert werden — was die Abzeichen-Vergabe angreifbar machte. Sie werden jetzt nur noch serverseitig gesetzt; das Team behält seine Korrekturmöglichkeit.
- **Fortschritt wird vollständig gezählt:** Bei Besuchen und Scans war die Zählung auf die ersten Einträge begrenzt, wodurch der Fortschritt ab einem bestimmten Punkt stehen blieb.

### Behoben
- **Ankündigung ließ sich nicht von einer Aktion lösen:** Wer die Zuordnung auf „Eigenständig" stellte, sah die Änderung gespeichert — tatsächlich blieb die alte Verknüpfung bestehen, und die Ankündigung blieb unsichtbar. Ursache: Das leere Feld wurde beim Speichern verschluckt statt übertragen.

### Geändert
- **Aktions-Faktoren nur noch ×1, ×2, ×3:** Der Zwischenschritt ×1,5 war weder nötig noch auf einen Blick zu erfassen. Ganze Zahlen gehen schneller von der Hand.
- **Aktionsliste kompakter:** Zeitraum und Faktoren stehen wieder in einer Zeile, die Faktoren als Kurzform (K×2 M×3) — sichtbar, ohne die Zeilenhöhe zu verdoppeln. (Inzwischen überholt: siehe oben, die Boni stehen jetzt ausgeschrieben in einer eigenen Zeile.)
- **App-Symbol feiner abgestimmt:** etwas kleiner als zuletzt, der senkrechte Strich ragt ein Stück unter den Bauch.

### Behoben (Darstellung)
- **Tab-Leiste unverändert gelassen:** Ein Versuch, den fließenden Übergang beim Tabwechsel nachzubauen, machte die Leiste kantig und ersetzte die Hervorhebung durch einen wandernden Punkt — schlechter als vorher. Zurückgenommen.
- **Aktions-Übersicht zeigt die Faktoren wieder:** Faktoren und Zeitraum standen zusammen in einer Zeile, die abgeschnitten wurde — ausgerechnet die Faktoren fielen weg. Jetzt stehen sie als eigene Marken darunter und sind auf einen Blick lesbar.
- **„Name speichern" wie die anderen Knöpfe:** Der Knopf war farblos, während „E-Mail ändern" und „Passwort ändern" daneben eingefärbt sind.

### Geändert (Bedienung & Aussehen)
- **Größeres App-Symbol:** Das Zeichen füllt jetzt deutlich mehr Fläche. Der senkrechte Strich endet am unteren Bogen, statt darunter hinauszulaufen — das P bleibt angedeutet, die Form liest sich stärker als Auge oder Smiley.
- **Farbwahl ohne Rätselraten:** Das erste Feld im Farbwähler zeigte ein Zauberstab-Symbol, das aussah, als würde eine Farbe automatisch gewählt. Gemeint war schlicht die Standardfarbe — jetzt steht dort der Markenton selbst.
- **Aushang erklärt sich:** Wie bei den Abzeichen steht oben ein kurzer Text, wofür Ankündigungen da sind und was die Zuordnung zu einer Aktion bewirkt.
- **Aktions-Faktoren kompakter:** Vorbeikommen, Mitnehmen und Bringen standen als drei gestapelte Blöcke mit je eigener Überschrift untereinander. Jetzt eine Zeile pro Typ — deutlich weniger Platz bei gleichem Inhalt.
- **Abmelden sichtbar gestaltet:** Der Knopf war ein blasser Geister-Button mit Zurück-Pfeil und las sich wie „eine Ebene zurück". Jetzt eine abgesetzte, rot beschriftete Karte.
- **Liquid Glass:** Die Leiste forderte ausdrücklich die helle Glas-Variante an — auf hellem Hintergrund ist die praktisch unsichtbar. Jetzt überlässt sie iOS die Wahl und bekommt einen leichten Farbstich, damit das Material Kante zeigt.

### Neu (Verwaltung)
- **Systeminfo im Konto:** Admins sehen unter Konto → System die iOS-Version, die App-Version, ob Apples Glas-Material auf dem Gerät verfügbar ist und ob die Bedienungshilfe „Transparenz reduzieren" es abschaltet. Damit lässt sich am Gerät selbst klären, warum die Tab-Leiste so aussieht, wie sie aussieht.

### Behoben (Verständlichkeit)
- **Verknüpfte Ankündigungen verschwanden unerwartet:** Wird eine Ankündigung einer laufenden Aktion zugeordnet, blendet die Startseite sie aus — die Aktions-Karte deckt das Thema bereits ab. Das war so gewollt, im Formular aber zu beiläufig erklärt: Der Hinweis sagt jetzt deutlich, dass die Ankündigung dadurch **nicht angezeigt** wird, und wie man das ändert.

### Behoben (Bedienung)
- **Zurück führt jetzt überall zurück:** Aus den Einstellungen, dem Aushang-Editor, der Abzeichen- und Rangverwaltung sowie dem Schaufenster landete man beim Zurückgehen auf der Startseite statt beim vorherigen Bildschirm. Ursache war dieselbe wie zuvor bei den Teilen: Diese Ansichten liegen technisch in der Tab-Leiste, wo „zurück" auf den ersten Tab springt. Alle zehn betroffenen Bildschirme nutzen jetzt denselben Weg wie die Teile-Ansicht.
- **Liquid Glass wird zuverlässiger erkannt:** Die Prüfung, ob das Gerät Apples Glas-Material unterstützt, lief einmalig beim Programmstart — war das zuständige System-Modul zu diesem Zeitpunkt noch nicht bereit, blieb die Leiste für die gesamte Sitzung beim Ersatz-Weichzeichner. Die Prüfung findet jetzt statt, wenn die Leiste tatsächlich gezeichnet wird. Zusätzlich wird die Bedienungshilfe „Transparenz reduzieren" berücksichtigt: Ist sie aktiv, kommt bewusst der Weichzeichner zum Einsatz.

### Geändert (Verwaltung)
- **Alle Verwaltungsfunktionen an einem Ort:** Die Abzeichen-Verwaltung war über ein Zahnrad in der Abzeichen-Übersicht versteckt, der Rest lag unter „Konto". Jetzt sitzt alles gebündelt unter Konto → Verwaltung: Aushang, Abzeichen, Aktionen und Punkte-Ränge. Die Tabs selbst zeigen dem Team dieselbe Ansicht wie allen anderen.

### Neu (Wartung)
- **Sicherheitsupdates eingespielt:** `tar`, `shell-quote` und `zustand` angehoben. Damit ist die einzige als kritisch eingestufte Meldung erledigt. Betroffen waren ohnehin nur Bauwerkzeuge, nicht die ausgelieferte App.
- **TypeScript auf 7.0:** Übersetzt den Quelltext und baut das Programmpaket fehlerfrei. Die Angabe im Steckbrief stand noch auf 5.9 — tatsächlich lief seit dem SDK-Wechsel bereits 6.0.
- **Dependabot eingerichtet:** Wöchentliche Prüfung auf Bibliotheks-Updates, allerdings bewusst eng gefasst. 33 der 36 Abhängigkeiten hängen an der Expo-SDK- oder PocketBase-Version und dürfen nur gemeinsam angehoben werden — einzeln aktualisiert würden sie den Build brechen. Vorschläge kommen daher nur für die drei wirklich unabhängigen Pakete.

### Geändert (Unterbau)
- **Expo SDK 54 → 57:** Drei Hauptversionen übersprungen, React Native von 0.81 auf 0.86, React auf 19.2. Damit läuft die App auf der neuen React-Native-Architektur, die seit SDK 55 verpflichtend ist. Die App ist dadurch etwas größer geworden (18 → 23 MB), weil die neue Architektur mehr nativen Code mitbringt.
- **Android zielt auf Android 16 (API 36):** Google Play verlangt das ab dem 31. August 2026 für neue Apps und Updates. Die Vorgabe war bereits erfüllt und bleibt es.
- **iOS setzt jetzt 16.4 voraus** (vorher 15.1). Das ist eine Vorgabe von Expo SDK 56 und betrifft iPhone 7, 6s und SE der ersten Generation — diese Geräte werden nicht mehr unterstützt.

### Neu (Dokumentation)
- **README neu aufgesetzt:** Logo, vollständige Funktionsübersicht nach Zielgruppe, Aufbau des Projekts und ein Datenschutz-Abschnitt. Die alten Angaben waren teils veraltet (Expo SDK 51 statt 54).
- **Technischer Steckbrief (`TECH.md`):** Stack mit Versionen, Abhängigkeiten, Datenmodell, Berechtigungen und Kennzahlen — knapp genug für die Homepage.

### Entfernt
- **Mikrofon-Berechtigung:** Android forderte `RECORD_AUDIO` an, obwohl die App nirgends Ton aufnimmt. Die Berechtigung stammte aus einer Vorgabe des Kamera-Moduls und ist jetzt raus.

### Sicherheit
- **Tür-Code erneuert:** Das Check-in-Geheimnis lag im Klartext in der Versionsgeschichte (über die Test-QR-Seite). Es wurde serverseitig durch ein neues ersetzt, womit der alte Wert wertlos ist. **Der QR-Code an der Ladentür muss einmal neu ausgedruckt werden.**
- **Test-QR-Seite nicht mehr im Repository:** Sie enthält das Tür-Geheimnis als Bild und liegt jetzt nur noch lokal.

### Neu (Sofort-Benachrichtigungen)
- **Push direkt nach dem Check-in:** Wer eincheckt, bekommt sofort eine Nachricht mit den gutgeschriebenen Punkten — inklusive mitgenommener Teile. Läuft eine Serie (ab zwei Wochen), steht sie mit in der Nachricht.
- **Push bei Freigabe eines gebrachten Teils:** Wird ein eingereichtes Teil freigegeben, erfährt die einreichende Person das jetzt mit den erhaltenen Punkten. Vorher blieb die Freigabe unbemerkt.
- **Tippen führt zum richtigen Bildschirm:** Eine angetippte Benachrichtigung öffnete bisher nur die App. Jetzt landet man dort, wo es um die Nachricht geht — auch wenn die App vorher geschlossen war. Aus Sicherheitsgründen sind nur bekannte Ziele erlaubt; alles andere öffnet schlicht die Startseite.

### Geändert (Team & Laden)
- **Offene Freigaben sind nicht mehr zu übersehen:** Warten eingereichte Teile, färbt sich die Freigabe-Kachel auf der Startseite und trägt einen Zähler — statt wie bisher unverändert auszusehen, egal ob null oder zwölf Teile offen sind.
- **„Beim Besitzer" heißt jetzt „extern":** Die Formulierung ging von einem Geschlecht aus. Im Laden, in den Filtern und in der Detailansicht steht jetzt durchgehend „extern gelagert".
- **Aktionen zeigen alle erhöhten Punkte:** Bislang stand im Aushang nur ein einziger Faktor. Erhöht eine Aktion Vorbeikommen ×3, Mitnehmen ×1,5 und Bringen ×2, werden jetzt alle drei genannt.
- **Zurück führt zurück:** Ein Teil aus dem Laden zu öffnen und wieder zu schließen landete auf der Startseite statt in der Liste, aus der man kam. Gilt ebenso für Schaufenster, Inventar und die Freigabe-Liste.

### Neu (App-Symbol)
- **Neues App-Symbol:** Ein „P", in dessen Bauch ein angedeutetes, zufrieden geschlossenes Auge sitzt — je nach Blick ein Lächeln. Weiß auf dem Marken-Verlauf, mit einem langen Schatten nach rechts unten. Der Name „plietsch" heißt klug und gewitzt; das Zeichen trägt genau dieses Augenzwinkern, statt Kleidung abzubilden.
- **Als Marke verwendbar:** Das Zeichen liegt zusätzlich einfarbig vor (weiß, Teal, schwarz) und funktioniert dadurch auf Stofftaschen, Stempeln und Schildern. Bauch und Auge sind echte Aussparungen, keine weiß gefüllten Flächen — die Form trägt jeden Untergrund. Quelldateien in `design/logo/`.
- **Android-Symbol mitgezogen:** Vordergrund, Monochrom-Fassung (für eingefärbte Startbildschirme) und Hintergrund neu erzeugt. Der Hintergrund trägt jetzt den Marken-Verlauf statt des bisherigen Hellgraus, auf dem ein weißes Motiv unsichtbar gewesen wäre.

### Geändert (Eingereichte Teile & Laden)
- **Freigabe-Buttons brechen nicht mehr um:** Bei „Eingereichte Teile" trägt nur noch die Hauptaktion „Freigeben" einen Text; „+ Schaufenster" (Stern) und „Ablehnen" (rotes X) sind jetzt Icon-Buttons. Ablehnen ist rot. Dieselbe Lösung im Teile-Inventar: Archivieren ist ein roter Papierkorb-Button.
- **Eingereichtes Teil antippbar:** Ein Tipp auf die Karte öffnet die Detailansicht — dort lässt sich das Teil vor der Freigabe noch bearbeiten (Foto, Titel, Größe, Punkte, Standort) und direkt freigeben.
- **Extern gelagerte Teile im Laden sichtbar:** Teile, die beim Besitzer verbleiben, tragen im Laden ein „beim Besitzer"-Schild auf dem Foto und lassen sich über den neuen Filter „Aufbewahrung" (Im Laden / Beim Besitzer) gezielt anzeigen. In der Detailansicht steht statt des Scan-Hinweises: im Laden ansprechen, wir stellen den Kontakt her.
- **Extern-Filter im Inventar:** Das Team kann die Teile-Übersicht jetzt auch nach „Extern" filtern.

### Behoben (Darstellung)
- **Abgeschnittene Schrift:** Bei größeren Zahlen und Beschriftungen wurden Ober- und Unterlängen gekappt — die Zeilenhöhe wuchs nicht mit der App-Schriftgröße mit. Betraf Punktestand, Startseite und Hinweistexte.
- **Chips zu niedrig:** Die Filter auf dem Punkte-Bildschirm (Alle · Check-Ins · Teile · Badges) hatten zu wenig Luft, die Schrift stieß oben und unten an.
- **Springende Zeilen bei den Rängen:** Im Admin unter „Punkte & Ränge" war das Punkte-Feld höher als das Namensfeld daneben, weil seine Beschriftung umbrach. Beide Felder sind jetzt immer gleich hoch.
- **Datumsauswahl bei Aktionen überlagerte sich:** „Von" und „Bis" öffneten ihren Kalender direkt im Formular — er passte nicht in die halbe Spaltenbreite, lief seitlich aus dem Bild, und zwei geöffnete Kalender lagen übereinander. Die Auswahl öffnet sich jetzt als eigenes Fenster über die volle Breite, mit „Abbrechen" und „Fertig".

### Behoben
- **Liquid Glass sah aus wie einfacher Weichzeichner:** Die Tab-Leiste beschnitt ihren eigenen Inhalt, wodurch das Apple-Material den Hintergrund nicht mehr aufnehmen konnte. Jetzt kommt das Glas richtig zur Geltung (iOS 26+).
- **Aushang zeigte dasselbe Thema doppelt:** Lief zu einer Ankündigung auch eine Aktion, standen beide untereinander. Ankündigungen lassen sich jetzt einer Aktion zuordnen — solange die Aktion läuft, erscheint nur die Aktions-Karte.
- **Aktions-Abzeichen gingen an den falschen Kreis:** Vergeben wurde nur an Nutzer mit Check-in im Aktionszeitraum — wer ein Teil zur Aktion **gebracht** hatte, ging leer aus. Jetzt zählt beides. Außerdem kam das Abzeichen erst nach Aktionsende; es wird nun sofort vergeben, sobald die Bedingung erfüllt ist.

### Neu
- **Aushang-Farbe frei wählbar:** Aktionen und Ankündigungen bekommen im Admin eine Akzentfarbe aus acht abgestimmten Tönen. Bei Aktionen wird der Verlauf auf diese Farbe gezogen — der Aushang darf bunter werden.
- **Motivation passt sich an:** Der Text auf der Startseite richtet sich nach der Lage statt immer gleich zu sein — kurz vor dem nächsten Rang, laufende Aktion, Streak in Gefahr, längere Abwesenheit oder erster Besuch.

### Geändert (Plattform-Design: iOS und Android jeweils typisch)
- **iOS bekommt echtes Liquid Glass:** Tab-Leiste und Glas-Karten nutzen jetzt Apples System-Material (`expo-glass-effect`) statt einer nachgebauten Weichzeichnung. Auf Geräten unter iOS 26 bleibt die bisherige Optik als Rückfallebene erhalten.
- **Android folgt Material 3:** Die Tab-Leiste sitzt am unteren Rand statt zu schweben, Schaltflächen sind vollrund und antworten mit dem typischen Material-Aufleuchten, Karten sind etwas eckiger und arbeiten mit Höhenstufen statt weicher Schatten. Chips und Überschriften folgen ebenfalls der Material-Typografie.
- **Eine Codebasis, zwei Design-Sprachen:** Beide Plattformen teilen sich Farben, Schrift und Aufbau — unterschiedlich sind nur Form, Tiefe und Reaktion auf Berührung. Umgesetzt über Plattform-Bausteine im zentralen Design-System, ohne zusätzliche Fremdbibliothek.
- **Aktiver Tab ohne Hinterlegung:** Der aktive Tab wird allein durch die Farbe von Symbol und Beschriftung markiert (statt zusätzlich durch eine farbige Fläche dahinter) — ruhigeres Bild in der Leiste.

### Neu (Punkte-System flexibel)
- **Punktwerte im Admin einstellbar:** Check-in, Punkte pro mitgenommenem und pro gebrachtem Teil sowie das Mitnahme-Limit sind jetzt im Admin-Bereich „Punkte & Ränge" konfigurierbar (keine festen Werte mehr im Code).
- **Aktionen mit gezielten Faktoren:** Statt „doppelte Punkte für alles" kann eine Aktion jeden Aktionstyp einzeln erhöhen — Vorbeikommen, Mitnehmen und Bringen je mit eigenem Faktor (×1/×1,5/×2/×3). So sind Aktionen wie „Nightshopping: ×3 aufs Vorbeikommen und ×2 aufs Mitnehmen" möglich.
- **Ränge frei erweiterbar:** Ränge lassen sich im Admin umbenennen, hinzufügen und entfernen — auch über Diamant hinaus.
- **Maximal 7 Teile pro Besuch** (Wert einstellbar): Mehr Teile lassen sich beim Scannen/Eintragen nicht gutschreiben.
- **Artikel-Detailansicht übersichtlicher:** klare Eigenschaften (Für wen · Art · Größe · Zustand) statt loser Schlagworte.
- **Schaufenster für alle:** Die kuratierten Schaufenster-Teile erscheinen wieder für alle Nutzer auf der Startseite, antippbar zur Detailansicht.

### Neu
- **Neuer Tab „Laden":** Alle Nutzer sehen das gesamte verfügbare Angebot im Laden, mit Filtern nach Kleidungsart und Größe. Teile sind antippbar und öffnen eine Detailansicht. Bildbetonte Galerie-Ansicht (zwei Spalten, großes Foto).
- **„Neu im Laden" antippbar:** Die Teile auf der Startseite führen jetzt direkt zur Detailansicht; „Alles ansehen" springt in den Laden-Tab. Große Bildkarten statt kleiner Vorschau.
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
