# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Monolithic Client-Server Architecture with Mobile-First Design

**Key Characteristics:**
- Separation between backend REST API and mobile client
- Stateless backend using JWT authentication
- Direct database access from single server process
- Embedded business logic in route handlers
- SQLite3 for data persistence

## Layers

**Presentation (Mobile):**
- Purpose: React Native UI for user interactions with Expo framework
- Location: `/Users/simonluthe/Documents/plietsche-pluenn/mobile/`
- Contains: React Native components, screen flows, navigation stacks, styling
- Depends on: Backend API via Axios HTTP client
- Used by: End users on iOS/Android/Web

**API/Route Handler (Backend):**
- Purpose: HTTP endpoint handling and request validation
- Location: `/Users/simonluthe/Documents/plietsche-pluenn/backend/server.js` (lines 68-249)
- Contains: Express route definitions, request/response handling, authentication middleware
- Depends on: Database layer, bcrypt for password hashing, JWT for token generation
- Used by: Mobile client and any other HTTP clients

**Business Logic (Backend):**
- Purpose: Core application features embedded within route handlers
- Location: `/Users/simonluthe/Documents/plietsche-pluenn/backend/server.js` (mixed with routes)
- Contains: User registration, item management, QR scanning, points calculation
- Depends on: Database layer
- Used by: Route handlers

**Data Access (Backend):**
- Purpose: Direct SQLite3 database interaction
- Location: `/Users/simonluthe/Documents/plietsche-pluenn/backend/server.js` (lines 15-48)
- Contains: Database initialization, schema creation, query execution callbacks
- Depends on: sqlite3 npm package
- Used by: All business logic and route handlers

## Data Flow

**User Registration Flow:**

1. Mobile client POSTs to `POST /api/auth/register` with username, email, password
2. Backend validates required fields (line 85-87)
3. Backend hashes password using bcrypt (line 89)
4. Backend inserts user record into `users` table (line 91-109)
5. Backend generates JWT token for new user (line 99-101)
6. Backend returns token and user object to client
7. Mobile client stores token and updates local user state (line 79-80)

**Item Creation & Gamification Flow:**

1. Mobile client POSTs to `POST /api/items` with item details and Bearer token (line 106-107)
2. Backend middleware `authenticateToken` verifies JWT from Authorization header (line 50-66)
3. Backend validates required fields: title, category, condition (line 191-192)
4. Backend inserts item with status='active' into `items` table (line 195-197)
5. Backend adds 1 PlietschPunkt to user record (line 204-206)
6. Backend returns created item ID and success message
7. Mobile client displays confirmation and reloads items list (line 110-111)

**QR Scan/Item Take Flow:**

1. Mobile client POSTs to `POST /api/qr/scan` with item_id and Bearer token (line 127-130)
2. Backend verifies user is authenticated
3. Backend queries `items` table for item with status='active' (line 225)
4. Backend validates item exists and user is not the owner (line 226-232)
5. Backend updates item status from 'active' to 'taken' (line 234-237)
6. Backend returns success message with item title
7. Mobile client reloads items list to reflect change (line 134)

**Item Listing Flow:**

1. Mobile client GETs `/api/items` (unauthenticated) (line 56)
2. Backend queries `items` table with JOIN to `users` for owner names, filters status='active' (line 172-176)
3. Backend returns items sorted by created_at DESC, max 20 items (line 177)
4. Mobile client displays items in FlatList with scan buttons (line 265-273)

**State Management:**

- Mobile: Local React state (useState) for user, items, form data - no persistence across sessions
- Backend: All state stored in SQLite3 database - volatile server memory holds only active connections
- Auth: Token-based (JWT) - no session server-side state

## Key Abstractions

**JWT Authentication Middleware:**
- Purpose: Validate Bearer token in Authorization header for protected routes
- Examples: `POST /api/items`, `POST /api/qr/scan`, `GET /api/users/profile`
- Pattern: middleware function `authenticateToken()` (line 50-66) extracts token and verifies signature with `process.env.JWT_SECRET`

**User Entity:**
- Purpose: Represents authenticated user with gamification state
- Examples: `users` table (line 21-29), User interface in App.tsx (line 19-24)
- Pattern: Contains id, username, email, password_hash (bcrypt), plietsch_points (integer counter)

**Item Entity:**
- Purpose: Represents clothing item available for exchange
- Examples: `items` table (line 32-45), Item interface in App.tsx (line 26-33)
- Pattern: Contains id, user_id (FK), title, description, category, size, color, condition, status ('pending'/'active'/'taken'), points_value, timestamps

**QR Code Scanning Abstraction:**
- Purpose: Simulate item claiming without actual QR code technology in MVP
- Examples: `simulateQRScan()` function in App.tsx (line 123-138)
- Pattern: Client sends item_id to backend which updates item status atomically

## Entry Points

**Backend Server:**
- Location: `/Users/simonluthe/Documents/plietsche-pluenn/backend/server.js` (line 252-255)
- Triggers: `npm run dev` (nodemon) or `npm start` (node)
- Responsibilities: Initializes Express app, creates SQLite database, starts HTTP server on PORT (default 3001)

**Mobile App:**
- Location: `/Users/simonluthe/Documents/plietsche-pluenn/mobile/index.ts` (line 1-8)
- Triggers: `expo start` command or loading in Expo Go
- Responsibilities: Registers root React component, initializes navigation

**Mobile UI Root:**
- Location: `/Users/simonluthe/Documents/plietsche-pluenn/mobile/App.tsx` (line 35-276)
- Triggers: Expo framework calls registerRootComponent
- Responsibilities: Renders authentication screen or main app screen based on login state

## Error Handling

**Strategy:** Try-catch at endpoint level with generic error responses

**Patterns:**
- Authentication errors return 401 (no token) or 403 (invalid token) (line 56, 61)
- Validation errors return 400 with specific error message (line 86, 191-192)
- Database errors return 500 with generic "Server Fehler" message (line 112, 180, 200, 239)
- Mobile client displays errors via Alert.alert() dialog (line 71, 119, 136)

## Cross-Cutting Concerns

**Logging:** Console.log for startup messages (line 47, 253-254), error logged but only to console in catch blocks

**Validation:** Manual field presence checks before database operations (line 85-87, 191-192, 221-222)

**Authentication:** JWT token validation in `authenticateToken` middleware applied to protected routes (line 50-66)

---

*Architecture analysis: 2026-04-07*
