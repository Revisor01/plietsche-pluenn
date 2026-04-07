# Codebase Concerns

**Analysis Date:** 2026-04-07

## Tech Debt

**Monolithic Server Design:**
- Issue: All routes, middleware, and database logic are in a single file (`server.js`). No separation of concerns or modular architecture.
- Files: `backend/server.js` (256 lines)
- Impact: Hard to maintain, test, and scale. Adding new features becomes increasingly difficult. Code reuse is minimal.
- Fix approach: Refactor into modules: `routes/`, `controllers/`, `middleware/`, `models/`, `utils/`. Create separate files for auth, items, QR scanning, etc.

**No Input Validation:**
- Issue: User input is accepted without validation or sanitization. No regex checks, length limits, or format validation on email, username, passwords, or item properties.
- Files: `backend/server.js` (lines 81-114, 188-215)
- Impact: Invalid data can be stored in database. Possible injection vulnerabilities. Poor user experience (user can store empty/garbage data).
- Fix approach: Use a validation library (e.g., `joi`, `yup`, `zod`) to validate all incoming requests. Define schemas for register, login, items, etc.

**Hardcoded API URL in Mobile App:**
- Issue: Backend API URL is hardcoded as `http://localhost:3001/api` in the mobile app (line 17).
- Files: `mobile/App.tsx` (line 17)
- Impact: Development only. App cannot be deployed to production without code changes. Different environments (dev/staging/prod) require separate builds.
- Fix approach: Move API URL to environment variables or config files. Use EAS Build or similar for environment-specific builds. Consider using a `.env` file or app.json config.

**No Error Logging or Monitoring:**
- Issue: Generic catch blocks and console.log statements. No structured logging, no error tracking, no way to identify production issues.
- Files: `backend/server.js` (lines 111-112, 150-151)
- Impact: Silent failures in production. Errors are caught but not logged. Difficult to debug issues reported by users.
- Fix approach: Implement structured logging (e.g., `winston`, `pino`, `bunyan`). Add error tracking (e.g., Sentry, LogRocket). Log all important events.

**Missing Database Migrations:**
- Issue: Database schema is created on every server start via raw SQL in `db.serialize()`. No version control for schema changes.
- Files: `backend/server.js` (lines 19-48)
- Impact: Difficult to track schema history. Rolling back changes is error-prone. Teams can't coordinate database changes.
- Fix approach: Use a migration tool (e.g., `knex`, `TypeORM`, `Sequelize`, `Prisma`). Version and track all schema changes.

**No Configuration Management:**
- Issue: Only `.env` file for configuration. No support for different environments (dev/test/prod) without manual .env switching.
- Files: `backend/server.js` (line 6, 16, 101, etc.)
- Impact: Risk of using wrong credentials in wrong environment. Hard to manage secrets across team/deployments.
- Fix approach: Use a config library that loads environment-specific files (e.g., `config` npm package). Separate secrets from configuration.

## Known Bugs

**No Email Verification in Registration:**
- Symptoms: Users are marked as verified (`verified = 1`) immediately upon registration without confirming their email address.
- Files: `backend/server.js` (line 92)
- Trigger: Any user can register with any email address without verification
- Impact: Account takeover risk. Fake/invalid emails create bounces. Leaderboards and point systems are unreliable.
- Workaround: Email verification step not implemented. Currently every registered user is auto-verified.

**Potential Race Condition on Item Deletion:**
- Symptoms: When user takes an item, no check for concurrent access. If two users scan same item simultaneously, both requests might succeed.
- Files: `backend/server.js` (lines 225-248)
- Trigger: Rapid QR scans of same item by multiple users
- Impact: Item could be marked as taken by multiple users. Points could be double-counted. Data inconsistency.
- Workaround: None. First-come-first-served is not enforced at database level.

**Token Not Stored in Mobile App:**
- Symptoms: `authToken` is stored in React state, which is lost on app restart. No persistent token storage.
- Files: `mobile/App.tsx` (lines 45, 67, 79, 89)
- Trigger: Closing and reopening the app
- Impact: Users are logged out every time they close the app. Poor UX.
- Workaround: None. Need to use AsyncStorage or similar persistent storage.

## Security Considerations

**No Input Sanitization/SQL Injection Prevention:**
- Risk: SQLite3 driver uses parameterized queries (good), but no validation of input content. Malicious characters or very long strings could cause issues.
- Files: `backend/server.js` (all database queries)
- Current mitigation: SQLite3 parameterized queries prevent classic SQL injection
- Recommendations: 
  - Add input validation (length, format, type checks)
  - Sanitize strings before storage (e.g., trim whitespace, escape special chars)
  - Add rate limiting on auth endpoints

**JWT Secret in Code/Env Variable:**
- Risk: `process.env.JWT_SECRET` is likely stored in `.env` file. If `.env` is committed or exposed, all user sessions are compromised.
- Files: `backend/server.js` (lines 101, 136)
- Current mitigation: `.env` is typically gitignored, but not version-controlled
- Recommendations:
  - Ensure `.env` is in `.gitignore`
  - Use strong, randomly generated secrets
  - Implement JWT refresh token rotation
  - Consider using a secrets management system (HashiCorp Vault, AWS Secrets Manager)

**No HTTPS Requirement:**
- Risk: Development setup uses `http://localhost`. In production, this must use HTTPS or tokens/credentials are exposed.
- Files: `mobile/App.tsx` (line 17)
- Current mitigation: Localhost only in development
- Recommendations:
  - Enforce HTTPS in production
  - Add CORS whitelist (currently open to all origins)
  - Use secure cookie flags (HttpOnly, SameSite)

**No Rate Limiting:**
- Risk: No protection against brute force attacks on login/register endpoints. Attacker can try unlimited password guesses.
- Files: `backend/server.js` (lines 81-114, 117-153)
- Current mitigation: None
- Recommendations:
  - Implement rate limiting on auth endpoints (e.g., `express-rate-limit`)
  - Limit login attempts per IP/username
  - Add account lockout after N failed attempts

**Open CORS Configuration:**
- Risk: `cors()` middleware with no options means all origins can access all endpoints.
- Files: `backend/server.js` (line 12)
- Current mitigation: None
- Recommendations:
  - Whitelist specific frontend URLs: `cors({ origin: process.env.FRONTEND_URL })`
  - Restrict HTTP methods per endpoint

**No Password Strength Requirements:**
- Risk: Users can register with weak passwords (single character, empty, etc.)
- Files: `backend/server.js` (lines 81-114)
- Current mitigation: None
- Recommendations:
  - Validate password length (min 8 chars)
  - Require mix of uppercase, lowercase, numbers, special chars
  - Use a library like `zxcvbn` for password strength checking

## Performance Bottlenecks

**No Database Indexes:**
- Problem: Queries on `users.username`, `users.email`, `items.user_id`, `items.status` have no indexes. Queries will scan entire tables.
- Files: `backend/server.js` (lines 122-149, 225-248, 171-185)
- Cause: `CREATE TABLE` statements have no `CREATE INDEX` directives. As user/item counts grow, queries slow exponentially.
- Improvement path:
  - Add indexes: `CREATE INDEX idx_users_email ON users(email)`
  - Add composite indexes: `CREATE INDEX idx_items_user_status ON items(user_id, status)`
  - Benchmark query performance before/after

**No Query Pagination:**
- Problem: `/api/items` endpoint returns all active items with only `LIMIT 20`. No offset/pagination support.
- Files: `backend/server.js` (line 177)
- Cause: Hardcoded limit, no cursor-based or offset-based pagination
- Improvement path:
  - Add `skip` and `limit` query parameters
  - Return total count for client-side pagination
  - Consider cursor-based pagination for large datasets

**No Caching:**
- Problem: Items list, user profile, and leaderboard are fetched fresh every time. No caching layer.
- Files: `backend/server.js` (entire app)
- Cause: No Redis or in-memory cache
- Improvement path:
  - Cache frequently accessed data (items list, leaderboards)
  - Implement cache invalidation strategy
  - Use HTTP caching headers (ETag, Cache-Control)

**In-Memory Database Connection:**
- Problem: SQLite3 stores database in single file. No connection pooling. Concurrent requests wait for disk I/O.
- Files: `backend/server.js` (line 16)
- Cause: SQLite not designed for high concurrency
- Improvement path:
  - For production: Migrate to PostgreSQL or MySQL with connection pooling
  - For development: SQLite is fine but understand the limitation

## Fragile Areas

**Badge System Not Implemented:**
- Files: No badge logic exists in codebase despite README documenting badge system
- Why fragile: README promises badge features (`/api/badges` endpoints, badge progress, leaderboards) that don't exist in code. Endpoints will 404.
- Safe modification: Implement badge system with separate model/table before deploying to users
- Test coverage: No tests exist for any feature

**Shop System Not Implemented:**
- Files: No shop logic exists despite README
- Why fragile: Shop endpoints (`/api/shop/items`, `/api/shop/purchase`) are documented but unimplemented
- Safe modification: Implement shop before public release or remove from docs
- Test coverage: None

**Admin Routes Not Implemented:**
- Files: No admin endpoints exist (`/api/admin/dashboard`, etc.)
- Why fragile: Admin features mentioned in README don't exist
- Safe modification: Add admin middleware and routes before enabling admin accounts
- Test coverage: None

**Seasonal Actions Not Implemented:**
- Files: No seasonal action logic despite README
- Why fragile: API expects `/api/seasonal/active` but feature is missing
- Safe modification: Implement or remove from docs
- Test coverage: None

**Notification System Not Implemented:**
- Files: No notification endpoints or logic
- Why fragile: `/api/notifications` endpoints don't exist
- Safe modification: Implement before mentioning in UI
- Test coverage: None

**No Tests at All:**
- Files: No `.test.js`, `.spec.js`, `jest.config.js`, or `vitest.config.js`
- Why fragile: Every refactor breaks something silently. No regression detection. Can't safely modify code.
- Safe modification: Start with unit tests for auth logic, then integration tests for QR scanning
- Test coverage: 0%

**No TypeScript in Backend:**
- Files: `backend/server.js` is plain JavaScript despite mobile using TypeScript
- Why fragile: No type checking. Typos in property names only found at runtime. API contracts are not enforced.
- Safe modification: Gradually migrate to TypeScript or use JSDoc type hints for immediate safety
- Test coverage: None

## Scaling Limits

**SQLite Limitations:**
- Current capacity: SQLite works fine for ~10k-100k records. Concurrency limited to ~10 concurrent connections.
- Limit: Performance degrades with >1M records or >50 concurrent users
- Scaling path: Migrate to PostgreSQL or MySQL before reaching limits. Plan for migration early.

**No Horizontal Scaling:**
- Current capacity: Single Node.js process on single server
- Limit: Can't scale across multiple servers/containers. Single server failure = total downtime.
- Scaling path: Add load balancer, run multiple app instances, use separate database server

**No Session Storage:**
- Current capacity: No session management. Each request is stateless (JWT only).
- Limit: Can't implement features like "active sessions", "device management", or "force logout"
- Scaling path: Add Redis for session store once needed

## Dependencies at Risk

**No Type Safety in Backend:**
- Risk: Backend is plain JavaScript. Mobile is TypeScript. Type mismatches between frontend/backend discovered only at runtime.
- Impact: API changes break the app. Refactoring is unsafe.
- Migration plan: Migrate backend to TypeScript. Use API documentation (OpenAPI/Swagger) to keep frontend/backend in sync. Consider code generation.

**Outdated Express Version (4.18.2):**
- Risk: Express is mature but not the latest. Security updates may lag.
- Impact: Potential security vulnerabilities
- Migration plan: Test upgrade path to latest Express. Monitor security advisories. Update regularly.

**No Testing Framework:**
- Risk: No Jest, Vitest, or Mocha installed. Adding tests later is harder because architecture isn't testable.
- Impact: Can't safely refactor. Regressions go undetected.
- Migration plan: Install testing framework now. Start with simplest tests (auth). Build test coverage gradually.

## Missing Critical Features

**Email Verification:**
- Problem: No email verification. Users can register with fake emails.
- Blocks: Can't send password reset emails. Can't validate user ownership of email. Spam/fake accounts.

**Password Reset:**
- Problem: No password reset functionality despite README mentioning `/api/auth/reset-password`
- Blocks: Locked-out users have no way to recover account

**Image Upload for Items:**
- Problem: README mentions "Multer + Sharp für Bildverarbeitung" but no image upload endpoints exist
- Blocks: Items can't have photos. User experience is poor.

**QR Code Generation:**
- Problem: README mentions "QR-Code Generation" but no endpoint to generate/retrieve QR codes for items
- Blocks: QR system is incomplete (can scan but can't generate)

**Persistent Token Storage:**
- Problem: Mobile app loses auth token on restart
- Blocks: Users must log in every time they open the app

**Email Sending:**
- Problem: README mentions "Nodemailer für Email-Versand" but it's not in package.json and not used in code
- Blocks: Can't send verification emails, password reset, notifications

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: Authentication logic, password hashing, JWT generation, input validation
- Files: All files lack tests
- Risk: JWT token generation could be broken silently. Password hashing could fail.
- Priority: High - auth is critical

**No Integration Tests:**
- What's not tested: Register → Login → Create Item → Scan Item workflows
- Files: All files
- Risk: Multi-step workflows fail in production but work in manual testing
- Priority: High - workflows are core features

**No API Tests:**
- What's not tested: Response formats, status codes, error messages, edge cases
- Files: All backend routes
- Risk: API contract breaks. Client receives unexpected data format.
- Priority: Medium - catch breaking changes early

**No Mobile App Tests:**
- What's not tested: Form validation, state management, API error handling, loading states
- Files: `mobile/App.tsx`
- Risk: UI logic breaks undetected. Poor error UX.
- Priority: Medium - UX regressions go unnoticed

**No End-to-End Tests:**
- What's not tested: Full user flows (register, login, add item, scan, view profile)
- Files: None
- Risk: Critical user flows break in production
- Priority: High - needed before public launch

---

*Concerns audit: 2026-04-07*
