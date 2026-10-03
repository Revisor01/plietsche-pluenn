// Teilen, Empfehlen, Bewerten — die Texte und Adressen.
//
// Geprüft wird die reine Logik in mobile/lib/share.ts. Ob das Teilen-Menü auf
// dem Gerät aufgeht, sieht dieser Test nicht; dass die Screens die Logik
// benutzen, prüfen die Text-Tests unten.

import { describe, it, expect } from 'vitest';
import {
  LINKS, canShareItem, itemShareText, appRecommendationText, reviewUrls,
} from '../mobile/lib/share.ts';
import { code } from './helper/quelltext.js';

const LADEN = { name: 'Plietsche Plünn', address: 'Kirchstraße 5, 25779 Hennstedt' };

const JACKE = {
  title: 'Jeansjacke',
  size: 'M',
  condition: 'Sehr gut',
  group: 'Damen',
  type: 'Oberteile',
};

describe('itemShareText', () => {
  it('ergibt einen vollständigen, lesbaren Text', () => {
    expect(itemShareText(JACKE, LADEN)).toBe(
      [
        'Schau mal, was es bei Plietsche Plünn gibt:',
        '',
        'Jeansjacke',
        'Größe M · Zustand: Sehr gut',
        'Für: Damen · Oberteile',
        '',
        'Zum Mitnehmen bei Plietsche Plünn, Kirchstraße 5, 25779 Hennstedt.',
        '',
        `Mehr zum Laden: ${LINKS.web}`,
      ].join('\n'),
    );
  });

  it('lässt fehlende Angaben weg, ohne leere Zeilen zu hinterlassen', () => {
    const text = itemShareText({ title: 'Mütze' }, null);
    expect(text).toBe(
      [
        'Schau mal, was es bei Plietsche Plünn gibt:',
        '',
        'Mütze',
        '',
        'Zum Mitnehmen bei Plietsche Plünn.',
        '',
        `Mehr zum Laden: ${LINKS.web}`,
      ].join('\n'),
    );
    expect(text).not.toMatch(/\n\n\n/);
  });

  it('nennt bei extern gelagerten Teilen keinen Ort, sondern das Team', () => {
    const text = itemShareText({ ...JACKE, staysExternal: true }, LADEN);
    expect(text).toContain('Das Teil lagert nicht im Laden');
    expect(text).not.toContain('Zum Mitnehmen');
  });

  it('gibt den internen Lagerort nie heraus, auch wenn er mitgereicht wird', () => {
    // Bei Teilen, die zu Hause bleiben, steht in location eine Privatadresse.
    const text = itemShareText({ ...JACKE, location: 'bei Fam. Petersen, Deichstr. 4' }, LADEN);
    expect(text).not.toContain('Petersen');
    expect(text).not.toContain('Deichstr');
  });

  it('nutzt keine Messenger-Auszeichnung, die anderswo als Sternchen erscheint', () => {
    const text = itemShareText({ ...JACKE, note: 'Kaum getragen' }, LADEN);
    expect(text).not.toMatch(/[*_~`]/);
  });

  it('kommt ohne Emoji aus', () => {
    const text = itemShareText({ ...JACKE, note: 'Kaum getragen' }, LADEN);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(appRecommendationText(LADEN)).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('übernimmt die öffentliche Beschreibung', () => {
    expect(itemShareText({ ...JACKE, note: 'Kaum getragen' }, LADEN)).toContain('Kaum getragen');
  });
});

describe('canShareItem', () => {
  it('erlaubt freigegebene Teile und Altbestand ohne Status', () => {
    expect(canShareItem({ status: 'approved' })).toBe(true);
    expect(canShareItem({ status: '' })).toBe(true);
  });

  it('verbietet vergebene, archivierte und ungeprüfte Teile', () => {
    expect(canShareItem({ status: 'approved', taken_at: '2026-10-01 10:00:00.000Z' })).toBe(false);
    expect(canShareItem({ status: 'archived', archived_at: '2026-10-01 10:00:00.000Z' })).toBe(false);
    expect(canShareItem({ status: 'pending' })).toBe(false);
  });
});

describe('appRecommendationText', () => {
  it('enthält beide Store-Links, je auf eigener Zeile', () => {
    const zeilen = appRecommendationText(LADEN).split('\n');
    expect(zeilen).toContain(`iPhone: ${LINKS.appStore}`);
    expect(zeilen).toContain(`Android: ${LINKS.playStore}`);
    expect(appRecommendationText(LADEN)).not.toMatch(/[*_~`]/);
  });
});

describe('reviewUrls', () => {
  it('iOS: direkt zur Bewertungsseite im App Store', () => {
    expect(reviewUrls('ios')).toEqual(['https://apps.apple.com/app/id6784690448?action=write-review']);
  });

  it('Android: erst die Play-Store-App, dann die Webseite', () => {
    expect(reviewUrls('android')).toEqual([
      'market://details?id=de.godsapp.plietschepluenn',
      'https://play.google.com/store/apps/details?id=de.godsapp.plietschepluenn',
    ]);
  });
});

describe('Die Screens benutzen es', () => {
  it('Detailseite: Teilen-Knopf über das System-Menü, nur für verfügbare Teile', () => {
    const src = code('mobile/app/(visitor)/items/[id].tsx');
    expect(src).toMatch(/Share\.share\(/);
    expect(src).toMatch(/itemShareText\(/);
    expect(src).toMatch(/canShareItem\(item\)/);
    // Mit Foto: unter iOS als Datei angehängt (Share nimmt dort message + url).
    expect(src).toMatch(/File\.downloadFileAsync\(/);
    expect(src).toMatch(/Platform\.OS === 'ios' && item\.photo/);
    // Der Lagerort darf in den Aufruf nicht hineingeraten.
    expect(src).not.toMatch(/itemShareText\([^)]*location/);
  });

  it('Profil: App empfehlen und App bewerten', () => {
    const src = code('mobile/app/(visitor)/settings/account.tsx');
    expect(src).toMatch(/appRecommendationText\(/);
    expect(src).toMatch(/reviewUrls\(Platform\.OS\)/);
    expect(src).toMatch(/label="App empfehlen"/);
    expect(src).toMatch(/label="App bewerten"/);
  });
});
