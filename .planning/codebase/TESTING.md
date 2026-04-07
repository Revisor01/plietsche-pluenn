# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

**Runner:**
- Not configured
- No test framework installed (Jest, Vitest, etc. absent from dependencies)

**Assertion Library:**
- Not applicable

**Run Commands:**
- No test scripts defined in either `package.json`
- Backend: `npm start` (node server.js), `npm run dev` (nodemon server.js)
- Mobile: `npm start` (expo start), `npm run android`, `npm run ios`, `npm run web`

## Test File Organization

**Location:**
- No test files exist in codebase
- No `__tests__` or `tests` directories
- No `.test.ts`, `.spec.ts`, `.test.js`, or `.spec.js` files found

**Naming:**
- Not applicable

**Structure:**
- Not applicable

## Test Structure

**Suite Organization:**
- Not applicable - no tests implemented

**Patterns:**
- Not applicable

## Mocking

**Framework:**
- Not used

**Patterns:**
- Manual simulation in application code (e.g., `simulateQRScan()` in `App.tsx`)
- Test data hardcoded: test item creation with fixed values
- Backend uses SQLite in-memory capable but not configured for testing

**What to Mock:**
- API calls (axios should be mocked in future tests)
- Database operations (SQLite)
- JWT token generation
- Bcrypt password hashing
- Request/response objects in Express

**What NOT to Mock:**
- Core business logic (user registration, item management)
- Authentication middleware behavior
- Database schema and constraints

## Fixtures and Factories

**Test Data:**
- Hardcoded in application code:

Backend `server.js` - No fixtures, uses live database:
```javascript
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT 0,
  plietsch_points INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
```

Mobile `App.tsx` - Test item hardcoded:
```typescript
const testItem = {
  title: 'Test T-Shirt',
  description: 'Ein schönes blaues T-Shirt',
  category: 'T-Shirt',
  size: 'M',
  color: 'Blau',
  condition: 'sehr_gut'
};
```

**Location:**
- Test data embedded in application logic
- No separate fixtures directory
- No factory functions for generating test data

## Coverage

**Requirements:**
- None enforced
- No coverage reporting configured

**View Coverage:**
- Not applicable

## Test Types

**Unit Tests:**
- Not implemented
- Should test: authentication middleware, validation functions, business logic helpers

**Integration Tests:**
- Not implemented
- Should test: API endpoints with database interactions, user workflows

**E2E Tests:**
- Not used
- Could use Expo testing or Detox for mobile
- Could use Supertest for backend API testing

## Current Testing Strategy

**Manual Testing Approach:**
- Backend: Use health check endpoint and hardcoded test requests
- Mobile: UI-based testing with simulated QR scans and test item creation
- Database: SQLite file persists across runs for manual testing

**Backend Testing Endpoints:**
- `GET /api/health` - Health check with timestamp
- Manual curl/Postman requests for API testing
- Test database: `database.sqlite` file in root

**Mobile Testing:**
- Buttons: "➕ Test-Item hinzufügen", "🔄 Items aktualisieren", "📱 QR Scannen (Simuliert)"
- Manual verification in Expo Go
- No automated test suite

## Recommended Testing Setup

**For Backend:**
- Install: `jest`, `supertest`, `sqlite3` (already present)
- Test location: `backend/__tests__/` or `backend/*.test.js`
- Database: Use in-memory SQLite for tests or separate test database
- Coverage target: Minimum 70%

**For Mobile:**
- Install: `jest`, `@testing-library/react-native`
- Test location: `mobile/__tests__/` 
- Mock axios and SQLite-based backend
- Unit tests for: components, hooks, form handlers

**Example Backend Test Structure:**
```javascript
// backend/__tests__/auth.test.js
describe('Authentication', () => {
  test('POST /api/auth/register creates user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
  });
});
```

---

*Testing analysis: 2026-04-07*
