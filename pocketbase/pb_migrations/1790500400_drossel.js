/// <reference path="../pb_data/types.d.ts" />

// Echte Client-IP aus X-Real-IP, das der Proxy überschreibt, und eine Drossel für Anmeldung und Passwort-Reset; schon von Hand Eingestelltes bleibt.

const REGELN = [
  // 20, weil das WLAN im Laden für viele Handys eine einzige Adresse ist.
  { label: 'users:authWithPassword', audience: '@guest', duration: 60, maxRequests: 20 },
  { label: 'users:requestPasswordReset', audience: '', duration: 300, maxRequests: 5 },
  { label: '_superusers:authWithPassword', audience: '@guest', duration: 60, maxRequests: 5 },
];

migrate((app) => {
  const settings = app.settings();
  if (!settings.trustedProxy.headers || settings.trustedProxy.headers.length === 0) {
    settings.trustedProxy.headers = ['X-Real-IP'];
    settings.trustedProxy.useLeftmostIP = false;
  }
  // Die Vorgaben von 0.40 (*:auth 2 in 3 s) sind für einen vollen Laden hinter einer Adresse zu knapp.
  if (!settings.rateLimits.enabled) {
    settings.rateLimits.rules = REGELN;
    settings.rateLimits.enabled = true;
  }
  app.save(settings);
}, (app) => {
  const settings = app.settings();
  settings.rateLimits.enabled = false;
  app.save(settings);
});
