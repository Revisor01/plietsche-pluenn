#!/usr/bin/env python3
"""Feature-Grafik fuer Google Play, 1024x500.

Markenverlauf wie Icon und Mailkopf, freigestelltes Zeichen links,
Name und Slogan rechts. Kein Alphakanal — Play verlangt das.
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1024, 500
SC = os.path.dirname(os.path.abspath(__file__))

# Markenverlauf 135deg: #2bb091 -> #79c3b0 (52%) -> #80b3e1
STOPS = [(0.0, (0x2b, 0xb0, 0x91)), (0.52, (0x79, 0xc3, 0xb0)), (1.0, (0x80, 0xb3, 0xe1))]


def farbe_bei(t):
    t = max(0.0, min(1.0, t))
    for i in range(len(STOPS) - 1):
        p0, c0 = STOPS[i]
        p1, c1 = STOPS[i + 1]
        if p0 <= t <= p1:
            f = (t - p0) / (p1 - p0) if p1 > p0 else 0
            return tuple(round(c0[j] + (c1[j] - c0[j]) * f) for j in range(3))
    return STOPS[-1][1]


def verlauf(w, h):
    """135deg = diagonal von links oben nach rechts unten."""
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = farbe_bei((x / w + y / h) / 2)
    return img


def schrift(groesse, gewicht):
    pfad = os.path.expanduser("~/Library/Fonts/Inter-VariableFont_opsz,wght.ttf")
    f = ImageFont.truetype(pfad, groesse)
    try:
        f.set_variation_by_axes([groesse, gewicht])
    except Exception:
        pass
    return f


def main():
    img = verlauf(W, H)

    # Zeichen links, weiss und freigestellt
    zeichen = Image.open(os.path.join(SC, "zeichen-weiss-1024.png")).convert("RGBA")
    z = 196
    zeichen = zeichen.resize((z, z), Image.LANCZOS)
    img.paste(zeichen, (88, (H - z) // 2), zeichen)

    d = ImageDraw.Draw(img)
    x = 88 + z + 56

    titel = schrift(76, 600)
    ort = schrift(31, 500)
    takt = schrift(27, 500)

    # Blockhoehe aus den echten Zeilenhoehen, damit der Satz optisch mittig sitzt
    h_titel = d.textbbox((0, 0), "Plietsche Plünn", font=titel)[3]
    h_ort = d.textbbox((0, 0), "Dein Tauschladen in Hennstedt", font=ort)[3]
    h_takt = d.textbbox((0, 0), "Bringen. Mitnehmen. Wiederkommen.", font=takt)[3]
    lueck1, lueck2 = 22, 26
    gesamt = h_titel + lueck1 + h_ort + lueck2 + h_takt
    y = (H - gesamt) // 2 - 6

    d.text((x, y), "Plietsche Plünn", font=titel, fill=(255, 255, 255))
    y += h_titel + lueck1
    d.text((x, y), "Dein Tauschladen in Hennstedt", font=ort, fill=(255, 255, 255))
    y += h_ort + lueck2
    d.text((x, y), "Bringen. Mitnehmen. Wiederkommen.", font=takt, fill=(237, 250, 246))

    ziel = os.path.join(SC, "play", "feature-1024x500.png")
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    img.save(ziel, "PNG")
    print("geschrieben:", ziel, img.size, img.mode)


if __name__ == "__main__":
    main()
