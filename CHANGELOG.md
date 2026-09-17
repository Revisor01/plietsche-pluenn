# Changelog

Alle nennenswerten Änderungen an Plietsche Plünn (App + Backend) werden hier festgehalten.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/).
Versionierung: `App-Version (Build)` — TestFlight-Builds fortlaufend nummeriert.

## [Unreleased]

### Geändert
- **Beim Check-in wird dein Standort nicht mehr gespeichert.** Die App prüft weiterhin, ob du wirklich im Laden bist — festgehalten wird davon aber nur noch, wie weit du vom Laden entfernt warst, nicht mehr, wo genau du standest. Am Check-in selbst ändert sich nichts.
- **Neues App-Symbol:** P und 2 stehen jetzt gleich groß nebeneinander im Ring, in kräftiger Schrift statt dünner Linien — die hochgestellte Ziffer ist weg. Ring und Zeichen sind gleich stark, dadurch bleibt das Symbol auch klein gut zu erkennen, etwa in den Einstellungen oder der Suche. Farben bleiben.

### Neu
- **Passwort vergessen:** Auf der Anmeldeseite lässt sich jetzt ein Link zum Zurücksetzen anfordern. Wer sein Passwort nicht mehr weiß, kommt wieder ins Konto, ohne jemanden fragen zu müssen.
- **Konto löschen:** Im Profil lässt sich das eigene Konto endgültig entfernen — mit Passwortabfrage und Rückfrage davor. Punktestand, Serie, Abzeichen und Besuche werden dabei gelöscht; Teile, die schon im Laden sind, bleiben dort ohne Bezug zur Person.
- **Filter „Neu" im Laden:** zeigt nur Teile, die in den letzten 14 Tagen dazugekommen sind — praktisch, wenn man alle paar Wochen vorbeischaut und sehen will, was seit dem letzten Mal neu ist.
- **Filter „Schaufenster" im Laden:** zeigt nur die Teile, die das Team ins Schaufenster gehoben hat. Lässt sich mit den übrigen Filtern kombinieren.
- **Mitteilungen lassen sich auf Android einzeln einstellen:** Serie und Punkte, Aktionen und Ankündigungen, Abzeichen und Ränge sowie Sonstiges sind jetzt vier getrennte Arten in den Android-Systemeinstellungen. Jede kann dort für sich stummgeschaltet werden, oder ihren eigenen Ton bekommen — unabhängig von den Schaltern in der App.

### Behoben
- **E-Mail-Adresse ändern funktioniert jetzt wirklich.** Die App meldete „Wir haben dir eine E-Mail geschickt", verschickt wurde aber nie etwas — im Backend war kein Mailversand eingerichtet. Die Bestätigungsmail kommt jetzt an.
- **Schaufenster-Knopf war farblich verdreht:** In der Teile-Übersicht leuchtete der Stern-Knopf kräftig bei genau den Teilen, die **nicht** im Schaufenster stehen — die Farbe zeigte also die Aufforderung statt des Zustands. Jetzt ist er kräftig, solange das Teil im Schaufenster liegt.

### Geändert
- **Weniger Beiwerk in der Teile-Liste:** Der kleine Pfeil am rechten Rand ist weg. Die ganze Zeile war ohnehin antippbar, er sagte nichts Zusätzliches.
- **Erinnerungen zur Serie kommen jetzt deutlicher an, Sonstiges leiser.** Eine Serie läuft an einem bestimmten Tag ab — die Erinnerung darf auf dem iPhone auch einen Fokus durchbrechen und meldet sich auf Android oben am Bildschirm. Hinweise auf neue Aktionen und Abzeichen melden sich normal, alles Übrige wandert still in die Mitteilungszentrale.

### Behoben

- **Absturz beim Öffnen von Teilen und Einstellungen behoben.** Jede Ansicht mit einem Schalter — die Detailansicht eines Teils (aus Laden, Inventar oder Freigabe-Liste), das Einstell-Formular, die Benachrichtigungen und die Admin-Bereiche für Badges und Suchanfragen — brach beim Öffnen sofort ab. Ursache war die Farbe der ausgeschalteten Schalter-Spur, die seit der Zusammenführung der Design-Farben erst während der Schalter-Animation berechnet wurde; dort ist sie nicht verfügbar. Sie steht jetzt wieder vorher fest.

## [1.0.0 (33)] – 2026-09-14

### Neu

**Laden & Teile**
- **Neuer Tab „Laden":** Alle Nutzer sehen das gesamte verfügbare Angebot im Laden, mit Filtern nach Kleidungsart und Größe. Teile sind antippbar und öffnen eine Detailansicht. Bildbetonte Galerie-Ansicht (zwei Spalten, großes Foto).
- **„Neu im Laden" auf der Startseite** zeigt die neuesten eingestellten Teile mit Foto.
- **„Neu im Laden" antippbar:** Die Teile auf der Startseite führen jetzt direkt zur Detailansicht; „Alles ansehen" springt in den Laden-Tab. Große Bildkarten statt kleiner Vorschau.
- **Teile-Übersicht (eigener Tab für Helfer/Admin).** Vollständiges Inventar mit Bildern, Filtern (Alle / Schaufenster / Zu prüfen / Vergeben), QR-Code je Teil und Aktionen pro Teil: freigeben, ins/aus dem Schaufenster, archivieren.
- **Teil antippen → Detailseite zum Bearbeiten.** Alle Felder änderbar (Titel, Größe, Punkte, Standort, Kategorie, Foto), Schaufenster-Schalter, archivieren, freigeben und großer QR-Code zum Drucken.
- **Einreichen mit klarer Wahl:** Beim Vorschlagen eines Teils wählt man jetzt ausdrücklich „Bringe ich in den Laden" oder „Verbleibt bei mir". Bei „Verbleibt bei mir" ist die Standortangabe Pflicht.
- **Schaufenster direkt beim Einstellen** festlegen (nur Helfer/Admin) — ein Schalter im Einstell-Formular.
- **Schaufenster für alle:** Die kuratierten Schaufenster-Teile erscheinen wieder für alle Nutzer auf der Startseite, antippbar zur Detailansicht.
- **QR-Etiketten zum Ausdrucken:** In der Teile-Übersicht erzeugt „QR-Etiketten drucken" einen A4-Bogen als PDF — vier Etiketten pro Reihe, je mit QR-Code, Name, Größe, Kategorie, Zustand, Nummer und Punktwert. Über den Teilen-Dialog geht er direkt an den Drucker oder per Mail weiter. Gedruckt wird immer die gerade gewählte Auswahl; bereits mitgenommene Teile bleiben außen vor. Die Codes stecken vollständig im Dokument, es braucht zum Drucken also kein Netz.

**Punkte, Ränge und Aktionen**
- **„Bringen" zählt jetzt:** Wenn ein Besucher ein Teil einstellt und ein Helfer es freigibt, bekommt der Einsteller Bring-Punkte (einmalig pro Teil). Das Bringer-Badge zählt freigegebene Einreichungen.
- **Punktwerte im Admin einstellbar:** Check-in, Punkte pro mitgenommenem und pro gebrachtem Teil sowie das Mitnahme-Limit sind jetzt im Admin-Bereich „Punkte & Ränge" konfigurierbar (keine festen Werte mehr im Code).
- **Ränge frei erweiterbar:** Ränge lassen sich im Admin umbenennen, hinzufügen und entfernen — auch über Diamant hinaus.
- **Punkte-Ränge selbst einstellen.** Neuer Admin-Bereich „Punkte-Ränge": die Punktgrenzen für Bronze→Diamant (Startseiten-Ring) frei konfigurierbar.
- **Diamant** als 5. Stufe — bei Badges (zusätzlich zu Bronze/Silber/Gold/Platin) und bei den globalen Punkte-Rängen.
- **Maximal 7 Teile pro Besuch** (Wert einstellbar): Mehr Teile lassen sich beim Scannen/Eintragen nicht gutschreiben.
- **Aktionen mit gezielten Faktoren:** Statt „doppelte Punkte für alles" kann eine Aktion jeden Aktionstyp einzeln erhöhen — Vorbeikommen, Mitnehmen und Bringen je mit eigenem Faktor. So sind Aktionen wie „Nightshopping: ×3 aufs Vorbeikommen und ×2 aufs Mitnehmen" möglich.
- **Aktionen mit Doppelpunkten.** Admin legt Aktionszeiträume an (z.B. „Winterkleidung 1.–31.12., ×2 Punkte"). In dem Zeitraum zählt jeder Scan/Check-in mehrfach. Optional ein Teilnahme-Badge koppeln.
- **Doppelte Punkte während einer Aktion:** Ordnet ein Helfer beim Freigeben ein gebrachtes Teil einer laufenden Aktion zu, bekommt der Einsteller die Bring-Punkte mit dem Aktions-Faktor. Ohne Aktion bleibt es bei den normalen Bring-Punkten. Der Faktor steht zur Klarheit in der Punkte-History.
- **Aktions-Bonus sichtbar:** Auf der Startseite zeigt jede laufende Aktion gut sichtbar, was sie bringt (z.B. „Doppelte Punkte", „Dreifach-Punkte"). Im Admin-Editor sieht man die Vorschau direkt beim Einstellen des Faktors.
- **Helfer ordnet Teile einer Aktion zu:** Beim Freigeben fragt die App, zu welcher laufenden Aktion ein Teil zählt — das treibt die Fortschritts-Badges. Vergabe läuft laufend, sobald die Schwelle erreicht ist.
- **Motivation passt sich an:** Der Text auf der Startseite richtet sich nach der Lage statt immer gleich zu sein — kurz vor dem nächsten Rang, laufende Aktion, Streak in Gefahr, längere Abwesenheit oder erster Besuch.

**Abzeichen**
- **Flexibleres Badge-System.** Zwei Arten: Stufen-Badges (Bronze→Platin, wie bisher) und Einzel-Abzeichen (ein Award mit optionalem Bonus) — z.B. für Jahres-Treue („1. Jahr aktiv", rückwirkend) oder Aktions-Teilnahme. Badge-Editor entsprechend erweitert und klarer beschriftet.
- **Aktions-Badges mit Fortschritt.** Ein Badge für eine Aktion kann jetzt Einzel-Abzeichen ODER Stufen sein (z.B. „Winterkinder": Bronze ab 2 Teilen, Silber ab 4). Das Badge wird im Badge-Editor direkt mit der Aktion verknüpft.
- **Geheime Abzeichen:** Ein Abzeichen lässt sich als geheim markieren. Es steht dann grau und namenlos in der Sammlung — man sieht, dass es etwas zu holen gibt, aber nicht was. Mit der ersten Stufe klappt es auf. Auch nach Ende einer Aktion bleibt die Kachel stehen: Wer nicht dabei war, behält eine Leerstelle.
- **Abzeichen als Raster:** Die Sammlung steht in zwei Spalten statt untereinander — bei einem Abzeichen pro Aktion wurde die Liste zu lang zum Überblicken.
- **Fortschritt als Ring:** Jede Kachel trägt einen Ring in der Farbe der erreichten Stufe (Bronze bis Diamant), ungelöst grau.
- **Abzeichen antippen zeigt die Beschreibung:** Beim Umbau auf das Raster hatte die Beschreibung keinen Platz mehr. Ein Tippen öffnet sie jetzt zusammen mit allen Stufen und dem Stand je Stufe. Geheime Abzeichen bleiben dabei verdeckt.
- **Eigene Farbe für Einzel-Abzeichen:** Ein besonderes Abzeichen kann eine eigene Farbe bekommen, statt immer im Gold der obersten Stufe zu leuchten. Gestufte Abzeichen behalten ihre Stufenfarben.
- **Badge-Verwaltung für Admins.** Voller Editor: Badges anlegen/bearbeiten/löschen mit Name, Icon, Auslöser (Besuche/Teile/Streak), Tier-Schwellen und Belohnungspunkten je Stufe.
- **Icon-Picker für Badges.** Statt FA6-Namen zu tippen, wählt man das Badge-Icon aus einem Raster.

**Aushang und Mitteilungen**
- **Bedarf-Aushang.** „Das suchen wir gerade" auf der Startseite — Helfer/Admin tragen ein, was der Laden braucht (z.B. „Winterjacken Gr. 140").
- **Schnell-Vorlagen + Push im Aushang:** Im Aushang-Editor gibt es Vorlagen-Buttons (z.B. „Wir haben jetzt geöffnet", „Heute geschlossen", „Neue Ware ist da"). Beim Anlegen kann optional direkt eine Push-Benachrichtigung an alle gesendet werden.
- **Aushang-Farbe frei wählbar:** Aktionen und Ankündigungen bekommen im Admin eine Akzentfarbe aus acht abgestimmten Tönen. Bei Aktionen wird der Verlauf auf diese Farbe gezogen — der Aushang darf bunter werden.
- **Push-Benachrichtigungen funktionieren jetzt.** Server versendet geplante Nachrichten (Aktionen, Hinweise) an die App; die App registriert ihr Gerät automatisch. Tote Geräte-Token werden selbst aufgeräumt. Zielgruppen (alle / nach Rolle / Streak / inaktiv) werden berücksichtigt.
- **Push direkt nach dem Check-in:** Wer eincheckt, bekommt sofort eine Nachricht mit den gutgeschriebenen Punkten — inklusive mitgenommener Teile. Läuft eine Serie (ab zwei Wochen), steht sie mit in der Nachricht.
- **Push bei Freigabe eines gebrachten Teils:** Wird ein eingereichtes Teil freigegeben, erfährt die einreichende Person das jetzt mit den erhaltenen Punkten. Vorher blieb die Freigabe unbemerkt.
- **Tippen führt zum richtigen Bildschirm:** Eine angetippte Benachrichtigung öffnete bisher nur die App. Jetzt landet man dort, wo es um die Nachricht geht — auch wenn die App vorher geschlossen war. Aus Sicherheitsgründen sind nur bekannte Ziele erlaubt; alles andere öffnet schlicht die Startseite.
- **Jahres-Treue-Badges** werden am 31.12. rückwirkend vergeben (für jedes aktive Jahr).
- **Aktions-Teilnahme-Badges** werden nach Aktionsende an alle Teilnehmer vergeben.

**Bedienung**
- **Die App lässt sich jetzt mit VoiceOver und TalkBack bedienen.** Jeder Knopf, Schalter, Filter und jedes Eingabefeld hat eine Ansage, die sagt, was er tut — bisher las der Bildschirmvorleser nur „Knopf" und man musste raten. Bei Knöpfen, die etwas verwerfen, steht die Folge dabei („Einreichung ablehnen — das Teil wird nicht aufgenommen"). Schalter sagen an, ob sie an oder aus sind, ausgewählte Filter und der aktive Tab werden als ausgewählt angesagt, und der Schritt-Anzeiger beim ersten Start nennt „Schritt 2 von 3".
- **Kleine Schaltflächen sind leichter zu treffen:** Route, Telefonnummer, Filter-Pillen und die Schalter reagieren jetzt auch, wenn man knapp danebentippt.
- **Bessere Lesbarkeit bei Knöpfen und Kleinschrift:** Weiße Schrift auf den farbigen Knöpfen war zu blass, um sie bei Sonnenlicht oder mit eingeschränktem Sehen sicher zu lesen. Die Knopffläche ist jetzt satter, die Schrift bleibt weiß. Ebenso aufgehellt wurden Feld-Beschriftungen, Platzhalter und Zeitangaben, die bisher sehr blass standen. Karten, Ringe und der Verlauf auf der Startseite sehen unverändert aus.

**Im Netz**
- **plietsche-plünn.de zeigt jetzt den Laden:** Wer die Adresse im Browser aufrief, bekam bisher eine Fehlermeldung zu sehen. Dort steht jetzt eine Seite mit Öffnungszeiten, Anschrift, Telefonnummer und einer kurzen Beschreibung — für alle, die keine App benutzen. Die Anschrift des Ladens war im Hintergrund noch mit einem Beispielwert hinterlegt und ist korrigiert; sie erscheint dadurch auch in der App richtig.

**Verwaltung**
- **Verwaltungs-Bereich** im Profil bündelt Inventar, Badges, Aktionen und Bedarf für Helfer/Admins.
- **Systeminfo im Konto:** Admins sehen unter Konto → System die iOS-Version, die App-Version, ob Apples Glas-Material auf dem Gerät verfügbar ist und ob die Bedienungshilfe „Transparenz reduzieren" es abschaltet. Damit lässt sich am Gerät selbst klären, warum die Tab-Leiste so aussieht, wie sie aussieht.
- **Extern-Filter im Inventar:** Das Team kann die Teile-Übersicht jetzt auch nach „Extern" filtern.

### Geändert

**Erscheinungsbild**
- **Neues App-Symbol:** Auf dem Startbildschirm steht jetzt ein P² im Kreis — schlicht, in den Farben der App. Die Linien sind schmal gehalten und das Zeichen steht mit Luft im Feld, damit es ruhig wirkt. Zusätzlich einfarbig (weiß, Teal, schwarz) für Stofftaschen, Stempel und Schilder; Android-Symbol samt Monochrom-Fassung mitgezogen.
- **Zwei Schriftgrößen leicht angepasst:** Die Überschrift im Abzeichen-Blatt und der große Punktestand in der Punkte-Übersicht stehen eine Spur kleiner. Beide fielen bisher aus der Reihe; jetzt passen sie zu den übrigen Größen der App.
- **Gesperrte Überschriften laufen wieder wie entworfen:** Die App vergrößert alle Schrift um denselben Faktor, ließ dabei aber den Buchstabenabstand unverändert. Große Überschriften standen dadurch enger, als sie gedacht waren.
- **iOS bekommt echtes Liquid Glass:** Tab-Leiste und Glas-Karten nutzen Apples System-Material statt einer nachgebauten Weichzeichnung. Auf Geräten unter iOS 26 bleibt die bisherige Optik als Rückfallebene erhalten.
- **Android folgt Material 3:** Die Tab-Leiste sitzt am unteren Rand statt zu schweben, Schaltflächen sind vollrund und antworten mit dem typischen Material-Aufleuchten, Karten sind etwas eckiger und arbeiten mit Höhenstufen statt weicher Schatten.
- **Eine Codebasis, zwei Design-Sprachen:** Beide Plattformen teilen sich Farben, Schrift und Aufbau — unterschiedlich sind nur Form, Tiefe und Reaktion auf Berührung.
- **Aktiver Tab ohne Hinterlegung:** Der aktive Tab wird allein durch die Farbe von Symbol und Beschriftung markiert — ruhigeres Bild in der Leiste.

**Bedienung**
- **Abmelden sichtbar gestaltet:** Der Knopf war ein blasser Geister-Button mit Zurück-Pfeil und las sich wie „eine Ebene zurück". Jetzt eine abgesetzte, rot beschriftete Karte.
- **Farbwahl ohne Rätselraten:** Das erste Feld im Farbwähler zeigte ein Zauberstab-Symbol, das aussah, als würde eine Farbe automatisch gewählt. Gemeint war schlicht die Standardfarbe — jetzt steht dort der Markenton selbst.
- **Freigabe-Buttons brechen nicht mehr um:** Bei „Eingereichte Teile" trägt nur noch die Hauptaktion „Freigeben" einen Text; „+ Schaufenster" und „Ablehnen" sind Icon-Buttons. Dieselbe Lösung im Teile-Inventar.
- **Eingereichtes Teil antippbar:** Ein Tipp auf die Karte öffnet die Detailansicht — dort lässt sich das Teil vor der Freigabe noch bearbeiten und direkt freigeben.
- **„Watt's neu" vom Dashboard entfernt:** Der Verlauf stand dort ein zweites Mal. Stattdessen führt ein Tippen auf den Punktestand oben direkt in die Punkte-Übersicht.
- **Artikel-Detailansicht übersichtlicher:** klare Eigenschaften (Für wen · Art · Größe · Zustand) statt loser Schlagworte.
- **„Aktionen" ohne Klammerzusatz:** Der Eintrag in den Einstellungen hieß „Aktionen (Doppelpunkte)".

**Laden, Team und Aushang**
- **Offene Freigaben sind nicht mehr zu übersehen:** Warten eingereichte Teile, färbt sich die Freigabe-Kachel auf der Startseite und trägt einen Zähler.
- **„Beim Besitzer" heißt jetzt „extern":** Die Formulierung ging von einem Geschlecht aus. Im Laden, in den Filtern und in der Detailansicht steht jetzt durchgehend „extern gelagert".
- **Extern gelagerte Teile im Laden sichtbar:** Teile, die beim Besitzer verbleiben, tragen im Laden ein Schild auf dem Foto und lassen sich über den Filter „Aufbewahrung" gezielt anzeigen. In der Detailansicht steht statt des Scan-Hinweises: im Laden ansprechen, wir stellen den Kontakt her.
- **Aushang: Ankündigungen zuerst:** Freie Ankündigungen stehen über den Aktionen — dort gehören Dinge wie Öffnungszeiten hin, die dauerhaft gelten. Befristete Aktionen folgen darunter.
- **Aushang-Farbe wirkt:** Die gewählte Farbe färbt die ganze Karte statt nur des kleinen Symbols. Vorher war eine Farbwahl praktisch nicht zu erkennen.
- **Aushang zusammengefasst:** Laufende Aktionen und freie Ankündigungen erscheinen auf der Startseite gemeinsam unter „Aushang".
- **Aushang erklärt sich:** Wie bei den Abzeichen steht oben ein kurzer Text, wofür Ankündigungen da sind und was die Zuordnung zu einer Aktion bewirkt.
- **Aktionsliste zeigt die Boni ausgeschrieben:** Zeitraum und Boni stehen in getrennten Zeilen; die Boni nennen den Anlass beim Namen (`Kommen ×2 · Mitnehmen ×3`) statt als Kürzel.
- **Aktionen zeigen alle erhöhten Punkte:** Bislang stand im Aushang nur ein einziger Faktor. Erhöht eine Aktion mehrere Bereiche, werden jetzt alle genannt.
- **Aktions-Faktoren nur noch ×1, ×2, ×3:** Der Zwischenschritt ×1,5 war weder nötig noch auf einen Blick zu erfassen.
- **Aktions-Faktoren kompakter:** Vorbeikommen, Mitnehmen und Bringen standen als drei gestapelte Blöcke untereinander. Jetzt eine Zeile pro Typ.
- **Aktionen mit echtem Datums-Picker** (Format TT.MM.JJJJ), Zeitzone korrekt berücksichtigt.
- **Alle Verwaltungsfunktionen an einem Ort:** Die Abzeichen-Verwaltung war über ein Zahnrad versteckt, der Rest lag unter „Konto". Jetzt sitzt alles gebündelt unter Konto → Verwaltung: Aushang, Abzeichen, Aktionen und Punkte-Ränge.
- **Verwaltungs-Menü entschlackt:** Teile und Badges nicht mehr doppelt.
- **Admin-Erklärtexte** in Badges, Aktionen und Ränge-Verwaltung.

**Abzeichen und Ränge**
- **Abzeichen-Stufen kommen aus „Punkte & Ränge":** Wie viele Stufen ein Abzeichen hat und wie sie heißen, richtet sich nach den dort gepflegten Rängen. Wer sie „Strandgut, Priel, Deich" nennt, sieht diese Namen auch am Abzeichen; pro Abzeichen trägst du nur noch das Ziel und den Bonus ein. Bis zu fünf Stufen.
- **Warum manche Abzeichen Diamant hatten und andere nicht:** Das lag nie an einer Einstellung, sondern an einem leeren Feld. Jetzt ist sichtbar, welche Stufen es gibt, und leere entfallen bewusst.
- **Teilnahme zählt, worauf es Bonus gibt:** Bisher zählte für Aktions-Abzeichen ausschließlich das Bringen — auch dann, wenn die Aktion darauf gar keinen Bonus gab. Jetzt zählt genau das, was die Aktion hervorhebt.
- **Aktionsbadge klarer:** Bei Auslöser „Aktions-Teilnahme" heißt die Wahl jetzt „Teilnahme" oder „Stufen" statt „Einzel-Abzeichen / Gestuft".
- **Verknüpfung nur noch an einer Stelle:** Aktionsbadges werden im Abzeichen-Editor mit ihrer Aktion gekoppelt. Die zweite Auswahl in der Aktion ist entfallen.
- **Einzel-Abzeichen ohne Schwellenfeld:** Bei „Teilnahme" stand ein Feld „ab (Schwelle)", das der Server gar nicht auswertet.
- **Einzel-Abzeichen zeigen „Noch offen" statt eines Zählerstands** — „0/1 bis Gold" ergab dort keinen Sinn.
- **Symbole mit mehr Gefühl:** Der Vorrat für Abzeichen und Aktionen führte technische Zeichen (Diagramm, Lupe, Regler). Jetzt sind es 64 Symbole aus Auszeichnung, Jahreslauf, Küste, Miteinander, Gefühl und Laden.
- **Bronze-Rang muss verdient werden:** Unter 150 Punkten hat man noch keinen Rang. Schwellen bleiben im Admin frei einstellbar.

### Behoben

**Punkte, Serie und Abzeichen**
- **Der Türcode war von außen abrufbar:** Die Ladeninformationen — Öffnungszeiten, Adresse, Punktwerte, Ränge — standen für jede Person im Netz, auch ohne Anmeldung. Darin lag auch der Code vom Aushang an der Ladentür. Wer ihn kannte, konnte sich von überall einchecken und sich Punkte und Serie gutschreiben lassen. Der Code liegt jetzt getrennt und ist über keinen Weg mehr abrufbar; die Ladeninformationen sehen angemeldete Nutzer:innen wie bisher.
- **Besuche ließen sich an der App vorbei erfinden:** Ein Konto konnte dem Laden-Server selbst Besuche melden, ohne je vor Ort gewesen zu sein — mit frei gewähltem Datum und beliebig oft. Am Punktestand ging das vorbei, an den Abzeichen nicht: „Stammgast" zählt schlicht die Besuche und schüttet je Stufe Punkte aus. Wer den Weg kannte, konnte sich Abzeichen samt Belohnung holen, ohne einen Fuß in den Laden zu setzen. Besuche entstehen jetzt nur noch beim echten Check-in im Laden.
- **Der Tag wechselte erst um zwei Uhr nachts:** Wer nach Mitternacht vorbeikam, zählte noch zum Vortag — der Check-in-Bonus stand deshalb am selben Vormittag ein zweites Mal zur Verfügung, und ein Besuch Montagnacht wurde der Vorwoche zugeschlagen, statt die Serie fortzusetzen. Auch die Jahre für die Treue-Abzeichen waren betroffen: Ein Besuch in der Neujahrsnacht zählte noch zum alten Jahr. Ursache war, dass sich der Tageswechsel nach der Uhr des Servers richtete und nicht nach der des Ladens. Jetzt gilt überall Mitternacht im Laden; die Zeitzone lässt sich in den Ladeneinstellungen pflegen.
- **Die Serie zählte über den Jahreswechsel falsch:** Manche Jahre haben 53 Kalenderwochen — 2026 ist eines, die 53. Woche beginnt am 28. Dezember. Wer sie ausließ und erst im neuen Jahr wiederkam, behielt seine Serie trotzdem und zählte sogar weiter hoch, obwohl eine ganze Woche fehlte; das nächtliche Zurücksetzen ließ sie aus demselben Grund stehen. Umgekehrt konnte eine Serie sogar ein volles Jahr Pause überdauern, wenn die Wochennummern zufällig aufeinanderzufolgen schienen. Jetzt zählt die Serie über den Jahreswechsel nur weiter, wenn tatsächlich keine Woche dazwischen fehlt — und reißt sonst, wie sie es unter dem Jahr auch täte.
- **„Durchhalter" zeigte Fortschritt ohne Check-in:** Das Abzeichen stand auf „1/2 Wochen in Folge", obwohl seit Wochen niemand da war. Ursache waren zwei Fehler, die sich gegenseitig verdeckt haben: der Fortschritt lag als Kopie in der Abzeichen-Tabelle und wurde beim nächtlichen Zurücksetzen der Serie nicht mitgezogen — und die Serie selbst hing an einem Zählerfeld beim Nutzer statt an den tatsächlichen Besuchen.
- **Serie zählt jetzt aus den Besuchen:** Wie viele Wochen jemand in Folge da war, wird aus den echten Check-ins abgeleitet. Ohne Besuch gibt es keinen Fortschritt — auch dann nicht, wenn ein alter Zählerstand herumliegt.
- **Nächtliches Zurücksetzen zieht die Abzeichen mit:** Verfällt eine Serie, wird der angezeigte Fortschritt sofort mit korrigiert.
- **Streak verfällt korrekt** bei Inaktivität: Wer länger als eine Woche nicht da war, verliert seinen Streak — vorher blieb er für immer stehen.
- **Punktestand und Serie sind schreibgeschützt:** Diese Felder konnten von der App aus verändert werden — was die Abzeichen-Vergabe angreifbar machte. Sie werden jetzt nur noch serverseitig gesetzt; das Team behält seine Korrekturmöglichkeit.
- **Fortschritt wird vollständig gezählt:** Bei Besuchen und Scans war die Zählung auf die ersten Einträge begrenzt, wodurch der Fortschritt ab einem bestimmten Punkt stehen blieb.
- **Punkte-History zeigte allen Admins ALLE Nutzer-Punkte.** Jetzt sieht jeder nur seine eigenen — auch Admins. Gleiches bei der Badge-Sammlung.
- **Gesamtpunkte aktualisierten sich nicht** nach Check-In/Scan. Die Anzeige hing am zwischengespeicherten Login-Stand; jetzt wird der Punktestand nach jedem Scan sofort frisch geladen.
- **Doppelter Check-in** bei schnellem Doppeltippen verhindert (kein doppelter Bonus mehr).
- **Noch nicht freigegebene Teile waren scanbar** — ein Besucher konnte sein eigenes eingereichtes Teil sofort scannen und Punkte kassieren. Jetzt zählt nur, was ein Helfer freigegeben hat.
- **Standort-Check beim Item-Scan** ergänzt (galt vorher nur beim Tür-Check-in).
- **Aktions-Abzeichen gingen an den falschen Kreis:** Vergeben wurde nur an Nutzer mit Check-in im Aktionszeitraum — wer ein Teil zur Aktion **gebracht** hatte, ging leer aus. Jetzt zählt beides, und das Abzeichen kommt sofort statt erst nach Aktionsende.
- **Aktionsbadges konnten stumm ausfallen:** Die Kopplung zwischen Aktion und Abzeichen steht in zwei Feldern. Wurde nur eines gepflegt, zählte das Abzeichen mit, wurde aber nie vergeben (oder umgekehrt). Beide werden jetzt gemeinsam gesetzt.
- **Server vergab Stufen, die die App nicht zeigt:** Wer einen Rang entfernte, sah eine Stufe weniger — im Hintergrund wurde sie weiter verliehen.
- **Aktions-Zielgruppen wirken:** Eine Aktion „nur für Inaktive/nach Rolle/Streak" gilt jetzt wirklich nur für diese — vorher für alle.
- **„+10 Punkte" bei einem Sprung um 510:** Schaltet ein Scan zugleich ein Abzeichen frei, stand dessen Belohnung zwar im Kontostand, aber nicht in der Meldung darüber — die beiden Zahlen passten genau in dem Moment nicht zusammen, in dem das Abzeichen aufging. Der Bonus wird jetzt getrennt mitgeliefert und lässt sich in einer künftigen App-Version ausweisen.
- **Bei zwei gleichzeitigen Aktionen gewann die schwächere:** Laufen zwei Aktionen zur selben Zeit, zählte bisher der Gesamtfaktor aus der älteren Pflege und nicht der, der tatsächlich mehr Punkte bringt. Eine beworbene „Holwoche ×5" blieb neben einer alten Dauer-Aktion wirkungslos — und weil ihr Faktor damit auf eins stand, zählte auch die Teilnahme nicht, das zugehörige Abzeichen blieb aus. Jetzt gewinnt die Aktion, die für Vorbeikommen, Mitnehmen oder Bringen den höchsten Faktor bietet. Gilt eine davon nicht für die Person, greift wie bisher die nächstbeste.
- **Gold, Platin und Diamant konnten stumm verschwinden:** Je nachdem, auf welchem Weg die Ränge zuletzt gespeichert worden waren, las der Server statt der Zahl der Ränge die Zahl der Zeichen — bei leerer Liste kamen so zwei Stufen heraus. Für jedes gestufte Abzeichen wäre oberhalb von Silber nichts mehr erreichbar gewesen, samt der Punkte dahinter, ohne jede Fehlermeldung. Die Rangliste wird jetzt in jeder Schreibweise richtig gelesen; ist keine gepflegt, bleibt es bei fünf Stufen.

**Konto und Daten**
- **Nach dem Abmelden blieben die Daten der vorigen Person stehen:** Auf einem geteilten Gerät — etwa dem Tablet im Laden — begrüßte die App die nächste Person eine halbe Minute lang mit dem Namen, dem Punktestand, dem Verlauf und den Abzeichen der vorigen. Grund war, dass die App die einmal geladenen Daten für kurze Zeit aufbewahrt, um nicht bei jedem Blättern neu laden zu müssen — beim Abmelden wurden sie aber nicht weggeräumt. Das geschieht jetzt. Ebenso wird das Gerät beim Abmelden von den Mitteilungen abgemeldet: Bisher liefen Erinnerungen an Serie und Abzeichen des alten Kontos weiter auf ein Gerät, das längst jemand anderem gehörte. Wer ohne Netz abmeldet, kommt trotzdem heraus.
- **Eingereichte Teile standen für alle offen — samt Privatadresse:** Jedes angemeldete Konto konnte den gesamten Bestand abrufen, auch fremde Einreichungen, die noch zu prüfen waren. Dazu gehörte das Standortfeld — und bei einem Teil, das bei der einreichenden Person zu Hause bleibt, steht dort deren Adresse. In der App war davon nichts zu sehen, weil die Ansichten es herausfilterten; der Laden-Server gab es trotzdem heraus. Jetzt sieht man nur noch, was freigegeben ist, und die eigenen Einreichungen. Das Team sieht wie bisher alles.
- **Geplante Mitteilungen gingen still verloren:** War der Versanddienst im geplanten Moment nicht erreichbar, galt die Nachricht trotzdem als verschickt und wurde nie wieder versucht — bei einem „Heute geschlossen" um zehn Uhr stand am Ende niemand davor, außer den Leuten vor der Ladentür. Im Verwaltungsbereich war nichts davon zu sehen, dort stand ein Häkchen. Eine Nachricht, die nicht rausging, bleibt jetzt offen und wird beim nächsten Versuch erneut geschickt; erst nach mehreren vergeblichen Anläufen gibt der Laden-Server auf.
- **Fremde Geräte ließen sich auf das eigene Konto umschreiben:** Beim An- und Abmelden für Mitteilungen wurde die Gerätekennung ungeprüft weitergereicht. Mit einer eigens gebauten Kennung ließ sich die Besitzprüfung umgehen — das fremde Gerät hörte auf, Mitteilungen zu bekommen, und die angreifende Person empfing sie stattdessen. Angenommen werden jetzt nur noch Kennungen in der Form, die die App tatsächlich vergibt; alles andere wird abgewiesen. Für Nutzer:innen ändert sich nichts.
- **Teilnahmezahlen anderer waren abrufbar:** Wer wie oft an welcher Aktion teilgenommen hatte, konnte jedes Konto für alle anderen abfragen — ein Bewegungsprofil durch den Laden. Diese Zahlen sind jetzt wie Punkteverlauf und Abzeichen auf die eigene Person beschränkt.
- **Helfer:innen wurde eine Push angeboten, die nie ankam:** Im Aushang-Editor stand für das ganze Team der Schalter „Als Push senden" — verschicken darf die Mitteilung aber nur die Leitung. Wer sie als Helfer:in einschaltete, sah den Aushang gespeichert und dazu einen Hinweis, die Push sei nicht rausgegangen; bei „Heute geschlossen" hieß das im schlimmsten Fall, dass Leute umsonst vor der Tür standen. Der Schalter erscheint jetzt nur noch dort, wo er auch wirkt.
- **Rolle (Helfer/Admin) wird überall konsistent erkannt** — der „Teile"-Tab und Admin-Funktionen erscheinen jetzt zuverlässig, auch direkt nach dem Start.
- **Profil-Namensfeld blieb leer** — zeigt jetzt den aktuellen Namen.
- **E-Mail-Format wird geprüft**, bevor eine Änderung abgeschickt wird.
- **SKU-Vergabe kollisionssicher** (leitet sich aus der höchsten bestehenden Nummer ab, nicht mehr aus der Anzahl — Löschungen verursachen keine Doppel-SKU mehr).

**Ansichten und Bedienung**
- **Freigeben änderte die Startseite nicht:** Wer alle eingereichten Teile freigab und zurückging, sah die orange Karte „3 Teile warten" unverändert stehen und beim Antippen eine leere Liste. Auch unter „Neu im Laden" tauchte das eben freigegebene Teil nicht auf. Dasselbe galt fürs Ablehnen, Archivieren, Einstellen und für das Schaufenster — und ebenso für Aktionen: Eine neu angelegte Aktion fehlte im Aushang, sodass sie leicht ein zweites Mal angelegt wurde. Alle betroffenen Ansichten werden jetzt gemeinsam aufgefrischt.
- **Englische Fehlermeldungen in deutschen Hinweisen:** Bei schlechtem Netz stand im Fehlerdialog ein englischer Entwicklersatz samt Link auf eine Programmierseite, statt zu sagen, was los ist. Jetzt heißt es „Keine Verbindung zum Laden-Server. Bist du online?" — und ebenso verständlich bei fehlender Berechtigung, abgelaufener Anmeldung oder unvollständig ausgefülltem Formular. Hinweise, die der Laden selbst schickt („Du bist nicht im Laden", „Schon mitgenommen"), stehen unverändert da.
- **Zurück führt jetzt überall zurück:** Aus den Einstellungen, dem Aushang-Editor, der Abzeichen- und Rangverwaltung, dem Schaufenster sowie aus Teilen, Inventar und Freigabe-Liste landete man beim Zurückgehen auf der Startseite statt beim vorherigen Bildschirm.
- **Karten mit abweichender Rundung standen wieder eckiger:** Beim Zusammenführen der Design-Werte ging verloren, dass einzelne Karten eine eigene Rundung mitbringen dürfen — die Karte mit dem Punktestand, die Aktions-Kacheln auf der Startseite und die Abzeichen-Karten wurden dadurch alle über einen Kamm geschoren. Sie sehen wieder so aus wie vorgesehen.
- **Schlecht lesbare Hinweise auf farbigem Grund:** Im Scanner und auf der Startseite standen sechs Zeilen in der falschen Farbe — dunkler Text auf dunklem Verlauf, teils kaum zu erkennen. Ursache war ein Vertipper beim Zusammenführen der Design-Werte, bei dem statt der Farbe ihr Name eingesetzt wurde. Die Zeilen sind wieder hell, und ein solcher Vertipper fällt künftig sofort auf, statt still falsch angezeigt zu werden.
- **Der Scanner hing im Laden und verschluckte den nächsten Versuch:** Drinnen hat das Handy oft keine Sicht zum Satelliten — die App wartete dann ohne Obergrenze auf den Standort, und der Scan stand still. Wer das für „nicht erkannt" hielt und die Kamera neu ausrichtete, bekam auf den zweiten Code gar keine Antwort; kurz darauf erschien die Erfolgsmeldung für das erste Teil, das man längst wieder weggelegt hatte. Die App wartet jetzt höchstens drei Sekunden auf den Standort und scannt danach ohne ihn weiter, und die Kamera bleibt gesperrt, solange ein Scan läuft, statt nach anderthalb Sekunden wieder anzuspringen.
- **Neue Teile standen mit 0 Punkten im Bestand:** Wer ein Teil ohne Punktwert anlegte, sah in der Teile-Übersicht eine 0 — beim Mitnehmen gab es trotzdem 30 Punkte. Jetzt steht von Anfang an der Wert dort, der auch gutgeschrieben wird.
- **Kategorien standen im Teil-Editor als Datenbankkürzel da:** Wer beim Bearbeiten eines Teils die Kategorie ändern wollte, las zehn Felder wie „damen-hose" und „herren-oberteil" statt „Damen · Hosen". Die Liste wich zudem von der beim Einstellen ab: „Kinder · Oberteile" fehlte, dafür gab es „Herren · Kleider". Die Auswahl läuft jetzt wie im Einstell-Formular über „Für wen" und „Art" und zeigt überall dieselben Möglichkeiten in Klartext.
- **Abgeschnittene Schrift:** Bei größeren Zahlen und Beschriftungen wurden Ober- und Unterlängen gekappt — die Zeilenhöhe wuchs nicht mit der App-Schriftgröße mit. Betraf Punktestand, Startseite und Hinweistexte.
- **Tastatur schloss sich nach jedem Buchstaben** in allen Formularen (Profil, Teil einstellen, Badge-Editor). Ursache war ein Render-Bug im Screen-Grundgerüst.
- **Chips zu niedrig:** Die Filter auf dem Punkte-Bildschirm hatten zu wenig Luft, die Schrift stieß oben und unten an.
- **Springende Zeilen bei den Rängen:** Im Admin unter „Punkte & Ränge" war das Punkte-Feld höher als das Namensfeld daneben. Beide Felder sind jetzt immer gleich hoch.
- **Datumsauswahl bei Aktionen überlagerte sich:** „Von" und „Bis" öffneten ihren Kalender direkt im Formular — er passte nicht in die halbe Spaltenbreite und zwei geöffnete Kalender lagen übereinander. Die Auswahl öffnet sich jetzt als eigenes Fenster über die volle Breite.
- **„Teile"-Tab reagierte nicht** auf Antippen — jetzt öffnet er das Inventar zuverlässig.
- **„Name speichern" wie die anderen Knöpfe:** Der Knopf war farblos, während „E-Mail ändern" und „Passwort ändern" daneben eingefärbt sind.
- **Aktions-Übersicht zeigt die Faktoren wieder:** Faktoren und Zeitraum standen zusammen in einer Zeile, die abgeschnitten wurde — ausgerechnet die Faktoren fielen weg.
- **Ankündigung ließ sich nicht von einer Aktion lösen:** Wer die Zuordnung auf „Eigenständig" stellte, sah die Änderung gespeichert — tatsächlich blieb die alte Verknüpfung bestehen. Ursache: Das leere Feld wurde beim Speichern verschluckt statt übertragen.
- **Verknüpfte Ankündigungen verschwanden unerwartet:** Wird eine Ankündigung einer laufenden Aktion zugeordnet, blendet die Startseite sie aus — die Aktions-Karte deckt das Thema bereits ab. Das war so gewollt, im Formular aber zu beiläufig erklärt.
- **Aushang zeigte dasselbe Thema doppelt:** Lief zu einer Ankündigung auch eine Aktion, standen beide untereinander. Ankündigungen lassen sich jetzt einer Aktion zuordnen.
- **Liquid Glass sah aus wie einfacher Weichzeichner:** Die Tab-Leiste beschnitt ihren eigenen Inhalt, wodurch das Apple-Material den Hintergrund nicht mehr aufnehmen konnte.
- **Liquid Glass wird zuverlässiger erkannt:** Die Prüfung lief einmalig beim Programmstart — war das System-Modul noch nicht bereit, blieb die Leiste für die gesamte Sitzung beim Ersatz-Weichzeichner. Die Prüfung findet jetzt statt, wenn die Leiste gezeichnet wird. Zusätzlich wird „Transparenz reduzieren" berücksichtigt.
- **Tab-Leiste unverändert gelassen:** Ein Versuch, den fließenden Übergang beim Tabwechsel nachzubauen, machte die Leiste kantig und ersetzte die Hervorhebung durch einen wandernden Punkt — schlechter als vorher. Zurückgenommen.
- **In „Was gibt es Neues" standen interne Notizen:** Die Hinweise für Tester:innen und im Store entstanden aus den letzten Änderungen — darunter auch solche, die nur den Bauvorgang betreffen. Wer die App bekam, las Sätze über Signaturschlüssel statt über die App.
- **Gescheiterte Benachrichtigung zum Aushang wurde übersehen:** Klappte das Verschicken nicht, erschien zwar ein Hinweis, der Editor schloss sich aber im selben Moment darunter. Wer den Hinweis wegtippte, ging davon aus, die Benachrichtigung sei raus. Jetzt bleibt er stehen, bis er bestätigt wurde.

### Sonstiges
- **Tür-Code erneuert:** Das Check-in-Geheimnis lag im Klartext in der Versionsgeschichte (über die Test-QR-Seite). Es wurde serverseitig durch ein neues ersetzt.
- **Test-QR-Seite nicht mehr im Repository:** Sie enthält das Tür-Geheimnis als Bild und liegt jetzt nur noch lokal.
- **Mikrofon-Berechtigung entfernt:** Android forderte `RECORD_AUDIO` an, obwohl die App nirgends Ton aufnimmt. Die Berechtigung stammte aus einer Vorgabe des Kamera-Moduls.
- Gemeldete Sicherheitslücken in den verwendeten Bibliotheken geschlossen.
- Farben, Abstände, Schriftgrößen, Rundungen und Symbolgrößen stehen jetzt an einer einzigen Stelle statt über die ganze App verstreut. Für Nutzer:innen ändert sich dadurch nichts; künftige Anpassungen am Aussehen wirken dafür überall gleich, statt einzelne Ansichten zu vergessen.
- **Expo SDK 54 → 57:** Drei Hauptversionen übersprungen, React Native von 0.81 auf 0.86, React auf 19.2. Damit läuft die App auf der neuen React-Native-Architektur, die seit SDK 55 verpflichtend ist. Die App ist dadurch etwas größer geworden (18 → 23 MB).
- **iOS setzt jetzt 16.4 voraus** (vorher 15.1). Vorgabe von Expo SDK 56; betrifft iPhone 7, 6s und SE der ersten Generation — diese Geräte werden nicht mehr unterstützt.
- **Android zielt auf Android 16 (API 36):** Google Play verlangt das ab dem 31. August 2026 für neue Apps und Updates.
- **Automatische Prüfung auf Bibliotheks-Updates** eingerichtet, bewusst eng gefasst: Der Großteil der Abhängigkeiten hängt an der Expo-SDK- oder PocketBase-Version und darf nur gemeinsam angehoben werden.
- **README und technischer Steckbrief** neu aufgesetzt: Funktionsübersicht nach Zielgruppe, Aufbau des Projekts, Datenschutz-Abschnitt, Stack mit Versionen, Datenmodell und Kennzahlen.
- **Korrekturen erreichen den Laden jetzt ohne Verzug.** Der Serverteil der App wurde bisher von Hand aufgespielt und lief dadurch einmal vier Wochen auf einem alten Stand — eine bereits behobene Sicherheitslücke blieb in dieser Zeit offen. Jetzt wird er bei jeder Änderung selbsttätig eingespielt, und im Anschluss wird geprüft, ob der neue Stand tatsächlich läuft.
- **Bibliotheken auf den aktuellen geprüften Stand gebracht.** Sie enthalten Fehlerkorrekturen der Hersteller, die unter anderem Kamera, Standort und Benachrichtigungen betreffen. Für Nutzer:innen ändert sich nichts an der Bedienung. Eine Entwicklungs-Bibliothek war unbemerkt auf eine Hauptversion gewandert, die nicht zum Rest passt; sie steht jetzt wieder auf dem abgestimmten Stand und ist gegen ein erneutes stillschweigendes Weiterwandern gesichert.

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
