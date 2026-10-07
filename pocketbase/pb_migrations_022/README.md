# Migrationen aus der Zeit von PocketBase 0.22

Diese 20 Dateien haben das Schema von Plietsche Plünn bis September 2026
aufgebaut. **Sie laufen nicht mehr** — PocketBase liest nur
`pocketbase/pb_migrations/`, und dieser Ordner wird weder ins Abbild kopiert
noch eingehängt.

## Warum sie nicht mehr laufen

Sie sind gegen die Schnittstelle von PocketBase 0.22 geschrieben
(`new Dao(db)`, `SchemaField`, `dao.saveCollection`). Ab 0.23 gibt es diese
Schnittstelle nicht mehr. Nach der offiziellen Upgrade-Anleitung werden alte
Migrationen deshalb durch einen Sammlungs-Snapshot ersetzt; das ist
`pb_migrations/1790500000_collections_snapshot.js`. Den Startbestand, den
einige dieser Dateien nebenbei angelegt haben (Laden, Türgeheimnis,
Abzeichen), übernimmt `pb_migrations/1790500100_seed.js`.

Auf einer frischen Installation waren sie ohnehin schon nicht mehr lauffähig:
`1782637408_updated_store.js` wurde im Adminbereich der Produktion erzeugt und
sucht die Sammlung über deren Produktions-ID (`8hdpqi33x65ptii`). Auf jeder
anderen Datenbank bricht sie ab; übergeht man das, scheitert sie danach an
„duplicate column name: tiers_json".

## Warum sie trotzdem bleiben

- **Nachvollziehbarkeit.** Hier steht, *warum* das Schema so ist, wie es ist:
  weshalb das Türgeheimnis eine eigene Sammlung hat
  (`1782690000_store_secret_collection.js`), weshalb die Leseregeln so eng
  sind (`1782710000_tighten_read_rules.js`), weshalb `points_log` keinen
  Verweis auf ein Teil trägt (`1700000000_init_schema.js`). Der Snapshot zeigt
  nur das Ergebnis.
- **Verweise.** Die Prüfberichte unter `docs/audit/` und
  `.github/scripts/deploy-verify.py` nennen diese Dateien beim Namen.
- **Produktion kennt sie.** In der Tabelle `_migrations` der laufenden Instanz
  stehen alle 20 als ausgeführt. Das stört 0.40 nicht, aber wer dort
  nachsieht, soll die Dateien finden.

Nicht mehr ändern. Eine Schemaänderung gehört als neue Migration mit der
0.40-Schnittstelle nach `pb_migrations/`.
