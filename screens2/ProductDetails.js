import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator,
  TextInput, FlatList, KeyboardAvoidingView, Platform
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../screens/supabaseClient';
import { Buffer } from 'buffer';

// RN sometimes needs this polyfill
if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

export default function ProductDetails({ navigation, route }) {
  const [loading, setLoading] = useState(false);
 
  // Debug loading state changes
  useEffect(() => {
    console.log('🔄 Loading state changed to:', loading);
  }, [loading]);
 
  // Get the transaction type from route params
  const { transactionType } = route.params || {};
  const isSelling = transactionType === 'sell';
 
  const [extractedData, setExtractedData] = useState({
    productName: '',
    price: '$', // Keep $ prefix but remove initial price
    description: '',
    imageUrl: ''
  });
  const [isScraping, setIsScraping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [checkmarkStates, setCheckmarkStates] = useState([false, false, false, false]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [preloadingImages, setPreloadingImages] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentCheckmarkIndex, setCurrentCheckmarkIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
 
  const { productUrl, userAddress, userProfile } = route.params || {};

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

  // -----------------------------
  // 👇 Invite helpers (payload + deep link)
  // -----------------------------
  const buildInvitePayload = () => {
    return {
      fbUrl: productUrl,
      price: extractedData?.price || '$',
      title: extractedData?.productName || '',     // product name the seller typed
      image: extractedData?.imageUrl || '',        // image shown in "PRODUCT IMAGE"
      seller: userProfile?.full_name || userProfile?.name || '',
      sellerAvatar: userProfile?.avatar_url || '',
      // offerId: 'optional-later'
    };
  };

  const makeInviteLink = (payload) => {
    const raw = JSON.stringify(payload);
    const b64 = Buffer.from(raw, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/,'');
    return `couri://invite?data=${b64}`;
  };
  // -----------------------------

  // Image preloading function for instant display
  const preloadImages = async (imageUrls) => {
    if (!imageUrls || imageUrls.length === 0) return;
    
    console.log('🚀 Starting image preloading for instant display...');
    setPreloadingImages(true);
    
    try {
      const preloadPromises = imageUrls.map(async (url, index) => {
        try {
          console.log(`🖼️ Preloading image ${index + 1}: ${url.substring(0, 50)}...`);
          await Image.prefetch(url);
          console.log(`✅ Image ${index + 1} preloaded successfully`);
          return true;
        } catch (error) {
          console.log(`❌ Failed to preload image ${index + 1}:`, error);
          return false;
        }
      });
      
      const results = await Promise.all(preloadPromises);
      const successCount = results.filter(Boolean).length;
      
      console.log(`🎉 Image preloading complete: ${successCount}/${imageUrls.length} images preloaded`);
      setImagesLoaded(true);
      setPreloadingImages(false);
      
    } catch (error) {
      console.log('❌ Error during image preloading:', error);
      setPreloadingImages(false);
    }
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

  // Animated checkmarks effect
  useEffect(() => {
    let checkmarkTimer;
    let completionTimer;
    
    if (isScraping && !extractedData.productName) {
      // Reset checkmarks when starting
      setCheckmarkStates([false, false, false, false]);
      setCurrentCheckmarkIndex(0);
      
      // Start checking marks one by one after a delay
      checkmarkTimer = setTimeout(() => {
        const checkNextMark = (index) => {
          if (index < 4) {
            setCheckmarkStates(prev => {
              const newStates = [...prev];
              newStates[index] = true;
              return newStates;
            });
            
            // If this is the last checkmark, wait longer to show it before completing
            if (index === 3) {
              // Wait 2 seconds after the last checkmark to ensure user sees it
              completionTimer = setTimeout(() => {
                // Now complete the process and move to product details
                setExtractedData(prev => ({
                  ...prev,
                  productName: prev.productName || 'Product Information (Please Edit)',
                  description: prev.description || 'Product information extracted. Please review and edit the details below.',
                  imageUrl: prev.imageUrl || 'https://via.placeholder.com/150?text=Manual+Input+Required',
                  images: prev.images && prev.images.length > 0 ? prev.images : ['https://via.placeholder.com/150?text=Manual+Input+Required']
                }));
                setIsScraping(false);
              }, 2000); // Wait 2 seconds after last checkmark to ensure visibility
            } else {
              // Check next mark after 2 seconds
              setTimeout(() => checkNextMark(index + 1), 2000);
            }
          }
        };
        
        // Start with first checkmark after 1 second
        checkNextMark(0);
      }, 1000);
    }
    
    return () => {
      if (checkmarkTimer) clearTimeout(checkmarkTimer);
      if (completionTimer) clearTimeout(completionTimer);
    };
  }, [isScraping, extractedData.productName]);

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
      } else if (params.get('desc')) {
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
        
                 const extractedData = {
           productName: productName || 'Facebook Product',
           price: '$', // Start with just $ sign
           description: description || 'Product information extracted from URL parameters',
           imageUrl: 'https://via.placeholder.com/150?text=URL+Extracted',
           images: ['https://via.placeholder.com/150?text=URL+Extracted']
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
           price: '$', // Start with just $ sign
           description: `Product from Facebook post ${postId}. Please enter details manually.`,
           imageUrl: 'https://via.placeholder.com/150?text=Post+ID+Found',
           images: ['https://via.placeholder.com/150?text=Post+ID+Found']
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

  // Parse Facebook HTML to extract product information
    const parseFacebookHTML = async (htmlContent, url) => {
    try {
      console.log('🔍 Parsing Facebook HTML content...');
      
      // FAST PARSING: Use targeted, efficient patterns instead of exhaustive search
      let productName = '';
      let price = '';
      let description = '';
      let imageUrl = '';
      
      // QUICK EXTRACTION: Look for the most common patterns first
      console.log('⚡ Fast extraction mode - targeting key patterns...');
      
      // 1. QUICK PRODUCT NAME: Look for Open Graph title first (usually cleanest)
      const ogTitleMatch = htmlContent.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        productName = ogTitleMatch[1].trim();
        console.log('✅ Fast product name found (og:title):', productName);
      }
      
             // 2. QUICK PRICE: Look for dollar amounts with better logic
       console.log('🔍 Searching for prices in HTML content...');
       
               // Method 1: Look for Open Graph price meta tags first
        const ogPriceMatch = htmlContent.match(/<meta[^>]*property="og:price:amount"[^>]*content="([^"]+)"/i);
        if (ogPriceMatch && ogPriceMatch[1]) {
          const ogPrice = ogPriceMatch[1].trim();
          if (ogPrice && !isNaN(parseFloat(ogPrice))) {
            // Don't set price automatically - let user enter it
            console.log('✅ Open Graph price found but not setting automatically:', ogPrice);
          }
        }
       
               // Method 2: Look for structured data (JSON-LD) price
        if (!price) {
          const jsonLdMatches = htmlContent.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
          if (jsonLdMatches) {
            for (const jsonLd of jsonLdMatches) {
              try {
                const jsonContent = jsonLd.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
                const parsed = JSON.parse(jsonContent);
                
                // Look for price in various structured data formats
                if (parsed.offers && parsed.offers.price) {
                  const foundPrice = parsed.offers.price;
                  if (foundPrice && !isNaN(parseFloat(foundPrice))) {
                    // Don't set price automatically - let user enter it
                    console.log('✅ Structured data price found but not setting automatically:', foundPrice);
                    break;
                  }
                } else if (parsed.price && !isNaN(parseFloat(parsed.price))) {
                  // Don't set price automatically - let user enter it
                  console.log('✅ Direct structured data price found but not setting automatically:', parsed.price);
                  break;
                }
              } catch (e) {
                // Continue to next JSON-LD block
              }
            }
          }
        }
       
               // Method 3: Look for Facebook-specific price patterns
        if (!price) {
          // Facebook often uses specific data attributes for prices
          const fbPriceMatches = htmlContent.match(/data-price="([^"]+)"/gi);
          if (fbPriceMatches && fbPriceMatches.length > 0) {
            const validPrices = fbPriceMatches
              .map(p => p.match(/data-price="([^"]+)"/i)?.[1])
              .filter(p => p && !isNaN(parseFloat(p)))
              .map(p => parseFloat(p))
              .filter(p => p >= 1 && p <= 10000);
            
            if (validPrices.length > 0) {
              // Don't set price automatically - let user enter it
              console.log('✅ Facebook data-price attribute found but not setting automatically:', Math.max(...validPrices));
            }
          }
        }
       
               // Method 4: Look for aria-label with price
        if (!price) {
          const ariaPriceMatches = htmlContent.match(/aria-label="[^"]*\$(\d+(?:\.\d{2})?)[^"]*"/gi);
          if (ariaPriceMatches && ariaPriceMatches.length > 0) {
            const validPrices = ariaPriceMatches
              .map(p => p.match(/\$(\d+(?:\.\d{2})?)/i)?.[1])
              .filter(p => p && !isNaN(parseFloat(p)))
              .map(p => parseFloat(p))
              .filter(p => p >= 1 && p <= 10000);
            
            if (validPrices.length > 0) {
              // Don't set price automatically - let user enter it
              console.log('✅ Aria-label price found but not setting automatically:', Math.max(...validPrices));
            }
          }
        }
       
               // Method 5: Look for any dollar amounts in the HTML (fallback)
        if (!price) {
          const priceMatches = htmlContent.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/gi);
          if (priceMatches && priceMatches.length > 0) {
            // Filter out very low and very high prices
            const validPrices = priceMatches
              .map(p => parseFloat(p.replace('$', '').replace(',', '')))
              .filter(p => p >= 1 && p <= 1000); // Lowered max to avoid high numbers like 8500
            
            if (validPrices.length > 0) {
              // Don't set price automatically - let user enter it
              const minPrice = Math.min(...validPrices);
              console.log('✅ Fallback price found but not setting automatically:', minPrice);
            }
          }
        }
      
      // 3. QUICK DESCRIPTION: Look for Open Graph description
      const ogDescMatch = htmlContent.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
      if (ogDescMatch && ogDescMatch[1]) {
        description = ogDescMatch[1].trim();
        console.log('✅ Fast description found (og:description):', description);
      }
      
      // 4. QUICK IMAGE: Look for MULTIPLE images aggressively
      console.log('🔍 Searching for MULTIPLE images on the page...');
      
      let allImages = [];
      
      // First try Open Graph image
      const ogImageMatch = htmlContent.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
      if (ogImageMatch && ogImageMatch[1]) {
        const ogImage = ogImageMatch[1].trim();
        allImages.push(ogImage);
        imageUrl = ogImage; // Keep for backward compatibility
        console.log('✅ Open Graph image found:', ogImage);
      }
      
      // Look for Facebook CDN images (most common)
      const fbImageMatches = htmlContent.match(/(https:\/\/scontent[^"]*\.fbcdn\.net[^"]*)/gi);
      if (fbImageMatches && fbImageMatches.length > 0) {
        // Filter and add unique Facebook CDN images
        fbImageMatches.forEach(match => {
          const cleanUrl = match.trim();
          if (!allImages.includes(cleanUrl) && cleanUrl.includes('http')) {
            allImages.push(cleanUrl);
          }
        });
        if (!imageUrl) {
          imageUrl = allImages[0]; // Keep for backward compatibility
        }
        console.log('✅ Facebook CDN images found:', fbImageMatches.length);
      }
      
      // Look for ANY image URL
      const anyImageMatches = htmlContent.match(/(https:\/\/[^"]*\.(?:jpg|jpeg|png|webp|gif))/gi);
      if (anyImageMatches && anyImageMatches.length > 0) {
        // Filter and add unique image URLs
        anyImageMatches.forEach(match => {
          const cleanUrl = match.trim();
          if (!allImages.includes(cleanUrl) && cleanUrl.includes('http')) {
            allImages.push(cleanUrl);
          }
        });
        if (!imageUrl) {
          imageUrl = allImages[0]; // Keep for backward compatibility
        }
        console.log('✅ Any image URLs found:', anyImageMatches.length);
      }
      
      // Look for relative image paths
      const relativeImageMatches = htmlContent.match(/(\/[^"]*\.(?:jpg|jpeg|png|webp|gif))/gi);
      if (relativeImageMatches && relativeImageMatches.length > 0) {
        // Convert relative paths to absolute
        const baseUrl = new URL(url).origin;
        relativeImageMatches.forEach(match => {
          const absoluteUrl = baseUrl + match.trim();
          if (!allImages.includes(absoluteUrl)) {
            allImages.push(absoluteUrl);
          }
        });
        if (!imageUrl) {
          imageUrl = allImages[0]; // Keep for backward compatibility
        }
        console.log('✅ Relative image paths converted:', relativeImageMatches.length);
      }
      
      // Filter out invalid images and remove duplicates
      allImages = allImages.filter(img => 
        img && 
        img.startsWith('http') && 
        !img.includes('data:') && 
        !img.includes('placeholder') &&
        !img.includes('avatar') &&
        !img.includes('profile') &&
        !img.includes('icon')
      );
      
      // Remove duplicates while preserving order
      allImages = [...new Set(allImages)];
      
      console.log('🖼️ Total unique images found:', allImages.length);
      if (allImages.length > 0) {
        console.log('🖼️ First image (for backward compatibility):', allImages[0]);
      }
      
      // If we got most data quickly, return it
      if (productName && price && description) {
        console.log('⚡ Fast extraction successful!');
        return { productName, price, description, imageUrl, images: allImages };
      }
      
      // FALLBACK: Only do deeper search if we're missing key data
      console.log('🔄 Some data missing, doing targeted fallback search...');
      
      // Product name fallback - just look for page title
      if (!productName) {
        const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          productName = titleMatch[1].trim();
          console.log('✅ Fallback product name (page title):', productName);
        }
      }
      
             // Price fallback - look for any reasonable dollar amount
       if (!price) {
         console.log('🔄 Fallback: Searching for prices with enhanced methods...');
         
                   // Try Facebook-specific price patterns first
          const fbPriceMatches = htmlContent.match(/data-price="([^"]+)"/gi);
          if (fbPriceMatches && fbPriceMatches.length > 0) {
            const validPrices = fbPriceMatches
              .map(p => p.match(/data-price="([^"]+)"/i)?.[1])
              .filter(p => p && !isNaN(parseFloat(p)))
              .map(p => parseFloat(p))
              .filter(p => p >= 1 && p <= 10000);
            
            if (validPrices.length > 0) {
              // Don't set price automatically - let user enter it
              console.log('✅ Fallback Facebook data-price attribute found but not setting automatically:', Math.max(...validPrices));
            }
          }
         
                   // Try aria-label with price
          if (!price) {
            const ariaPriceMatches = htmlContent.match(/aria-label="[^"]*\$(\d+(?:\.\d{2})?)[^"]*"/gi);
            if (ariaPriceMatches && ariaPriceMatches.length > 0) {
              const validPrices = ariaPriceMatches
                .map(p => p.match(/\$(\d+(?:\.\d{2})?)/i)?.[1])
                .filter(p => p && !isNaN(parseFloat(p)))
                .map(p => parseFloat(p))
                .filter(p => p >= 1 && p <= 10000);
              
              if (validPrices.length > 0) {
                // Don't set price automatically - let user enter it
                console.log('✅ Fallback aria-label price found but not setting automatically:', Math.max(...validPrices));
              }
            }
          }
         
                   // Try any dollar amounts in the HTML (final fallback)
          if (!price) {
            const allPrices = htmlContent.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/gi);
            if (allPrices && allPrices.length > 0) {
              // Filter and find the most likely main product price
              const validPrices = allPrices
                .map(p => parseFloat(p.replace('$', '').replace(',', '')))
                .filter(p => p >= 1 && p <= 1000); // Lowered max to avoid high numbers like 8500
              
              if (validPrices.length > 0) {
                // Don't set price automatically - let user enter it
                const minPrice = Math.min(...validPrices);
                console.log('✅ Final fallback price found but not setting automatically:', minPrice);
              }
            }
          }
       }
      
      // Description fallback - look for any meta description
      if (!description) {
        const metaDescMatch = htmlContent.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
        if (metaDescMatch && metaDescMatch[1]) {
          description = metaDescMatch[1].trim();
          console.log('✅ Fallback description found:', description);
        }
      }
      
      // Image fallback - look for ANY image aggressively
      if (!imageUrl) {
        console.log('🔄 Fallback: Searching for ANY image on the page...');
        
        // Try Facebook CDN images
        const fbImageMatch = htmlContent.match(/(https:\/\/scontent[^"]*\.fbcdn\.net[^"]*)/i);
        if (fbImageMatch) {
          imageUrl = fbImageMatch[1];
          console.log('✅ Fallback Facebook CDN image found:', imageUrl);
        }
        
        // If still no image, try ANY image tag
        if (!imageUrl) {
          const imgTagMatch = htmlContent.match(/<img[^>]*src="([^"]+)"/i);
          if (imgTagMatch) {
            imageUrl = imgTagMatch[1];
            console.log('✅ Fallback img tag image found:', imageUrl);
          }
        }
        
        // If still no image, try background images
        if (!imageUrl) {
          const bgImageMatch = htmlContent.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
          if (bgImageMatch) {
            imageUrl = bgImageMatch[1];
            console.log('✅ Fallback background image found:', imageUrl);
          }
        }
      }
        
      // Set defaults if data is missing
      if (!productName) {
        productName = 'Facebook Marketplace Product';
        console.log('⚠️ Product name not found, using default');
      }
      
              // CRITICAL FIX: Ensure price always starts with just $ sign
        if (!price || price === '$0.00' || price === '0.00') {
          price = '$';
          console.log('⚠️ Price not found or invalid, using default $ sign');
        } else {
          // Always start with just $ sign, don't auto-fill price
          price = '$';
          console.log('✅ Price set to default $ sign (user must enter amount)');
        }
      
      if (!description) {
        description = 'Product description not available. Please edit manually.';
        console.log('⚠️ Description not found, using default');
      }
      
      if (!imageUrl) {
        imageUrl = 'https://via.placeholder.com/150?text=No+Image';
        console.log('⚠️ Image URL not found, using default');
      }
      
      // Clean up the extracted data
      if (productName) {
        productName = productName.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        
        // Don't extract price from product name - let user enter it manually
        console.log('✅ Price will be entered manually by user');
        
        // Clean up product name - remove price info and make it shorter
        productName = productName
          .replace(/\$\d+(?:\.\d{2})?/gi, '') // Remove price
          .replace(/for\s+\$\d+/gi, '') // Remove "for $X"
          .replace(/everything\s+in\s+the\s+picture/gi, '') // Remove "everything in the picture"
          .replace(/\s+/g, ' ') // Clean up extra spaces
          .trim();
        
        // If product name is too long, truncate it
        if (productName.length > 80) {
          productName = productName.substring(0, 80) + '...';
          console.log('✅ Product name truncated to:', productName);
        }
      }
      
      if (description) {
        description = description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      }
      
      const extractedData = {
        productName,
        price,
        description,
        imageUrl,
        images: allImages
      };
      
      console.log('📝 Final extracted data:', extractedData);
      return extractedData;
      
    } catch (error) {
      console.error('🚨 Error parsing Facebook HTML:', error);
      throw error;
    }
  };

     // Special function to find Facebook-specific price patterns
   const findFacebookPrice = async (htmlContent) => {
     console.log('💰 FACEBOOK PRICE SEARCH: Looking for Facebook-specific price patterns...');
     
     let foundPrice = null;
     
     // Method 1: Look for Facebook's specific price data attributes
     const dataPriceMatches = htmlContent.match(/data-price="([^"]+)"/gi);
     if (dataPriceMatches && dataPriceMatches.length > 0) {
       const validPrices = dataPriceMatches
         .map(p => p.match(/data-price="([^"]+)"/i)?.[1])
         .filter(p => p && !isNaN(parseFloat(p)))
         .map(p => parseFloat(p))
         .filter(p => p >= 1 && p <= 10000);
       
       if (validPrices.length > 0) {
         foundPrice = Math.max(...validPrices);
         console.log('💰 Method 1 - Facebook data-price attribute:', foundPrice);
         return foundPrice;
       }
     }
     
     // Method 2: Look for Facebook's price in aria-labels
     const ariaPriceMatches = htmlContent.match(/aria-label="[^"]*\$(\d+(?:\.\d{2})?)[^"]*"/gi);
     if (ariaPriceMatches && ariaPriceMatches.length > 0) {
       const validPrices = ariaPriceMatches
         .map(p => p.match(/\$(\d+(?:\.\d{2})?)/i)?.[1])
         .filter(p => p && !isNaN(parseFloat(p)))
         .map(p => parseFloat(p))
         .filter(p => p >= 1 && p <= 10000);
       
       if (validPrices.length > 0) {
         foundPrice = Math.max(...validPrices);
         console.log('💰 Method 2 - Aria-label price:', foundPrice);
         return foundPrice;
       }
     }
     
     // Method 3: Look for Facebook's price in specific div structures
     const priceDivMatches = htmlContent.match(/<div[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\$\d+(?:\.\d{2})?)[\s\S]*?<\/div>/gi);
     if (priceDivMatches && priceDivMatches.length > 0) {
       const validPrices = priceDivMatches
         .map(p => p.match(/\$(\d+(?:\.\d{2})?)/i)?.[1])
         .filter(p => p && !isNaN(parseFloat(p)))
         .map(p => parseFloat(p))
         .filter(p => p >= 1 && p <= 10000);
       
       if (validPrices.length > 0) {
         foundPrice = Math.max(...validPrices);
         console.log('💰 Method 3 - Price div structure:', foundPrice);
         return foundPrice;
       }
     }
     
     // Method 4: Look for Facebook's price in span structures
     const priceSpanMatches = htmlContent.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\$\d+(?:\.\d{2})?)[\s\S]*?<\/span>/gi);
     if (priceSpanMatches && priceSpanMatches.length > 0) {
       const validPrices = priceSpanMatches
         .map(p => p.match(/\$(\d+(?:\.\d{2})?)/i)?.[1])
         .filter(p => p && !isNaN(parseFloat(p)))
         .map(p => parseFloat(p))
         .filter(p => p >= 1 && p <= 10000);
       
       if (validPrices.length > 0) {
         foundPrice = Math.max(...validPrices);
         console.log('💰 Method 4 - Price span structure:', foundPrice);
         return foundPrice;
       }
     }
     
     // Method 5: Look for Facebook's price in specific text patterns (most aggressive)
     console.log('💰 Method 5 - Aggressive text pattern search...');
     
     // Remove all HTML tags to get clean text
     const cleanText = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
     console.log('💰 Clean text preview (first 500 chars):', cleanText.substring(0, 500));
     
     // Look for price patterns in the clean text
     const pricePatterns = [
       /\$(\d{1,2}(?:\.\d{2})?)/g,  // $25, $25.00, $5.50
       /(\d{1,2})\s*dollars?/gi,     // 25 dollars, 25 dollar
       /(\d{1,2})\s*bucks?/gi,       // 25 bucks, 25 buck
       /price[:\s]*\$?(\d{1,2})/gi,  // price: 25, price $25
       /cost[:\s]*\$?(\d{1,2})/gi,   // cost: 25, cost $25
       /selling[:\s]*\$?(\d{1,2})/gi, // selling: 25, selling $25
       /for\s*\$?(\d{1,2})/gi,       // for 25, for $25
     ];
     
     for (const pattern of pricePatterns) {
       const matches = cleanText.match(pattern);
       if (matches && matches.length > 0) {
         for (const match of matches) {
           const priceMatch = match.match(/(\d{1,2})/);
           if (priceMatch && priceMatch[1]) {
             const price = parseFloat(priceMatch[1]);
             if (price >= 1 && price <= 1000) { // Reasonable price range for most items
               console.log('💰 Method 5 - Found price with pattern:', pattern.source, '=', price);
               return price;
             }
           }
         }
       }
     }
     
     // Method 6: Look for any dollar amounts but filter out very high ones (likely not the main price)
     const allDollarMatches = cleanText.match(/\$(\d+(?:\.\d{2})?)/gi);
     if (allDollarMatches && allDollarMatches.length > 0) {
       const validPrices = allDollarMatches
         .map(p => p.match(/\$(\d+(?:\.\d{2})?)/i)?.[1])
         .filter(p => p && !isNaN(parseFloat(p)))
         .map(p => parseFloat(p))
         .filter(p => p >= 1 && p <= 1000); // Lowered max to avoid high numbers like 8500
       
       if (validPrices.length > 0) {
         // Take the LOWEST reasonable price (usually the main product price)
         const foundPrice2 = Math.min(...validPrices);
         console.log('💰 Method 6 - Lowest reasonable price found:', foundPrice2);
         return foundPrice2;
       }
     }
     
     console.log('❌ No Facebook-specific price found with any method');
     return null;
   };

   // Special function to just find ANY image on the page
   const findAnyImage = async (htmlContent, url) => {
    console.log('🖼️ IMAGE SEARCH: Looking for ANY image on the page...');
    
    let allImages = [];
    
    // Method 1: Open Graph images
    const ogImageMatch = htmlContent.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogImageMatch && ogImageMatch[1]) {
      const ogImage = ogImageMatch[1].trim();
      allImages.push(ogImage);
      console.log('🖼️ Method 1 - Open Graph image:', ogImage);
    }
    
    // Method 2: Facebook CDN images (most common)
    const fbImageMatches = htmlContent.match(/(https:\/\/scontent[^"]*\.fbcdn\.net[^"]*)/gi);
    if (fbImageMatches && fbImageMatches.length > 0) {
      fbImageMatches.forEach(match => {
        const cleanUrl = match.trim();
        if (!allImages.includes(cleanUrl) && cleanUrl.includes('http')) {
          allImages.push(cleanUrl);
        }
      });
      console.log('🖼️ Method 2 - Facebook CDN images found:', fbImageMatches.length);
    }
    
    // Method 3: Any image tag
    const imgTagMatches = htmlContent.match(/<img[^>]*src="([^"]+)"/gi);
    if (imgTagMatches && imgTagMatches.length > 0) {
      imgTagMatches.forEach(match => {
        const srcMatch = match.match(/src="([^"]+)"/i);
        if (srcMatch && srcMatch[1].includes('http') && !allImages.includes(srcMatch[1])) {
          allImages.push(srcMatch[1]);
        }
      });
      console.log('🖼️ Method 3 - Image tags found:', imgTagMatches.length);
    }
    
    // Method 4: Any URL ending with image extension
    const anyImageMatches = htmlContent.match(/(https:\/\/[^"]*\.(?:jpg|jpeg|png|webp|gif))/gi);
    if (anyImageMatches && anyImageMatches.length > 0) {
      anyImageMatches.forEach(match => {
        const cleanUrl = match.trim();
        if (!allImages.includes(cleanUrl)) {
          allImages.push(cleanUrl);
        }
      });
      console.log('🖼️ Method 4 - Any image URLs found:', anyImageMatches.length);
    }
    
    // Method 5: Relative image paths
    const relativeImageMatches = htmlContent.match(/(\/[^"]*\.(?:jpg|jpeg|png|webp|gif))/gi);
    if (relativeImageMatches && relativeImageMatches.length > 0) {
      const baseUrl = new URL(url).origin;
      relativeImageMatches.forEach(match => {
        const absoluteUrl = baseUrl + match.trim();
        if (!allImages.includes(absoluteUrl)) {
          allImages.push(absoluteUrl);
        }
      });
      console.log('🖼️ Method 5 - Relative image paths found:', relativeImageMatches.length);
    }
    
    // Method 6: Background images
    const bgImageMatches = htmlContent.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/gi);
    if (bgImageMatches && bgImageMatches.length > 0) {
      bgImageMatches.forEach(match => {
        const urlMatch = match.match(/url\(['"]?([^'")\s]+)['"]?\)/i);
        if (urlMatch && urlMatch[1].includes('http') && !allImages.includes(urlMatch[1])) {
          allImages.push(urlMatch[1]);
        }
      });
      console.log('🖼️ Method 6 - Background images found:', bgImageMatches.length);
    }
    
    // Filter out invalid images and remove duplicates
    allImages = allImages.filter(img => 
      img && 
      img.startsWith('http') && 
      !img.includes('data:') && 
      !img.includes('placeholder') &&
      !img.includes('avatar') &&
      !img.includes('profile') &&
      !img.includes('icon')
    );
    
    // Remove duplicates while preserving order
    allImages = [...new Set(allImages)];
    
    console.log('🖼️ Total unique images found:', allImages.length);
    
    if (allImages.length > 0) {
      return allImages[0]; // Return first image for backward compatibility
    }
    
    console.log('❌ No image found with any method');
    return null;
  };

  const scrapeFacebookData = async (url) => {
    try {
      console.log('🔍 Starting Facebook data scraping...');
      setIsScraping(true);
      setLoading(true);
      
      console.log('🌐 Attempting to scrape data from:', url);
      
      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
      });
      
      // Try multiple approaches to get the data
      let extractedData = null;
      
      // Approach 1: Try to fetch the page directly
      try {
        console.log('🔄 Approach 1: Direct fetch with enhanced headers...');
        
        const fetchPromise = fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
          },
          credentials: 'omit',
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (response.ok) {
          const htmlContent = await response.text();
          console.log('📄 HTML content received, length:', htmlContent.length);
          console.log('🔍 HTML preview (first 1000 chars):', htmlContent.substring(0, 1000));
          
          // Even if it's a login page, try to extract what we can
          console.log('🔍 Attempting to parse HTML content...');
          extractedData = await parseFacebookHTML(htmlContent, url);
          
                     // If we didn't get a price, try the dedicated Facebook price finder
           if (!extractedData.price || extractedData.price === '$0.00') {
             console.log('💰 No price found in main parsing, trying dedicated Facebook price finder...');
             const foundPrice = await findFacebookPrice(htmlContent);
             if (foundPrice) {
               extractedData.price = `$${foundPrice.toFixed(2)}`;
               console.log('💰 Price found by dedicated finder:', extractedData.price);
             }
           }
           
           // If we didn't get an image, try the dedicated image finder
           if (!extractedData.imageUrl || extractedData.imageUrl === 'https://via.placeholder.com/150?text=No+Image') {
             console.log('🖼️ No image found in main parsing, trying dedicated image finder...');
             const foundImage = await findAnyImage(htmlContent, url);
             if (foundImage) {
               extractedData.imageUrl = foundImage;
               console.log('🖼️ Image found by dedicated finder:', foundImage);
             }
           }
           
                       // Ensure we have the images array populated
            if (extractedData.images && extractedData.images.length > 0) {
              console.log('🖼️ Multiple images found:', extractedData.images.length);
            } else if (extractedData.imageUrl && extractedData.imageUrl !== 'https://via.placeholder.com/150?text=No+Image') {
              // If we only have imageUrl, create images array with it
              extractedData.images = [extractedData.imageUrl];
              console.log('🖼️ Single image converted to array');
            }
            
            // CRITICAL FIX: Filter out invalid images and limit to reasonable number
            if (extractedData.images && extractedData.images.length > 0) {
              // Filter out invalid images
              extractedData.images = extractedData.images.filter(img => 
                img && 
                img.startsWith('http') && 
                !img.includes('data:') && 
                !img.includes('placeholder') &&
                !img.includes('avatar') &&
                !img.includes('profile') &&
                !img.includes('icon') &&
                !img.includes('fbcdn.net') // Filter out Facebook CDN images that might be duplicates
              );
              
              // Limit to first 10 images to avoid overwhelming the UI
              if (extractedData.images.length > 10) {
                extractedData.images = extractedData.images.slice(0, 10);
                console.log('🖼️ Limited images to first 10 to avoid UI issues');
              }
              
              console.log('🖼️ Filtered images array length:', extractedData.images.length);
            }
            
            // CRITICAL FIX: If images array is empty but we have a valid imageUrl, populate it
            console.log('🖼️ DEBUG: Checking if we need to populate images array');
            console.log('🖼️ DEBUG: extractedData.images:', extractedData.images);
            console.log('🖼️ DEBUG: extractedData.imageUrl:', extractedData.imageUrl);
            console.log('🖼️ DEBUG: images length:', extractedData.images ? extractedData.images.length : 'undefined');
            console.log('🖼️ DEBUG: imageUrl includes fbcdn.net:', extractedData.imageUrl ? extractedData.imageUrl.includes('fbcdn.net') : 'no imageUrl');
            
            if ((!extractedData.images || extractedData.images.length === 0) && 
                extractedData.imageUrl && 
                extractedData.imageUrl.includes('fbcdn.net')) {
              // Decode HTML entities in the image URL before adding to images array
              const decodedImageUrl = extractedData.imageUrl
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#x27;/g, "'");
              
              extractedData.images = [decodedImageUrl];
              console.log('🖼️ CRITICAL FIX: Populated images array with decoded imageUrl:', extractedData.images);
            } else {
              console.log('🖼️ DEBUG: Not populating images array - conditions not met');
            }
            
            // Debug: Log the final images array
            console.log('🖼️ Final images array:', extractedData.images);
            console.log('🖼️ Images array length:', extractedData.images ? extractedData.images.length : 'undefined');
            
            // Start preloading images for instant display
            if (extractedData.images && extractedData.images.length > 0) {
              console.log('🚀 Starting image preloading for instant display...');
              preloadImages(extractedData.images);
            } else if (extractedData.imageUrl && extractedData.imageUrl.includes('fbcdn.net')) {
              console.log('🚀 Starting single image preloading for instant display...');
              preloadImages([extractedData.imageUrl]);
            }
          
                     if (extractedData && extractedData.productName && extractedData.productName !== 'Facebook Marketplace Product') {
             console.log('✅ Successfully extracted data from HTML:', extractedData);
             
             // Decode HTML entities in the image URL
             if (extractedData.imageUrl) {
               extractedData.imageUrl = extractedData.imageUrl
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"');
               console.log('🔧 Decoded image URL:', extractedData.imageUrl);
             }
             
             console.log('🔍 DEBUG - Product Name:', extractedData.productName);
             console.log('🔍 DEBUG - Price:', extractedData.price);
             console.log('🔍 DEBUG - Image URL:', extractedData.imageUrl);
             setExtractedData(extractedData);
             await saveToSupabase(extractedData);
             return;
           } else {
            console.log('⚠️ HTML parsing did not yield useful data, trying next approach...');
          }
        } else {
          console.log('⚠️ HTTP error:', response.status);
        }
      } catch (fetchError) {
        console.log('⚠️ Direct fetch failed:', fetchError.message);
      }
      
      // Approach 2: Try to convert share URL to marketplace URL
      if (!extractedData || !extractedData.productName || extractedData.productName === 'Facebook Marketplace Product') {
        try {
          console.log('🔄 Approach 2: Converting share URL to marketplace format...');
          
          // Convert share URL to marketplace format
          let marketplaceUrl = url;
          if (url.includes('/share/')) {
            const postId = url.match(/\/share\/([^\/\?]+)/)?.[1];
            if (postId) {
              marketplaceUrl = `https://www.facebook.com/marketplace/item/${postId}`;
              console.log('🔄 Converted to marketplace URL:', marketplaceUrl);
              
              const response = await fetch(marketplaceUrl, {
                method: 'GET',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
                credentials: 'omit',
              });
              
              if (response.ok) {
                const htmlContent = await response.text();
                console.log('📄 Marketplace HTML received, length:', htmlContent.length);
                
                extractedData = await parseFacebookHTML(htmlContent, marketplaceUrl);
                
                                 // If we didn't get a price, try the dedicated Facebook price finder
                 if (!extractedData.price || extractedData.price === '$0.00') {
                   console.log('💰 No price found in marketplace parsing, trying dedicated Facebook price finder...');
                   const foundPrice = await findFacebookPrice(htmlContent);
                   if (foundPrice) {
                     extractedData.price = `$${foundPrice.toFixed(2)}`;
                     console.log('💰 Price found by dedicated finder in marketplace:', extractedData.price);
                   }
                 }
                 
                                   // If we didn't get an image, try the dedicated image finder
                  if (!extractedData.imageUrl || extractedData.imageUrl === 'https://via.placeholder.com/150?text=No+Image') {
                    console.log('🖼️ No image found in marketplace parsing, trying dedicated image finder...');
                    const foundImage = await findAnyImage(htmlContent, marketplaceUrl);
                    if (foundImage) {
                      extractedData.imageUrl = foundImage;
                      console.log('🖼️ Image found by dedicated finder in marketplace:', foundImage);
                    }
                  }
                  
                                     // Ensure we have the images array populated for marketplace approach
                   if (extractedData.images && extractedData.images.length > 0) {
                     console.log('🖼️ Multiple images found in marketplace:', extractedData.images.length);
                   } else if (extractedData.imageUrl && extractedData.imageUrl !== 'https://via.placeholder.com/150?text=No+Image') {
                     // If we only have imageUrl, create images array with it
                     extractedData.images = [extractedData.imageUrl];
                     console.log('🖼️ Single image converted to array in marketplace');
                   }
                   
                   // CRITICAL FIX: Filter out invalid images and limit to reasonable number for marketplace
                   if (extractedData.images && extractedData.images.length > 0) {
                     // Filter out invalid images
                     extractedData.images = extractedData.images.filter(img => 
                       img && 
                       img.startsWith('http') && 
                       !img.includes('data:') && 
                       !img.includes('placeholder') &&
                       !img.includes('avatar') &&
                       !img.includes('profile') &&
                       !img.includes('icon') &&
                       !img.includes('fbcdn.net') // Filter out Facebook CDN images that might be duplicates
                     );
                     
                     // Limit to first 10 images to avoid overwhelming the UI
                     if (extractedData.images.length > 10) {
                       extractedData.images = extractedData.images.slice(0, 10);
                       console.log('🖼️ Limited marketplace images to first 10 to avoid UI issues');
                     }
                     
                     console.log('🖼️ Filtered marketplace images array length:', extractedData.images.length);
                   }
                   
                   // CRITICAL FIX: If images array is empty but we have a valid imageUrl, populate it
                   console.log('🖼️ DEBUG MARKETPLACE: Checking if we need to populate images array');
                   console.log('🖼️ DEBUG MARKETPLACE: extractedData.images:', extractedData.images);
                   console.log('🖼️ DEBUG MARKETPLACE: extractedData.imageUrl:', extractedData.imageUrl);
                   console.log('🖼️ DEBUG MARKETPLACE: images length:', extractedData.images ? extractedData.images.length : 'undefined');
                   console.log('🖼️ DEBUG MARKETPLACE: imageUrl includes fbcdn.net:', extractedData.imageUrl ? extractedData.imageUrl.includes('fbcdn.net') : 'no imageUrl');
                   
                   if ((!extractedData.images || extractedData.images.length === 0) && 
                       extractedData.imageUrl && 
                       extractedData.imageUrl.includes('fbcdn.net')) {
                     // Decode HTML entities in the image URL before adding to images array
                     const decodedImageUrl = extractedData.imageUrl
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"')
                       .replace(/&#x27;/g, "'");
                     
                     extractedData.images = [decodedImageUrl];
                     console.log('🖼️ CRITICAL FIX: Populated marketplace images array with decoded imageUrl:', extractedData.images);
                   } else {
                     console.log('🖼️ DEBUG MARKETPLACE: Not populating images array - conditions not met');
                   }
                   
                   // Start preloading images for instant display (marketplace section)
                   if (extractedData.images && extractedData.images.length > 0) {
                     console.log('🚀 Starting marketplace image preloading for instant display...');
                     preloadImages(extractedData.images);
                   } else if (extractedData.imageUrl && extractedData.imageUrl.includes('fbcdn.net')) {
                     console.log('🚀 Starting marketplace single image preloading for instant display...');
                     preloadImages([extractedData.imageUrl]);
                   }
                
                                 if (extractedData && extractedData.productName && extractedData.productName !== 'Facebook Marketplace Product') {
                   console.log('✅ Successfully extracted data from marketplace URL:', extractedData);
                   
                   // Decode HTML entities in the image URL
                   if (extractedData.imageUrl) {
                     extractedData.imageUrl = extractedData.imageUrl
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"');
                     console.log('🔧 Decoded image URL:', extractedData.imageUrl);
                   }
                   
                   console.log('🔍 DEBUG - Product Name:', extractedData.productName);
                   console.log('🔍 DEBUG - Price:', extractedData.price);
                   console.log('🔍 DEBUG - Image URL:', extractedData.imageUrl);
                   setExtractedData(extractedData);
                   await saveToSupabase(extractedData);
                   return;
                 }
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Marketplace URL approach failed:', error.message);
        }
      }
      
      // Approach 3: Try to extract from URL parameters
      if (!extractedData || !extractedData.productName || extractedData.productName === 'Facebook Marketplace Product') {
        console.log('🔄 Approach 3: Extracting from URL parameters...');
        const urlData = await extractDataFromURL(url);
        if (urlData && urlData.productName && urlData.productName !== 'Facebook Product') {
          console.log('✅ URL extraction successful:', urlData);
          extractedData = urlData;
        }
      }
      
      // Approach 4: Try to find any text content that might be product info
      if (!extractedData || !extractedData.productName || extractedData.productName === 'Facebook Marketplace Product') {
        console.log('🔄 Approach 4: Searching for any product-like content...');
        
        try {
          // Make one more attempt with different headers
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
            credentials: 'omit',
          });
          
          if (response.ok) {
            const htmlContent = await response.text();
            console.log('📄 Mobile user-agent HTML received, length:', htmlContent.length);
            
            // Look for any text that might be product information
            const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            console.log('🔍 Text content preview:', textContent.substring(0, 500));
            
            // Try to find product-like patterns in the text
            const productPatterns = [
              /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Soundbar|Speaker|Audio|Electronics|TV|Monitor|Computer|Phone|Tablet|Laptop))/i,
              /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:for sale|available|selling))/i,
              /(\$\d+(?:\.\d{2})?)/g,
            ];
            
            let foundProductName = '';
            let foundPrice = '';
            
            for (const pattern of productPatterns) {
              const matches = textContent.match(pattern);
              if (matches) {
                if (pattern.source.includes('Soundbar') || pattern.source.includes('Speaker')) {
                  foundProductName = matches[1] || matches[0];
                } else if (pattern.source.includes('\\$')) {
                  foundPrice = matches[0];
                }
              }
            }
            
                         if (foundProductName || foundPrice) {
               // Don't set price automatically - let user enter it
               extractedData = {
                 productName: foundProductName || 'Product Found in Text',
                 price: '$', // Start with just $ sign
                 description: 'Product information extracted from page text content.',
                 imageUrl: 'https://via.placeholder.com/150?text=Text+Extracted'
               };
               console.log('✅ Extracted data from text content (price not auto-set):', extractedData);
             }
          }
        } catch (error) {
          console.log('⚠️ Text content extraction failed:', error.message);
        }
      }
      
             // If we still don't have data, show what we found and let user edit
       if (!extractedData || !extractedData.productName || extractedData.productName === 'Facebook Marketplace Product') {
         console.log('⚠️ All scraping approaches exhausted, showing manual input with hints...');
         
         // Try to give the user some hints about what might be on the page
         const hintData = {
           productName: isSelling ? 'Item Information (Please Edit)' : 'Product Information (Please Edit)',
           price: '$', // Keep $ prefix but remove initial price
           description: isSelling
             ? 'The app attempted to scrape Facebook but could not automatically extract the item details. This is common due to Facebook\'s security measures. Please open the URL in your browser and copy the item information manually to create an attractive listing.'
             : 'The app attempted to scrape Facebook but could not automatically extract the product details. This is common due to Facebook\'s security measures. Please open the URL in your browser and copy the product information manually.',
           imageUrl: 'https://via.placeholder.com/150?text=Manual+Input+Required',
           images: ['https://via.placeholder.com/150?text=Manual+Input+Required']
         };
         
         setExtractedData(hintData);
         // Removed alert to avoid popup when navigating
       } else {
                   // Ensure images array exists before setting data
          if (!extractedData.images || extractedData.images.length === 0) {
            if (extractedData.imageUrl && extractedData.imageUrl !== 'https://via.placeholder.com/150?text=No+Image') {
              extractedData.images = [extractedData.imageUrl];
              console.log('🖼️ Final fallback: Created images array from imageUrl');
            } else {
              extractedData.images = [];
              console.log('🖼️ Final fallback: No images available');
            }
          }
          
          // CRITICAL FIX: Final filtering of images array
          if (extractedData.images && extractedData.images.length > 0) {
            // Filter out invalid images
            extractedData.images = extractedData.images.filter(img => 
              img && 
              img.startsWith('http') && 
              !img.includes('data:') && 
              !img.includes('placeholder') &&
              !img.includes('avatar') &&
              !img.includes('profile') &&
              !img.includes('icon') &&
              !img.includes('fbcdn.net') // Filter out Facebook CDN images that might be duplicates
            );
            
            // Limit to first 10 images to avoid overwhelming the UI
            if (extractedData.images.length > 10) {
              extractedData.images = extractedData.images.slice(0, 10);
              console.log('🖼️ Final fallback: Limited images to first 10 to avoid UI issues');
            }
            
            console.log('🖼️ Final fallback: Filtered images array length:', extractedData.images.length);
          }
          
          console.log('🖼️ Final extracted data with images:', extractedData);
          // We found some data, show it to the user
          setExtractedData(extractedData);
          // Removed alert to avoid popup when navigating
       }
      
    } catch (error) {
      console.error('🚨 Facebook scraping error:', error);
      
      // Show error but still let user input manually
      const errorData = {
        productName: isSelling ? 'Item Information (Error Occurred)' : 'Product Information (Error Occurred)',
        price: '$', // Keep $ prefix but remove initial price
        description: isSelling
          ? 'An error occurred during scraping: ' + error.message + '\n\nPlease enter your item details manually below to create a listing.'
          : 'An error occurred during scraping: ' + error.message + '\n\nPlease enter the product details manually below.',
        imageUrl: 'https://via.placeholder.com/150?text=Error+Occurred'
      };
      
      setExtractedData(errorData);
      // Removed alert to avoid popup when navigating
      
    } finally {
      setIsScraping(false);
      setLoading(false);
    }
  };

  const saveToSupabase = async (data) => {
    try {
      console.log('💾 saveToSupabase called with data:', data);
      console.log('💾 Product URL:', productUrl);
      
      console.log('👤 Getting user ID...');
      const userResponse = await supabase.auth.getUser();
      console.log('👤 User response:', userResponse);
      
      // Check if user is authenticated
      if (!userResponse.data.user) {
        console.log('❌ No authenticated user found');
        Alert.alert(
          'Authentication Required', 
          'Please log in again to save your product information.',
          [
            { text: 'OK', onPress: () => navigation.navigate('Welcomepage') }
          ]
        );
        return;
      }
      
      const userId = userResponse.data.user?.id;
      console.log('👤 User ID:', userId);
      
      // CRITICAL FIX: Ensure price is always a valid number
      let parsedPrice = 0.00;
      try {
        // Clean the price string by removing dollar signs, commas, and extra spaces
        const cleanPrice = data.price.toString().replace(/[$,]/g, '').trim();
        parsedPrice = parseFloat(cleanPrice);
        
        // Validate that we got a valid number
        if (isNaN(parsedPrice) || parsedPrice < 0 || data.price === '$') {
          console.log('⚠️ Invalid price detected, using default:', data.price);
          parsedPrice = 0.00;
        }
        
        console.log('💰 Price parsing - Original:', data.price, 'Cleaned:', cleanPrice, 'Parsed:', parsedPrice);
      } catch (priceError) {
        console.log('⚠️ Price parsing error, using default:', priceError);
        parsedPrice = 0.00;
      }
      
      const insertData = {
        url: productUrl,
        name: data.productName || 'Unknown Product',
        price: parsedPrice, // Use the validated price
        description: data.description || 'No description available',
        image_url: data.imageUrl || null,
        user_id: userId,
        created_at: new Date().toISOString()
      };
      
      console.log('💾 Inserting data into Supabase:', insertData);
      
      // First check if products table exists
      const { error: tableCheckError } = await supabase
        .from('products')
        .select('*')
        .limit(1);
      
              if (tableCheckError && tableCheckError.code === '42P01') {
          console.log('❌ Products table does not exist');
          Alert.alert(
            'Database Setup Required', 
            'The products table has not been created yet. You can still proceed with the transaction without saving to database.',
            [
              { 
                text: 'Continue Without Save', 
                onPress: () => {
                  console.log('⏭️ User chose to continue without database save');
                  Alert.alert(
                    'Product Extracted', 
                    'Product information has been extracted successfully. You can continue with the transaction.',
                    [{ text: 'OK' }]
                  );
                }
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
      
      // Try to insert the data
      const { data: result, error } = await supabase
        .from('products')
        .insert([insertData])
        .select();

      if (error) {
        console.log('❌ Supabase error:', error);
        
        // Handle specific authentication errors
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          Alert.alert(
            'Authentication Error', 
            'Your session has expired. Please log in again.',
            [
              { text: 'OK', onPress: () => navigation.navigate('Welcomepage') }
            ]
          );
        } else if (error.code === '23505') {
          // Unique constraint violation (duplicate URL)
          console.log('⚠️ Product with this URL already exists');
          Alert.alert(
            'Duplicate Product', 
            'This product has already been processed. You can still proceed with the transaction.',
            [
              { text: 'OK' }
            ]
          );
        } else if (error.code === '23502') {
          // NOT NULL constraint violation
          console.log('❌ NOT NULL constraint violation:', error.message);
          Alert.alert(
            'Data Validation Error', 
            'Some required product information is missing. Please check that all fields are filled correctly.',
            [
              { text: 'OK' }
            ]
          );
        } else {
          throw error;
        }
        return;
      }
      
      console.log('✅ Product saved to Supabase:', result);
      
    } catch (error) {
      console.error('🚨 Supabase save error:', error);
      
      // Handle network or other errors
      if (error.message?.includes('fetch')) {
        Alert.alert(
          'Network Error', 
          'Unable to connect to the server. Please check your internet connection and try again.',
          [
            { text: 'OK', onPress: () => navigation.navigate('Welcomepage') }
          ]
        );
      } else {
        Alert.alert(
          'Warning', 
          'Product extracted but failed to save to database. You can still proceed with the transaction.',
          [
            { text: 'OK' }
          ]
        );
      }
    }
  };

  const handleManualEdit = (field, value) => {
    if (field === 'price') {
      // Handle price field specially - ensure it always has a $ prefix
      let cleanValue = value;
      if (value && !value.startsWith('$')) {
        cleanValue = '$' + value;
      }
      // If the value is empty, just keep the $ prefix
      if (!value || value.trim() === '') {
        cleanValue = '$';
      }
      setExtractedData(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    } else if (field === 'imageUrl') {
      // When manually editing imageUrl, also update the images array
      setExtractedData(prev => ({
        ...prev,
        [field]: value,
        images: value ? [value] : []
      }));
    } else {
      setExtractedData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = () => {
    if (!extractedData.productName || !extractedData.price || extractedData.price === '$') {
      Alert.alert('Error', 'Please ensure product name and price are filled');
      return;
    }

    // 👇 Build and pass invite payload + deep link
    const invitePayload = buildInvitePayload();
    const inviteUrl = makeInviteLink(invitePayload);

    // Only show the modal for sellers
    if (isSelling) {
      setShowModal(true);
    } else {
      // For buyers, navigate directly to ConfirmAddress
      navigation.navigate('ConfirmAddress', {
        productUrl,
        productPrice: extractedData.price,
        userAddress,
        productName: extractedData.productName,
        productDescription: extractedData.description,
        productImage: extractedData.imageUrl,
        transactionType,
        userProfile,
        invitePayload, // 🔗
        inviteUrl,     // 🔗
      });
    }
  };

  // Handle modal actions
  const handleIUnderstand = () => {
    setShowModal(false);
    // Check if price is valid before navigating
    if (extractedData.price === '$') {
      Alert.alert('Error', 'Please enter a valid price before continuing');
      return;
    }

    // 👇 Build and pass invite payload + deep link
    const invitePayload = buildInvitePayload();
    const inviteUrl = makeInviteLink(invitePayload);

    // Navigate to ConfirmAddress page
    navigation.navigate('ConfirmAddress', {
      productUrl,
      productPrice: extractedData.price,
      userAddress,
      productName: extractedData.productName,
      productDescription: extractedData.description,
      productImage: extractedData.imageUrl,
      transactionType, // Pass along the transaction type
      userProfile,
      invitePayload, // 🔗
      inviteUrl,     // 🔗
    });
  };

  const handleCancelTransaction = () => {
    setShowModal(false);
    // Return to welcome page without saving data
    navigation.navigate('Welcomepage');
  };

  const handleRetakeScreenshot = () => {
    setExtractedData({
      productName: '',
      price: '$', // Reset to just $ sign
      description: '',
      imageUrl: '',
      images: []
    });
    // Restart scraping
    scrapeFacebookData(productUrl);
  };

  const handleProfilePress = () => {
    navigation.navigate('MyAccount', { userData: userProfile });
  };



  // Removed the first loading screen to avoid duplicate loading states

  // Debug: Log the current extractedData state
  console.log('🖼️ UI Render - Current extractedData:', extractedData);
  console.log('🖼️ UI Render - Images array:', extractedData.images);
  console.log('🖼️ UI Render - Images length:', extractedData.images ? extractedData.images.length : 'undefined');

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

        <TouchableOpacity onPress={handleProfilePress} style={styles.profileContainer}>
          {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
            <Image 
              source={{ uri: userProfile.avatar_url }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>
                {userProfile ? getUserInitials(userProfile) : 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {/* Bars on top */}
        <View style={styles.progressBar}>
          <View style={[styles.stepIndicator, styles.stepActive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
        </View>
        
        {/* Words underneath the bars */}
        <View style={styles.progressLabels}>
          <Text style={[styles.stepText, styles.stepTextFirst]}>Product</Text>
          <Text style={[styles.stepText, styles.stepTextSecond]}>Address</Text>
          <Text style={[styles.stepText, styles.stepTextThird]}>Payment</Text>
          <Text style={[styles.stepText, styles.stepTextFourth]}>Share</Text>
        </View>
      </View>

      {/* Main Content with Keyboard Avoidance */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.mainContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
        <View style={styles.contentContainer}>
          
          {!extractedData.productName ? (
            <View style={styles.webViewContainer}>
              <Text style={styles.sectionTitle}>
                {isSelling ? 'Facebook Marketplace Seller' : 'Facebook Marketplace Scraper'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {isSelling 
                  ? 'Automatically extracting product information for listing: ' + productUrl
                  : 'Automatically extracting product information from: ' + productUrl
                }
              </Text>
              
                             {/* Note section removed */}
              
              {/* Loading State - Couri AI Style */}
              <View style={styles.couriLoadingContainer}>
                {/* Main Modal */}
                <View style={styles.couriModal}>
                  {/* Central Icon */}
                  <View style={styles.couriIconContainer}>
                    <View style={styles.couriIconOuter}>
                      <View style={styles.couriIconInner}>
                        <Image 
                          source={require('../assets/mark2_dark.png')} 
                          style={styles.couriIconImage}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Loading Text & Animation */}
                  <View style={styles.couriLoadingTextContainer}>
                    <View style={styles.sparkleAnimation} />
                    <Text style={styles.couriLoadingText}>
                      {checkmarkStates.filter(Boolean).length === 4 
                        ? 'Couri AI verification complete! ✨' 
                        : 'Couri AI assist... ✨'
                      }
                    </Text>
                  </View>

                  {/* Progress Steps */}
                  <View style={styles.verificationSteps}>
                    <View style={styles.verificationStep}>
                      <View style={[styles.checkmarkContainer, checkmarkStates[0] && styles.checkmarkContainerActive]}>
                        <Text style={[styles.checkmark, { opacity: checkmarkStates[0] ? 1 : 0.3 }]}>✓</Text>
                      </View>
                      <Text style={styles.verificationText}>Verifying the seller</Text>
                    </View>
                    
                    <View style={styles.verificationStep}>
                      <View style={[styles.checkmarkContainer, checkmarkStates[1] && styles.checkmarkContainerActive]}>
                        <Text style={[styles.checkmark, { opacity: checkmarkStates[1] ? 1 : 0.3 }]}>✓</Text>
                      </View>
                      <Text style={styles.verificationText}>Analyzing images and brand data</Text>
                    </View>
                    
                    <View style={styles.verificationStep}>
                      <View style={[styles.checkmarkContainer, checkmarkStates[2] && styles.checkmarkContainerActive]}>
                        <Text style={[styles.checkmark, { opacity: checkmarkStates[2] ? 1 : 0.3 }]}>✓</Text>
                      </View>
                      <Text style={styles.verificationText}>Scanning for fraud indicators</Text>
                    </View>
                    
                    <View style={styles.verificationStep}>
                      <View style={[styles.checkmarkContainer, checkmarkStates[3] && styles.checkmarkContainerActive]}>
                        <Text style={[styles.checkmark, { opacity: checkmarkStates[3] ? 1 : 0.3 }]}>✓</Text>
                      </View>
                      <Text style={styles.verificationText}>Preparing your secure transaction</Text>
                    </View>
                  </View>

                  {/* Bottom Animation */}
                  <View style={styles.bottomSparkleAnimation} />
                </View>
                
                {/* Image Preloading Indicator */}
                {preloadingImages && (
                  <View style={styles.imagePreloadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.imagePreloadingText}>Loading images for instant display...</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <>
              {/* Extracted Data Section */}
              <View style={styles.extractedDataContainer}>
              <Text style={styles.sectionTitle}>
                {isSelling ? 'Extracted Listing Information' : 'Extracted Product Information'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {isSelling 
                  ? 'Review and edit your listing information below'
                  : 'Review and edit the extracted information below'
                }
              </Text>
              
              {/* Product Information Card */}
              <TouchableOpacity 
                style={styles.productInfoCard}
                onPress={() => setShowProductModal(true)}
                activeOpacity={0.9}
              >
                {/* Product Image */}
                <View style={styles.productImageContainer}>
                  {extractedData.images && extractedData.images.length > 0 ? (
                    <View style={styles.photoSwiperContainer}>
                      <FlatList
                        data={extractedData.images}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => index.toString()}
                        onMomentumScrollEnd={(event) => {
                          const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
                          setCurrentImageIndex(index);
                        }}
                        getItemLayout={(data, index) => ({
                          length: 120,
                          offset: 120 * index,
                          index,
                        })}
                        renderItem={({ item, index }) => (
                          <View style={styles.photoSwiperItem}>
                            <Image 
                              source={{ uri: item }}
                              style={styles.productCardImage}
                              resizeMode="cover"
                              onLoad={() => console.log(`🖼️ Image ${index + 1} loaded successfully`)}
                              onError={(error) => console.log(`❌ Image ${index + 1} failed to load:`, error.nativeEvent.error)}
                            />
                          </View>
                        )}
                      />
                      
                      {/* Image Counter - Only show for multiple images */}
                      {extractedData.images.length > 1 && (
                        <View style={styles.imageCounter}>
                          <Text style={styles.imageCounterText}>
                            {currentImageIndex + 1} of {extractedData.images.length}
                          </Text>
                        </View>
                      )}
                      
                      {/* Image Dots - Only show for multiple images */}
                      {extractedData.images.length > 1 && (
                        <View style={styles.imageDots}>
                          {extractedData.images.map((_, index) => (
                            <View
                              key={index}
                              style={[
                                styles.imageDot,
                                index === currentImageIndex && styles.imageDotActive
                              ]}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    /* Fallback when no images - also check imageUrl for backward compatibility */
                    extractedData.imageUrl && 
                    extractedData.imageUrl !== 'https://via.placeholder.com/150?text=No+Image' &&
                    extractedData.imageUrl !== 'https://via.placeholder.com/150?text=Manual+Input+Required' &&
                    extractedData.imageUrl !== 'https://via.placeholder.com/150?text=Manual+Input' &&
                    extractedData.imageUrl !== 'https://via.placeholder.com/150?text=Error+Occurred' &&
                    extractedData.imageUrl.startsWith('http') ? (
                      <Image 
                        source={{ uri: extractedData.imageUrl }}
                        style={styles.productCardImage}
                        resizeMode="cover"
                        onLoad={() => console.log('🖼️ Single image loaded successfully')}
                        onError={(error) => console.log('❌ Single image failed to load:', error.nativeEvent.error)}
                      />
                    ) : (
                      <View style={styles.productCardImagePlaceholder}>
                        <Text style={styles.productCardImagePlaceholderText}>
                          {extractedData.imageUrl && 
                           extractedData.imageUrl !== 'https://via.placeholder.com/150?text=No+Image' &&
                           extractedData.imageUrl !== 'https://placeholder.com/150?text=Manual+Input+Required' &&
                           extractedData.imageUrl !== 'https://via.placeholder.com/150?text=Manual+Input' &&
                           extractedData.imageUrl !== 'https://via.placeholder.com/150?text=Error+Occurred' &&
                           extractedData.imageUrl.startsWith('http')
                            ? 'Loading image...' 
                            : 'No Image Available'}
                        </Text>
                      </View>
                    )
                  )}
                </View>
                
                {/* Product Details */}
                <View style={styles.productDetailsContainer}>
                  <Text style={styles.productTitle}>
                    {extractedData.productName || 'Product Name'}
                  </Text>
                  <View style={styles.sourceContainer}>
                    <Text style={styles.facebookIcon}>f</Text>
                    <Text style={styles.sourceText}>from Facebook Marketplace</Text>
                  </View>
                </View>
              </TouchableOpacity>
             
              {/* Price Input Card */}
              <View style={styles.priceInputCard}>
                <Text style={styles.priceLabel}>
                  {isSelling ? 'SELLING PRICE' : 'PRODUCT PRICE'}
                </Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.pricePrefix}>$</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    value={extractedData.price === '$' ? '' : extractedData.price.replace('$', '')}
                    onChangeText={(text) => handleManualEdit('price', text)}
                    placeholder=""
                    keyboardType="numeric"
                  />
                  {extractedData.price !== '$' && (
                    <TouchableOpacity 
                      style={styles.clearPriceButton}
                      onPress={() => handleManualEdit('price', '')}
                    >
                      <Text style={styles.clearPriceButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={styles.retakeButton} 
                  onPress={handleRetakeScreenshot}
                >
                  <Text style={styles.retakeButtonText}>
                    Retry Scraping
                  </Text>
                </TouchableOpacity>
               
                <TouchableOpacity 
                    style={styles.submitButton} 
                    onPress={handleSubmit}
                  >
                    <Text style={styles.submitButtonText}>
                      Submit
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
          
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

             {/* Modal Popup */}
       {showModal && (
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             {/* Icon */}
             <View style={styles.modalIconContainer}>
               <View style={styles.modalIconOuter}>
                 <View style={styles.modalIconInner}>
                   <Text style={styles.modalIconText}>CO</Text>
                 </View>
               </View>
             </View>

             {/* Title */}
             <Text style={styles.modalTitle}>Help Keep Couri Safe and Trusted</Text>

             {/* Body Text */}
             <Text style={styles.modalBodyText}>
               To protect our community, buyers have a 4-hour return window in case an item is fake, damaged, or misrepresented. Seller payouts are held until this window closes.
             </Text>
             
             <Text style={styles.modalBodyText}>
               Please ensure your listings are authentic and accurately described. <Text style={styles.modalBoldText}>Repeated violations will lead to account suspension.</Text>
             </Text>

             {/* Primary Button */}
             <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleIUnderstand}>
               <Text style={styles.modalPrimaryButtonText}>I understand</Text>
             </TouchableOpacity>

             {/* Secondary Button */}
             <TouchableOpacity style={styles.modalSecondaryButton} onPress={handleCancelTransaction}>
               <Text style={styles.modalSecondaryButtonText}>Cancel transaction</Text>
             </TouchableOpacity>
           </View>
         </View>
       )}

       {/* Product Details Modal */}
       {showProductModal && (
         <View style={styles.modalOverlay}>
           <View style={styles.productModalContainer}>
             {/* Close Button */}
             <TouchableOpacity 
               style={styles.closeButton}
               onPress={() => setShowProductModal(false)}
             >
               <Text style={styles.closeButtonText}>×</Text>
             </TouchableOpacity>

             {/* Product Image */}
             <View style={styles.productModalImageContainer}>
               {extractedData.images && extractedData.images.length > 0 ? (
                 <Image 
                   source={{ uri: extractedData.images[currentImageIndex] }}
                   style={styles.productModalImage}
                   resizeMode="cover"
                 />
               ) : (
                 <Image 
                   source={{ uri: extractedData.imageUrl }}
                   style={styles.productModalImage}
                   resizeMode="cover"
                 />
               )}
             </View>

             {/* Product Information */}
             <View style={styles.productModalInfo}>
               <Text style={styles.productModalTitle}>
                 {extractedData.productName || 'Product Name'}
               </Text>
               
               <View style={styles.productModalSource}>
                 <Text style={styles.facebookIcon}>f</Text>
                 <Text style={styles.sourceText}>from Facebook Marketplace</Text>
               </View>

               <Text style={styles.productModalDescription}>
                 {extractedData.description || 'No description available'}
               </Text>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  profileInitials: {
    color: '#444444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
    paddingTop: 0,
    alignItems: 'flex-start',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 0,
  },
  progressLabels: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 0,
    position: 'relative',
  },
  stepIndicator: {
    width: 80,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  stepActive: {
    backgroundColor: '#10B981',
  },
  stepInactive: {
    backgroundColor: '#E5E7EB',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#9CA3AF',
  },
  stepTextFirst: {
    position: 'absolute',
    left: '0%',
    color: '#000000',
  },
  stepTextSecond: {
    position: 'absolute',
    left: '25%',
    color: '#9CA3AF',
  },
  stepTextThird: {
    position: 'absolute',
    left: '50%',
    color: '#9CA3AF',
  },
  stepTextFourth: {
    position: 'absolute',
    left: '75%',
    color: '#9CA3AF',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 20,
    alignItems: 'center',
  },
  // Image preloading indicator styles
  imagePreloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  imagePreloadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  
  // Removed loading screen styles that are no longer needed
  webViewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  extractedDataContainer: {
    width: '100%',
    alignItems: 'center',
  },
  
     // Couri AI Loading Screen Styles
   couriLoadingContainer: {
     width: '100%',
     alignItems: 'center',
     paddingVertical: 20,
   },
   couriModal: {
     width: '90%',
     maxWidth: 400,
     backgroundColor: '#E8F4FD',
     borderRadius: 20,
     padding: 24,
     alignItems: 'center',
     shadowColor: '#000',
     shadowOffset: {
       width: 0,
       height: 4,
     },
     shadowOpacity: 0.15,
     shadowRadius: 12,
     elevation: 8,
     borderWidth: 1,
     borderColor: 'rgba(135, 206, 250, 0.3)',
   },
   couriIconContainer: {
     marginBottom: 20,
   },
   couriIconOuter: {
     width: 80,
     height: 80,
     borderRadius: 40,
     backgroundColor: '#fff',
     justifyContent: 'center',
     alignItems: 'center',
     shadowColor: '#000',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.1,
     shadowRadius: 6,
     elevation: 4,
   },
       couriIconInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 0,
    },
       couriIconImage: {
      width: 32,
      height: 32,
      resizeMode: 'contain',
    },
   couriLoadingTextContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 24,
   },
   sparkleAnimation: {
     width: 16,
     height: 16,
     backgroundColor: '#FFB6C1',
     borderRadius: 8,
     marginRight: 8,
     opacity: 0.8,
   },
   couriLoadingText: {
     fontSize: 18,
     fontWeight: '600',
     color: '#2F4F4F',
     textAlign: 'center',
   },
   verificationSteps: {
     width: '100%',
     gap: 16,
   },
   verificationStep: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#fff',
     borderRadius: 12,
     padding: 16,
     shadowColor: '#000',
     shadowOffset: {
       width: 0,
       height: 1,
     },
     shadowOpacity: 0.05,
     shadowRadius: 3,
     elevation: 2,
   },
   checkmarkContainer: {
     width: 24,
     height: 24,
     borderRadius: 12,
     backgroundColor: '#4CAF50',
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 12,
     opacity: 0.3,
   },
   checkmarkContainerActive: {
     opacity: 1,
     backgroundColor: '#4CAF50',
     shadowColor: '#4CAF50',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.3,
     shadowRadius: 4,
     elevation: 4,
   },
   checkmark: {
     color: '#fff',
     fontSize: 14,
     fontWeight: 'bold',
   },
   verificationText: {
     fontSize: 14,
     color: '#2F4F4F',
     fontWeight: '500',
     flex: 1,
   },
       bottomSparkleAnimation: {
      width: 24,
      height: 24,
      backgroundColor: '#FFB6C1',
      borderRadius: 12,
      marginTop: 16,
      opacity: 0.8,
    },
    // Progress indicator styles removed
     // Removed help note styles
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  webViewWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
     // Open in Browser button styles removed

  captureButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  imageContainer: {
    width: '100%',
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imagePlaceholderText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
   
  // Product Info Card Styles
  productInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '95%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImageContainer: {
    marginRight: 20,
  },
  productCardImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  productCardImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productCardImagePlaceholderText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  productDetailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    lineHeight: 24,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facebookIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1877F2',
    marginRight: 8,
  },
  sourceText: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // Price Input Card Styles
  priceInputCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '95%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  
  // Photo Swiper Styles (Updated for card layout)
  photoSwiperContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  photoSwiperItem: {
    width: 120, // Match the getItemLayout length
    height: 120,
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageDotActive: {
    backgroundColor: '#fff',
  },
  
  updateImageButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  updateImageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
     textInput: {
     borderWidth: 1,
     borderColor: '#E5E7EB',
     borderRadius: 8,
     padding: 16,
     fontSize: 16,
     backgroundColor: '#fff',
     minHeight: 48,
   },
   descriptionText: {
     fontSize: 16,
     color: '#374151',
     lineHeight: 24,
     paddingVertical: 16,
     paddingHorizontal: 16,
     backgroundColor: '#F9FAFB',
     borderRadius: 8,
     borderWidth: 1,
     borderColor: '#E5E7EB',
     minHeight: 48,
   },
  actionButtonsContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Price input styles
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  pricePrefix: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
     priceTextInput: {
     flex: 1,
     fontSize: 16,
     color: '#000',
     paddingVertical: 16,
     paddingRight: 16,
     minHeight: 48,
   },
   clearPriceButton: {
     width: 24,
     height: 24,
     borderRadius: 12,
     backgroundColor: '#E5E7EB',
     justifyContent: 'center',
     alignItems: 'center',
     marginLeft: 8,
   },
   clearPriceButtonText: {
     fontSize: 18,
     color: '#6B7280',
     fontWeight: 'bold',
   },

  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modalIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28,
  },
  modalBodyText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  modalBoldText: {
    fontWeight: 'bold',
  },
  modalPrimaryButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSecondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalSecondaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Product Modal Styles
  productModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  productModalImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  productModalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  productModalInfo: {
    width: '100%',
    alignItems: 'center',
  },
  productModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  productModalSource: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productModalDescription: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
