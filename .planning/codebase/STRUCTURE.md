# Codebase Structure

**Analysis Date:** 2026-04-07

## Directory Layout

```
plietsche-pluenn/
├── .planning/              # Planning and analysis documents
│   └── codebase/           # Generated architecture documentation
├── backend/                # Node.js Express backend server
│   ├── server.js           # Main server entry point (256 lines)
│   ├── package.json        # Dependencies: express, sqlite3, bcrypt, jwt, dotenv
│   ├── package-lock.json   # Locked dependency versions
│   ├── .env                # Environment variables (git-ignored)
│   ├── database.sqlite     # SQLite database file (auto-created)
│   └── backend.log         # Server logs
├── mobile/                 # React Native mobile app with Expo
│   ├── App.tsx             # Root component and all UI (446 lines)
│   ├── index.ts            # Expo entry point
│   ├── app.json            # Expo configuration
│   ├── package.json        # Dependencies: expo, react-native, axios, react-navigation
│   ├── package-lock.json   # Locked dependency versions
│   ├── tsconfig.json       # TypeScript configuration
│   ├── assets/             # App icons and splash screens
│   │   ├── icon.png
│   │   ├── adaptive-icon.png
│   │   ├── splash-icon.png
│   │   └── favicon.png
│   └── .git/               # Git repository for mobile only
├── README.md               # Project documentation, features, API docs
└── .DS_Store               # macOS metadata (git-ignored)
```

## Directory Purposes

**`/backend`:**
- Purpose: REST API server handling all business logic and data persistence
- Contains: Single monolithic Node.js server file, SQLite database, environment config
- Key files: `server.js` (all routes, middleware, business logic)

**`/mobile`:**
- Purpose: Cross-platform mobile UI built with React Native and Expo
- Contains: Single root component with all screens and navigation, asset files
- Key files: `App.tsx` (entire application UI)

**`/.planning/codebase`:**
- Purpose: Generated architecture documentation for CI/CD and code guidance
- Contains: Markdown documents describing architecture, structure, conventions, testing patterns, concerns
- Key files: ARCHITECTURE.md, STRUCTURE.md, etc.

## Key File Locations

**Entry Points:**
- `backend/server.js`: Backend HTTP server initialization, line 252-255
- `mobile/index.ts`: Mobile app Expo registration, line 1-8
- `mobile/App.tsx`: Root React component with UI state and screens, line 35-276

**Configuration:**
- `backend/package.json`: Backend dependencies and scripts
- `mobile/package.json`: Mobile dependencies and Expo scripts
- `mobile/app.json`: Expo app metadata, platform-specific config, splash/icon settings
- `backend/.env`: Environment variables (created from .env.example in README)

**Core Logic:**
- `backend/server.js` (lines 15-48): Database schema initialization for users, items tables
- `backend/server.js` (lines 50-66): JWT authentication middleware
- `backend/server.js` (lines 68-249): All API route handlers (auth, items, QR, profile)
- `mobile/App.tsx` (lines 35-276): Single App component with state management, all screens

**Testing:**
- Not present - no test files in codebase

## Naming Conventions

**Files:**
- Backend: Lowercase with .js extension (`server.js`)
- Mobile: PascalCase with .tsx extension for components (`App.tsx`), lowercase .ts for utilities
- Assets: Lowercase with dashes for descriptive names (`adaptive-icon.png`, `splash-icon.png`)

**Directories:**
- Lowercase, descriptive names: `backend`, `mobile`, `assets`
- Feature-based organization (monolithic files, not feature-split directories)

**Backend Routes:**
- Grouped by domain: `/api/auth/*`, `/api/items/*`, `/api/qr/*`, `/api/users/*`
- Pattern: `/api/{domain}/{action}` (e.g., `/api/auth/login`, `/api/items`)
- HTTP verbs: GET for read, POST for create, PUT for update, DELETE for remove

**Database Tables:**
- Lowercase singular names: `users`, `items` (created in server.js lines 21-45)
- Column names: snake_case (`user_id`, `plietsch_points`, `created_at`, `password_hash`)

**TypeScript Interfaces (Mobile):**
- PascalCase: `User`, `Item` (defined in App.tsx lines 19-33)
- Properties: camelCase

**JavaScript Variables:**
- camelCase: `loginForm`, `authToken`, `plietsch_points`, `authenticateToken`
- Constants: UPPERCASE: `API_BASE_URL` (line 17)
- Component names: PascalCase with suffix convention: `App` for main component

## Where to Add New Code

**New API Endpoint:**
- Location: `backend/server.js` after existing routes (line 249)
- Pattern: `app.post('/api/{domain}/{action}', [middleware], (req, res) => { db.run(...) })`
- Include authentication middleware if user-specific data
- Add table schema to db.serialize block if new data needed

**New Database Table:**
- Location: `backend/server.js` db.serialize block (lines 19-48)
- Pattern: `db.run('CREATE TABLE IF NOT EXISTS tableName (...)')`
- Use FOREIGN KEY constraints to reference `users(id)`

**New Mobile Screen/Feature:**
- Location: `mobile/App.tsx` (currently all in one file)
- Pattern: Add state variables with useState (lines 36-45), JSX render logic, styling
- Navigation: Modify return statement logic to show conditional screens
- API calls: Use axios with `API_BASE_URL` (line 17), pass authToken in headers if protected

**New Styling:**
- Mobile: Add to StyleSheet.create at bottom of `mobile/App.tsx` (lines 279-446)
- Pattern: Define style object with camelCase keys and React Native properties
- Colors: Use app color scheme (green: #2E7D32, darker green: #1B5E20, white text)

**Environment Variables:**
- Location: `backend/.env` (create from README example, lines 73-96)
- Use in code: `process.env.VARIABLE_NAME` (e.g., line 9, 59, 101)

## Special Directories

**`/mobile/.git`:**
- Purpose: Separate Git repository tracking just the mobile app
- Generated: Yes (initialized with git init)
- Committed: No (git directory itself not tracked by parent)

**`/backend/database.sqlite`:**
- Purpose: SQLite database file created at startup if missing
- Generated: Yes (auto-created by sqlite3 module on first run)
- Committed: No (.gitignore should exclude *.sqlite files)

**`/mobile/assets`:**
- Purpose: Static image assets for Expo (app icon, splash screen, favicon)
- Generated: No (included with project)
- Committed: Yes (source assets tracked in git)

**`/mobile/node_modules`:**
- Purpose: Installed npm dependencies for mobile app
- Generated: Yes (created by npm install)
- Committed: No (.gitignore excludes)

**`/backend/node_modules`:**
- Purpose: Installed npm dependencies for backend server
- Generated: Yes (created by npm install)
- Committed: No (.gitignore excludes)

---

*Structure analysis: 2026-04-07*
