import { FACEBOOK_CONFIG, FACEBOOK_ENDPOINTS, buildGraphAPIUrl, extractPostIdFromUrl, extractPageIdFromUrl } from './facebookConfig';

// Check if we're in Expo Go (Facebook SDK not available)
const isExpoGo = !global.nativeCallSyncHook;

class FacebookGraphService {
  constructor() {
    this.accessToken = null;
  }

  // Set access token for API calls
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Get access token from Facebook Login
  async getAccessToken() {
    try {
      console.log('🔐 Starting Facebook login...');
      
      if (isExpoGo) {
        console.log('📱 Running in Expo Go - Using mock Facebook login');
        // In Expo Go, simulate Facebook login with mock token
        return 'mock_facebook_access_token_for_expo_go';
      }
      
      // Import Facebook SDK only when not in Expo Go
      const { LoginManager, AccessToken } = require('react-native-fbsdk-next');
      
      // Check if user is already logged in
      const currentToken = await AccessToken.getCurrentAccessToken();
      if (currentToken && !currentToken.isExpired()) {
        console.log('✅ Using existing Facebook access token');
        return currentToken.accessToken;
      }
      
      // Login with required permissions
      const result = await LoginManager.logInWithPermissions([
        'business_management',
        'catalog_management', 
        'pages_show_list'
      ]);
      
      if (result.isCancelled) {
        throw new Error('Facebook login cancelled by user');
      }
      
      // Get the access token
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('Failed to get Facebook access token');
      }
      
      console.log('✅ Facebook login successful, access token obtained');
      return data.accessToken;
      
    } catch (error) {
      console.error('❌ Facebook access token error:', error);
      return null;
    }
  }

  // Fetch user information
  async getUserInfo() {
    try {
      const url = buildGraphAPIUrl(FACEBOOK_ENDPOINTS.USER_INFO, {
        fields: 'id,name,email,picture',
        access_token: this.accessToken
      });

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data;
    } catch (error) {
      console.error('❌ Facebook user info error:', error);
      throw error;
    }
  }

  // Fetch user's pages (including marketplace pages)
  async getUserPages() {
    try {
      const url = buildGraphAPIUrl(FACEBOOK_ENDPOINTS.USER_PAGES, {
        fields: 'id,name,category,access_token',
        access_token: this.accessToken
      });

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data || [];
    } catch (error) {
      console.error('❌ Facebook user pages error:', error);
      throw error;
    }
  }

  // Fetch marketplace listings from a specific page
  async getMarketplaceListings(pageId) {
    try {
      const url = buildGraphAPIUrl(`/${pageId}/marketplace_listings`, {
        fields: 'id,name,description,price,images,location,created_time',
        access_token: this.accessToken
      });

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data || [];
    } catch (error) {
      console.error('❌ Facebook marketplace listings error:', error);
      throw error;
    }
  }

  // Fetch specific post details
  async getPostDetails(postId) {
    try {
      const url = buildGraphAPIUrl(`/${postId}`, {
        fields: 'id,message,story,created_time,attachments{media,subattachments}',
        access_token: this.accessToken
      });

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data;
    } catch (error) {
      console.error('❌ Facebook post details error:', error);
      throw error;
    }
  }

  // Extract product data from Facebook URL
  async extractProductDataFromUrl(url) {
    try {
      console.log('🔍 Facebook Graph API - Extracting data from URL:', url);

      if (isExpoGo) {
        console.log('📱 Running in Expo Go - Using mock Facebook data');
        return await this.getMockProductData(url);
      }

      // Extract post ID from URL
      const postId = extractPostIdFromUrl(url);
      if (!postId) {
        throw new Error('Could not extract post ID from URL');
      }

      console.log('🔍 Facebook Graph API - Post ID:', postId);

      // Get post details
      const postData = await this.getPostDetails(postId);
      console.log('🔍 Facebook Graph API - Post data:', postData);

      // Extract product information
      const productData = this.parsePostData(postData);
      console.log('🔍 Facebook Graph API - Parsed product data:', productData);

      return productData;
    } catch (error) {
      console.error('❌ Facebook Graph API - Error extracting product data:', error);
      throw error;
    }
  }

  // Parse post data to extract product information
  parsePostData(postData) {
    try {
      const productData = {
        productName: '',
        price: '',
        description: '',
        imageUrl: '',
        images: [],
        sellerName: '',
        location: '',
        createdTime: postData.created_time || ''
      };

      // Extract product name from message or story
      if (postData.message) {
        productData.productName = this.extractProductName(postData.message);
        productData.description = postData.message;
      } else if (postData.story) {
        productData.productName = this.extractProductName(postData.story);
        productData.description = postData.story;
      }

      // Extract price from message
      if (postData.message) {
        productData.price = this.extractPrice(postData.message);
      }

      // Extract images from attachments
      if (postData.attachments && postData.attachments.data) {
        const images = this.extractImages(postData.attachments.data);
        productData.images = images;
        if (images.length > 0) {
          productData.imageUrl = images[0];
        }
      }

      return productData;
    } catch (error) {
      console.error('❌ Facebook Graph API - Error parsing post data:', error);
      return {
        productName: 'Product from Facebook',
        price: '',
        description: 'Product information from Facebook',
        imageUrl: '',
        images: [],
        sellerName: '',
        location: '',
        createdTime: ''
      };
    }
  }

  // Extract product name from text
  extractProductName(text) {
    // Look for common patterns in marketplace posts
    const patterns = [
      /^([^-\n]+)/, // First line before dash or newline
      /^([^$]+?)(?:\$|\d+)/, // Text before price
      /^([^,]+)/ // First part before comma
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 0) {
        return match[1].trim();
      }
    }

    return 'Product from Facebook';
  }

  // Extract price from text
  extractPrice(text) {
    const pricePatterns = [
      /\$(\d+(?:\.\d{2})?)/, // $25, $25.00
      /(\d+(?:\.\d{2})?)\s*dollars?/i, // 25 dollars
      /price[:\s]*\$?(\d+(?:\.\d{2})?)/i // Price: $25
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        return `$${match[1]}`;
      }
    }

    return '';
  }

  // Extract images from attachments
  extractImages(attachments) {
    const images = [];

    for (const attachment of attachments) {
      if (attachment.media && attachment.media.image) {
        images.push(attachment.media.image.src);
      }
      if (attachment.subattachments && attachment.subattachments.data) {
        for (const subattachment of attachment.subattachments.data) {
          if (subattachment.media && subattachment.media.image) {
            images.push(subattachment.media.image.src);
          }
        }
      }
    }

    return images;
  }

  // Mock product data for Expo Go testing
  async getMockProductData(url) {
    console.log('🎭 ===== MOCK PRODUCT DATA GENERATION START =====');
    console.log('🎭 Input URL:', url);
    console.log('🎭 Generating mock Facebook product data for Expo Go');
    
    // Extract post ID for consistent mock data
    const postId = extractPostIdFromUrl(url) || 'mock123';
    console.log('🎭 Extracted Post ID:', postId);
    
    // Try to extract real Facebook image URLs and product info from the URL
    console.log('🎭 Starting Facebook image extraction...');
    const facebookImageUrl = await this.extractFacebookImageFromUrl(url);
    console.log('🎭 Facebook image extraction result:', facebookImageUrl);
    
    // Check if we got product information from HTML extraction
    let extractedProductInfo = null;
    if (facebookImageUrl && typeof facebookImageUrl === 'object') {
      extractedProductInfo = facebookImageUrl;
      console.log('🎭 Using extracted product info from HTML:', extractedProductInfo);
    }
    
    // Generate consistent mock data based on post ID
    const mockProducts = {
      '1ALEXXi6gg': {
        productName: 'Mario & Luigi Halloween Mask',
        price: '$25',
        description: 'Mario & Luigi Halloween Mask - Perfect for Halloween costumes and cosplay! High quality materials, comfortable fit.',
        imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=face&auto=format&q=80',
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=face&auto=format&q=80'],
        sellerName: 'Facebook Seller',
        location: 'Local Area',
        createdTime: new Date().toISOString()
      },
      '16h8JTTEm9': {
        productName: 'Bravest Studio Slides Size 12',
        price: '$80',
        description: 'WORN a few times, retail $120',
        imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=face&auto=format&q=80',
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=face&auto=format&q=80'],
        sellerName: 'Facebook Seller',
        location: 'Local Area',
        createdTime: new Date().toISOString()
      },
      'mock123': {
        productName: 'Facebook Marketplace Item',
        price: '$50',
        description: 'This is a sample product from Facebook Marketplace. In a real app, this would be extracted using the Facebook Graph API.',
        imageUrl: (typeof facebookImageUrl === 'string' ? facebookImageUrl : null) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=face&auto=format&q=80',
        images: [(typeof facebookImageUrl === 'string' ? facebookImageUrl : null) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=face&auto=format&q=80'],
        sellerName: 'Facebook Seller',
        location: 'Local Area',
        createdTime: new Date().toISOString()
      }
    };
    
    // Return specific mock data or default
    const mockData = mockProducts[postId] || mockProducts['mock123'];
    
    // If we extracted real product info from HTML, use it instead of mock data
    if (extractedProductInfo) {
      console.log('🎭 Overriding mock data with extracted product info');
      
      // Ensure we have a proper imageUrl string, not an object
      let finalImageUrl = null;
      
      // First try to get imageUrl from extracted product info
      if (typeof extractedProductInfo.imageUrl === 'string' && extractedProductInfo.imageUrl) {
        finalImageUrl = extractedProductInfo.imageUrl;
        console.log('🎭 Using extracted imageUrl:', finalImageUrl);
      } else {
        // Fallback to mock data imageUrl, but ensure it's a string
        if (typeof mockData.imageUrl === 'string') {
          finalImageUrl = mockData.imageUrl;
          console.log('🎭 Using mock imageUrl:', finalImageUrl);
        } else {
          // Use a default image URL
          finalImageUrl = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=face&auto=format&q=80';
          console.log('🎭 Using default imageUrl:', finalImageUrl);
        }
      }
      
      const finalData = {
        ...mockData,
        productName: extractedProductInfo.productName || mockData.productName,
        price: extractedProductInfo.price || mockData.price,
        description: extractedProductInfo.description || mockData.description,
        sellerName: extractedProductInfo.sellerName || mockData.sellerName,
        imageUrl: finalImageUrl, // This is now guaranteed to be a string
        images: [finalImageUrl] // This is now guaranteed to be an array of strings
      };
      
      console.log('🎭 Final data with extracted info:', finalData);
      console.log('🎭 Final imageUrl type:', typeof finalData.imageUrl);
      console.log('🎭 Final imageUrl value:', finalData.imageUrl);
      return finalData;
    }
    
    console.log('🎭 ===== MOCK PRODUCT DATA GENERATION END =====');
    console.log('🎭 Selected mock product for postId:', postId);
    console.log('🎭 Final mock data:', JSON.stringify(mockData, null, 2));
    console.log('🎭 Image URL being returned:', mockData.imageUrl);
    console.log('🎭 Images array being returned:', mockData.images);
    
    return mockData;
  }

  // Extract Facebook image URL from the original URL
  async extractFacebookImageFromUrl(url) {
    try {
      console.log('🖼️ ===== FACEBOOK IMAGE EXTRACTION START =====');
      console.log('🖼️ Input URL:', url);
      console.log('🖼️ Attempting to extract Facebook image from URL');
      
      // Look for Facebook CDN image URLs in the URL parameters
      console.log('🖼️ Step 1: Checking URL for Facebook CDN image URLs');
      const imagePatterns = [
        /(https:\/\/scontent[^&\s]*\.fbcdn\.net[^&\s]*)/i,
        /(https:\/\/external[^&\s]*\.fbcdn\.net[^&\s]*)/i,
        /(https:\/\/[^&\s]*\.fbcdn\.net[^&\s]*)/i
      ];
      
      console.log('🖼️ Testing', imagePatterns.length, 'image patterns against URL');
      for (let i = 0; i < imagePatterns.length; i++) {
        const pattern = imagePatterns[i];
        console.log(`🖼️ Testing pattern ${i + 1}:`, pattern);
        const match = url.match(pattern);
        console.log(`🖼️ Pattern ${i + 1} match result:`, match);
        if (match) {
          console.log('🖼️ ✅ Found Facebook image URL in URL:', match[1]);
          console.log('🖼️ ===== FACEBOOK IMAGE EXTRACTION END (URL MATCH) =====');
          return match[1];
        }
      }
      console.log('🖼️ ❌ No Facebook image URLs found in URL parameters');
      
      // Try to fetch the actual Facebook page and extract image
      try {
        console.log('🖼️ Step 2: Attempting to fetch Facebook page for image extraction');
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        console.log('🖼️ Proxy URL:', proxyUrl);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        console.log('🖼️ Fetch response status:', response.status);
        console.log('🖼️ Fetch response ok:', response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🖼️ Response data keys:', Object.keys(data));
          const htmlContent = data.contents;
          console.log('🖼️ HTML content length:', htmlContent ? htmlContent.length : 'null');
          
          // Debug: Show a sample of the HTML content to understand the structure
          if (htmlContent) {
            console.log('🖼️ HTML content sample (first 1000 chars):', htmlContent.substring(0, 1000));
            
            // Check if Facebook requires login
            if (htmlContent.includes('You must log in to continue') || 
                htmlContent.includes('Log Into Facebook') ||
                htmlContent.includes('Log In') && htmlContent.includes('Forgot account')) {
              console.log('🖼️ ⚠️ Facebook requires login - prompting user to authenticate');
              console.log('🖼️ Post ID detected:', postId);
              throw new Error('FACEBOOK_LOGIN_REQUIRED'); // Throw specific error for login requirement
            }
            
            // Look for specific Facebook patterns in the HTML
            const facebookPatterns = [
              /"name":"[^"]+"/i,
              /"price":"[^"]+"/i,
              /"description":"[^"]+"/i,
              /"image":"[^"]+"/i,
              /"title":"[^"]+"/i,
              /"headline":"[^"]+"/i,
              /"content":"[^"]+"/i,
              /<meta[^>]*property="og:[^"]+"[^>]*content="[^"]+"/i
            ];
            
            console.log('🖼️ Looking for Facebook patterns in HTML...');
            facebookPatterns.forEach((pattern, index) => {
              const matches = htmlContent.match(pattern);
              if (matches) {
                console.log(`🖼️ Found Facebook pattern ${index + 1}:`, matches[0]);
              }
            });
            
            // Look for any text that might be a product name (not generic Facebook text)
            console.log('🖼️ Looking for potential product names in HTML...');
            const potentialNames = htmlContent.match(/"name":"([^"]{5,50})"/gi);
            if (potentialNames) {
              potentialNames.forEach((match, index) => {
                console.log(`🖼️ Potential name ${index + 1}:`, match);
              });
            }
            
            // Look for price patterns in HTML
            console.log('🖼️ Looking for potential prices in HTML...');
            const potentialPrices = htmlContent.match(/\$(\d+(?:\.\d{2})?)/gi);
            if (potentialPrices) {
              potentialPrices.forEach((match, index) => {
                console.log(`🖼️ Potential price ${index + 1}:`, match);
              });
            }
            
            // Look for any JSON data that might contain product info
            console.log('🖼️ Looking for JSON data patterns...');
            const jsonPatterns = [
              /"name":"[^"]+"/gi,
              /"title":"[^"]+"/gi,
              /"price":"[^"]+"/gi,
              /"description":"[^"]+"/gi
            ];
            
            jsonPatterns.forEach((pattern, index) => {
              const matches = htmlContent.match(pattern);
              if (matches) {
                console.log(`🖼️ JSON pattern ${index + 1} matches:`, matches.slice(0, 5)); // Show first 5 matches
              }
            });
          }
          
          // Extract image URLs from HTML content
          const htmlImagePatterns = [
            /<img[^>]+src="([^"]*scontent[^"]*\.fbcdn\.net[^"]*)"/i,
            /<img[^>]+src="([^"]*external[^"]*\.fbcdn\.net[^"]*)"/i,
            /"([^"]*scontent[^"]*\.fbcdn\.net[^"]*)"/i,
            /"([^"]*external[^"]*\.fbcdn\.net[^"]*)"/i
          ];
          
          console.log('🖼️ Testing', htmlImagePatterns.length, 'HTML image patterns');
          for (let i = 0; i < htmlImagePatterns.length; i++) {
            const pattern = htmlImagePatterns[i];
            console.log(`🖼️ Testing HTML pattern ${i + 1}:`, pattern);
            const match = htmlContent.match(pattern);
            console.log(`🖼️ HTML pattern ${i + 1} match result:`, match ? 'Found match' : 'No match');
            if (match && match[1]) {
              console.log('🖼️ ✅ Found Facebook image in HTML:', match[1]);
              console.log('🖼️ ===== FACEBOOK IMAGE EXTRACTION END (HTML MATCH) =====');
              return match[1];
            }
          }
          console.log('🖼️ ❌ No Facebook images found in HTML content');
          
          // Try to extract product information from HTML content
          console.log('🖼️ Attempting to extract product information from HTML...');
          const productInfo = this.extractProductInfoFromHTML(htmlContent, postId);
          if (productInfo) {
            console.log('🖼️ ✅ Found product information in HTML:', productInfo);
            return productInfo;
          }
        } else {
          console.log('🖼️ ❌ Fetch response not ok:', response.status);
        }
      } catch (fetchError) {
        console.log('🖼️ ❌ Could not fetch Facebook page:', fetchError.message);
        console.log('🖼️ Fetch error details:', fetchError);
      }
      
      // If no direct image URL found, try to construct one based on post ID
      console.log('🖼️ Step 3: Trying to extract post ID and fetch Facebook image');
      const postId = extractPostIdFromUrl(url);
      console.log('🖼️ Extracted post ID:', postId);
      
      if (postId) {
        // Try to get a real Facebook image using the post ID
        try {
          console.log('🖼️ Attempting to fetch Facebook image for post ID:', postId);
          const imageUrl = await this.fetchFacebookImageByPostId(postId);
          console.log('🖼️ Facebook image fetch result:', imageUrl);
          if (imageUrl) {
            console.log('🖼️ ✅ Found Facebook image for post:', imageUrl);
            console.log('🖼️ ===== FACEBOOK IMAGE EXTRACTION END (POST ID MATCH) =====');
            return imageUrl;
          }
        } catch (error) {
          console.log('🖼️ ❌ Could not fetch Facebook image for post:', error.message);
          console.log('🖼️ Post ID fetch error details:', error);
        }
        
        // Fallback to a working image URL - Use reliable Unsplash images instead of Facebook URLs
        console.log('🖼️ Step 4: Using reliable fallback image URLs (avoiding Facebook safe_image.php)');
        
        // Use specific image for Mario & Luigi mask, or random for others
        let imageUrl;
        if (postId === '1ALEXXi6gg') {
          imageUrl = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=face&auto=format&q=80';
          console.log('🖼️ Using specific Mario & Luigi mask image for post ID:', postId);
        } else {
          const fallbackImages = [
            'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=face&auto=format&q=80',
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop&crop=face&auto=format&q=80',
            'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=face&auto=format&q=80'
          ];
          
          const hash = this.generateHashFromString(postId);
          const imageIndex = parseInt(hash) % fallbackImages.length;
          imageUrl = fallbackImages[imageIndex];
          
          console.log('🖼️ Generated hash from post ID:', hash);
          console.log('🖼️ Selected image index:', imageIndex);
        }
        
        console.log('🖼️ ✅ Using reliable fallback image URL:', imageUrl);
        console.log('🖼️ ===== FACEBOOK IMAGE EXTRACTION END (FALLBACK) =====');
        return imageUrl;
      }
      
      console.log('🖼️ ❌ No post ID found in URL');
      console.log('🖼️ ===== FACEBOOK IMAGE EXTRACTION END (NO POST ID) =====');
      return null;
    } catch (error) {
      console.error('❌ Error extracting Facebook image URL:', error);
      return null;
    }
  }

  // Try to fetch Facebook image by post ID
  async fetchFacebookImageByPostId(postId) {
    try {
      console.log('🖼️ Fetching Facebook image for post ID:', postId);
      
      // Try different Facebook image URL patterns (but avoid safe_image.php as it returns invalid data)
      const imagePatterns = [
        `https://scontent.xx.fbcdn.net/v/t39.30808-1/${postId}_${postId}_n.jpg`,
        `https://scontent.xx.fbcdn.net/v/t39.30808-1/${postId}_n.jpg`
      ];
      
      for (const imageUrl of imagePatterns) {
        try {
          console.log('🖼️ Testing image URL:', imageUrl);
          const response = await fetch(imageUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('🖼️ Found working Facebook image URL:', imageUrl);
            return imageUrl;
          }
        } catch (error) {
          console.log('🖼️ Image URL not accessible:', imageUrl);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching Facebook image by post ID:', error);
      return null;
    }
  }

  // Extract product information from Facebook HTML content
  extractProductInfoFromHTML(htmlContent, postId) {
    try {
      console.log('🔍 Extracting product information from HTML for post ID:', postId);
      
      // Extract product name/title - Look for Facebook-specific patterns
      const titlePatterns = [
        // Facebook JSON-LD structured data (more specific patterns)
        /"name":"([^"]{5,80})"/i,
        /"title":"([^"]{5,80})"/i,
        /"headline":"([^"]{5,80})"/i,
        /"item_name":"([^"]{5,80})"/i,
        /"product_name":"([^"]{5,80})"/i,
        // Facebook meta tags
        /<meta[^>]*property="og:title"[^>]*content="([^"]{5,80})"/i,
        /<meta[^>]*name="title"[^>]*content="([^"]{5,80})"/i,
        // Facebook marketplace specific patterns
        /"marketplace_listing_title":"([^"]{5,80})"/i,
        /"listing_title":"([^"]{5,80})"/i,
        /"item_title":"([^"]{5,80})"/i,
        /"post_title":"([^"]{5,80})"/i,
        // Facebook content patterns
        /"content":"([^"]{5,80})"/i,
        /"text":"([^"]{5,80})"/i,
        /"message":"([^"]{5,80})"/i,
        // HTML headings (more specific)
        /<h1[^>]*>([^<]{5,80})<\/h1>/i,
        /<h2[^>]*>([^<]{5,80})<\/h2>/i,
        /<h3[^>]*>([^<]{5,80})<\/h3>/i,
        // Facebook specific div patterns
        /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{5,80})<\/div>/i,
        /<div[^>]*class="[^"]*name[^"]*"[^>]*>([^<]{5,80})<\/div>/i,
        /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{5,80})<\/span>/i
      ];
      
      let productName = null;
      for (const pattern of titlePatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1] && match[1].length > 3) {
          const candidate = match[1].trim();
          // Filter out generic Facebook content
          if (!candidate.includes('Facebook') && 
              !candidate.includes('Marketplace') && 
              !candidate.includes('Share') &&
              !candidate.includes('Post') &&
              !candidate.includes('Timeline') &&
              !candidate.includes('Profile') &&
              candidate.length > 5) {
            productName = candidate;
            console.log('🔍 Found product name:', productName);
            break;
          }
        }
      }
      
      // Extract price - Look for Facebook-specific price patterns
      const pricePatterns = [
        // Facebook JSON-LD structured data
        /"price":"([^"]+)"/i,
        /"amount":"([^"]+)"/i,
        /"priceValue":"([^"]+)"/i,
        /"price_amount":"([^"]+)"/i,
        /"cost":"([^"]+)"/i,
        // Facebook marketplace specific patterns
        /"marketplace_listing_price":"([^"]+)"/i,
        /"listing_price":"([^"]+)"/i,
        /"item_price":"([^"]+)"/i,
        /"post_price":"([^"]+)"/i,
        // Price in various formats (more specific)
        /\$(\d+(?:\.\d{2})?)/g,
        /(\d+(?:\.\d{2})?)\s*USD/i,
        /(\d+(?:\.\d{2})?)\s*dollars/i,
        // HTML price elements (more specific)
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/span>/i,
        /<div[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/div>/i,
        /<span[^>]*class="[^"]*amount[^"]*"[^>]*>([^<]+)<\/span>/i,
        /<div[^>]*class="[^"]*amount[^"]*"[^>]*>([^<]+)<\/div>/i
      ];
      
      let price = null;
      for (const pattern of pricePatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1]) {
          let foundPrice = match[1].trim();
          // Clean up price format
          if (foundPrice.includes('$')) {
            price = foundPrice;
          } else if (foundPrice.match(/\d+/)) {
            price = `$${foundPrice}`;
          }
          console.log('🔍 Found price:', price);
          break;
        }
      }
      
      // Extract description - Look for Facebook-specific description patterns
      const descriptionPatterns = [
        // Facebook JSON-LD structured data
        /"description":"([^"]{20,500})"/i,
        /"content":"([^"]{20,500})"/i,
        // Facebook meta tags
        /<meta[^>]*property="og:description"[^>]*content="([^"]{20,500})"/i,
        /<meta[^>]*name="description"[^>]*content="([^"]{20,500})"/i,
        // Facebook marketplace specific patterns
        /"marketplace_listing_description":"([^"]{20,500})"/i,
        /"listing_description":"([^"]{20,500})"/i,
        // HTML content
        /<p[^>]*>([^<]{20,500})<\/p>/i,
        /<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]{20,500})<\/div>/i
      ];
      
      let description = null;
      for (const pattern of descriptionPatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1] && match[1].length > 10 && !match[1].includes('Facebook') && !match[1].includes('Marketplace')) {
          description = match[1].trim();
          console.log('🔍 Found description:', description);
          break;
        }
      }
      
      // Extract seller name - Look for Facebook-specific seller patterns
      const sellerPatterns = [
        // Facebook JSON-LD structured data
        /"seller":"([^"]+)"/i,
        /"sellerName":"([^"]+)"/i,
        /"author":"([^"]+)"/i,
        /"creator":"([^"]+)"/i,
        // Facebook marketplace specific patterns
        /"marketplace_seller":"([^"]+)"/i,
        /"listing_seller":"([^"]+)"/i
      ];
      
      let sellerName = null;
      for (const pattern of sellerPatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1] && match[1].length > 2) {
          sellerName = match[1].trim();
          console.log('🔍 Found seller name:', sellerName);
          break;
        }
      }
      
      // Extract image URL - Look for Facebook-specific image patterns
      const imagePatterns = [
        // Facebook meta tags
        /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i,
        /<meta[^>]*property="og:image:url"[^>]*content="([^"]+)"/i,
        // Facebook JSON-LD structured data
        /"image":"([^"]+)"/i,
        /"thumbnailUrl":"([^"]+)"/i,
        // Facebook CDN images
        /<img[^>]*src="([^"]*scontent[^"]*\.fbcdn\.net[^"]*)"/i,
        /<img[^>]*src="([^"]*external[^"]*\.fbcdn\.net[^"]*)"/i,
        // Facebook marketplace specific patterns
        /"marketplace_listing_image":"([^"]+)"/i,
        /"listing_image":"([^"]+)"/i
      ];
      
      let imageUrl = null;
      for (const pattern of imagePatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1] && match[1].includes('http')) {
          imageUrl = match[1].trim();
          console.log('🔍 Found image URL:', imageUrl);
          break;
        }
      }
      
      // Return extracted information if we found anything useful
      if (productName || price || description || sellerName || imageUrl) {
        const extractedInfo = {
          productName: productName || 'Facebook Marketplace Item',
          price: price || '$50',
          description: description || 'Product from Facebook Marketplace. Please edit the details below.',
          sellerName: sellerName || 'Facebook Seller',
          imageUrl: imageUrl || null
        };
        
        console.log('🔍 Extracted product info:', extractedInfo);
        return extractedInfo;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error extracting product info from HTML:', error);
      return null;
    }
  }

  // Generate a hash from string for consistent image URLs
  generateHashFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }
}

export default new FacebookGraphService();
