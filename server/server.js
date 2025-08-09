const express = require('express');
const cors = require('cors');
const { Expo } = require('expo-server-sdk');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Expo SDK
const expo = new Expo();

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'tokens.db'));

// Create tokens table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS push_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Store push token
app.post('/api/store-token', async (req, res) => {
  try {
    const { token, userId } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Validate token format
    if (!Expo.isExpoPushToken(token)) {
      return res.status(400).json({ error: 'Invalid Expo push token' });
    }

    // Store token in database
    db.run(
      'INSERT OR REPLACE INTO push_tokens (token, user_id) VALUES (?, ?)',
      [token, userId || null],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to store token' });
        }
        
        console.log(`Token stored successfully: ${token}`);
        res.json({ success: true, message: 'Token stored successfully' });
      }
    );
  } catch (error) {
    console.error('Error storing token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send notification to all users
app.post('/api/send-notification', async (req, res) => {
  try {
    const { title, body, data } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    // Get all tokens from database
    db.all('SELECT token FROM push_tokens', [], async (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to retrieve tokens' });
      }

      const tokens = rows.map(row => row.token);
      
      if (tokens.length === 0) {
        return res.json({ success: true, message: 'No tokens to send to' });
      }

      // Create messages
      const messages = tokens.map(token => ({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: data || {},
      }));

      // Send notifications
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (let chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending chunk:', error);
        }
      }

      console.log(`Sent ${tickets.length} notifications`);
      res.json({ 
        success: true, 
        message: `Sent ${tickets.length} notifications`,
        tickets: tickets 
      });
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send notification to specific user
app.post('/api/send-notification-to-user', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'User ID, title and body are required' });
    }

    // Get user's token from database
    db.get('SELECT token FROM push_tokens WHERE user_id = ?', [userId], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to retrieve token' });
      }

      if (!row) {
        return res.status(404).json({ error: 'User token not found' });
      }

      const message = {
        to: row.token,
        sound: 'default',
        title: title,
        body: body,
        data: data || {},
      };

      try {
        const ticket = await expo.sendPushNotificationsAsync([message]);
        console.log(`Sent notification to user ${userId}`);
        res.json({ success: true, message: 'Notification sent', ticket: ticket[0] });
      } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
      }
    });
  } catch (error) {
    console.error('Error sending notification to user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all tokens (for debugging)
app.get('/api/tokens', (req, res) => {
  db.all('SELECT * FROM push_tokens', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to retrieve tokens' });
    }
    res.json({ tokens: rows });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Push notification server is running' });
});

app.listen(PORT, () => {
  console.log(`Push notification server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
