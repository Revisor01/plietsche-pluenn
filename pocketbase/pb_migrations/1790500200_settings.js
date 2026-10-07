/// <reference path="../pb_data/types.d.ts" />

// Einstellungen, die mit PocketBase 0.40 neu dazugekommen sind und die wir
// anders brauchen als ab Werk.
//
// authAlert AUS (Sammlung `users`)
//   Ab 0.23 schickt PocketBase bei jeder Anmeldung von einem unbekannten
//   Gerät eine Mail „Login from a new location" — auf Englisch, mit
//   PocketBase-Text, an Nutzer:innen, die nie ein PocketBase-Konto angelegt
//   haben. Die App meldet sich auf jedem neuen Handy, nach jeder
//   Neuinstallation und nach jedem Ablauf des Tokens neu an; die Mail käme
//   also oft und ohne Anlass. Die Vorlage auf Deutsch zu übersetzen löst
//   das nicht: Der Inhalt („Warst du das nicht, ändere sofort dein Passwort")
//   erschreckt bei einer Kleidertausch-App mehr, als er schützt.
//
//   Läuft einmal. Schaltet jemand es später im Adminbereich wieder ein,
//   bleibt es an — die Migration ist dann schon vermerkt.
//
// Bestätigungslink eine Woche gültig (Sammlung `users`)
//   Die deutsche Bestätigungsmail verspricht „Der Link gilt eine Woche". Unter
//   0.22 war das die Vorgabe, und eine gehobene Datenbank behält den Wert.
//   Eine FRISCHE 0.40-Installation setzt aber 1 Tag (86400 s) — die Mail
//   stimmte dann nicht. Geändert wird nur, wenn noch genau die 0.40-Vorgabe
//   dasteht; einen bewusst gepflegten anderen Wert lässt die Migration stehen.
//   (Gemessen 26.09.2026: frisch 86400, nach Upgrade von 0.22 604800.)
//
// Anmeldung 30 Tage gültig (Sammlung `users`)
//   Produktion meldet 30 Tage an (2592000 s, unter 0.22 eingestellt und vom
//   Upgrade übernommen). Eine frische 0.40-Installation setzt 5 Tage (432000 s);
//   die App erneuert ihren Token nicht, eine Testinstanz verhielte sich dann
//   anders als Produktion. Gleiche Bedingung wie oben: nur, wenn noch die
//   0.40-Vorgabe dasteht. (Gemessen 26.09.2026: frisch 432000.)
//
// Bewusst NICHT hier:
//   - Rate-Limiting. Hinter Apache → Traefik sieht PocketBase ohne passenden
//     trustedProxy-Eintrag nur die IP des Proxys; alle Nutzer:innen teilten
//     sich dann ein Kontingent, und ein Laden voller Leute beim Einchecken
//     sperrte sich selbst aus. Einschalten erst, wenn gemessen ist, welcher
//     Kopf die echte IP trägt. Vorgehen und Regelvorschlag: docs/deploy.md,
//     Abschnitt „Upgrade auf 0.40".
//   - MFA/OTP für Superuser. Empfohlen, aber eine Migration ist der falsche
//     Ort: Sie würde bei einer frischen Installation zuschlagen, bevor
//     überhaupt ein Mailversand eingerichtet ist, und damit den Zugang zum
//     Adminbereich versperren.

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.authAlert.enabled = false;
  if (users.verificationToken.duration === 86400) {
    users.verificationToken.duration = 604800;
  }
  if (users.authToken.duration === 432000) {
    users.authToken.duration = 2592000;
  }
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId('users');
  users.authAlert.enabled = true;
  app.save(users);
});
