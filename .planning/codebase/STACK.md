# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- JavaScript (Node.js) - Backend API in `backend/server.js`
- TypeScript - Mobile app in `mobile/App.tsx`, `mobile/tsconfig.json`
- React Native / Expo - Mobile client framework

**Secondary:**
- SQL - SQLite database queries in `backend/server.js`

## Runtime

**Environment:**
- Node.js (version not specified, infer from npm scripts)
- Expo Runtime ~53.0.16 for mobile

**Package Manager:**
- npm
- Lockfiles: `backend/package-lock.json`, `mobile/package-lock.json` present

## Frameworks

**Core Backend:**
- Express 4.18.2 - HTTP server and routing in `backend/server.js`

**Core Mobile:**
- React 19.0.0 - UI framework in `mobile/App.tsx`
- React Native 0.79.5 - Cross-platform mobile
- Expo ~53.0.16 - React Native development platform

**Mobile Navigation:**
- @react-navigation/native 7.1.14 - Navigation base
- @react-navigation/bottom-tabs 7.4.2 - Tab navigation
- @react-navigation/stack 7.4.2 - Stack navigation

**Mobile Camera/Scanning:**
- expo-barcode-scanner 13.0.1 - QR code scanning capability
- expo-camera 16.1.10 - Camera access for scanning

**Mobile UI:**
- expo-status-bar ~2.2.3 - Status bar management

## Key Dependencies

**Critical Backend:**
- sqlite3 5.1.6 - Embedded relational database in `backend/server.js`
- express 4.18.2 - Web framework for API endpoints
- bcrypt 5.1.1 - Password hashing for authentication (Lines 4, 89, 129 in `backend/server.js`)
- jsonwebtoken 9.0.2 - JWT token generation and verification (Lines 5, 59, 99, 134 in `backend/server.js`)
- cors 2.8.5 - Cross-origin resource sharing in `backend/server.js`

**Backend Development:**
- nodemon 3.0.2 - Auto-restart server on file changes (dev dependency)
- dotenv 16.3.1 - Environment variable loading in `backend/server.js`

**Critical Mobile:**
- axios 1.10.0 - HTTP client for API calls in `mobile/App.tsx` (Lines 14, 56, 65, 77, 106, 114, 127)

**Mobile Development:**
- TypeScript ~5.8.3 - Type safety
- Babel 7.25.2 - JavaScript transpilation
- @types/react ~19.0.10 - React type definitions

## Configuration

**Environment:**
- `.env` file present in `backend/` directory (contents not shown for security)
- Environment variables loaded via dotenv 16.3.1
- Key vars referenced: `PORT`, `DB_PATH`, `JWT_SECRET` (from `backend/server.js`)

**Backend Configuration:**
- `backend/package.json` - Dependencies and scripts
- `backend/server.js` - Monolithic Express app with inline configuration
- Default PORT: 3001 (Line 9 in `backend/server.js`)
- Default DB_PATH: `./database.sqlite` (Line 16 in `backend/server.js`)

**Mobile Configuration:**
- `mobile/app.json` - Expo configuration with app metadata, splash screens, platform-specific settings
- `mobile/tsconfig.json` - TypeScript compiler options extending `expo/tsconfig.base`
- `mobile/package.json` - Mobile dependencies and scripts

## Platform Requirements

**Development:**
- Node.js (version unspecified)
- npm (with package-lock.json tracking)
- Expo CLI for mobile development

**Production (Backend):**
- Node.js runtime
- SQLite file system access (local database)
- Port 3001 (configurable via PORT env var)
- Environment secrets: JWT_SECRET, DB_PATH

**Production (Mobile):**
- iOS 12+ or Android 5+ device/emulator
- Expo Go app or native build (APK/IPA)
- Network access to backend API (configured at `mobile/App.tsx` Line 17: `http://localhost:3001/api` - requires runtime configuration for production)

---

*Stack analysis: 2026-04-07*
