# Plietsche Plünn

Mobile App + Backend für den Kleidertausch-Laden Plietsche Plünn der Kirchengemeinde Lokstedt.

## Stack

- **Mobile**: Expo SDK 51+ (TypeScript, expo-router, Dev Client)
- **Backend**: PocketBase 0.22+ (Go binary, SQLite WAL)
- **Deployment**: server.godsapp.de (Docker + Traefik + KeyHelp)

## Struktur

```
mobile/          # Expo App (iOS + Android)
pocketbase/      # PocketBase project (hooks, migrations, public)
design/          # Design-Referenz (Mockup, Tokens, JSX-Vorlagen)
docker-compose.yml  # Deployment-Stack
```

## Quickstart

### Mobile (lokal)

```bash
cd mobile
npm install
npx expo start --dev-client
```

Erfordert ein installiertes Dev-Client-Build (siehe `mobile/README.md`).

### PocketBase (lokal für Tests)

```bash
cd pocketbase
./pocketbase serve --http=0.0.0.0:8090
# Admin UI: http://localhost:8090/_/
```

### PocketBase (Production)

Läuft auf `server.godsapp.de` unter `https://pb.plietschepluenn.de` via Docker-Stack.
Siehe `docker-compose.yml`.

## Design

`design/HANDOFF.md` enthält das vollständige Briefing inkl. Tokens, Schema, Phasen-Plan.
