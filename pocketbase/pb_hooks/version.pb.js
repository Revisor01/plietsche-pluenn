/// <reference path="../pb_data/types.d.ts" />

// GET /api/pp/version — welcher Commit auf dem Server läuft.
//
// Antwort: { commit: "<40-stelliger Hash>" }, ohne Anmeldung.
//
// Wozu: Die Nachher-Prüfung des Deploys (.github/scripts/deploy-verify.py)
// misst je Migration ein Schemamerkmal. Eine Änderung nur an den Hooks war
// damit nicht zu sehen — lief noch das alte Abbild, stimmte das Schema
// trotzdem. Jetzt vergleicht die Prüfung zusätzlich diesen Commit mit dem
// ausgelieferten.
//
// Der Commit steht in lib/build.js. Die Datei liegt nicht im Repo; das
// Dockerfile schreibt sie beim Bauen in /pb_hooks — also dorthin, von wo
// PocketBase die Hooks wirklich lädt. Überdeckt ein Bind-Mount /pb_hooks mit
// einem alten Stand, ist auch der Commit der alte, und die Prüfung schlägt an.
//
// Lokal (Upstream-Abbild, eingehängte Hooks) fehlt die Datei; dann ist der
// Commit leer.
routerAdd('GET', '/api/pp/version', (c) => {
  let commit = '';
  try {
    commit = `${require(`${__hooks}/lib/build.js`).commit || ''}`;
  } catch (_) {}
  return c.json(200, { commit });
});
