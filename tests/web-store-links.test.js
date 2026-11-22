import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

describe('Landingpage verlinkt die Apps', () => {
  it('kein Hinweis „bald verfügbar“ mehr', () => {
    expect(html).not.toMatch(/bald verfügbar/i);
  });

  it('verlinkt App Store und Google Play', () => {
    expect(html).toContain('href="https://apps.apple.com/de/app/id6784690448"');
    expect(html).toContain('href="https://play.google.com/store/apps/details?id=de.godsapp.plietschepluenn"');
  });
});
