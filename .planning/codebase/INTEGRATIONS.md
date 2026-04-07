# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**Currently Implemented:**
- None detected in current running code

**Planned/Documented (from README.md):**
- Email Service (Nodemailer) - For user verification and notifications
  - SDK/Client: nodemailer (not in current package.json)
  - Configuration: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (from README.md Lines 83-87)

- QR Code Generation - For item identification
  - SDK/Client: Library for QR code generation (not yet implemented in current code)
  - Configuration: QR_BASE_URL env var (README.md Line 95)

## Data Storage

**Databases:**
- SQLite 5.1.6 (Embedded)
  - Location: `backend/database.sqlite` (default at `backend/server.js` Line 16)
  - Connection: Via sqlite3 package, path configurable via `DB_PATH` env var
  - Client: sqlite3 5.1.6 npm package
  - Tables initialized in `backend/server.js` Lines 20-45:
    - `users` - User accounts with authentication
    - `items` - Clothing items for exchange
  - Planned tables (from README.md): transactions, badge_definitions, user_badges, seasonal_actions, shop_items, shop_purchases, notifications, settings, categories

**File Storage:**
- Not implemented - Local filesystem only for database

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: Backend at `backend/server.js` Lines 50-66 (authenticateToken middleware)
  - Token generation on registration: Lines 99-102
  - Token generation on login: Lines 134-137
  - JWT_SECRET required as environment variable
  - Token format: `Bearer {token}` in Authorization header (used in `mobile/App.tsx` Lines 107, 115, 130)

**Registration Flow:**
- POST `/api/auth/register` at `backend/server.js` Lines 81-114
- Passwords hashed with bcrypt (10 salt rounds)
- Email and username uniqueness enforced via SQLite UNIQUE constraints

**Login Flow:**
- POST `/api/auth/login` at `backend/server.js` Lines 117-153
- Accepts username or email
- Password verified via bcrypt comparison

**Planned Features (from README.md):**
- Email verification (POST /api/auth/verify-email)
- Password reset (POST /api/auth/forgot-password, POST /api/auth/reset-password)
- Refresh tokens (JWT_REFRESH_SECRET env var referenced but not implemented)

## Monitoring & Observability

**Error Tracking:**
- None detected - basic console.log statements in `backend/server.js`

**Logs:**
- Console logging: Lines 47, 253-254 in `backend/server.js`
- Backend log file: `backend/backend.log` exists but format unknown

**Planned Features (from README.md):**
- Daily badge updates
- Weekly summary emails
- Monthly leaderboard notifications

## CI/CD & Deployment

**Hosting:**
- Not specified - Currently local development only

**CI Pipeline:**
- Not detected - No GitHub Actions or CI config files found

## Environment Configuration

**Required env vars (from backend/server.js):**
- `PORT` - Server port (default 3001)
- `JWT_SECRET` - Secret key for JWT signing (required - referenced Lines 59, 101, 136)
- `DB_PATH` - SQLite database file path (default ./database.sqlite)

**Optional env vars:**
- `NODE_ENV` - Runtime environment (not checked in code)

**Planned env vars (from README.md):**
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM - Email configuration
- APP_NAME, APP_URL, FRONTEND_URL - Application URLs
- QR_BASE_URL - QR code domain prefix

**Secrets location:**
- `.env` file in `backend/` directory (git-ignored)
- Environment variable injection at runtime

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

**Planned (from README.md):**
- Email campaigns (admin feature)
- Notification system for badge achievements
- Weekly and monthly email summaries

## Mobile-Backend Communication

**API Base URL:**
- Hardcoded: `http://localhost:3001/api` in `mobile/App.tsx` Line 17
- **CRITICAL**: Must be updated for production to actual backend domain

**HTTP Client:**
- axios 1.10.0 for all API calls in `mobile/App.tsx`:
  - GET endpoints: Lines 56 (loadItems), 114 (profile)
  - POST endpoints: Lines 65 (login), 77 (register), 106 (items), 128 (qr/scan)

**Authentication in Mobile:**
- Bearer token in Authorization header
- Token stored in component state: `authToken` (Line 45)
- Used in all authenticated requests (Lines 107, 115, 130)

## Current API Endpoints (Implemented)

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

**Users:**
- `GET /api/users/profile` - Get authenticated user profile

**Items:**
- `GET /api/items` - List active items (public)
- `POST /api/items` - Create new item (authenticated, awards 1 point)

**QR/Scanning:**
- `POST /api/qr/scan` - Mark item as taken (authenticated, prevents self-taking)

**Health:**
- `GET /api/health` - Server status check (Lines 71-78)

---

*Integration audit: 2026-04-07*
