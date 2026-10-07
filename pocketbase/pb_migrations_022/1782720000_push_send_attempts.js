/// <reference path="../pb_data/types.d.ts" />

// push_messages.send_attempts — wie oft der Versand schon gescheitert ist.
//
// Der Cronjob setzte sent_at bisher unabhängig davon, ob Expo überhaupt
// erreichbar war. Die Nachricht galt damit als verschickt, obwohl sie es nicht
// war, und der Filter `sent_at = ""` holte sie nie wieder. Jetzt bleibt sie bei
// einem Fehlversuch stehen und wird erneut versucht; dieser Zähler begrenzt
// das, damit der Job nicht jede Minute gegen eine dauerhaft unerreichbare
// Adresse läuft.
//
// Rein additiv: ein neues, optionales Zahlenfeld. Bestehende Datensätze lesen
// es als 0, kein vorhandenes Feld ändert sich, keine Antwortform verschiebt
// sich. Die App liest push_messages nicht (kein Treffer in mobile/); den
// Verwaltungsbereich lässt ein zusätzliches Feld unberührt.

migrate(
  (db) => {
    const dao = new Dao(db);
    const col = dao.findCollectionByNameOrId('push_messages');
    if (!col.schema.getFieldByName('send_attempts')) {
      col.schema.addField(
        new SchemaField({
          name: 'send_attempts',
          type: 'number',
          required: false,
          options: { min: 0 },
        })
      );
      dao.saveCollection(col);
    }
  },
  (db) => {
    const dao = new Dao(db);
    try {
      const col = dao.findCollectionByNameOrId('push_messages');
      const f = col.schema.getFieldByName('send_attempts');
      if (f) {
        col.schema.removeField(f.id);
        dao.saveCollection(col);
      }
    } catch (_) {}
  }
);
