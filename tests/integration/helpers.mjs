// Handgriffe der Integrationstests mit dem SDK der Apps (0.22.1); der Superuser geht am SDK vorbei, weil 0.22.1 nur /api/admins kennt.

import { inject } from 'vitest';
import PocketBase from 'pocketbase';

export const url = () => inject('pbUrl');

/** Ein frischer SDK-Client, wie ihn die App anlegt. */
export function client() {
  const pb = new PocketBase(url());
  pb.autoCancellation(false);
  return pb;
}

/** Roher Aufruf: gibt { status, body } zurück, ohne bei Fehlern zu werfen. */
export async function call(method, path, { body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = token;
  const res = await fetch(url() + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

let superToken = null;
export async function superuserToken() {
  if (superToken) return superToken;
  const su = inject('superuser');
  const res = await call('POST', '/api/collections/_superusers/auth-with-password', {
    body: { identity: su.email, password: su.password },
  });
  if (res.status !== 200) throw new Error(`Superuser-Anmeldung: HTTP ${res.status}`);
  superToken = res.body.token;
  return superToken;
}

/** Alle Datensätze einer Sammlung, an den Regeln vorbei. */
export async function adminList(collection, filter = '') {
  const token = await superuserToken();
  const q = new URLSearchParams({ perPage: '200' });
  if (filter) q.set('filter', filter);
  const res = await call('GET', `/api/collections/${collection}/records?${q}`, { token });
  if (res.status !== 200) throw new Error(`${collection}: HTTP ${res.status}`);
  return res.body.items;
}

let seq = 0;
/** Eindeutige Adresse je Aufruf, damit sich Tests nicht in die Quere kommen. */
export function uniqueEmail(name) {
  seq += 1;
  return `${name}.${Date.now().toString(36)}${seq}@integration.test`;
}

/** Registriert und meldet ein Konto an wie die App und gibt den Client zurück. */
export async function registerAndLogin(name, extra = {}) {
  const pb = client();
  const email = uniqueEmail(name);
  const password = 'Passwort-123';
  await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name,
    role: 'visitor',
    ...extra,
  });
  await pb.collection('users').authWithPassword(email, password);
  return { pb, email, password, id: pb.authStore.model.id };
}

/** Ein Team-Konto mit Rolle admin — das kann nur ein Superuser anlegen. */
export async function createTeamUser(name) {
  const token = await superuserToken();
  const email = uniqueEmail(name);
  const password = 'Passwort-123';
  const res = await call('POST', '/api/collections/users/records', {
    token,
    body: { email, password, passwordConfirm: password, name, role: 'admin' },
  });
  if (res.status !== 200) throw new Error(`Team-Konto: HTTP ${res.status} ${JSON.stringify(res.body)}`);
  const pb = client();
  await pb.collection('users').authWithPassword(email, password);
  return { pb, email, password, id: res.body.id };
}

export const sortedKeys = (obj) => Object.keys(obj).sort();
