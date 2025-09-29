// Configuration file for web pages
// Replace these with your actual Supabase credentials

const CONFIG = {
  // Supabase configuration
  SUPABASE_URL: 'YOUR_SUPABASE_URL', // Replace with your Supabase project URL
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY', // Replace with your Supabase anon key
  
  // App Store links
  APP_STORE_URL: 'https://apps.apple.com/app/couri/id1234567890', // Replace with your actual App Store URL
  GOOGLE_PLAY_URL: 'https://play.google.com/store/apps/details?id=com.couri.app', // Replace with your actual Google Play URL
  
  // Domain configuration
  DOMAIN: 'gocouri.com',
  BASE_URL: 'https://gocouri.com',
  
  // Deep link configuration
  DEEP_LINK_SCHEME: 'couri://',
  
  // Transaction settings
  TRANSACTION_EXPIRY_DAYS: 7,
  
  // UI settings
  THEME: {
    PRIMARY_COLOR: '#007AFF',
    SUCCESS_COLOR: '#28a745',
    ERROR_COLOR: '#dc3545',
    BACKGROUND_COLOR: '#f8f9fa',
    TEXT_COLOR: '#333333'
  }
};

// Export for use in HTML files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
