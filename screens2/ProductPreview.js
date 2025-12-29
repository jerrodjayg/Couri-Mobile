import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function ProductPreview({ navigation, route }) {
  const [facebookImage, setFacebookImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemTitle, setItemTitle] = useState(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [hasBeenClicked, setHasBeenClicked] = useState(false);
  // Use the URL from route params (passed from URL screen) instead of hardcoded
  const url = route.params?.productUrl || '';
  const isFacebook = url.includes('facebook.com') || url.includes('fb.com');
  
  // Animation for pulsing border when item is successfully loaded
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Clear image and title immediately when URL changes
  useEffect(() => {
    setFacebookImage(null);
    setItemTitle(null);
    setLoading(false);
    setShowSuccessBanner(false);
    setHasBeenClicked(false); // Reset click state when URL changes
  }, [url]);

  // Show banner when both image and title are successfully loaded
  useEffect(() => {
    if (facebookImage && itemTitle) {
      setShowSuccessBanner(true);
      
      // Auto-hide banner after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setShowSuccessBanner(false);
    }
  }, [facebookImage, itemTitle]);

  // Start pulsing animation when both image and title are loaded (only if not clicked yet)
  useEffect(() => {
    if (facebookImage && itemTitle && !hasBeenClicked) {
      // Create pulsing animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [facebookImage, itemTitle, hasBeenClicked]);

  useEffect(() => {
    if (isFacebook) {
      setLoading(true);
      const fetchFacebookImage = async () => {
        // Helper function to add timeout to fetch
        const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
              throw new Error('Request timeout');
            }
            throw error;
          }
        };

        // Method 1: Try Microlink.io API (works well for Facebook) - with 3 second timeout
        const tryMicrolink = async (urlToTry) => {
          try {
            console.log('🔄 Trying Microlink.io for Facebook image...');
            // Clean and validate URL first
            const cleanUrl = urlToTry.trim();
            if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
              throw new Error('Invalid URL format');
            }
            const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}`;
            const response = await fetchWithTimeout(microlinkUrl, {}, 3000); // 3 second timeout
            
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'success') {
                let foundImage = false;
                let foundTitle = false;
                
                // Get image
                if (data.data?.image?.url) {
                  const imageUrl = data.data.image.url;
                  // Filter out Facebook logo/placeholder images
                  if (!imageUrl.includes('rsrc.php') && !imageUrl.includes('.svg')) {
                    console.log('✅ Got image from Microlink:', imageUrl.substring(0, 100));
                    setFacebookImage(imageUrl);
                    foundImage = true;
                  }
                }
                
                // Get title
                if (data.data?.title) {
                  let title = data.data.title;
                  const titleLower = title.toLowerCase();
                  // Filter out generic Facebook titles and login pages (multiple languages)
                  const isLoginPage = 
                    titleLower.includes('log into facebook') ||
                    titleLower.includes('log in') ||
                    titleLower.includes('se connecter') ||
                    titleLower.includes('se connecter a facebook') ||
                    titleLower.includes('connexion') ||
                    titleLower.includes('iniciar sesión') ||
                    titleLower.includes('anmelden') ||
                    titleLower === 'facebook' ||
                    titleLower.includes('facebook login') ||
                    titleLower.includes('facebook - log in');
                  
                  if (title && !isLoginPage && title.length > 5) {
                    console.log('✅ Got title from Microlink:', title);
                    setItemTitle(title);
                    foundTitle = true;
                  } else {
                    console.log('⚠️ Filtered out login page title:', title);
                  }
                }
                
                if (foundImage || foundTitle) {
                  setLoading(false);
                  return true; // Success
                }
              }
            }
            return false; // No image/title found
          } catch (error) {
            console.log('⚠️ Microlink failed:', error.message);
            return false;
          }
        };

        // Check if URL ends with "/" and try with original first, then without trailing "/"
        // Try both in parallel for faster results
        const urlEndsWithSlash = url.trim().endsWith('/');
        let microlinkSuccess = false;
        
        if (urlEndsWithSlash) {
          console.log('🔍 URL ends with "/", trying Microlink with both versions in parallel...');
          const urlWithoutSlash = url.trim().replace(/\/+$/, '');
          // Try both URLs in parallel
          const [result1, result2] = await Promise.allSettled([
            tryMicrolink(url),
            tryMicrolink(urlWithoutSlash)
          ]);
          microlinkSuccess = (result1.status === 'fulfilled' && result1.value) || 
                            (result2.status === 'fulfilled' && result2.value);
        } else {
          // URL doesn't end with "/", just try normally
          microlinkSuccess = await tryMicrolink(url);
        }
        
        if (microlinkSuccess) {
          return; // Successfully got image/title from Microlink
        }

        // Method 2: Try multiple CORS proxies in PARALLEL (much faster!)
        const cleanUrl = url.trim();
        const proxies = [
          { url: `https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`, isJson: true },
          { url: `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`, isJson: false },
          { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`, isJson: false },
        ];

        // Try all proxies in parallel with 4 second timeout each
        console.log('🔄 Trying all proxies in parallel...');
        const proxyPromises = proxies.map(async (proxy) => {
          try {
            const response = await fetchWithTimeout(proxy.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
            }, 4000); // 4 second timeout per proxy
            
            if (response.ok) {
              let html = '';
              
              // Handle JSON-wrapped responses (allorigins.win)
              if (proxy.isJson) {
                try {
                  const data = await response.json();
                  html = data.contents || data.content || data.html || '';
                } catch (jsonError) {
                  // If JSON parse fails, try as text
                  html = await response.text();
                }
              } else {
                // Handle direct HTML responses
                html = await response.text();
              }
              
              if (html && html.length > 100) {
                let foundImage = false;
                let foundTitle = false;
                
                // Try multiple patterns for og:image
                const patterns = [
                  /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
                  /<meta[^>]*property=["']og:image:url["'][^>]*content=["']([^"']+)["']/i,
                  /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
                ];
                
                for (const pattern of patterns) {
                  const match = html.match(pattern);
                  if (match && match[1]) {
                    let imageUrl = match[1].trim();
                    
                    // Decode HTML entities (like &amp; to &)
                    imageUrl = imageUrl
                      .replace(/&amp;/g, '&')
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>');
                    
                    // Filter out Facebook logo/placeholder images
                    if (imageUrl && 
                        !imageUrl.includes('rsrc.php') && 
                        !imageUrl.includes('.svg') &&
                        !imageUrl.includes('profile_pic') &&
                        imageUrl.startsWith('http')) {
                      console.log('✅ Found image from HTML:', imageUrl.substring(0, 100));
                      setFacebookImage(imageUrl);
                      foundImage = true;
                      break; // Found image, stop searching
                    }
                  }
                }
                
                // Try to extract title from HTML
                const titlePatterns = [
                  /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
                  /<meta[^>]*property=["']og:title["'][^>]*content=[""]([^""]+)[""]/i,
                  /<title[^>]*>([^<]+)<\/title>/i,
                ];
                
                for (const pattern of titlePatterns) {
                  const match = html.match(pattern);
                  if (match && match[1]) {
                    let title = match[1]
                      .replace(/&amp;/g, '&')
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .trim();
                    
                    // Filter out generic Facebook titles and login pages (multiple languages)
                    const titleLower = title.toLowerCase();
                    const isLoginPage = 
                      titleLower.includes('log into facebook') ||
                      titleLower.includes('log in') ||
                      titleLower.includes('se connecter') ||
                      titleLower.includes('se connecter a facebook') ||
                      titleLower.includes('connexion') ||
                      titleLower.includes('iniciar sesión') ||
                      titleLower.includes('anmelden') ||
                      titleLower === 'facebook' ||
                      titleLower.includes('facebook login') ||
                      titleLower.includes('facebook - log in');
                    
                    if (title && !isLoginPage && title.length > 5) {
                      console.log('✅ Found title from HTML:', title);
                      setItemTitle(title);
                      foundTitle = true;
                      break; // Found title, stop searching
                    }
                  }
                }
                
                // Return result if we found anything
                if (foundImage || foundTitle) {
                  return { success: true, foundImage, foundTitle };
                }
              }
            }
            return { success: false };
          } catch (error) {
            console.log('⚠️ Proxy failed:', error.message);
            return { success: false };
          }
        });

        // Wait for first successful result (or all to fail)
        const results = await Promise.allSettled(proxyPromises);
        
        // Check results - use first successful one
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value?.success) {
            // We already set the image/title in the promise, just exit
            setLoading(false);
            return;
          }
        }

        // Method 3: Try Facebook oEmbed API (last resort, often doesn't work for Marketplace) - with timeout
        try {
          console.log('🔄 Trying Facebook oEmbed API...');
          const oembedUrl = `https://www.facebook.com/plugins/post/oembed.json/?url=${encodeURIComponent(url)}`;
          const response = await fetchWithTimeout(oembedUrl, {}, 3000); // 3 second timeout
          
          if (response.ok) {
            const data = await response.json();
            if (data.html) {
              const imgMatch = data.html.match(/<img[^>]*src=["']([^"']+)["']/i);
              if (imgMatch && imgMatch[1] && !imgMatch[1].includes('rsrc.php')) {
                console.log('✅ Got image from oEmbed');
                setFacebookImage(imgMatch[1]);
                setLoading(false);
                return;
              }
            }
          }
        } catch (error) {
          console.log('⚠️ oEmbed failed');
        }
        
        console.log('❌ Could not fetch Facebook image');
        setLoading(false);
      };

      fetchFacebookImage();
    }
  }, [url, isFacebook]);

  // Handler functions
  const handleCancel = () => {
    navigation.goBack();
  };

  const handleContinue = () => {
    const transactionType = route.params?.transactionType || 'buy';
    const userAddress = route.params?.userAddress || {};
    const userProfile = route.params?.userProfile || {};
    
    // Skip ProductDetails screen - navigate directly to next screen based on transaction type
    if (transactionType === 'buy') {
      // For buyer flow, go directly to Share
      navigation.navigate('Share', {
        productUrl: url,
        productPrice: '$', // Will be filled by user
        productTitle: itemTitle || 'Facebook Marketplace Item',
        productDescription: '',
        productImage: facebookImage || '',
        userAddress,
        userProfile,
        transactionType,
        sellerName: '',
        extractedData: {
          productName: itemTitle || 'Facebook Marketplace Item',
          price: '$',
          description: '',
          imageUrl: facebookImage || '',
          images: facebookImage ? [facebookImage] : []
        }
      });
    } else {
      // For seller flow, go to ProductPrice
      navigation.navigate('ProductPrice', {
        productUrl: url,
        userAddress,
        userProfile,
        extractedData: {
          productName: itemTitle || 'Facebook Marketplace Item',
          price: '$',
          description: '',
          imageUrl: facebookImage || '',
          images: facebookImage ? [facebookImage] : []
        },
        sellerName: ''
      });
    }
  };

  const handleProfilePress = () => {
    const userProfile = route.params?.userProfile || {};
    navigation.navigate('MyAccount', { userData: userProfile });
  };

  const getUserInitials = () => {
    const userProfile = route.params?.userProfile || {};
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    if (userProfile?.name) {
      const names = userProfile.name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    return 'U';
  };

  const userProfile = route.params?.userProfile || {};

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Image
            source={require('../assets/backarrow1.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleProfilePress} style={styles.profileButton}>
          {userProfile?.avatar_url ? (
            <Image
              source={{ uri: userProfile.avatar_url }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>{getUserInitials()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Banner - Only show if product is fully loaded - Above progress bar */}
      {showSuccessBanner && facebookImage && itemTitle && (
        <View style={styles.successBannerTop}>
          <View style={styles.successBannerContent}>
            <View style={styles.checkmarkContainer}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
            <Text style={styles.successBannerText}>Product linked successfully</Text>
            <TouchableOpacity 
              onPress={() => setShowSuccessBanner(false)} 
              style={styles.bannerCloseButton}
            >
              <Text style={styles.bannerCloseText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Progress Tabs - Buyer flow: Product Confirmation and Share with Seller */}
      <View style={styles.progressTabsContainer}>
        {route.params?.transactionType === 'buy' ? (
          <View style={styles.progressTabsRow}>
            <View style={styles.progressTab}>
              <View style={[styles.progressTabUnderline, styles.progressTabUnderlineActive]} />
              <Text style={[styles.progressTabText, styles.progressTabActive]}>Product Confirmation</Text>
            </View>
            <View style={styles.progressTab}>
              <View style={[styles.progressTabUnderline, styles.progressTabUnderlineInactive]} />
              <Text style={[styles.progressTabText, styles.progressTabInactive]}>Share with Seller</Text>
            </View>
          </View>
        ) : (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTabIndicator, styles.progressTabIndicatorActive]} />
            <View style={styles.progressTabIndicator} />
            <View style={styles.progressTabIndicator} />
            <View style={styles.progressTabIndicator} />
          </View>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

        <Text style={styles.title}>What are you buying?</Text>

        {/* Image and Title Display - Backend logic unchanged, wrapped in card */}
        {isFacebook ? (
          <TouchableOpacity 
            style={[
              styles.previewCard,
              facebookImage && itemTitle && {
                borderWidth: 2,
                borderColor: '#27C193',
                shadowColor: '#27C193',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 4,
              }
            ]}
            onPress={() => {
              setHasBeenClicked(true); // Stop pulsing after first click
              Linking.openURL(url).catch(err => {
                console.error('Failed to open URL:', err);
              });
            }}
            activeOpacity={0.7}
          >
            {/* Pulsing border indicator when item is loaded (only if not clicked yet) */}
            {facebookImage && itemTitle && !hasBeenClicked && (
              <Animated.View
                style={[
                  styles.pulseBorder,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.05],
                      outputRange: [0.6, 1],
                    }),
                  },
                ]}
              />
            )}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            ) : (
              <View style={styles.cardContent}>
                <View style={styles.imageWrapper}>
                  <View style={styles.imageBackgroundBox} />
                  {/* Only show actual image if both image and title exist, otherwise show stock image */}
                  {facebookImage && itemTitle ? (
                    <Image 
                      key={url} // Force reload when URL changes
                      source={{ 
                        uri: facebookImage + (facebookImage.includes('?') ? '&' : '?') + 't=' + Date.now(),
                        headers: {
                          'Referer': 'https://www.facebook.com/',
                        }
                      }}
                      style={styles.previewImage}
                      resizeMode="cover"
                      onLoad={() => console.log('✅ Image loaded successfully')}
                      onError={(error) => {
                        console.log('❌ Image load error:', error.nativeEvent?.error || 'Unknown error');
                        console.log('❌ Failed URL:', facebookImage.substring(0, 150));
                      }}
                    />
                  ) : (
                    <Image
                      source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/facebook2.png' }}
                      style={styles.previewImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
                <View style={styles.cardTextContent}>
                  {/* Only show actual title, never stock title */}
                  {itemTitle && (
                    <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">
                      {itemTitle}
                    </Text>
                  )}
                  {/* Show message if no photo and no title */}
                  {!facebookImage && !itemTitle && (
                    <Text style={styles.tapToViewMessage}>
                      Tap to view listing on Facebook Marketplace
                    </Text>
                  )}
                  <View style={styles.sourceContainer}>
                    <Image
                      source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/facebook2.png' }}
                      style={styles.facebookLogoImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.urlTitle}>
                      from Facebook Marketplace
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Explanatory Text */}
        <Text style={styles.explanatoryText}>
          We'll share this preview with the seller to make sure you're both aligned on what's being sold.
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelLink}
            onPress={handleCancel}
          >
            <Text style={styles.cancelLinkText}>Cancel transaction</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  progressTabsContainer: {
    paddingHorizontal: 15,
    paddingTop: 16,
    paddingBottom: 0,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressTabsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  progressTab: {
    flex: 1,
  },
  progressTabText: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 8,
    fontStyle: 'Areal Normal',
  },
  progressTabActive: {
    color: '#000000',
  },
  progressTabInactive: {
    color: '#82827F',
  },
  progressTabUnderline: {
    height: 5,
    borderRadius: 2,
  },
  progressTabUnderlineActive: {
    backgroundColor: '#27C193',
  },
  progressTabUnderlineInactive: {
    backgroundColor: '#E5E7EB',
  },
  progressTabIndicator: {
    width: 32,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
  },
  progressTabIndicatorActive: {
    backgroundColor: '#000000',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 24,
    marginTop: 16,
  },
  successBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  successBannerTop: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 0,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  successBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#27C193',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  bannerCloseButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerCloseText: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '300',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    position: 'relative',
    overflow: 'visible',
  },
  pulseBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#27C193',
    borderStyle: 'solid',
  },
  cardContent: {
    flexDirection: 'row',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  imageBackgroundBox: {
    position: 'absolute',
    width: 100,
    height: 100,
    backgroundColor: '#000000',
    borderRadius: 8,
    top: 4,
    left: 4,
    zIndex: 0,
  },
  previewImage: {
    width: 100,
    height: 100,
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    position: 'relative',
    zIndex: 1,
  },
  cardTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
  },
  noImageContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
  },
  noImageText: {
    fontSize: 12,
    color: '#666666',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  tapToViewMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facebookLogoImage: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  urlTitle: {
    fontSize: 14,
    color: '#666666',
  },
  explanatoryText: {
    fontSize: 14,
    fontweight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 42,
    lineHeight: 20,
    lineHeight: 24,
  },
  actionBar: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  continueButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#171715',
    borderRadius: 30,
    marginBottom: 12,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelLink: {
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: 14,
    marginTop: 15,
    fontWeight: '500',
    color: '#000',
    textDecorationLine: 'underline',
  },
});

