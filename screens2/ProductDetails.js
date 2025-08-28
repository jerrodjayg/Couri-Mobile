import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator,
  TextInput
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../screens/supabaseClient';

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
          price: formattedPrice,
          description: description || 'Product information extracted from URL parameters',
          imageUrl: 'https://via.placeholder.com/150?text=URL+Extracted'
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
           price = `$${parseFloat(ogPrice).toFixed(2)}`;
           console.log('✅ Open Graph price found:', price);
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
                   price = `$${parseFloat(foundPrice).toFixed(2)}`;
                   console.log('✅ Structured data price found:', price);
                   break;
                 }
               } else if (parsed.price && !isNaN(parseFloat(parsed.price))) {
                 price = `$${parseFloat(parsed.price).toFixed(2)}`;
                 console.log('✅ Direct structured data price found:', price);
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
             price = `$${Math.max(...validPrices).toFixed(2)}`;
             console.log('✅ Facebook data-price attribute found:', price);
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
             price = `$${Math.max(...validPrices).toFixed(2)}`;
             console.log('✅ Aria-label price found:', price);
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
             // Take the LOWEST reasonable price (usually the main product price)
             const minPrice = Math.min(...validPrices);
             price = `$${minPrice.toFixed(2)}`;
             console.log('✅ Fallback price found (filtered, lowest):', price);
           }
         }
       }
      
      // 3. QUICK DESCRIPTION: Look for Open Graph description
      const ogDescMatch = htmlContent.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
      if (ogDescMatch && ogDescMatch[1]) {
        description = ogDescMatch[1].trim();
        console.log('✅ Fast description found (og:description):', description);
      }
      
      // 4. QUICK IMAGE: Look for ANY image aggressively
      console.log('🔍 Searching for ANY image on the page...');
      
      // First try Open Graph image
      const ogImageMatch = htmlContent.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
      if (ogImageMatch && ogImageMatch[1]) {
        imageUrl = ogImageMatch[1].trim();
        console.log('✅ Open Graph image found:', imageUrl);
      }
      
      // If no Open Graph, try ANY Facebook CDN image
      if (!imageUrl) {
        console.log('🔍 Looking for Facebook CDN images...');
        const fbImageMatches = htmlContent.match(/(https:\/\/scontent[^"]*\.fbcdn\.net[^"]*)/gi);
        if (fbImageMatches && fbImageMatches.length > 0) {
          imageUrl = fbImageMatches[0];
          console.log('✅ Facebook CDN image found:', imageUrl);
        }
      }
      
      // If still no image, try ANY image URL
      if (!imageUrl) {
        console.log('🔍 Looking for ANY image URL...');
        const anyImageMatches = htmlContent.match(/(https:\/\/[^"]*\.(?:jpg|jpeg|png|webp|gif))/gi);
        if (anyImageMatches && anyImageMatches.length > 0) {
          imageUrl = anyImageMatches[0];
          console.log('✅ Any image URL found:', imageUrl);
        }
      }
      
      // If still no image, try relative image paths
      if (!imageUrl) {
        console.log('🔍 Looking for relative image paths...');
        const relativeImageMatches = htmlContent.match(/(\/[^"]*\.(?:jpg|jpeg|png|webp|gif))/gi);
        if (relativeImageMatches && relativeImageMatches.length > 0) {
          // Convert relative path to absolute
          const baseUrl = new URL(url).origin;
          imageUrl = baseUrl + relativeImageMatches[0];
          console.log('✅ Relative image path converted to:', imageUrl);
        }
      }
      
      // If we got most data quickly, return it
      if (productName && price && description) {
        console.log('⚡ Fast extraction successful!');
        return { productName, price, description, imageUrl };
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
             price = `$${Math.max(...validPrices).toFixed(2)}`;
             console.log('✅ Fallback Facebook data-price attribute found:', price);
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
               price = `$${Math.max(...validPrices).toFixed(2)}`;
               console.log('✅ Fallback aria-label price found:', price);
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
               // Take the LOWEST reasonable price (usually the main product price)
               const minPrice = Math.min(...validPrices);
               price = `$${minPrice.toFixed(2)}`;
               console.log('✅ Final fallback price found (filtered, lowest):', price);
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
      
      // CRITICAL FIX: Ensure price is always a valid format
      if (!price || price === '$0.00' || price === '0.00') {
        price = '$';
        console.log('⚠️ Price not found or invalid, using default');
      } else {
        // Clean up the price to ensure it's in a parseable format
        try {
          // Remove dollar signs and commas, then validate
          const cleanPrice = price.replace(/[$,]/g, '').trim();
          const parsedPrice = parseFloat(cleanPrice);
          
          if (isNaN(parsedPrice) || parsedPrice < 0) {
            console.log('⚠️ Invalid price format detected, using default:', price);
            price = '0.00';
          } else {
            // Format the price consistently
            price = parsedPrice.toFixed(2);
            console.log('✅ Price cleaned and formatted:', price);
          }
        } catch (priceError) {
          console.log('⚠️ Price cleaning error, using default:', priceError);
          price = '0.00';
        }
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
        
        // Check if product name contains a price and extract it
        const priceInName = productName.match(/\$(\d+(?:\.\d{2})?)/i);
        if (priceInName && priceInName[1] && (price === '0.00' || price === '$0.00')) {
          // Format the price with proper decimal formatting
          const extractedPrice = parseFloat(priceInName[1]);
          if (!isNaN(extractedPrice) && extractedPrice > 0) {
            price = extractedPrice.toFixed(2);
            console.log('✅ Price extracted from product name:', price);
          }
        }
        
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
        imageUrl
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
         foundPrice = Math.min(...validPrices);
         console.log('💰 Method 6 - Lowest reasonable price found:', foundPrice);
         return foundPrice;
       }
     }
     
     console.log('❌ No Facebook-specific price found with any method');
     return null;
   };

   // Special function to just find ANY image on the page
   const findAnyImage = async (htmlContent, url) => {
    console.log('🖼️ IMAGE SEARCH: Looking for ANY image on the page...');
    
    let foundImage = null;
    
    // Method 1: Open Graph images
    const ogImageMatch = htmlContent.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogImageMatch && ogImageMatch[1]) {
      foundImage = ogImageMatch[1].trim();
      console.log('🖼️ Method 1 - Open Graph image:', foundImage);
      return foundImage;
    }
    
    // Method 2: Facebook CDN images (most common)
    const fbImageMatches = htmlContent.match(/(https:\/\/scontent[^"]*\.fbcdn\.net[^"]*)/gi);
    if (fbImageMatches && fbImageMatches.length > 0) {
      foundImage = fbImageMatches[0];
      console.log('🖼️ Method 2 - Facebook CDN image:', foundImage);
      return foundImage;
    }
    
    // Method 3: Any image tag
    const imgTagMatches = htmlContent.match(/<img[^>]*src="([^"]+)"/gi);
    if (imgTagMatches && imgTagMatches.length > 0) {
      // Filter for actual image URLs
      for (const match of imgTagMatches) {
        const srcMatch = match.match(/src="([^"]+)"/i);
        if (srcMatch && srcMatch[1].includes('http')) {
          foundImage = srcMatch[1];
          console.log('🖼️ Method 3 - Image tag found:', foundImage);
          return foundImage;
        }
      }
    }
    
    // Method 4: Any URL ending with image extension
    const anyImageMatches = htmlContent.match(/(https:\/\/[^"]*\.(?:jpg|jpeg|png|webp|gif))/gi);
    if (anyImageMatches && anyImageMatches.length > 0) {
      foundImage = anyImageMatches[0];
      console.log('🖼️ Method 4 - Any image URL:', foundImage);
      return foundImage;
    }
    
    // Method 5: Relative image paths
    const relativeImageMatches = htmlContent.match(/(\/[^"]*\.(?:jpg|jpeg|png|webp|gif))/gi);
    if (relativeImageMatches && relativeImageMatches.length > 0) {
      const baseUrl = new URL(url).origin;
      foundImage = baseUrl + relativeImageMatches[0];
      console.log('🖼️ Method 5 - Relative image path:', foundImage);
      return foundImage;
    }
    
    // Method 6: Background images
    const bgImageMatches = htmlContent.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/gi);
    if (bgImageMatches && bgImageMatches.length > 0) {
      for (const match of bgImageMatches) {
        const urlMatch = match.match(/url\(['"]?([^'")\s]+)['"]?\)/i);
        if (urlMatch && urlMatch[1].includes('http')) {
          foundImage = urlMatch[1];
          console.log('🖼️ Method 6 - Background image:', foundImage);
          return foundImage;
        }
      }
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
                      // Ensure price is in valid format
        let formattedPrice = '$';
        if (foundPrice) {
          try {
            const cleanPrice = foundPrice.replace(/[$,]/g, '').trim();
            const parsedPrice = parseFloat(cleanPrice);
            if (!isNaN(parsedPrice) && parsedPrice >= 0) {
              formattedPrice = `$${parsedPrice.toFixed(2)}`;
            }
          } catch (e) {
            console.log('⚠️ Price formatting error in text extraction:', e);
          }
        }
        
        extractedData = {
          productName: foundProductName || 'Product Found in Text',
          price: formattedPrice,
          description: 'Product information extracted from page text content.',
          imageUrl: 'https://via.placeholder.com/150?text=Text+Extracted'
        };
              console.log('✅ Extracted data from text content:', extractedData);
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
          imageUrl: 'https://via.placeholder.com/150?text=Manual+Input+Required'
        };
        
        setExtractedData(hintData);
        // Removed alert to avoid popup when navigating
      } else {
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
        userProfile
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
    // Navigate to ConfirmAddress page
    navigation.navigate('ConfirmAddress', {
      productUrl,
      productPrice: extractedData.price,
      userAddress,
      productName: extractedData.productName,
      productDescription: extractedData.description,
      productImage: extractedData.imageUrl,
      transactionType, // Pass along the transaction type
      userProfile
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
      price: '',
      description: '',
      imageUrl: ''
    });
    // Restart scraping
    scrapeFacebookData(productUrl);
  };

  const handleProfilePress = () => {
    navigation.navigate('MyAccount', { userData: userProfile });
  };



  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Extracting product information...</Text>
          <Text style={styles.loadingSubtext}>This may take a few moments</Text>
          <View style={styles.progressDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

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

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
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
              
              {/* Helpful note about Facebook scraping */}
              <View style={styles.helpNoteContainer}>
                <Text style={styles.helpNoteText}>
                  💡 <Text style={styles.helpNoteBold}>Note:</Text> Facebook has security measures that may prevent automatic data extraction. If scraping fails, you can enter the product details manually below.
                  {isSelling && ' We\'ll help you create an attractive listing for potential buyers.'}
                </Text>
              </View>
              
              {/* Loading State */}
              <View style={styles.loadingStateContainer}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingStateText}>
                  {isScraping 
                    ? (isSelling ? '🔄 Scraping Facebook Marketplace for listing...' : '🔄 Scraping Facebook Marketplace...')
                    : (isSelling ? '⏳ Preparing to scrape for listing...' : '⏳ Preparing to scrape...')
                  }
                </Text>
                <Text style={styles.loadingStateSubtext}>
                  This may take a few moments
                </Text>
              </View>
              
              {/* Open in Browser Button */}
              <TouchableOpacity 
                style={styles.openInBrowserButton}
                onPress={async () => {
                  try {
                    await WebBrowser.openBrowserAsync(productUrl);
                  } catch (error) {
                    console.log('🌐 Error opening browser:', error);
                    Alert.alert('Error', 'Could not open product URL in browser');
                  }
                }}
              >
                <Text style={styles.openInBrowserButtonText}>Open in Browser</Text>
              </TouchableOpacity>
              
               
               
                               {/* Debug button to test extraction without screenshot */}
                <TouchableOpacity 
                  style={[styles.captureButton, { backgroundColor: '#FF6B6B', marginTop: 12 }]} 
                  onPress={() => {
                    console.log('🧪 Debug: Testing extraction directly...');
                    extractProductInfo();
                  }}
                >
                  <Text style={styles.captureButtonText}>🧪 Test Extraction (Debug)</Text>
                </TouchableOpacity>
                
                {/* Image-only search button */}
                <TouchableOpacity 
                  style={[styles.captureButton, { backgroundColor: '#8B5CF6', marginTop: 12 }]} 
                  onPress={async () => {
                    console.log('🖼️ Testing image-only search...');
                    try {
                      const response = await fetch(productUrl, {
                        method: 'GET',
                        headers: {
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        },
                        credentials: 'omit',
                      });
                      
                      if (response.ok) {
                        const htmlContent = await response.text();
                        console.log('🖼️ HTML received for image search, length:', htmlContent.length);
                        
                        const foundImage = await findAnyImage(htmlContent, productUrl);
                        if (foundImage) {
                          console.log('🖼️ SUCCESS: Image found:', foundImage);
                          Alert.alert('Image Found!', `Found image: ${foundImage}`);
                          
                          // Update the extracted data with just the image
                          setExtractedData(prev => ({
                            ...prev,
                            imageUrl: foundImage
                          }));
                        } else {
                          console.log('❌ No image found');
                          // Removed alert to avoid popup
                        }
                      }
                    } catch (error) {
                      console.log('❌ Image search failed:', error.message);
                      // Removed alert to avoid popup
                    }
                  }}
                >
                  <Text style={styles.captureButtonText}>🖼️ Search for Images Only</Text>
                </TouchableOpacity>
               
               {/* Manual table creation button */}
               <TouchableOpacity 
                 style={[styles.captureButton, { backgroundColor: '#8B5CF6', marginTop: 12 }]} 
                 onPress={async () => {
                   console.log('🔧 Manual: Attempting to create products table...');
                   try {
                     await createProductsTable();
                     // Removed alert to avoid popup
                   } catch (error) {
                     console.error('❌ Manual table creation failed:', error);
                     // Removed alert to avoid popup
                   }
                 }}
               >
                 <Text style={styles.captureButtonText}>🔧 Create Products Table</Text>
               </TouchableOpacity>
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
              
                                             {/* Product Image */}
                <View style={styles.imageContainer}>
                  <Text style={styles.fieldLabel}>PRODUCT IMAGE</Text>
                  
                                                           {/* Display Image from URL */}
                    {extractedData.imageUrl && 
                     extractedData.imageUrl !== 'https://via.placeholder.com/150?text=No+Image' && 
                     extractedData.imageUrl !== 'https://via.placeholder.com/150?text=Manual+Input+Required' &&
                     extractedData.imageUrl !== 'https://via.placeholder.com/150?text=Manual+Input' &&
                     extractedData.imageUrl.startsWith('http') ? (
                      <Image 
                        source={{ uri: extractedData.imageUrl }}
                        style={styles.productImage}
                        resizeMode="cover"
                        onLoad={() => console.log('🖼️ Image loaded successfully')}
                        onError={(error) => console.log('❌ Image failed to load:', error.nativeEvent.error)}
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderText}>
                          {extractedData.imageUrl && 
                           extractedData.imageUrl !== 'https://via.placeholder.com/150?text=No+Image' &&
                           extractedData.imageUrl !== 'https://via.placeholder.com/150?text=Manual+Input+Required' &&
                           extractedData.imageUrl !== 'https://via.placeholder.com/150?text=Manual+Input' &&
                           extractedData.imageUrl.startsWith('http')
                            ? 'Loading image...' 
                            : 'No Image Available'}
                        </Text>
                      </View>
                    )}
                  
                                                         
                </View>
              
              {/* Product Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.fieldLabel}>
                  {isSelling ? 'ITEM NAME' : 'PRODUCT NAME'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={extractedData.productName}
                  onChangeText={(text) => handleManualEdit('productName', text)}
                  placeholder="Enter product name"
                  multiline
                />
              </View>
              
              {/* Price */}
              <View style={styles.inputContainer}>
                <Text style={styles.fieldLabel}>
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
                </View>
              </View>
              
              {/* Description */}
              <View style={styles.inputContainer}>
                <Text style={styles.fieldLabel}>
                  {isSelling ? 'ITEM DESCRIPTION' : 'DESCRIPTION'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={extractedData.description}
                  onChangeText={(text) => handleManualEdit('description', text)}
                  placeholder="Enter product description"
                  multiline
                  numberOfLines={3}
                />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: '#10B981',
  },
  webViewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  extractedDataContainer: {
    width: '100%',
    alignItems: 'center',
  },
  
  loadingStateContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  helpNoteContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  helpNoteText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  helpNoteBold: {
    fontWeight: 'bold',
  },
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
  openInBrowserButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  openInBrowserButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

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
   
 });
