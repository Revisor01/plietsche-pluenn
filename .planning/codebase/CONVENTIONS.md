# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- Backend: `server.js` (single entry point, camelCase)
- Mobile: `App.tsx` (PascalCase for main component), `index.ts` (standard entry point), `tsconfig.json`
- Descriptive naming: Database-related modules, utilities follow camelCase

**Functions:**
- camelCase for all function names: `authenticateToken`, `handleLogin`, `loadItems`, `simulateQRScan`
- Handlers prefixed with `handle`: `handleLogin`, `handleRegister`, `handleLogout`
- Loaders prefixed with `load`: `loadItems`
- Async functions explicitly use `async`/`await` pattern

**Variables:**
- camelCase for local variables and state: `authToken`, `loginForm`, `registerForm`, `plietsch_points`
- State setter pairs use camelCase: `user`/`setUser`, `items`/`setItems`
- Boolean flags use `is` or `has` prefix: `isRegistering`
- Private database fields use snake_case in schema: `password_hash`, `plietsch_points`, `user_id`, `created_at`, `verified`

**Types:**
- PascalCase for interfaces: `User`, `Item`
- Database schema columns use snake_case
- Response objects use camelCase

## Code Style

**Formatting:**
- No formal linting/prettier configuration detected
- Implicit spacing: 2-space indentation used in all files
- Line breaks between logical sections (marked by comments)
- Trailing whitespace inconsistencies present

**Linting:**
- No ESLint or formatting tool configured
- No pre-commit hooks observed
- TypeScript strict mode enabled in mobile (`tsconfig.json`)

## Import Organization

**Order:**
1. External libraries (React, React Native, third-party packages)
2. Local imports (components, services, types)
3. Local relative imports

**Example from `App.tsx`:**
```typescript
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
```

**Path Aliases:**
- No path aliases configured
- Relative imports used throughout

## Error Handling

**Patterns:**
- Backend: try/catch blocks with generic error responses
- Mobile: try/catch with user-facing `Alert.alert()` fallbacks
- Generic error messages: "Server Fehler", "Fehler beim..." (German localization)
- Error details passed in response JSON: `error.response?.data?.error`
- Database errors caught and translated to HTTP status codes
- No custom error classes or error hierarchy
- Silent logging in some paths (e.g., `console.error` in `loadItems`)

**Backend Example:**
```javascript
try {
  // operation
} catch (error) {
  res.status(500).json({ error: 'Server Fehler' });
}
```

**Mobile Example:**
```typescript
try {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, loginForm);
  setUser(response.data.user);
} catch (error: any) {
  Alert.alert('Fehler', error.response?.data?.error || 'Login fehlgeschlagen');
}
```

## Logging

**Framework:** Native `console` object

**Patterns:**
- Startup logs with emoji: `console.log('✅ Database initialized')`
- `console.log` for info messages with emoji decorators
- `console.error` for error logging: `console.error('Fehler beim Laden der Items:', error)`
- No structured logging framework
- No timestamp or log level abstraction
- Logs go to stdout (development) or backend.log file

## Comments

**When to Comment:**
- Section headers for logical groupings: `// Auth middleware`, `// Routes`, `// Health check`
- Minimal inline comments observed
- Comment before non-obvious operations
- No JSDoc comments used in current codebase

**JSDoc/TSDoc:**
- Not used
- No type documentation beyond inline TypeScript types

## Function Design

**Size:** Functions are concise, typically 5-30 lines
- Route handlers: 10-25 lines
- Event handlers: 5-15 lines
- Async operations combined with state management

**Parameters:**
- Minimal parameters (max 3-4)
- Request/response objects used for HTTP handlers
- Destructuring used: `const { username, email, password } = req.body`
- Type annotations for TypeScript: `error: any`, `item: Item`

**Return Values:**
- HTTP routes: return JSON responses via `res.json()` or `res.status().json()`
- Async functions: return Promise<T> implicitly
- No explicit return in event handlers (void)

## Module Design

**Exports:**
- Backend: Single export `module.exports = app` at end
- Mobile: Default export of component `export default function App()`
- No named exports observed
- No barrel files (re-exports)

**Barrel Files:**
- Not used

## Language & Localization

**Primary Language:** German used in user-facing strings and comments
- Error messages: German
- Route comments: German
- Variable names: Mixed (English for code structure, German for UI text)
- Database values: German (`"sehr_gut"` for condition)

---

*Convention analysis: 2026-04-07*
