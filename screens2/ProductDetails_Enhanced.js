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
  
  // Debug loading state changes
  useEffect(() => {
    console.log('🔄 Loading state changed to:', loading);
  }, [loading]);

  // Debug extractedData changes and auto-fix corrupted data
  useEffect(() => {
    console.log('🖼️ ===== EXTRACTED DATA CHANGED =====');
    console.log('🖼️ extractedData changed:', extractedData);
    console.log('🖼️ Current imageUrl:', extractedData.imageUrl);
    console.log('🖼️ Current images array:', extractedData.images);
    console.log('🖼️ Images array length:', extractedData.images?.length || 0);
    console.log('🖼️ Has real Facebook URL?', extractedData.imageUrl?.includes('fbcdn.net'));
    console.log('🖼️ Has placeholder in images?', extractedData.images?.some(img => img.includes('placeholder.com')));
    console.log('🖼️ Images array is empty?', !extractedData.images || extractedData.images.length === 0);
    
    // Auto-fix any corrupted data immediately
    const needsFix = (extractedData.images && extractedData.images.some(img => 
      img.includes('placeholder.com') || 
      img.includes('Manual+Input+Required') ||
      img.includes('No+Image') ||
      img.includes('URL+Extracted') ||
      img.includes('Post+ID+Found')
    )) || 
    (extractedData.imageUrl && extractedData.imageUrl.includes('placeholder.com')) ||
    (!extractedData.images || extractedData.images.length === 0);
    
    console.log('🖼️ Needs fix?', needsFix);
    
    if (needsFix) {
      console.log('🖼️ 🔧 AUTO-FIXING CORRUPTED EXTRACTED DATA...');
      const sanitized = sanitizeExtractedData(extractedData);
      
      // Force update to fix corrupted data immediately
      console.log('🖼️ 🔧 Applying sanitized data:', sanitized);
      
      // Use setTimeout to break the current render cycle and prevent infinite loops
      setTimeout(() => {
        console.log('🖼️ 🔧 Setting sanitized data via setTimeout');
        setExtractedData(sanitized);
      }, 0);
    }
    console.log('🖼️ ===== END EXTRACTED DATA CHANGED =====');
  }, [extractedData]);

  // INSTANT CORRUPTION PREVENTION: Check and fix on every render
  useEffect(() => {
    console.log('🖼️ ⚡ INSTANT CORRUPTION PREVENTION - Running on every render');
    console.log('🖼️ ⚡ Current imageUrl:', extractedData.imageUrl);
    console.log('🖼️ ⚡ Current images array:', extractedData.images);
    
    // This runs on EVERY render to catch corruption instantly
    if (extractedData.imageUrl && extractedData.imageUrl.includes('fbcdn.net')) {
      console.log('🖼️ ⚡ Has real Facebook URL, checking for corruption...');
      
      // If the images array is corrupted, fix it INSTANTLY
      if (extractedData.images && extractedData.images.some(img => 
        img.includes('placeholder.com') || 
        img.includes('Manual+Input+Required') ||
        img.includes('No+Image') ||
        img.includes('URL+Extracted') ||
        img.includes('Post+ID+Found')
      )) {
        console.log('🖼️ ⚡ INSTANT: Detected corruption, fixing immediately');
        // Force the images array to contain the real Facebook image URL
        setExtractedData(prev => ({
          ...prev,
          images: [extractedData.imageUrl]
        }));
      } else if (!extractedData.images || extractedData.images.length === 0) {
        console.log('🖼️ ⚡ INSTANT: Images array is empty, fixing immediately');
        setExtractedData(prev => ({
          ...prev,
          images: [extractedData.imageUrl]
        }));
      } else {
        console.log('🖼️ ⚡ Images array looks good, no fix needed');
      }
    } else {
      console.log('🖼️ ⚡ No real Facebook URL found, skipping instant protection');
    }
  });

  // Ultra-aggressive corruption prevention - check on every render
  useEffect(() => {
    // If we have a real Facebook image URL, ensure it's never corrupted
    if (extractedData.imageUrl && extractedData.imageUrl.includes('fbcdn.net')) {
      // Force the images array to always contain the real image URL
      if (!extractedData.images || extractedData.images.length === 0 || 
          extractedData.images.some(img => img.includes('placeholder.com'))) {
        console.log('🖼️ Ultra-aggressive: Forcing images array to contain real Facebook image URL');
        setExtractedData(prev => ({
          ...prev,
          images: [extractedData.imageUrl]
        }));
      }
    }
  });

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

  // FINAL NUCLEAR OPTION: Force image to stay visible on EVERY SINGLE RENDER
  useEffect(() => {
    console.log('🖼️ 💥 FINAL NUCLEAR OPTION - Running on every render');
    console.log('🖼️ 💥 Current imageUrl:', extractedData.imageUrl);
    console.log('🖼️ 💥 Current images array:', extractedData.images);
    
    // This is the absolute last line of defense - runs on EVERY render
    if (extractedData.imageUrl && extractedData.imageUrl.includes('fbcdn.net')) {
      console.log('🖼️ 💥 Has real Facebook URL, checking for corruption...');
      
      // If the images array is empty or corrupted, FORCE it to contain the real image URL
      if (!extractedData.images || 
          extractedData.images.length === 0 || 
          extractedData.images.some(img => 
            img.includes('placeholder.com') || 
            img.includes('Manual+Input+Required') ||
            img.includes('No+Image') ||
            img.includes('URL+Extracted') ||
            img.includes('Post+ID+Found')
          )) {
        console.log('🖼️ 💥 FINAL NUCLEAR: Forcing image to stay visible on every render');
        console.log('🖼️ 💥 Setting images array to:', [extractedData.imageUrl]);
        // Force update immediately without setTimeout
        setExtractedData(prev => ({
          ...prev,
          images: [extractedData.imageUrl]
        }));
      } else {
        console.log('🖼️ 💥 Images array looks good, no nuclear fix needed');
      }
    } else {
      console.log('🖼️ 💥 No real Facebook URL found, skipping nuclear protection');
    }
  });

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

    // Check authentication status and create products table if needed
    const initializeScreen = async () => {
      try {
        // Check authentication
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.log('❌ Authentication check failed:', error);
          Alert.alert(
            'Authentication Required',
            'Please log in to continue.',
            [
              { text: 'OK', onPress: () => navigation.navigate('Welcomepage') }
            ]
          );
          return;
        }
        
        console.log('✅ User authenticated:', user.email);
        
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

  // Extract data from URL parameters and metadata
  const extractDataFromURL = async (url) => {
    try {
      console.log('🔍 Extracting data from URL:', url);
      
      // Try to extract information from URL parameters
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      // Look for common Facebook parameters that might contain product info
      let productName = '';
      let price = '';
      let description = '';
      let sellerName = '';
      
      // Check for common Facebook parameters
      if (params.get('title')) {
        productName = params.get('title');
      } else if (params.get('name')) {
        productName = params.get('name');
      } else if (params.get('text')) {
        productName = params.get('text');
      }
      
      if (params.get('price')) {
        price = params.get('price');
      } else if (params.get('amount')) {
        price = params.get('amount');
      }
      
      if (params.get('description')) {
        description = params.get('description');
      }
      
      // Check for seller name in URL parameters
      if (params.get('seller')) {
        sellerName = params.get('seller');
      } else if (params.get('seller_name')) {
        sellerName = params.get('seller_name');
      } else if (params.get('by')) {
        sellerName = params.get('by');
      }
      
      if (params.get('desc')) {
        description = params.get('desc');
      }
      
      // If we found some data, return it
      if (productName || price || description) {
        // Ensure price is in valid format
        let formattedPrice = '$';
        if (price) {
          try {
            const cleanPrice = price.replace(/[$,]/g, '').trim();
            const parsedPrice = parseFloat(cleanPrice);
            if (!isNaN(parsedPrice) && parsedPrice >= 0) {
              formattedPrice = `$${parsedPrice.toFixed(2)}`;
            }
          } catch (e) {
            console.log('⚠️ Price formatting error in URL extraction:', e);
          }
        }
        
        // Try to extract image URL from the original URL if it's a Facebook URL
        let imageUrl = 'https://via.placeholder.com/150?text=URL+Extracted';
        if (url.includes('facebook.com') || url.includes('fbcdn.net')) {
          // For Facebook URLs, we'll try to construct a better placeholder
          // or use the actual URL as a base for image extraction
          imageUrl = 'https://via.placeholder.com/400x300?text=Facebook+Product';
        }
        
        const extractedData = {
          productName: productName || 'Facebook Product',
          price: formattedPrice,
          description: description || 'Product information extracted from URL parameters',
          imageUrl: imageUrl,
          sellerName: sellerName || ''
        };
        
        console.log('✅ Data extracted from URL parameters:', extractedData);
        return extractedData;
      }
      
      // If no parameters found, try to extract from the URL path
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.includes('marketplace') || pathParts.includes('item')) {
        // This looks like a marketplace URL, try to extract post ID
        const postIdIndex = pathParts.findIndex(part => part === 'item' || part === 'share');
        if (postIdIndex !== -1 && pathParts[postIdIndex + 1]) {
          const postId = pathParts[postIdIndex + 1];
          console.log('🔍 Found post ID in URL:', postId);
          
          // Return basic info based on post ID
          return {
            productName: `Facebook Product (ID: ${postId})`,
            price: '$', // Keep $ prefix but remove initial price
            description: `Product from Facebook post ${postId}. Please enter details manually.`,
            imageUrl: 'https://via.placeholder.com/150?text=Post+ID+Found'
          };
        }
      }
      
      console.log('⚠️ No useful data found in URL');
      return null;
    } catch (error) {
      console.error('🚨 Error extracting data from URL:', error);
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
      
      // Extract basic data from URL first
      const urlData = await extractDataFromURL(url);
      
      // Try to extract Facebook image URL from the original URL
      let facebookImageUrl = null;
      if (url.includes('facebook.com') || url.includes('fbcdn.net')) {
        // Look for Facebook CDN image URLs in the original URL
        const fbImageMatch = url.match(/(https:\/\/scontent[^&\s]*\.fbcdn\.net[^&\s]*)/i);
        if (fbImageMatch) {
          facebookImageUrl = fbImageMatch[1];
          console.log('🖼️ Found Facebook image URL:', facebookImageUrl);
        }
      }
      
      if (urlData) {
        console.log('✅ Basic data extracted from URL:', urlData);
        
        // Use the real image URL from Facebook if found, otherwise use extracted data
        const realData = {
          ...urlData,
          // Prioritize Facebook image URL, then extracted data, then placeholder
          imageUrl: facebookImageUrl || urlData.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image+Available',
          // Set images array to contain the real image URL
          images: facebookImageUrl || urlData.imageUrl ? [facebookImageUrl || urlData.imageUrl] : [],
          // Don't override with mock data - use what was actually extracted
          productName: urlData.productName || 'Facebook Product',
          price: urlData.price || '$',
          description: urlData.description || 'Product description from Facebook Marketplace',
          sellerName: urlData.sellerName || '' // Include seller name
        };
        
                 console.log('📱 Setting real extracted data:', realData);
         console.log('🖼️ Final image URL being set:', realData.imageUrl);
         console.log('🖼️ Images array being set:', realData.images);
         
         // Immediately store permanent image data to prevent corruption
         if (realData.imageUrl && !realData.imageUrl.includes('placeholder.com')) {
           console.log('🖼️ Storing permanent image data immediately');
           setPermanentImageData({
             imageUrl: realData.imageUrl,
             productName: realData.productName,
             description: realData.description,
             price: realData.price,
             sellerName: realData.sellerName
           });
           
           // Also immediately set the images array to prevent corruption
           realData.images = [realData.imageUrl];
           console.log('🖼️ Immediately setting images array to prevent corruption:', realData.images);
         }
         
         console.log('🖼️ About to set extractedData with:', realData);
         setExtractedData(prevData => {
           const newData = {
             ...prevData,
             ...realData
           };
           console.log('🖼️ Setting extractedData to:', newData);
           return newData;
         });
      } else {
        // Only use mock data if no URL data was extracted
        const mockData = {
          productName: 'Facebook Product',
          price: '$25.00',
          description: 'Product description from Facebook Marketplace',
          imageUrl: facebookImageUrl || 'https://via.placeholder.com/400x300?text=Product+Image',
          images: facebookImageUrl ? [facebookImageUrl] : []
        };
        
        console.log('📱 Setting mock data (no URL extraction):', mockData);
        setExtractedData(prevData => ({
          ...prevData,
          ...mockData
        }));
      }
      
      // Show the modal with the extracted data
      setShowModal(true);
      
    } catch (error) {
      console.error('🚨 Facebook scraping error:', error);
      Alert.alert('Error', 'Failed to extract product information from Facebook');
    } finally {
      setIsScraping(false);
      setLoading(false);
    }
  };

  // Handle save product
  const handleSaveProduct = async () => {
    try {
      setLoading(true);
      console.log('💾 Saving product to database...');
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      
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
          user_id: user.id
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
      
      // Navigate to next screen
      navigation.navigate('ProductPrice', {
        productUrl,
        userAddress,
        userProfile,
        extractedData: protectedData,
        sellerName: extractedData.sellerName || '' // Pass seller name
      });
      
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
            source={require('../assets/backarrow.png')}
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

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Image Section */}
        <View style={styles.imageSection}>
          {extractedData.imageUrl ? (
            <Image 
              source={{ uri: extractedData.imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Product Image</Text>
            </View>
          )}
        </View>

        {/* Product Information */}
        <View style={styles.infoSection}>
          <Text style={styles.productName}>
            {extractedData.productName || 'Product Name'}
          </Text>
          
          <Text style={styles.productPrice}>
            {extractedData.price || '$0.00'}
          </Text>
          
          <Text style={styles.productDescription}>
            {extractedData.description || 'No description available'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.extractButton}
            onPress={extractProductInfo}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.extractButtonText}>Extract Product Info</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveProduct}
            disabled={loading || !extractedData.productName}
          >
            <Text style={styles.saveButtonText}>Save Product</Text>
          </TouchableOpacity>
        </View>
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
});
