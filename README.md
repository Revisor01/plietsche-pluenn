# Plietsche Plünn - Clothing Exchange App

Eine App für den nachhaltigen Kleidertausch mit Gamification-Elementen.

## Technologie-Stack

### Backend
- Node.js + Express
- SQLite3 Datenbank  
- JWT Authentication mit Email-Verifizierung
- Multer + Sharp für Bildverarbeitung
- QR-Code Generation und Scanning
- Nodemailer für Email-Versand
- Node-cron für Scheduling

### Frontend
- React mit TypeScript
- React Router für Navigation
- TanStack Query für State Management
- React Hook Form für Formulare
- Styled Components für Styling
- HTML5 QR-Code für Scanner

## Features

### Kernfunktionen
- **User Registration & Authentication**: JWT-basierte Authentifizierung mit Email-Verifizierung
- **Item Management**: Items hinzufügen, bearbeiten, Admin-Genehmigung
- **QR-Code System**: Generierung und Scanning für Item-Mitnahme
- **Gamification**: Punktesystem, Badges, Leaderboards
- **Shop System**: Punkte gegen Goodies tauschen
- **Admin Panel**: Vollständige Verwaltung aller Systemkomponenten

### Gamification
- **PlietschPunkte**: Punkte für das Bringen von Items
- **Badge System**: Verschiedene Kategorien (Mengen, Aktivität, Saison, Community)
- **Saisonale Aktionen**: Bonus-Multiplikatoren für bestimmte Zeiträume
- **Leaderboards**: Monatliche anonymisierte Ranglisten

### Admin Features
- Item-Genehmigung mit Punktevergabe
- User-Management und Punkte-Anpassung
- Shop-Verwaltung
- Badge-Management
- Saisonale Aktionen
- Email-Kampagnen
- System-Einstellungen

## Installation

### Backend

```bash
cd backend
cp .env.example .env
# .env Datei konfigurieren
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Environment Variables

Kopiere `.env.example` zu `.env` und konfiguriere:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Database
DB_PATH=./database.sqlite

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@plietsche-pluenn.de

# App Configuration
APP_NAME=Plietsche Plünn
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# QR Code Settings
QR_BASE_URL=https://your-domain.com/item/
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User Registration
- `POST /api/auth/login` - User Login
- `POST /api/auth/verify-email` - Email Verification
- `POST /api/auth/forgot-password` - Password Reset Request
- `POST /api/auth/reset-password` - Password Reset
- `GET /api/auth/me` - Get Current User

### Items
- `GET /api/items` - List Items (mit Filtering)
- `GET /api/items/:id` - Get Item Details
- `POST /api/items` - Create Item
- `PUT /api/items/:id` - Update Item
- `DELETE /api/items/:id` - Delete Item
- `GET /api/items/categories` - List Categories

### QR Code
- `POST /api/qr/scan` - Scan QR Code (Authenticated)
- `POST /api/qr/easy-scan` - Easy Scan (Anonymous)
- `GET /api/qr/take-limit` - Check Take Limit

### User Management
- `GET /api/users/profile` - User Profile
- `PUT /api/users/profile` - Update Profile
- `GET /api/users/badges` - User Badges
- `GET /api/users/transactions` - Transaction History
- `GET /api/users/items` - User Items
- `GET /api/users/taken-items` - Taken Items
- `GET /api/users/leaderboard` - Leaderboard

### Shop
- `GET /api/shop/items` - Shop Items
- `POST /api/shop/purchase` - Purchase Item
- `GET /api/shop/purchases` - Purchase History

### Admin
- `GET /api/admin/dashboard` - Admin Dashboard
- `GET /api/admin/items/pending` - Pending Items
- `POST /api/admin/items/:id/approve` - Approve Item
- `POST /api/admin/items/:id/reject` - Reject Item
- `GET /api/admin/users` - User Management
- `POST /api/admin/users/:id/adjust-points` - Adjust User Points

### Badges
- `GET /api/badges` - List Badges
- `POST /api/badges/check-progress` - Check Badge Progress
- `GET /api/badges/leaderboard` - Badge Leaderboard

### Notifications
- `GET /api/notifications` - List Notifications
- `PUT /api/notifications/:id/read` - Mark as Read
- `PUT /api/notifications/mark-all-read` - Mark All as Read
- `DELETE /api/notifications/:id` - Delete Notification

### Seasonal Actions
- `GET /api/seasonal/active` - Active Seasonal Actions
- `GET /api/seasonal/upcoming` - Upcoming Actions

## Datenbank Schema

### Haupttabellen
- `users` - Benutzer
- `items` - Kleidungsstücke
- `categories` - Kategorien
- `transactions` - Punkte-Transaktionen
- `badge_definitions` - Badge-Definitionen
- `user_badges` - User Badge Progress
- `seasonal_actions` - Saisonale Aktionen
- `shop_items` - Shop Artikel
- `shop_purchases` - Shop Käufe
- `notifications` - Benachrichtigungen
- `settings` - System-Einstellungen

## Cron Jobs

- **Täglich (00:00)**: Badge-Updates, Notification-Cleanup
- **Alle 6 Stunden**: Seasonal Action Status Updates
- **Wöchentlich (Montag 09:00)**: Wöchentliche Zusammenfassung
- **Monatlich (1. Tag 12:00)**: Monats-Leaderboard

## Development

### Backend Development
```bash
npm run dev  # Startet Server mit Nodemon
npm test     # Läuft Tests
```

### Frontend Development
```bash
npm start    # Startet Development Server
npm test     # Läuft Tests
npm run build # Production Build
```

## Deployment

1. Environment Variables setzen
2. Database migrieren
3. Frontend builden
4. Backend starten
5. Cron Jobs aktivieren

## Lizenz

MIT License