// Holt das gepinnte PocketBase-Binary für die Integrationstests.
//
// Warum ein echtes Binary und nicht der Harness: Der Harness (tests/harness.js)
// baut die PocketBase-Umgebung nach und prüft die Fachlogik schnell und
// genau. Was er nicht prüfen kann, ist, ob PocketBase selbst unsere Dateien so
// versteht, wie wir sie meinen — ob die Migrationen durchlaufen, ob eine
// Leseregel greift, ob ein Filter der App noch dieselben Datensätze liefert.
// Genau daran hängt ein Versionssprung wie 0.22 → 0.40.
//
// Die Version ist fest und muss zu pocketbase/Dockerfile passen. Die
// Prüfsummen stammen aus der checksums.txt des offiziellen Releases
// (https://github.com/pocketbase/pocketbase/releases/tag/v0.40.4).
// Stimmt die Prüfsumme nicht, wird nichts ausgepackt.
//
// Cache: node_modules/.cache/pocketbase/<version>/<plattform>/pocketbase —
// ein zweiter Lauf lädt nichts nach. In der CI hält actions/cache das
// Verzeichnis zwischen den Läufen.
//
// Offline oder mit eigenem Binary: PB_BINARY=/pfad/zu/pocketbase setzen.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PB_VERSION = '0.40.4';

const SHA256 = {
  darwin_arm64: 'eeb619ea4f8a06421daedb946d133bed269fea334a760941d147f76befc25ebc',
  darwin_amd64: '052906521f09f6f23405cd804c930d2b7a1f8eee06d39b85723b5054b2acb4e4',
  linux_amd64: '9042ec818570e79c3628dadcd0a756c1496d9e1173918ec409d133c02f82e5fa',
  linux_arm64: '86095bf8ed9345954f0d2bf0a5fb9b57584ae60b77ebf3b6cd23a8003a3fd418',
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CACHE_DIR = path.join(ROOT, 'node_modules', '.cache', 'pocketbase', PB_VERSION);

function platformKey() {
  const os = { darwin: 'darwin', linux: 'linux' }[process.platform];
  const arch = { arm64: 'arm64', x64: 'amd64' }[process.arch];
  const key = os && arch ? `${os}_${arch}` : null;
  if (!key || !SHA256[key]) {
    throw new Error(
      `Kein gepinntes PocketBase-Binary für ${process.platform}/${process.arch}. ` +
        'PB_BINARY auf ein passendes Binary setzen.'
    );
  }
  return key;
}

export async function ensurePocketBase() {
  if (process.env.PB_BINARY) return process.env.PB_BINARY;

  const key = platformKey();
  const dir = path.join(CACHE_DIR, key);
  const bin = path.join(dir, 'pocketbase');
  if (fs.existsSync(bin)) return bin;

  const name = `pocketbase_${PB_VERSION}_${key}.zip`;
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${name}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download von ${url} fehlgeschlagen: HTTP ${res.status}`);
  const zip = Buffer.from(await res.arrayBuffer());

  const ist = createHash('sha256').update(zip).digest('hex');
  if (ist !== SHA256[key]) {
    throw new Error(`Prüfsumme von ${name} stimmt nicht: ${ist}, erwartet ${SHA256[key]}`);
  }

  fs.mkdirSync(dir, { recursive: true });
  const zipPath = path.join(dir, name);
  fs.writeFileSync(zipPath, zip);
  execFileSync('unzip', ['-o', '-q', zipPath, 'pocketbase', '-d', dir]);
  fs.rmSync(zipPath);
  fs.chmodSync(bin, 0o755);
  return bin;
}
