# Couri Push Notification Server

A simple Express.js server to handle push notifications for the Couri mobile app.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will run on `http://localhost:3000`

## 📱 API Endpoints

### Store Push Token
```bash
POST /api/store-token
Content-Type: application/json

{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "userId": "user123"
}
```

### Send Notification to All Users
```bash
POST /api/send-notification
Content-Type: application/json

{
  "title": "Notification Title",
  "body": "Notification message",
  "data": {
    "screen": "Home",
    "type": "welcome"
  }
}
```

### Send Notification to Specific User
```bash
POST /api/send-notification-to-user
Content-Type: application/json

{
  "userId": "user123",
  "title": "Personal Notification",
  "body": "This is just for you!",
  "data": {
    "screen": "Profile",
    "type": "personal"
  }
}
```

### Get All Stored Tokens
```bash
GET /api/tokens
```

### Health Check
```bash
GET /api/health
```

## 🧪 Testing

### Test Notifications
```bash
node test-notification.js
```

### Manual Testing with curl
```bash
# Send notification to all users
curl -X POST http://localhost:3000/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Hello from curl!"}'

# Check stored tokens
curl http://localhost:3000/api/tokens
```

## 🌐 Production Deployment

### Option 1: Heroku
```bash
# Install Heroku CLI
heroku create couri-push-server
git add .
git commit -m "Add push notification server"
git push heroku main
```

### Option 2: Railway
```bash
# Install Railway CLI
railway login
railway init
railway up
```

### Option 3: DigitalOcean App Platform
- Connect your GitHub repository
- Set build command: `npm install`
- Set run command: `npm start`

## 🔧 Environment Variables

Create a `.env` file:
```env
PORT=3000
NODE_ENV=production
```

## 📊 Database

The server uses SQLite to store push tokens. The database file (`tokens.db`) will be created automatically.

### Database Schema
```sql
CREATE TABLE push_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 Security Notes

- Add authentication to your API endpoints in production
- Use HTTPS in production
- Consider rate limiting
- Validate all input data
- Use environment variables for sensitive data

## 📱 Mobile App Integration

The mobile app will automatically send tokens to the server when users enable push notifications. Make sure to update the server URL in your mobile app for production:

```javascript
// Development
const SERVER_URL = 'http://localhost:3000';

// Production
const SERVER_URL = 'https://your-server-domain.com';
```

## 🎯 Next Steps

1. **Add Authentication**: Implement user authentication
2. **Add Rate Limiting**: Prevent abuse
3. **Add Logging**: Track notification delivery
4. **Add Analytics**: Monitor notification performance
5. **Add Templates**: Create reusable notification templates
