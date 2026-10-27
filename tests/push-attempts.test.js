// push_messages.send_attempts muss im Schema stehen, sonst zählt der Cron nie hoch; geprüft über loadSchema.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { loadSchema } = createRequire(import.meta.url)('./harness.js');

// Felder des ursprünglichen Schemas, der Snapshot darf keins verlieren.
const FELDER_ALT = ['title', 'body', 'target_segment', 'target_role', 'scheduled_at', 'sent_at', 'deep_link', 'sent_by'];

describe('push_messages.send_attempts im Schema', () => {
  const felder = loadSchema().push_messages.fields;

  it('ist ein optionales Zahlenfeld ohne negative Werte', () => {
    const f = felder.send_attempts;
    expect(f.type).toBe('number');
    expect(f.required).toBe(false);
    expect(f.min).toBe(0);
  });

  it('steht neben allen bisherigen Feldern', () => {
    for (const name of FELDER_ALT) expect(Object.keys(felder)).toContain(name);
  });
});
