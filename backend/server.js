const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database(process.env.DB_PATH || './database.sqlite');

// Initialize database
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    verified BOOLEAN DEFAULT 0,
    plietsch_points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Items table
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    size TEXT,
    color TEXT,
    condition TEXT,
    status TEXT DEFAULT 'pending',
    points_value INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  console.log('✅ Database initialized');
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Plietsche Plünn Backend läuft!',
    port: PORT,
    timestamp: new Date().toISOString() 
  });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, email, password_hash, verified) VALUES (?, ?, ?, 1)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'Benutzer bereits vorhanden' });
        }
        
        const token = jwt.sign(
          { id: this.lastID, username, email },
          process.env.JWT_SECRET
        );
        
        res.status(201).json({
          message: 'Benutzer erfolgreich erstellt',
          token,
          user: { id: this.lastID, username, email, plietsch_points: 0 }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server Fehler' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [login, login],
      async (err, user) => {
        if (err || !user) {
          return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
          return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
        }
        
        const token = jwt.sign(
          { id: user.id, username: user.username, email: user.email },
          process.env.JWT_SECRET
        );
        
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            plietsch_points: user.plietsch_points
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server Fehler' });
  }
});

// Get user profile
app.get('/api/users/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, plietsch_points FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' });
      }
      res.json(user);
    }
  );
});

// Get items
app.get('/api/items', (req, res) => {
  db.all(
    `SELECT i.*, u.username as owner 
     FROM items i 
     LEFT JOIN users u ON i.user_id = u.id 
     WHERE i.status = 'active' 
     ORDER BY i.created_at DESC 
     LIMIT 20`,
    (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Laden der Items' });
      }
      res.json(items);
    }
  );
});

// Add item
app.post('/api/items', authenticateToken, (req, res) => {
  const { title, description, category, size, color, condition } = req.body;
  
  if (!title || !category || !condition) {
    return res.status(400).json({ error: 'Titel, Kategorie und Zustand sind erforderlich' });
  }
  
  db.run(
    'INSERT INTO items (user_id, title, description, category, size, color, condition, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, title, description, category, size, color, condition, 'active'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Erstellen des Items' });
      }
      
      // Add points to user
      db.run(
        'UPDATE users SET plietsch_points = plietsch_points + 1 WHERE id = ?',
        [req.user.id]
      );
      
      res.status(201).json({
        id: this.lastID,
        message: 'Item erfolgreich hinzugefügt! +1 PlietschPunkt!'
      });
    }
  );
});

// Scan QR (simulate taking an item)
app.post('/api/qr/scan', authenticateToken, (req, res) => {
  const { item_id } = req.body;
  
  if (!item_id) {
    return res.status(400).json({ error: 'Item ID erforderlich' });
  }
  
  db.get('SELECT * FROM items WHERE id = ? AND status = "active"', [item_id], (err, item) => {
    if (err || !item) {
      return res.status(404).json({ error: 'Item nicht gefunden oder bereits mitgenommen' });
    }
    
    if (item.user_id === req.user.id) {
      return res.status(400).json({ error: 'Du kannst deine eigenen Items nicht mitnehmen' });
    }
    
    db.run(
      'UPDATE items SET status = "taken" WHERE id = ?',
      [item_id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Fehler beim Mitnehmen' });
        }
        
        res.json({
          message: `Du hast "${item.title}" erfolgreich mitgenommen!`,
          item: { id: item.id, title: item.title }
        });
      }
    );
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Plietsche Plünn Backend läuft auf Port ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;