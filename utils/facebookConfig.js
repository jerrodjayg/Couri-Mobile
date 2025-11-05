// Facebook App Configuration
export const FACEBOOK_CONFIG = {
  APP_ID: '1038986044948413',
  APP_NAME: 'Couri',
  PERMISSIONS: [
    'business_management',
    'catalog_management', 
    'pages_show_list'
  ],
  GRAPH_API_VERSION: 'v18.0'
};

// Facebook Graph API endpoints
export const FACEBOOK_ENDPOINTS = {
  BASE_URL: 'https://graph.facebook.com',
  USER_INFO: '/me',
  USER_PAGES: '/me/accounts',
  PAGE_POSTS: '/{page-id}/posts',
  POST_DETAILS: '/{post-id}',
  MARKETPLACE_LISTINGS: '/me/marketplace_listings'
};

// Helper function to build Graph API URL
export const buildGraphAPIUrl = (endpoint, params = {}) => {
  const baseUrl = `${FACEBOOK_ENDPOINTS.BASE_URL}/${FACEBOOK_CONFIG.GRAPH_API_VERSION}${endpoint}`;
  const queryParams = new URLSearchParams(params);
  return queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;
};

// Helper function to extract post ID from Facebook URL
export const extractPostIdFromUrl = (url) => {
  // Extract post ID from various Facebook URL formats
  const patterns = [
    /\/item\/(\d+)/,
    /\/marketplace\/item\/(\d+)/,
    /\/share\/([^\/\?]+)/,
    /\/posts\/(\d+)/,
    /\/permalink\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
};

// Helper function to extract page ID from Facebook URL
export const extractPageIdFromUrl = (url) => {
  // Extract page ID from Facebook page URLs
  const patterns = [
    /facebook\.com\/([^\/\?]+)/,
    /facebook\.com\/pages\/[^\/]+\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
};
