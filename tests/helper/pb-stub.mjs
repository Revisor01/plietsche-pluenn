// Ein gestellter PocketBase-Server für tests/deploy-verify.test.js.
//
// Läuft als eigener Prozess und nicht im Test-Worker: Das zu prüfende Skript
// ist ein Kindprozess, und ein Server in derselben Ereignisschleife käme
// nicht dazu zu antworten, solange auf dieses Kind gewartet wird.
//
// Erwartet auf stdin ein JSON-Objekt:
//   { antworten: { "<pfad>": { status, koerper } }, warmlaufAbrufe: <zahl> }
//
// Gibt auf stdout als erste Zeile den Port aus, auf dem er lauscht.
//
// `warmlaufAbrufe` beantwortet die ersten n Abrufe je Pfad mit 503 — so
// verhält sich ein Container, der gerade neu startet. Ein Pfad, der in
// `antworten` fehlt, bekommt 404; PocketBase antwortet auf eine unbekannte
// Sammlung genauso.

import { createServer } from 'node:http';

const eingabe = await new Promise((fertig) => {
  let text = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (stueck) => { text += stueck; });
  process.stdin.on('end', () => fertig(JSON.parse(text)));
});

const { antworten = {}, warmlaufAbrufe = 0 } = eingabe;
const zaehler = new Map();

const server = createServer((req, res) => {
  const pfad = req.url;
  const nr = (zaehler.get(pfad) ?? 0) + 1;
  zaehler.set(pfad, nr);

  let eintrag;
  if (nr <= warmlaufAbrufe) {
    eintrag = { status: 503, koerper: { code: 503, message: 'Service Unavailable' } };
  } else {
    eintrag = antworten[pfad] ?? { status: 404, koerper: { code: 404, message: 'Not Found.' } };
  }

  const koerper = JSON.stringify(eintrag.koerper);
  res.writeHead(eintrag.status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(koerper),
  });
  res.end(koerper);
});

server.listen(0, '127.0.0.1', () => {
  process.stdout.write(`${server.address().port}\n`);
});
