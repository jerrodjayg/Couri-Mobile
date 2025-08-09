const fetch = require('node-fetch');

// Test sending a notification to all users
async function sendTestNotification() {
  try {
    const response = await fetch('http://localhost:3000/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Welcome to Couri! 🚀',
        body: 'Your push notifications are working perfectly!',
        data: {
          screen: 'Home',
          type: 'welcome'
        }
      }),
    });
    
    const result = await response.json();
    console.log('Notification result:', result);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Test sending a notification to a specific user
async function sendTestNotificationToUser(userId) {
  try {
    const response = await fetch('http://localhost:3000/api/send-notification-to-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        title: 'Personal Notification 📱',
        body: 'This is a personal notification just for you!',
        data: {
          screen: 'Profile',
          type: 'personal'
        }
      }),
    });
    
    const result = await response.json();
    console.log('Personal notification result:', result);
  } catch (error) {
    console.error('Error sending personal notification:', error);
  }
}

// Check stored tokens
async function checkTokens() {
  try {
    const response = await fetch('http://localhost:3000/api/tokens');
    const result = await response.json();
    console.log('Stored tokens:', result);
  } catch (error) {
    console.error('Error checking tokens:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🔍 Checking stored tokens...');
  await checkTokens();
  
  console.log('\n📱 Sending test notification to all users...');
  await sendTestNotification();
  
  console.log('\n👤 Sending test notification to specific user...');
  await sendTestNotificationToUser('user123');
}

// Run if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  sendTestNotification,
  sendTestNotificationToUser,
  checkTokens
};
