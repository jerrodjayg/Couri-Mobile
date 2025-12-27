import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../screens/supabaseClient';

export default function ProductDetails({ navigation, route }) {
  // Get the transaction type from route params
  const { transactionType } = route.params || {};
  const isSelling = transactionType === 'sell';
  
  // DECLARE ALL STATE FIRST - this is crucial!
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState({
    productName: '',
    price: '$', // Keep $ prefix but remove initial price
    description: '',
    imageUrl: '',
    images: [], // Add images array to prevent conflicts
    sellerName: '' // Add seller name
  });
  const [isScraping, setIsScraping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [permanentImageData, setPermanentImageData] = useState(null);
  
  const { productUrl, userAddress, userProfile } = route.params || {};
  
  // Sanitize extractedData to ensure it always has valid image URLs
  const sanitizeExtractedData = (data) => {
    console.log('🖼️ 🧹 SANITIZE FUNCTION CALLED');
    console.log('🖼️ 🧹 Input data:', data);
    console.log('🖼️ 🧹 Permanent image data:', permanentImageData);
    
    if (!data) {
      console.log('🖼️ 🧹 No data provided, returning null');
      return data;
    }
    
    const sanitized = { ...data };
    console.log('🖼️ 🧹 Sanitized copy created:', sanitized);
    
    // If we have permanent image data, use it to restore corrupted data
    if (permanentImageData) {
      console.log('🖼️ 🧹 Using permanent image data to sanitize');
      sanitized.imageUrl = permanentImageData.imageUrl;
      sanitized.images = [permanentImageData.imageUrl];
      sanitized.productName = permanentImageData.productName || sanitized.productName;
      sanitized.description = permanentImageData.description || sanitized.description;
      sanitized.price = permanentImageData.price || sanitized.price;
      console.log('🖼️ 🧹 Sanitized with permanent data:', sanitized);
      return sanitized;
    }
    
    // Ensure imageUrl is always the real Facebook image URL
    if (sanitized.imageUrl && sanitized.imageUrl.includes('placeholder.com')) {
      console.log('🖼️ 🧹 Sanitizing corrupted imageUrl');
      sanitized.imageUrl = '';
    }
    
    // Ensure images array only contains real image URLs
    if (sanitized.images && Array.isArray(sanitized.images)) {
      console.log('🖼️ 🧹 Filtering images array:', sanitized.images);
      const realImages = sanitized.images.filter(img => 
        img && 
        !img.includes('placeholder.com') && 
        !img.includes('Manual+Input+Required') &&
        !img.includes('No+Image') &&
        !img.includes('URL+Extracted') &&
        !img.includes('Post+ID+Found')
      );
      console.log('🖼️ 🧹 Real images after filtering:', realImages);
      
      if (realImages.length === 0 && sanitized.imageUrl && !sanitized.imageUrl.includes('placeholder.com')) {
        sanitized.images = [sanitized.imageUrl];
        console.log('🖼️ 🧹 Sanitized images array to contain real image URL:', sanitized.images);
      } else {
        sanitized.images = realImages;
        console.log('🖼️ 🧹 Sanitized images array, removed placeholders:', sanitized.images);
      }
    } else if (sanitized.imageUrl && !sanitized.imageUrl.includes('placeholder.com')) {
      // If images array doesn't exist or is empty, create it with the real image URL
      sanitized.images = [sanitized.imageUrl];
      console.log('🖼️ 🧹 Created images array with real image URL:', sanitized.images);
    }
    
    console.log('🖼️ 🧹 Final sanitized data:', sanitized);
    return sanitized;
  };
  
  // Debug extracted data changes
  useEffect(() => {
    console.log('📊 Extracted Data Updated:', {
      productName: extractedData.productName,
      price: extractedData.price,
      description: extractedData.description,
      imageUrl: extractedData.imageUrl,
      sellerName: extractedData.sellerName
    });
    
    // Check if data is empty and log warning
    if (!extractedData.productName && !extractedData.price && !extractedData.description) {
      console.log('⚠️ WARNING: All extracted data is empty!');
    }
  }, [extractedData]);

  // Removed interfering useEffect hook

  // Removed interfering useEffect hook

  // NUCLEAR OPTION: Force protection on every single render
  useEffect(() => {
    // This runs on EVERY render to ensure the image never disappears
    if (extractedData.imageUrl && extractedData.imageUrl.includes('fbcdn.net')) {
      // If the images array is corrupted or empty, fix it immediately
      const needsFix = !extractedData.images || 
                      extractedData.images.length === 0 || 
                      extractedData.images.some(img => 
                        img.includes('placeholder.com') || 
                        img.includes('Manual+Input+Required') ||
                        img.includes('No+Image') ||
                        img.includes('URL+Extracted') ||
                        img.includes('Post+ID+Found')
                      );
      
      if (needsFix) {
        console.log('🖼️ NUCLEAR: Forcing images array to contain real Facebook image URL on every render');
        // Use setTimeout to prevent infinite loops
        setTimeout(() => {
          setExtractedData(prev => ({
            ...prev,
            images: [extractedData.imageUrl]
          }));
        }, 0);
      }
    }
  });
  
  // Store permanent image data when it's first extracted
  useEffect(() => {
    if (extractedData.imageUrl && 
        !extractedData.imageUrl.includes('placeholder.com') && 
        !permanentImageData) {
      console.log('🖼️ Storing permanent image data:', extractedData.imageUrl);
      setPermanentImageData({
        imageUrl: extractedData.imageUrl,
        productName: extractedData.productName,
        description: extractedData.description,
        price: extractedData.price
      });
    }
  }, [extractedData.imageUrl, extractedData.productName, extractedData.description, extractedData.price, permanentImageData]);

  // More aggressive permanent image data storage - check on every render
  useEffect(() => {
    // If we have a real Facebook image URL and no permanent data, store it immediately
    if (extractedData.imageUrl && 
        extractedData.imageUrl.includes('fbcdn.net') && 
        !permanentImageData) {
      console.log('🖼️ Aggressively storing permanent image data:', extractedData.imageUrl);
      setPermanentImageData({
        imageUrl: extractedData.imageUrl,
        productName: extractedData.productName,
        description: extractedData.description,
        price: extractedData.price
      });
    }
  });
  
  // Restore image data if it gets corrupted
  useEffect(() => {
    if (permanentImageData && 
        (extractedData.imageUrl.includes('placeholder.com') || 
         (extractedData.images && extractedData.images.some(img => img.includes('placeholder.com'))))) {
      console.log('🖼️ Restoring permanent image data due to corruption');
      setExtractedData(prev => ({
        ...prev,
        imageUrl: permanentImageData.imageUrl,
        images: [permanentImageData.imageUrl],
        productName: permanentImageData.productName || prev.productName,
        description: permanentImageData.description || prev.description,
        price: permanentImageData.price || prev.price
      }));
    }
  }, [extractedData.imageUrl, extractedData.images, permanentImageData]);

  // More aggressive corruption detection - check on every render
  useEffect(() => {
    // If we have permanent data and current data is corrupted, fix it immediately
    if (permanentImageData && 
        (extractedData.imageUrl.includes('placeholder.com') || 
         (extractedData.images && extractedData.images.some(img => 
           img.includes('placeholder.com') || 
           img.includes('Manual+Input+Required') ||
           img.includes('No+Image') ||
           img.includes('URL+Extracted') ||
           img.includes('Post+ID+Found')
         )))) {
      console.log('🖼️ Aggressively fixing corrupted data with permanent image data');
      setExtractedData(prev => ({
        ...prev,
        imageUrl: permanentImageData.imageUrl,
        images: [permanentImageData.imageUrl],
        productName: permanentImageData.productName || prev.productName,
        description: permanentImageData.description || prev.description,
        price: permanentImageData.price || prev.price
      }));
    }
  });

  // ULTRA-AGGRESSIVE: Force images array to always contain real Facebook image URL
  useEffect(() => {
    // If we have a real Facebook image URL, NEVER allow the images array to be corrupted
    if (extractedData.imageUrl && extractedData.imageUrl.includes('fbcdn.net')) {
      // Force the images array to always contain the real image URL
      if (!extractedData.images || extractedData.images.length === 0 || 
          extractedData.images.some(img => 
            img.includes('placeholder.com') || 
            img.includes('Manual+Input+Required') ||
            img.includes('No+Image') ||
            img.includes('URL+Extracted') ||
            img.includes('Post+ID+Found')
          )) {
        console.log('🖼️ ULTRA-AGGRESSIVE: Forcing images array to contain real Facebook image URL');
        setExtractedData(prev => ({
          ...prev,
          images: [extractedData.imageUrl]
        }));
      }
    }
  });

  // Removed interfering useEffect hook

  const getUserInitials = (profile) => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    if (profile?.name) {
      const names = profile.name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    return 'U';
  };

  // Create products table if it doesn't exist
  const createProductsTable = async () => {
    try {
      console.log('🔄 Creating products table if it doesn\'t exist...');
      
      // Try to create the products table using RPC
      const { error: rpcError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS products (
            id BIGSERIAL PRIMARY KEY,
            url TEXT NOT NULL,
            name TEXT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            description TEXT,
            image_url TEXT,
            user_id UUID REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create index on user_id for better performance
          CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
          
          -- Create index on url for duplicate checking
          CREATE INDEX IF NOT EXISTS idx_products_url ON products(url);
        `
      });
      
      if (rpcError) {
        console.log('⚠️ Could not create products table via RPC:', rpcError);
        // Try alternative approach - just check if table exists
        const { error: checkError } = await supabase
          .from('products')
          .select('*')
          .limit(1);
        
        if (checkError && checkError.code === '42P01') {
          console.log('🔄 Products table does not exist and RPC creation failed');
          console.log('🔄 You may need to create the table manually in Supabase dashboard');
          console.log('🔄 For now, proceeding without database save...');
        } else {
          console.log('✅ Products table is accessible');
        }
      } else {
        console.log('✅ Products table created successfully');
      }
    } catch (error) {
      console.log('⚠️ Error checking/creating products table:', error);
    }
  };

  useEffect(() => {
    if (!productUrl) {
      Alert.alert('Error', 'No product URL provided');
      navigation.goBack();
      return;
    }

    // Initialize screen and start scraping
    const initializeScreen = async () => {
      try {
        console.log('🚀 Starting ProductDetails initialization...');
        
        // Create products table if it doesn't exist
        await createProductsTable();
        
        // Automatically start scraping the Facebook URL
        console.log('🚀 Starting automatic Facebook scraping for URL:', productUrl);
        await scrapeFacebookData(productUrl);
      } catch (error) {
        console.error('🚨 Initialization error:', error);
      }
    };

    initializeScreen();
    console.log('✅ ProductDetails screen initialized');
  }, [productUrl, navigation]);

  const extractProductInfo = async () => {
    try {
      console.log('🔍 extractProductInfo called');
      console.log('🔍 Current loading state:', loading);
      
      // This function is now used for manual extraction testing
      // In production, you would implement EasyOCR here
      console.log('⏳ Starting manual extraction process...');
      
      // For now, we'll trigger the Facebook scraping again
      if (productUrl) {
        console.log('🔄 Re-triggering Facebook scraping...');
        await scrapeFacebookData(productUrl);
      } else {
        console.log('⚠️ No product URL available for extraction');
        Alert.alert('Error', 'No product URL available for extraction');
      }
    } catch (error) {
      console.error('🚨 Extraction error:', error);
      Alert.alert('Error', 'Failed to extract product information');
    } finally {
      console.log('🔄 Setting loading to false in extractProductInfo');
      setLoading(false);
    }
  };

  // Parse Facebook page content to extract product information
  const parseFacebookContent = async (htmlContent, url) => {
    try {
      console.log('🔍 Parsing Facebook page content...');
      
      let extractedData = {
        productName: 'Facebook Marketplace Item',
        price: '$',
        description: 'Product from Facebook Marketplace',
        imageUrl: 'https://picsum.photos/400/300?random=2',
        images: [],
        sellerName: ''
      };
      
      // Extract product name from various Facebook patterns
      const namePatterns = [
        /<title[^>]*>([^<]+)<\/title>/i,
        /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
        /<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /<h2[^>]*>([^<]+)<\/h2>/i,
        /"name":"([^"]+)"/i,
        /"title":"([^"]+)"/i
      ];
      
      for (const pattern of namePatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1] && match[1].length > 3) {
          let productName = match[1].trim();
          // Clean up the product name
          productName = productName.replace(/&amp;/g, '&')
                                  .replace(/&lt;/g, '<')
                                  .replace(/&gt;/g, '>')
                                  .replace(/&quot;/g, '"')
                                  .replace(/&#39;/g, "'");
          
          if (productName && !productName.includes('Facebook') && !productName.includes('Marketplace')) {
            extractedData.productName = productName;
            console.log('✅ Extracted product name:', productName);
            break;
          }
        }
      }
      
      // Extract price from various patterns
      const pricePatterns = [
        /\$(\d+(?:\.\d{2})?)/g,
        /"price":"([^"]+)"/i,
        /"amount":"([^"]+)"/i,
        /price[^>]*>([^<]+)</i,
        /amount[^>]*>([^<]+)</i
      ];
      
      for (const pattern of pricePatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1]) {
          let price = match[1].trim();
          if (price && !price.includes('$')) {
            price = `$${price}`;
          }
          if (price && price.match(/\$\d+/)) {
            extractedData.price = price;
            console.log('✅ Extracted price:', price);
            break;
          }
        }
      }
      
      // Extract description
      const descPatterns = [
        /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i,
        /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
        /"description":"([^"]+)"/i,
        /<p[^>]*>([^<]+)<\/p>/i
      ];
      
      for (const pattern of descPatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1] && match[1].length > 10) {
          let description = match[1].trim();
          description = description.replace(/&amp;/g, '&')
                                  .replace(/&lt;/g, '<')
                                  .replace(/&gt;/g, '>')
                                  .replace(/&quot;/g, '"')
                                  .replace(/&#39;/g, "'");
          
          if (description && !description.includes('Facebook') && !description.includes('Marketplace')) {
            extractedData.description = description;
            console.log('✅ Extracted description:', description.substring(0, 100) + '...');
            break;
          }
        }
      }
      
      // Extract images
      const imagePatterns = [
        /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i,
        /<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i,
        /"image":"([^"]+)"/i,
        /src="([^"]*\.(?:jpg|jpeg|png|gif|webp)[^"]*)"/i
      ];
      
      for (const pattern of imagePatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1] && match[1].includes('http')) {
          let imageUrl = match[1].trim();
          if (imageUrl && (imageUrl.includes('fbcdn.net') || imageUrl.includes('facebook.com'))) {
            extractedData.imageUrl = imageUrl;
            extractedData.images = [imageUrl];
            console.log('✅ Extracted image URL:', imageUrl);
            break;
          }
        }
      }
      
      // Extract seller name
      const sellerPatterns = [
        /"seller":"([^"]+)"/i,
        /"seller_name":"([^"]+)"/i,
        /"by":"([^"]+)"/i,
        /seller[^>]*>([^<]+)</i
      ];
      
      for (const pattern of sellerPatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1] && match[1].length > 2) {
          let sellerName = match[1].trim();
          if (sellerName && sellerName.length < 50) {
            extractedData.sellerName = sellerName;
            console.log('✅ Extracted seller name:', sellerName);
            break;
          }
        }
      }
      
      console.log('📊 Final extracted data:', extractedData);
      return extractedData;
      
    } catch (error) {
      console.error('❌ Error parsing Facebook content:', error);
      return {
        productName: 'Facebook Marketplace Item',
        price: '$',
        description: 'Product from Facebook Marketplace',
        imageUrl: 'https://picsum.photos/400/300?random=2',
        images: [],
        sellerName: ''
      };
    }
  };

  // Extract data from URL parameters and metadata
  const extractDataFromURL = async (url) => {
    try {
      // Simple timeout for URL parsing
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('URL parsing timeout')), 5000)
      );
      
      const parsePromise = new Promise((resolve) => {
        try {
          const urlObj = new URL(url);
          const params = urlObj.searchParams;
          
          // Extract basic information from URL parameters
          const productName = params.get('title') || params.get('name') || params.get('text') || '';
          const price = params.get('price') || params.get('amount') || '';
          const description = params.get('description') || params.get('desc') || '';
          const sellerName = params.get('seller') || params.get('seller_name') || params.get('by') || '';
          
          // Format price
          let formattedPrice = '$';
          if (price) {
            const cleanPrice = price.replace(/[$,]/g, '').trim();
            const parsedPrice = parseFloat(cleanPrice);
            if (!isNaN(parsedPrice) && parsedPrice >= 0) {
              formattedPrice = `$${parsedPrice.toFixed(2)}`;
            }
          }
          
          // Check if this is a Facebook marketplace URL
          const isFacebookMarketplace = url.includes('facebook.com') && 
            (url.includes('marketplace') || url.includes('item'));
          
          if (productName || price || description || isFacebookMarketplace) {
            resolve({
              productName: productName || 'Facebook Product',
              price: formattedPrice,
              description: description || 'Product from Facebook Marketplace',
              imageUrl: 'https://via.placeholder.com/400x300?text=Facebook+Product',
              sellerName: sellerName
            });
          } else {
            resolve(null);
          }
        } catch (error) {
          resolve(null);
        }
      });
      
      return await Promise.race([parsePromise, timeoutPromise]);
      
    } catch (error) {
      console.error('❌ URL extraction error:', error);
      return null;
    }
  };

  // Helper function to score images by likely size indicators
  const getImageSizeScore = (url) => {
    let score = 0;
    
    // Higher score for URLs that suggest larger images
    if (url.includes('large') || url.includes('big') || url.includes('full')) score += 15;
    if (url.includes('original') || url.includes('source')) score += 12;
    if (url.includes('high') || url.includes('quality')) score += 8;
    if (url.includes('1080') || url.includes('1920') || url.includes('4k')) score += 6;
    if (url.includes('720') || url.includes('hd')) score += 4;
    if (url.includes('product') || url.includes('item')) score += 10;
    
    // Bonus for specific Facebook marketplace patterns
    if (url.includes('marketplace') || url.includes('post')) score += 8;
    if (url.includes('photo') && !url.includes('profile')) score += 5;
    
    // Lower score for URLs that suggest smaller images
    if (url.includes('thumb') || url.includes('small') || url.includes('mini')) score -= 8;
    if (url.includes('icon') || url.includes('avatar')) score -= 15;
    if (url.includes('16x16') || url.includes('32x32') || url.includes('64x64')) score -= 12;
    if (url.includes('profile') || url.includes('user')) score -= 10;
    
    // Bonus for Facebook CDN URLs (usually product images)
    if (url.includes('fbcdn.net')) score += 5;
    
    // Bonus for URLs that look like product images (not profile/avatar)
    if (!url.includes('avatar') && !url.includes('profile') && !url.includes('icon')) score += 3;
    
    return score;
  };

  // Debug function to help analyze HTML content
  const debugHTMLContent = (htmlContent, url) => {
    console.log('🔍 DEBUG: Analyzing HTML content for images and descriptions...');
    console.log('📄 HTML length:', htmlContent.length);
    
    // Look for any img tags
    const allImgTags = htmlContent.match(/<img[^>]*>/gi);
    if (allImgTags) {
      console.log('🖼️ DEBUG: Found', allImgTags.length, 'img tags total');
      allImgTags.slice(0, 5).forEach((tag, index) => {
        console.log(`🖼️ DEBUG: Img tag ${index + 1}:`, tag.substring(0, 200));
      });
    }
    
    // Look for any src attributes
    const allSrcAttrs = htmlContent.match(/src="([^"]+)"/gi);
    if (allSrcAttrs) {
      console.log('🔗 DEBUG: Found', allSrcAttrs.length, 'src attributes total');
      allSrcAttrs.slice(0, 5).forEach((src, index) => {
        console.log(`🔗 DEBUG: Src ${index + 1}:`, src);
      });
    }
    
    // Look for any data-src attributes
    const allDataSrcAttrs = htmlContent.match(/data-src="([^"]+)"/gi);
    if (allDataSrcAttrs) {
      console.log('🔗 DEBUG: Found', allDataSrcAttrs.length, 'data-src attributes total');
      allDataSrcAttrs.slice(0, 5).forEach((dataSrc, index) => {
        console.log(`🔗 DEBUG: Data-src ${index + 1}:`, dataSrc);
      });
    }
    
    // Look for any Facebook CDN URLs
    const allFbUrls = htmlContent.match(/(https:\/\/scontent[^"]*\.fbcdn\.net[^"]*)/gi);
    if (allFbUrls) {
      console.log('📱 DEBUG: Found', allFbUrls.length, 'Facebook CDN URLs total');
      allFbUrls.slice(0, 5).forEach((url, index) => {
        console.log(`📱 DEBUG: FB URL ${index + 1}:`, url);
      });
    }
    
    // Look for any image URLs
    const allImageUrls = htmlContent.match(/(https:\/\/[^"]*\.(?:jpg|jpeg|png|webp|gif))/gi);
    if (allImageUrls) {
      console.log('🖼️ DEBUG: Found', allImageUrls.length, 'image URLs total');
      allImageUrls.slice(0, 5).forEach((url, index) => {
        console.log(`🖼️ DEBUG: Image URL ${index + 1}:`, url);
      });
    }
    
    // Look for description-related meta tags
    const ogDescTags = htmlContent.match(/<meta[^>]*property="og:description"[^>]*>/gi);
    if (ogDescTags) {
      console.log('📝 DEBUG: Found', ogDescTags.length, 'og:description meta tags');
      ogDescTags.forEach((tag, index) => {
        console.log(`📝 DEBUG: og:description ${index + 1}:`, tag.substring(0, 200));
      });
    }
    
    const metaDescTags = htmlContent.match(/<meta[^>]*name="description"[^>]*>/gi);
    if (metaDescTags) {
      console.log('📝 DEBUG: Found', metaDescTags.length, 'meta description tags');
      metaDescTags.forEach((tag, index) => {
        console.log(`📝 DEBUG: meta description ${index + 1}:`, tag.substring(0, 200));
      });
    }
  };

  // Extract seller name from Facebook HTML content
  const extractSellerFromHTML = (htmlContent) => {
    try {
      console.log('🔍 Extracting seller name from HTML...');
      
      // Common patterns for seller names on Facebook Marketplace
      const sellerPatterns = [
        // Pattern 1: Look for seller name in meta tags
        /<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i,
        // Pattern 2: Look for seller in structured data
        /"seller"[^}]*"name"[^}]*"([^"]+)"/i,
        // Pattern 3: Look for seller in page title
        /<title[^>]*>([^<]+)\s*on\s+Facebook/i,
        // Pattern 4: Look for "by [Name]" patterns
        /by\s+([A-Za-z\s]+?)(?:\s|$|,)/i,
        // Pattern 5: Look for seller in description
        /seller[:\s]*([A-Za-z\s]+?)(?:\s|$|,)/i
      ];
      
      for (const pattern of sellerPatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1]) {
          const sellerName = match[1].trim();
          if (sellerName && sellerName.length > 1 && sellerName.length < 50) {
            console.log('✅ Seller name found:', sellerName);
            return sellerName;
          }
        }
      }
      
      console.log('⚠️ No seller name found in HTML');
      return '';
    } catch (error) {
      console.error('❌ Error extracting seller name:', error);
      return '';
    }
  };

  // Facebook scraping function
  const scrapeFacebookData = async (url) => {
    try {
      console.log('🚀 Starting Facebook data scraping for:', url);
      setIsScraping(true);
      setLoading(true);
      
      console.log('⏳ Scraping process started...');
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Scraping timeout')), 15000)
      );
      
      // Create scraping promise
      const scrapingPromise = new Promise(async (resolve, reject) => {
        try {
          console.log('🌐 Attempting to fetch actual content from Facebook URL...');
          
          // Initialize default data
          let extractedData = {
            productName: 'Facebook Marketplace Item',
            price: '$',
            description: 'Product from Facebook Marketplace',
            imageUrl: 'https://picsum.photos/400/300?random=2',
            images: [],
            sellerName: ''
          };
          
          // Try to fetch the actual page content
          try {
            // For React Native, we'll use a proxy service to fetch Facebook content
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            console.log('🔄 Fetching content via proxy:', proxyUrl);
            
            const response = await fetch(proxyUrl, {
              method: 'GET',
              headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              const htmlContent = data.contents;
              console.log('✅ Successfully fetched page content, length:', htmlContent.length);
              
              // Parse the HTML content to extract product information
              extractedData = await parseFacebookContent(htmlContent, url);
              console.log('📊 Extracted real data from page:', extractedData);
            } else {
              console.log('⚠️ Proxy request failed, using fallback data');
            }
          } catch (fetchError) {
            console.log('⚠️ Failed to fetch page content:', fetchError.message);
            console.log('🔄 Using fallback extraction method...');
            
            // Fallback: Extract what we can from URL structure
            const postIdMatch = url.match(/\/item\/(\d+)/) || 
                               url.match(/\/marketplace\/item\/(\d+)/) ||
                               url.match(/\/share\/([^\/\?]+)/);
            if (postIdMatch) {
              const postId = postIdMatch[1];
              extractedData.productName = `Facebook Product #${postId}`;
              extractedData.description = `Product from Facebook Marketplace post #${postId}. Please edit the details below.`;
            }
            
            // Try to extract any image URLs from the URL itself
            const imageMatch = url.match(/(https:\/\/scontent[^&\s]*\.fbcdn\.net[^&\s]*)/i);
            if (imageMatch) {
              extractedData.imageUrl = imageMatch[1];
              extractedData.images = [imageMatch[1]];
            }
          }
          
          // Simulate processing time
          console.log('🔄 Processing extracted data...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          console.log('✅ Scraping completed with data:', extractedData);
          resolve(extractedData);
        } catch (error) {
          reject(error);
        }
      });
      
      // Race between scraping and timeout
      const result = await Promise.race([scrapingPromise, timeoutPromise]);
      
      // Store permanent image data if we have a real image
      if (result.imageUrl && !result.imageUrl.includes('placeholder.com')) {
        setPermanentImageData({
          imageUrl: result.imageUrl,
          productName: result.productName,
          description: result.description,
          price: result.price,
          sellerName: result.sellerName
        });
      }
      
      // Update extracted data
      console.log('🔄 Setting extracted data to:', result);
      setExtractedData(result);
      
      console.log('✅ Facebook scraping completed successfully');
      
    } catch (error) {
      console.error('🚨 Facebook scraping error:', error);
      
      // Set fallback data on error
      const fallbackData = {
        productName: 'Facebook Product',
        price: '$25.00',
        description: 'Product description from Facebook Marketplace',
        imageUrl: 'https://picsum.photos/400/300?random=3',
        images: [],
        sellerName: ''
      };
      
      console.log('🔄 Setting fallback data to:', fallbackData);
      setExtractedData(fallbackData);
    } finally {
      setIsScraping(false);
      setLoading(false);
    }
  };

  // Handle save product
  const handleSubmit = () => {
    // For buyer flow, skip address and payment, go directly to Share
    if (transactionType === 'buy') {
      navigation.navigate('Share', {
        productUrl: productUrl,
        productPrice: extractedData.price,
        productTitle: extractedData.productName,
        productImage: extractedData.imageUrl,
        userAddress: userAddress,
        userProfile: userProfile,
        transactionType: transactionType,
        sellerName: extractedData.sellerName || 'Facebook Seller',
        extractedData: extractedData
      });
    } else {
      // For seller flow, go to ConfirmAddress (existing flow)
      navigation.navigate('ConfirmAddress', {
        productUrl: productUrl,
        productPrice: extractedData.price,
        productTitle: extractedData.productName,
        productImage: extractedData.imageUrl,
        userAddress: userAddress,
        userProfile: userProfile,
        transactionType: transactionType,
        sellerName: extractedData.sellerName || 'Facebook Seller',
        extractedData: extractedData
      });
    }
  };

  const handleSaveProduct = async () => {
    try {
      setLoading(true);
      console.log('💾 Saving product to database...');
      
      // Check if products table exists
      const { error: tableCheckError } = await supabase
        .from('products')
        .select('*')
        .limit(1);
      
      if (tableCheckError) {
        console.log('⚠️ Products table not accessible, skipping save');
        Alert.alert('Info', 'Product information extracted successfully. Database save not available.');
        return;
      }
      
      // Save to database
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          url: productUrl,
          name: extractedData.productName,
          price: parseFloat(extractedData.price.replace('$', '')),
          description: extractedData.description,
          image_url: extractedData.imageUrl,
          user_id: null // Allow saving without user authentication
        });
      
      if (insertError) {
        throw insertError;
      }
      
      console.log('✅ Product saved successfully');
      Alert.alert('Success', 'Product information saved successfully!');
      
      // Use permanent image data if available, otherwise use current data
      const finalImageUrl = permanentImageData?.imageUrl || extractedData.imageUrl;
      const finalProductName = permanentImageData?.productName || extractedData.productName;
      const finalDescription = permanentImageData?.description || extractedData.description;
      const finalPrice = permanentImageData?.price || extractedData.price;
      
      // Create a completely protected copy of the data
      const protectedData = {
        productName: finalProductName,
        price: finalPrice,
        description: finalDescription,
        imageUrl: finalImageUrl,
        images: finalImageUrl ? [finalImageUrl] : []
      };
      
      console.log('🛡️ Protected data for navigation:', protectedData);
      
      // For buyer flow, skip address and payment, go directly to Share
      if (transactionType === 'buy') {
        navigation.navigate('Share', {
          productUrl,
          productPrice: protectedData.price,
          productTitle: protectedData.productName,
          productDescription: protectedData.description,
          productImage: protectedData.imageUrl,
          userAddress,
          userProfile,
          transactionType,
          sellerName: extractedData.sellerName || '',
          extractedData: protectedData
        });
      } else {
        // For seller flow, go to ProductPrice (existing flow)
        navigation.navigate('ProductPrice', {
          productUrl,
          userAddress,
          userProfile,
          extractedData: protectedData,
          sellerName: extractedData.sellerName || ''
        });
      }
      
    } catch (error) {
      console.error('🚨 Save product error:', error);
      Alert.alert('Error', 'Failed to save product information');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close - preserve image data
  const handleModalClose = () => {
    console.log('🔒 Closing modal, preserving image data');
    setShowModal(false);
    // Don't reset extractedData here - keep the image and other data
  };

  // Handle modal actions
  const handleModalAction = (action) => {
    if (action === 'save') {
      handleSaveProduct();
    } else if (action === 'cancel') {
      handleModalClose();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../assets/backarrow1.png')}
            style={styles.backButtonImage}
          />
        </TouchableOpacity>
        
        <View style={styles.profileContainer}>
          {userProfile?.avatar_url ? (
            <Image 
              source={{ uri: userProfile.avatar_url }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profilePlaceholderText}>
                {getUserInitials(userProfile)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <Text style={styles.progressStepText}>Product</Text>
          <View style={styles.progressStepActive} />
        </View>
        {transactionType !== 'buy' && (
          <>
            <View style={styles.progressStep}>
              <Text style={styles.progressStepText}>Address</Text>
              <View style={styles.progressStepInactive} />
            </View>
            <View style={styles.progressStep}>
              <Text style={styles.progressStepText}>Payment</Text>
              <View style={styles.progressStepInactive} />
            </View>
          </>
        )}
        <View style={styles.progressStep}>
          <Text style={styles.progressStepText}>Share</Text>
          <View style={styles.progressStepInactive} />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Extracted Product Information</Text>
          <Text style={styles.subtitleText}>Review and edit the extracted information below</Text>
        </View>

        {/* Product Information Card */}
        <View style={styles.productCard}>
          <View style={styles.productInfoRow}>
            <View style={styles.productImageContainer}>
              {extractedData.imageUrl ? (
                <Image 
                  source={{ uri: extractedData.imageUrl }}
                  style={styles.productThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>No Image</Text>
                </View>
              )}
            </View>
            <View style={styles.productDetailsContainer}>
              <Text style={styles.productNameText}>
                {extractedData.productName || 'Product Name'}
              </Text>
              <View style={styles.sourceContainer}>
                <Text style={styles.sourceText}>from Facebook Marketplace</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Product Price Card */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>PRODUCT PRICE</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.priceInput}
              value={extractedData.price?.replace('$', '') || ''}
              onChangeText={(text) => setExtractedData(prev => ({ ...prev, price: `$${text}` }))}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Product Details Modal */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleModalClose}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            {/* Product Image - This will persist when modal is closed */}
            <View style={styles.modalImageContainer}>
              {extractedData.imageUrl ? (
                <Image 
                  source={{ uri: extractedData.imageUrl }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.modalImagePlaceholder}>
                  <Text style={styles.modalImagePlaceholderText}>No Image</Text>
                </View>
              )}
            </View>

            {/* Product Information */}
            <View style={styles.modalInfo}>
              <Text style={styles.modalTitle}>
                {extractedData.productName || 'Product Name'}
              </Text>
              
              <Text style={styles.modalPrice}>
                {extractedData.price || '$0.00'}
              </Text>
              
              <Text style={styles.modalDescription}>
                {extractedData.description || 'No description available'}
              </Text>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={() => handleModalAction('save')}
              >
                <Text style={styles.modalSaveButtonText}>Save Product</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => handleModalAction('cancel')}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  profileContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#000',
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  imageSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 18,
    color: '#999',
  },
  infoSection: {
    marginTop: 24,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 16,
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionSection: {
    marginTop: 32,
    gap: 16,
  },
  extractButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: '90%',
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
  },
  modalImageContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  modalImage: {
    width: 280,
    height: 200,
    borderRadius: 12,
  },
  modalImagePlaceholder: {
    width: 280,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  modalImagePlaceholderText: {
    fontSize: 16,
    color: '#999',
  },
  modalInfo: {
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for the updated layout
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  progressStepActive: {
    width: '100%',
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  progressStepInactive: {
    width: '100%',
    height: 3,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  productCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  productThumbnail: {
    width: '100%',
    height: '100%',
  },
  productDetailsContainer: {
    flex: 1,
  },
  productNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    lineHeight: 24,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 14,
    color: '#666',
  },
  priceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 8,
  },
  dollarSign: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    paddingVertical: 4,
  },
  submitButton: {
    backgroundColor: '#000',
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
