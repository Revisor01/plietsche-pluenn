<p align="center">
  <img src="mobile/assets/icon.png" alt="Plietsche Plünn" width="128" height="128">
</p>

<h1 align="center">Plietsche Plünn</h1>

<p align="center">
  The app for the clothes swap shop —<br>
  drop by, take, bring and collect points for it.
</p>

<p align="center">
  <a href="README.md">Deutsch</a> · <b>English</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-iOS%2016.4%2B%20%C2%B7%20Android%207%2B-blue" alt="Platform">
  <img src="https://img.shields.io/itunes/v/6784690448?label=App%20Store&color=green" alt="App Store version">
  <img src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo" alt="Expo">
  <img src="https://img.shields.io/github/license/Revisor01/plietsche-pluenn" alt="License">
</p>

## What it is about

A clothes swap shop thrives when people come back — and when they do not only
take but also bring. The app makes exactly that visible: every visit, every
item taken and every item brought earns points. Points become ranks, regular
visits become badges.

The team manages the stock, reviews submitted items and runs campaigns in which
certain actions count more. The data lives on a self-hosted server; there is no
cloud service in between. The app is in German (*plietsch* is Low German for
“clever”, *Plünn* for “clothes”).

## Features

### For visitors

- **Check-in by QR code** — one scan at the shop door, one visit counted; if
  enabled, the app checks that you are really on site
- **Taking items** — scan the code on the garment or enter the number
- **Points, ranks, badges** — progress as a ring, badges in levels from bronze
  to diamond, point history by day
- **Browsing the shop** — all available items with photo, size and point value,
  filters for target group, type, size and “new”; plus the team's shop window
- **Submitting items** — photo, size and condition; points after approval
- **Share, recommend, rate** — pass items on via the share menu
- **Notifications of your choice** — four kinds, each one can be switched off
- **Manage your own account** — reset password, delete account

### For the team

- **Approvals** — review and edit submitted items, put them in the shop window
- **Inventory** — all items with status, filters and label printing
- **Notice board** — announcements with templates and an optional instant
  notification

### For the management

- **Campaigns** — period and separate factors for dropping by, taking and
  bringing, optionally only for certain groups
- **Points and ranks** — point values, maximum per visit and rank ladder freely
  configurable
- **Badges** — your own levels, triggers, thresholds and bonuses

## Installation

**[Download on the App Store »](https://apps.apple.com/app/id6784690448)** ·
**[Get it on Google Play »](https://play.google.com/store/apps/details?id=de.godsapp.plietschepluenn)**

The app belongs to one particular shop: after starting it you create an account
and check in at the door on your next visit. If you want to run your own shop
with it, you need your own server, see [Running it yourself](#running-it-yourself).

## Screenshots

| Start | Shop | Item | Badges |
|-------|------|------|--------|
| <img src="design/store/ios/01-start.png" alt="Start" width="200"> | <img src="design/store/ios/02-laden.png" alt="Shop" width="200"> | <img src="design/store/ios/04-detail.png" alt="Item" width="200"> | <img src="design/store/ios/08-abzeichen.png" alt="Badges" width="200"> |

## Versions

What changed when is in [CHANGELOG.md](CHANGELOG.md) (in German, written from
the users' point of view).

## Running it yourself

The backend is [PocketBase](https://pocketbase.io) with its own hooks and
migrations. You need Docker, and Node 22 for the app.

**1. Start the backend.** Hooks and migrations are read on start and the schema
creates itself. PocketBase encrypts its settings with a key of exactly 32
characters.

```bash
git clone https://github.com/Revisor01/plietsche-pluenn.git
cd plietsche-pluenn
echo "PB_ENCRYPTION_KEY=$(openssl rand -hex 16)" > .env
docker compose up -d
# check: curl http://localhost:8090/api/health
```

Keep the key in `.env`: without it the stored settings can no longer be read
after a restart.

**2. Set up administration.** On first start PocketBase writes a link for
creating the superuser account to the log (`docker compose logs pocketbase`).
Afterwards, at `http://localhost:8090/_/`, you can maintain the shop's opening
hours, address and location in the `store` record and give an account the role
`volunteer` (team) or `admin` (management) in `users`.

**3. Start the app.** The app talks to the server named in `EXPO_PUBLIC_PB_URL`;
without the variable, login does not work (template: `mobile/.env.example`). A
phone on the same network reaches your computer through its local address.

```bash
cd mobile
npm install --legacy-peer-deps
EXPO_PUBLIC_PB_URL=http://<address-of-your-computer>:8090 npx expo start
```

Notifications go through Expo's push service and need your own Expo project
with credentials for Apple and Google; without them everything else works,
nothing is delivered.

**Tests.** `npm test` in the root directory checks the hooks;
`npm run test:integration` downloads a real PocketBase and checks migrations and
access rules against it.

## Structure

```
plietsche-pluenn
├── mobile/              — the app (Expo / React Native, TypeScript)
│   ├── app/             — screens, file-based routing
│   ├── components/      — building blocks, tab bar, scanner
│   └── lib/             — design tokens, API, hooks, notifications
├── pocketbase/
│   ├── pb_hooks/        — scanner, points and badge logic, sending, schedules
│   ├── pb_migrations/   — schema and seed data
│   └── Dockerfile       — image with hooks and migrations
├── tests/               — hook tests and integration tests
├── web/                 — landing page
├── design/              — design and store images
└── docs/                — API (openapi.yaml), notification channels
```

Technical profile with versions, data model and permissions (German):
[TECH.md](TECH.md). The API is described in [docs/openapi.yaml](docs/openapi.yaml).

**What matters when building it:**
- **The truth lives on the server.** Point balance, streak and role are
  protected against writes from the app; the app displays, it does not
  calculate.
- **The point account heals itself.** After every booking the balance is summed
  again from the complete journal and cannot drift.
- **Privacy by data model.** An item taken stores no reference to the person;
  “person X took item Y” does not exist in the database.
- **Two design languages, one codebase.** iOS follows Apple's design rules,
  Android Material 3; colours, typography and layout are the same.
- **Never break shipped apps.** Versions in the stores read the API too;
  response shapes only change additively (see [CLAUDE.md](CLAUDE.md)).

## Contributing

Bug reports and suggestions are welcome as an
[issue](https://github.com/Revisor01/plietsche-pluenn/issues). Please report
security issues privately as described in [SECURITY.md](SECURITY.md). Pull
requests go through tests and a secret scan; see
[CONTRIBUTING.md](CONTRIBUTING.md).

## Privacy

No analytics, no advertising, no crash reports to third parties. The app only
talks to the shop's server and, for notifications, to Expo's push service. It
stores the account, points, visits and submitted items; at check-in only the
distance to the shop, not the location. Login data is kept in the device's
keychain.

The full privacy policy (German) is at
[simonluthe.de/apps/plietschepluenn/datenschutz](https://simonluthe.de/apps/plietschepluenn/datenschutz/).

## License

Plietsche Plünn is licensed under the
[GNU Affero General Public License v3.0](LICENSE): if you run the app or the
backend for others, you publish your changes too. The [LICENSE](LICENSE) file
is authoritative; contributions follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Contact

Pastor Simon Luthe · [mail@simonluthe.de](mailto:mail@simonluthe.de) ·
[simonluthe.de](https://simonluthe.de)
