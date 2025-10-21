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

  useEffect(() => {
    if (!productUrl) {
      Alert.alert('Error', 'No product URL provided');
      navigation.goBack();
      return;
    }

    // Automatically start scraping the Facebook URL
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
        
        // Automatically start scraping the Facebook URL
        console.log('🚀 Starting automatic Facebook scraping for URL:', productUrl);
        await scrapeFacebookData(productUrl);
      } catch (error) {
        console.error('🚨 Initialization error:', error);
      }
    };

    initializeScreen();
  }, [productUrl, navigation]);

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
      
      console.log('⚠️ No useful data found in URL');
      return null;
    } catch (error) {
      console.error('🚨 Error extracting data from URL:', error);
      return null;
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
        setExtractedData(realData);
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
        setExtractedData(mockData);
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
      console.log('💾 Saving product...');
      
      // Navigate to next screen
      navigation.navigate('ProductPrice', {
        productUrl,
        userAddress,
        userProfile,
        extractedData,
        sellerName: extractedData.sellerName || ''
      });
      
    } catch (error) {
      console.error('🚨 Save product error:', error);
      Alert.alert('Error', 'Failed to save product information');
    } finally {
      setLoading(false);
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

        {/* Action Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveProduct}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 32,
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
});

