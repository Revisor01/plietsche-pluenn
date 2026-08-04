import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'qrcode';

import type { Item } from './types';
import { categoryLabel } from './format';

/**
 * Druckbogen mit QR-Etiketten — zum Ausschneiden und an die Kleidung heften.
 *
 * Als PDF über den Teilen-Dialog: So kann das Team es direkt an einen Drucker
 * schicken, per Mail an den Laden senden oder auf einem Rechner ablegen. Ein
 * reiner Bildschirm-Screen hätte keinen Weg aufs Papier.
 *
 * Die QR-Codes werden als data:-URI eingebettet, damit der Bogen auch ohne
 * Netz vollständig ist — im Laden ist WLAN nicht selbstverständlich.
 */

const MM = (n: number) => `${n}mm`;

function esc(s?: string): string {
  return `${s ?? ''}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function qrDataUri(text: string): Promise<string> {
  // Fehlerkorrektur M: verträgt Knicke und Waschzettel-Falten, bleibt aber
  // klein genug für ein Etikett von 30 mm.
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

// Bewusst ohne Punktwert und Zustand: Beides kann sich ändern, ohne dass das
// Teil ein neues Etikett bekommt — gedruckt gehört nur, was dauerhaft gilt.
function label(item: Item, qr: string): string {
  const cat = categoryLabel(item.category);
  return `
    <div class="tag">
      <img class="qr" src="${qr}" alt="${esc(item.sku)}" />
      <div class="info">
        <div class="title">${esc(item.title)}</div>
        ${item.size ? `<div class="size">Größe ${esc(item.size)}</div>` : ''}
        ${cat ? `<div class="meta">${esc(cat)}</div>` : ''}
        <div class="foot"><span class="sku">${esc(item.sku)}</span></div>
      </div>
    </div>`;
}

export async function printQrSheet(items: Item[], title = 'QR-Etiketten'): Promise<void> {
  if (!items.length) throw new Error('Keine Teile zum Drucken.');

  const qrs = await Promise.all(items.map((i) => qrDataUri(i.qr_code || i.sku)));
  const tags = items.map((i, n) => label(i, qrs[n])).join('');

  const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: ${MM(10)}; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #1A2E2C; margin: 0; }
  h1 { font-size: 13pt; margin: 0 0 2mm; letter-spacing: -0.2pt; }
  .sub { font-size: 8.5pt; color: #5A6B6A; margin: 0 0 5mm; }
  .sheet { display: flex; flex-wrap: wrap; gap: ${MM(4)}; }
  .tag {
    width: ${MM(60)}; height: ${MM(32)};
    border: 0.4mm dashed #B7C4C2; border-radius: 2mm;
    padding: ${MM(2)}; display: flex; gap: ${MM(2)};
    align-items: center; page-break-inside: avoid;
  }
  .qr { width: ${MM(26)}; height: ${MM(26)}; display: block; }
  .info { flex: 1; min-width: 0; }
  .title { font-size: 9pt; font-weight: 700; line-height: 1.15;
           overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2;
           -webkit-box-orient: vertical; }
  .size { font-size: 8.5pt; font-weight: 600; margin-top: 0.6mm; }
  .meta { font-size: 7pt; color: #5A6B6A; margin-top: 0.6mm; line-height: 1.2; }
  .foot { margin-top: 1.2mm; }
  .sku { font-size: 7.5pt; font-weight: 700; color: #27b092; letter-spacing: 0.2pt; }
</style></head>
<body>
  <h1>Plietsche Plünn — ${esc(title)}</h1>
  <p class="sub">${items.length} ${items.length === 1 ? 'Etikett' : 'Etiketten'} · an der gestrichelten Linie schneiden</p>
  <div class="sheet">${tags}</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } else {
    // Ohne Teilen-Dialog wenigstens direkt in den Druckdialog.
    await Print.printAsync({ uri });
  }
}
