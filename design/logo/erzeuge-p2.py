#!/usr/bin/env python3
"""Erzeugt p2-quelle.svg — das P2 im Ring.

Die Buchstaben werden als Konturen aus Work Sans Black gelesen und in die
Datei eingebettet; sie braucht deshalb keine installierte Schrift.

Die Ringstaerke ist kein freier Wert: Sie entspricht der gemessenen
Stammbreite des P in diesem Schnitt (164 von 462 Einheiten Versalhoehe).
Nur so wirken Ring und Zeichen gleich fett.

Aufruf (fontTools noetig):
    python3 -m venv venv && ./venv/bin/pip install fonttools
    ./venv/bin/python design/logo/erzeuge-p2.py > design/logo/p2-quelle.svg
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

SCHRIFT = (Path(__file__).resolve().parents[2] / "mobile/node_modules/"
           "@expo-google-fonts/work-sans/900Black/WorkSans_900Black.ttf")

CAN = 2048          # Kantenlaenge
LOCKUP_W = 1000.0   # Breite von "P2" zusammen
STROKE = 208.0      # Ringstaerke = Stammbreite des P
R_MITTE = 840.0     # Ringradius (Mitte des Strichs)
GAP = -70.0         # Abstand P/2 in Font-Einheiten; negativ = verschraenkt
WEISS = "#fffffb"


def main() -> str:
    font = TTFont(SCHRIFT)
    glyphen = font.getGlyphSet()
    cmap = font.getBestCmap()

    def grenzen(zeichen: str):
        stift = BoundsPen(glyphen)
        glyphen[cmap[ord(zeichen)]].draw(stift)
        return stift.bounds

    def kontur(zeichen: str, skala: float, dx: float, dy: float) -> str:
        stift = SVGPathPen(glyphen)
        # y spiegeln: Schriften wachsen nach oben, SVG nach unten
        glyphen[cmap[ord(zeichen)]].draw(
            TransformPen(stift, Transform(skala, 0, 0, -skala, dx, dy)))
        return stift.getCommands()

    pb, zb = grenzen("P"), grenzen("2")
    pw, ph = pb[2] - pb[0], pb[3] - pb[1]
    zw, zh = zb[2] - zb[0], zb[3] - zb[1]

    gesamt = pw + GAP + zw
    skala = LOCKUP_W / gesamt
    mitte = CAN / 2
    x0 = mitte - (gesamt * skala) / 2
    # Optisch zentrieren: die 2 ueberschiesst die Versalhoehe leicht
    grundlinie = mitte + (max(ph, zh) * skala) / 2

    p_d = kontur("P", skala, x0 - pb[0] * skala, grundlinie)
    z_d = kontur("2", skala, x0 + (pw + GAP) * skala - zb[0] * skala, grundlinie)

    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CAN} {CAN}" width="{CAN}" height="{CAN}">
  <!-- Erzeugt von design/logo/erzeuge-p2.py. Nicht von Hand aendern.
       Schrift: Work Sans Black (900), wie die App.
       Ringstaerke = Stammbreite des P, damit Ring und Zeichen gleich
       fett wirken. Wer eine Groesse aendert, rechnet die andere mit. -->
  <defs>
    <linearGradient id="verlauf" x1="0" y1="0" x2="{CAN}" y2="{CAN}"
                    gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2bb091"/>
      <stop offset=".5" stop-color="#79c3b0"/>
      <stop offset="1" stop-color="#80b3e1"/>
    </linearGradient>
  </defs>
  <rect width="{CAN}" height="{CAN}" fill="url(#verlauf)"/>
  <circle cx="{mitte:.1f}" cy="{mitte:.1f}" r="{R_MITTE:.1f}" fill="none"
          stroke="{WEISS}" stroke-width="{STROKE:.1f}"/>
  <path d="{p_d}" fill="{WEISS}"/>
  <path d="{z_d}" fill="{WEISS}"/>
</svg>
'''


if __name__ == "__main__":
    print(main(), end="")
