/// <reference path="../pb_data/types.d.ts" />

// authAlert aus, Bestätigungslink 7 Tage, Anmeldung 30 Tage, jeweils nur über der 0.40-Vorgabe; Rate-Limit und MFA bewusst nicht hier.

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
