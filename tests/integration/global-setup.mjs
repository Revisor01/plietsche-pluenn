// Startet EINE echte PocketBase für alle Integrationstests.
//
// Aufbau wie in Produktion, nur auf leerem, temporärem pb_data:
//   - Migrationen aus pocketbase/pb_migrations, Hooks aus pocketbase/pb_hooks
//     (die Dateien aus dem Repo, nicht kopiert — was hier grün ist, ist der
//     Stand, der ins Abbild kommt),
//   - Einstellungen verschlüsselt über --encryptionEnv, wie im Stack,
//   - ein Superuser für die Prüfungen, die an den Regeln vorbei lesen müssen
//     (Türgeheimnis, Push-Geräte). Die App selbst hat keinen.
//
// Freier Port, Warten auf /api/health, am Ende beenden und aufräumen. Bricht
// PocketBase beim Start ab (z. B. weil eine Migration scheitert), schlägt die
// Einrichtung mit dem Protokoll fehl, statt dass jeder Test einzeln in einen
// Timeout läuft.

import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensurePocketBase } from './pocketbase-binary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGRATIONS = path.join(ROOT, 'pocketbase', 'pb_migrations');
// PB_HOOKS_DIR: zum Gegenprüfen mit einem anderen Hook-Stand (z. B. leer, um
// zu sehen, dass die Routen-Tests dann wirklich rot werden).
const HOOKS = process.env.PB_HOOKS_DIR || path.join(ROOT, 'pocketbase', 'pb_hooks');

export const SUPERUSER = { email: 'superuser@integration.test', password: 'Integration-Superuser-1' };

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export default async function setup({ provide }) {
  const bin = await ensurePocketBase();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-integration-'));
  const dataDir = path.join(tmp, 'pb_data');
  const logFile = path.join(tmp, 'pocketbase.log');

  const env = {
    ...process.env,
    PB_ENCRYPTION_KEY: randomBytes(16).toString('hex'), // 32 Zeichen
    TZ: 'UTC',
  };
  const common = [
    `--dir=${dataDir}`,
    `--migrationsDir=${MIGRATIONS}`,
    `--hooksDir=${HOOKS}`,
    '--encryptionEnv=PB_ENCRYPTION_KEY',
  ];

  execFileSync(bin, ['superuser', 'upsert', SUPERUSER.email, SUPERUSER.password, ...common], {
    env,
    stdio: 'pipe',
  });

  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const log = fs.openSync(logFile, 'a');
  const proc = spawn(
    bin,
    [
      'serve',
      `--http=127.0.0.1:${port}`,
      ...common,
      // Keine Neustarts, wenn während des Laufs eine Hook-Datei gespeichert
      // wird, und keine Migrationsdateien, die PocketBase selbst schreibt.
      '--hooksWatch=false',
      '--automigrate=false',
    ],
    { env, stdio: ['ignore', log, log] }
  );

  let exited = null;
  proc.on('exit', (code) => {
    exited = code;
  });

  const deadline = Date.now() + 30_000;
  let healthy = false;
  while (Date.now() < deadline && exited === null) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) {
        healthy = true;
        break;
      }
    } catch (_) {
      // startet noch
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  if (!healthy) {
    proc.kill('SIGKILL');
    const text = fs.readFileSync(logFile, 'utf8');
    throw new Error(
      `PocketBase ist nicht gesund gestartet (Exit ${exited}). Protokoll:\n${text}`
    );
  }

  provide('pbUrl', url);
  provide('superuser', SUPERUSER);
  provide('pbLog', logFile);
  provide('pbDataDir', dataDir);

  return async () => {
    proc.kill('SIGTERM');
    await new Promise((r) => {
      if (exited !== null) return r();
      proc.on('exit', r);
      setTimeout(r, 5000);
    });
    if (process.env.PB_KEEP_DATA) {
      console.log(`PocketBase-Daten behalten: ${tmp}`);
    } else {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  };
}
