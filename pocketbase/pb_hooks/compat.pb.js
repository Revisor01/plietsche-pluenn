/// <reference path="../pb_data/types.d.ts" />

// Übergangs-Middleware: Anmelde-Token aus PocketBase 0.22 weiter annehmen.
//
// Warum: Ab 0.23 heißt der Token-Typ "auth" statt "authRecord". PocketBase
// 0.40 weist die alten Token ab — ohne Fehlermeldung an die App, e.auth bleibt
// einfach leer. Jedes Handy, das vor dem Upgrade angemeldet war, liefe danach
// stillschweigend „leer": Scan und Push-Anmeldung mit 401, Listen ohne eigene
// Daten, bis die Person sich von Hand ab- und wieder anmeldet.
//
// Was hier geprüft wird — dasselbe, was 0.22 geprüft hat:
//   - Typ "authRecord" und die Sammlung `users` (nichts anderes; ein Token auf
//     eine Sammlung ohne Anmeldegeheimnis ließe sich sonst mit leerem
//     Schlüssel fälschen),
//   - Signatur HS256 mit tokenKey des Kontos + Anmeldegeheimnis der Sammlung.
//     So hat 0.22 signiert (tokenKey + Settings.RecordAuthToken.Secret); das
//     Upgrade übernimmt dieses Geheimnis nach users.authToken.secret —
//     gemessen am 26.09.2026 an einer mit 0.22.21 angelegten und auf 0.40.4
//     gehobenen Datenbank: HMAC mit tokenKey + authToken.secret ergibt genau
//     die Signatur des alten Tokens.
//   - Ablauf (exp). parseJWT lehnt abgelaufene Token ab.
// Ein geändertes Passwort ändert den tokenKey — ein alter Token ist dann auch
// hier ungültig, wie vorher.
//
// Ein angenommener alter Token wirkt wie ein neuer: e.auth ist das Konto.
// Er wird dadurch NICHT verlängert: auth-refresh gibt unter 0.40 einen Token
// ohne "refreshable"-Angabe unverändert zurück (gemessen: Antwort 200 mit
// demselben alten Token). Die App ruft auth-refresh ohnehin nicht auf — wie
// unter 0.22 gilt ein Token 30 Tage ab der Anmeldung; danach meldet
// authStore.isValid ihn als abgelaufen, und die App führt zur Anmeldung, die
// einen Token im 0.40-Format ausstellt.
//
// ENTFERNEN: Die Anmeldedauer (users.authToken.duration) ist 30 Tage. 30 Tage
// nach dem Upgrade in Produktion ist jeder alte Token abgelaufen; dann kann
// diese Datei ersatzlos weg (Datum des Upgrades + 30 Tage, in docs/deploy.md
// vermerken).
//
// Alles im Handler: PocketBase führt ihn in einer eigenen Umgebung aus.

routerUse((e) => {
  if (!e.auth) {
    const header = `${e.request.header.get('Authorization') || ''}`;
    const token = header.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      try {
        const claims = $security.parseUnverifiedJWT(token);
        if (claims && claims.type === 'authRecord' && claims.id) {
          const users = $app.findCollectionByNameOrId('users');
          if (`${claims.collectionId || ''}` === users.id) {
            const rec = $app.findRecordById(users, `${claims.id}`);
            const tokenKey = `${rec.tokenKey() || ''}`;
            const secret = `${users.authToken.secret || ''}`;
            // Ohne beide Teile gäbe es keinen Schlüssel, den nur der Server kennt.
            if (tokenKey && secret) {
              $security.parseJWT(token, tokenKey + secret); // wirft bei falscher Signatur oder Ablauf
              e.auth = rec;
            }
          }
        }
      } catch (_) {
        // Kein gültiger alter Token: e.auth bleibt leer, wie ohne Middleware.
      }
    }
  }
  return e.next();
});
