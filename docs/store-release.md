# Wie die App in die Stores kommt

Stand: 15.09.2026.

Gegenstück zu [`deploy.md`](deploy.md), das das Backend beschreibt. Hier geht es
um die App auf den Geräten: App Store und Google Play.

| Workflow | Wofür |
|---|---|
| `.github/workflows/testflight.yml` | iOS-Testfassungen nach TestFlight |
| `.github/workflows/play-internal.yml` | Android in eine Spur bei Google Play |
| `.github/workflows/release.yml` | Veröffentlichung, beide Stores in einem Lauf |

## Entwurf oder Freigabe — die Wahl bei Google Play

Beide Android-Workflows fragen beim Start nach einer **Freigabe**. Der Wert
entscheidet, was nach dem Upload mit der Fassung passiert:

| Wert | Was passiert | Wann |
|---|---|---|
| `completed` | Die Fassung geht sofort in die gewählte Spur. Google startet die Prüfung selbst. | Der Normalfall — jede Testfassung, jede Veröffentlichung nach der ersten. |
| `draft` | Die Fassung landet als **Entwurf** in der Play Console. Sie ist bei niemandem, bis jemand sie dort von Hand freigibt. | Die **allererste** Veröffentlichung. Und immer dann, wenn der Upload vom Freigabe-Zeitpunkt getrennt sein soll. |

Vorgabe ist überall `completed`. `draft` wird bewusst gewählt — als Vorgabe
blieben sonst Testfassungen unbemerkt in der Konsole liegen, statt bei den
Tester:innen anzukommen.

### Warum `draft` bei der ersten Veröffentlichung Pflicht ist

Solange eine App bei Google noch **nie** veröffentlicht wurde, gilt sie dort als
„draft app". Die Play-API nimmt für sie ausschließlich Entwürfe an. Jeder andere
Status wird abgelehnt:

```
Only releases with status draft may be created on draft app.
```

Das trifft den Lauf erst **nach** dem fertigen Build und dem Upload — also nach
etwa einer Stunde Rechenzeit. Deshalb prüft `upload-play.py` den Wert schon
vor der Anmeldung bei Google: Ein Tippfehler bricht sofort ab und kostet keinen
Build. Erlaubt sind nur `draft` und `completed`; ein unbekannter Wert wird nicht
durchgereicht.

Sobald die erste Fassung in der Konsole freigegeben und von Google ausgeliefert
ist, ist die App nicht mehr „draft" — ab dann ist `completed` der richtige Wert.

## Erste Veröffentlichung in die Produktionsspur

Die App liegt bei Google bislang nur mit versionCode 1 in der Spur `internal`.
`production`, `beta` und `alpha` sind leer — veröffentlicht wurde also noch nie.
Der Weg dorthin:

1. **In der Play Console vorbereiten.** Ohne das lehnt Google die
   Veröffentlichung ab, ganz gleich was der Workflow tut. Das füllt der
   Betreiber selbst aus, es gibt dafür keine Automatik:
   - Store-Eintrag: Name, Kurz- und vollständige Beschreibung, Symbol,
     Feature-Grafik, Screenshots (Telefon, und für jede unterstützte
     Geräteklasse)
   - Inhaltsbewertung: den Fragebogen ausfüllen
   - Datenschutzerklärung (URL) und der Abschnitt **Datensicherheit** — welche
     Daten erhoben werden und wofür
   - Zielgruppe und Inhalte, Werbe-Angabe, App-Zugriff (Testzugang, falls Teile
     erst nach Anmeldung sichtbar sind)
   - Die Erklärungen zu Regierungs-Apps, Finanzdiensten usw., soweit gefragt
2. **Version anheben** in `mobile/app.json` (`expo.version`) und committen. Der
   versionCode kommt automatisch aus Google Play, der muss nicht gepflegt
   werden.
3. **Workflow „Veröffentlichen" starten** (`release.yml`):
   - *Version*: die Nummer aus `app.json` abtippen — stimmt sie nicht, bricht
     der Lauf ab, bevor gebaut wird
   - *Plattformen*: `beide` oder `nur Android`
   - *Freigabe*: **`draft`** — das ist der Punkt, auf den es hier ankommt
   - *Hinweis*: leer lassen, dann entsteht er aus den Commits
4. **In der Play Console freigeben.** Die Fassung liegt jetzt als Entwurf in der
   Produktionsspur. Dort „Überprüfen und veröffentlichen". Google beginnt die
   Prüfung; sie dauert bei der ersten Einreichung üblicherweise länger als bei
   späteren Fassungen.
5. **Ab der zweiten Veröffentlichung** steht die Freigabe wieder auf
   `completed`; Schritt 4 entfällt dann.

## Testfassungen

`play-internal.yml` bedient die Spuren `internal`, `alpha`, `beta` und
`production`. Vorgabe ist `internal` — die Produktionsspur ist damit auch hier
erreichbar, aber nur durch bewusste Auswahl.

Der **Probelauf** baut, lädt hoch, setzt die Spur und verwirft die
Play-Bearbeitung anschließend. Nichts wird veröffentlicht, die Versionsnummer
bleibt unverbraucht. Nach jedem Umbau an den Workflows ist das der erste Lauf.

## iOS

`release.yml` lädt die Fassung nach App Store Connect hoch, veröffentlicht sie
aber nicht. Dort die Version anlegen, den Build binden und zur Prüfung
einreichen; nach Apples Freigabe veröffentlichen. Anders als bei Google gibt es
keinen Entwurfsstatus, der hier eine Rolle spielte.
