#!/usr/bin/env python3
"""Schreibt google-services.json aus GOOGLE_SERVICES_JSON_BASE64; Aufruf: google-services.py <ziel> <paket>."""
import base64
import binascii
import json
import os
import pathlib
import sys


def fehler(text):
    print(f"::error::{text}", file=sys.stderr)
    sys.exit(1)


def main():
    if len(sys.argv) != 3:
        fehler("Aufruf: google-services.py <ziel> <paket>")
    ziel, paket = pathlib.Path(sys.argv[1]), sys.argv[2]

    roh = os.environ.get("GOOGLE_SERVICES_JSON_BASE64", "").strip()
    if not roh:
        fehler("Secret GOOGLE_SERVICES_JSON_BASE64 fehlt oder ist leer.")
    try:
        text = base64.b64decode(roh, validate=True).decode("utf-8")
        daten = json.loads(text)
    except (binascii.Error, UnicodeDecodeError, json.JSONDecodeError):
        fehler("GOOGLE_SERVICES_JSON_BASE64 ist kein base64-kodiertes JSON.")

    pakete = [
        c.get("client_info", {}).get("android_client_info", {}).get("package_name")
        for c in daten.get("client", [])
    ]
    if paket not in pakete:
        fehler(f"google-services.json kennt das Paket {paket} nicht (enthalten: {', '.join(p for p in pakete if p) or 'keins'}).")

    ziel.write_text(text, encoding="utf-8")
    projekt = daten.get("project_info", {}).get("project_id", "?")
    print(f"google-services.json geschrieben: Projekt {projekt}, Paket {paket}")


if __name__ == "__main__":
    main()
