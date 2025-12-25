import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../screens/supabaseClient';

export default function ProductPrice({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [productPrice, setProductPrice] = useState('');
  const [sellerName, setSellerName] = useState(''); // Add seller name state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user, customUser, setCustomUser } = useUser();
  const { width: screenWidth } = useWindowDimensions();

  // Safely read/normalize params
  const params = route?.params || {};
  const {
    url,
    productUrl,
    productTitle: incomingTitle,
    productImage: incomingImage,
    productName,
    imageUrl,
    sellerName: incomingSellerName,
    extractedData,
    transactionType,
  } = params;

  // Use extractedData if available (from manual input)
  const productTitle = extractedData?.productName || incomingTitle || productName || '';
  const productImage = extractedData?.imageUrl || incomingImage || imageUrl || '';
  const finalUrl = url || productUrl;
  
  // Get product data for confirmation screen
  const productImages = extractedData?.images || (productImage ? [productImage] : []) || (imageUrl ? [imageUrl] : []);
  
  // Format price - ensure only one dollar sign
  let displayPrice = '';
  if (extractedData?.price) {
    // If price already has dollar sign, use it; otherwise add one
    displayPrice = extractedData.price.startsWith('$') ? extractedData.price : `$${extractedData.price}`;
  } else if (productPrice) {
    // Remove any existing dollar sign before adding one
    const cleanPrice = productPrice.replace('$', '');
    displayPrice = `$${cleanPrice}`;
  }
  
  const productDescription = extractedData?.description || '';
  const productCondition = extractedData?.condition || '';
  const productConditionDetails = extractedData?.conditionDetails || '';

  useEffect(() => {
    // Load cached user profile for header avatar
    loadUserProfile();
    
    // Set seller name if provided
    if (incomingSellerName) {
      setSellerName(incomingSellerName);
    }

    // Set price from extractedData if available (from manual input)
    if (extractedData?.price) {
      // Remove $ sign if present
      const priceValue = extractedData.price.replace('$', '');
      setProductPrice(priceValue);
    }
  }, [url, incomingSellerName, extractedData]);

  const loadUserProfile = async () => {
    try {
      // Try multiple storage keys to find user profile
      const profileData = await AsyncStorage.getItem('userProfileData') || 
                         await AsyncStorage.getItem('userProfile') ||
                         await AsyncStorage.getItem('tempUserData');
      if (profileData) {
        const parsed = JSON.parse(profileData);
        setUserProfile(parsed);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };
  
  const handleProfilePress = () => {
    if (userProfile) {
      navigation.navigate('MyAccount', { userData: userProfile });
    } else {
      navigation.navigate('Login');
    }
  };

  const validateAndNavigate = async (maybeUrl) => {
    try {
      const isString = typeof maybeUrl === 'string';
      if (isString && maybeUrl.startsWith('https://')) {
        navigation.navigate('ConfirmAddress', {
          productUrl: maybeUrl,
          productPrice: productPrice,
          productTitle: productTitle,
          productImage: productImage,
          extractedData: extractedData,
        });
      } else if (!maybeUrl) {
        // Manual input - no URL validation needed
        Alert.alert('Info', 'This is a manually entered product. No URL validation required.');
      } else {
        Alert.alert(
          'Invalid Link',
          "We weren't able to recognize that link. Please try again, or input product info manually.",
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('URL validation error:', error);
      Alert.alert('Error', 'There was an error processing your link. Please try again.', [{ text: 'OK', style: 'default' }]);
    }
  };

  const handleSignOut = async () => {
    try {
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      }
      setCustomUser(null);
      navigation.navigate('Welcome');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // NOTE: Admin deleteUser is typically server-side only; guard it to avoid crashes on client
  const handleDeleteAccount = async () => {
    try {
      if (user && supabase?.auth?.admin?.deleteUser) {
        await supabase.auth.admin.deleteUser(user.id);
      }
      setCustomUser(null);
      navigation.navigate('Welcome');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleSubmit = () => {
    if (!productPrice || productPrice.trim() === '') {
      Alert.alert('Missing Price', 'Please enter a product price before continuing.');
      return;
    }

    // For manual input, URL is optional
    const isManualInput = !finalUrl;

    navigation.navigate('ConfirmAddress', {
      productUrl: finalUrl || 'Manual Input',
      productPrice: productPrice,
      productTitle: productTitle,
      productImage: productImage,
      sellerName: sellerName,
      extractedData: extractedData, // Pass along extracted data
      transactionType: transactionType,
      isManualInput: isManualInput,
      userProfile: userProfile,
    });
  };

  const clearPrice = () => setProductPrice('');
  const handleManualUrlInput = () => navigation.goBack();
  
  const handleEditInfo = () => {
    navigation.goBack();
  };
  
  const getUserInitials = () => {
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    if (userProfile?.name) {
      const names = userProfile.name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    if (userProfile?.firstName) {
      return userProfile.firstName.charAt(0).toUpperCase();
    }
    if (userProfile?.email) {
      return userProfile.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Image source={require('../assets/backarrow1.png')} style={styles.backButtonImage} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.profileContainer} onPress={handleProfilePress}>
          {userProfile?.avatar_url && userProfile.avatar_url !== '' && !userProfile.avatar_url.includes('undefined') ? (
            <Image 
              source={{ uri: userProfile.avatar_url }} 
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>
                {getUserInitials()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.stepIndicator, styles.stepActive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
        </View>
        
        <View style={styles.progressLabels}>
          <Text style={[styles.stepText, styles.stepTextFirst]}>Product</Text>
          <Text style={[styles.stepText, styles.stepTextSecond]}>Address</Text>
          <Text style={[styles.stepText, styles.stepTextThird]}>Payment</Text>
          <Text style={[styles.stepText, styles.stepTextFourth]}>Share</Text>
        </View>
      </View>

      {/* Light Blue Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Confirm product details below</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image with Carousel */}
        {productImages.length > 0 && (
          <View style={styles.imageContainer}>
            {productImages.length > 1 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const scrollViewWidth = event.nativeEvent.layoutMeasurement.width;
                  const offsetX = event.nativeEvent.contentOffset.x;
                  const index = Math.round(offsetX / scrollViewWidth);
                  setCurrentImageIndex(index);
                }}
                style={styles.imageScrollView}
                contentContainerStyle={styles.imageScrollContent}
              >
                {productImages.map((uri, index) => (
                  <View key={index} style={[styles.imageWrapper, { width: screenWidth }]}>
                    <View style={styles.imageContainerInner}>
                      <Image 
                        source={{ uri }} 
                        style={styles.productImage} 
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.singleImageWrapper}>
                <View style={styles.imageContainerInner}>
                  <Image 
                    source={{ uri: productImages[0] }} 
                    style={styles.productImage} 
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}
            
            {/* Carousel Dots */}
            {productImages.length > 1 && (
              <View style={styles.dotsContainer}>
                {productImages.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === currentImageIndex && styles.dotActive
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Product Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.productTitle}>"{productTitle}"</Text>
        </View>

        {/* Information Cards */}
        <View style={styles.cardsContainer}>
          {/* PRICE Card */}
          {displayPrice && (
            <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>PRICE</Text>
              <Text style={styles.cardValue}>{displayPrice}</Text>
            </View>
          )}

          {/* DESCRIPTION Card */}
          {productDescription && (
            <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>DESCRIPTION</Text>
              <Text style={styles.cardDescription}>{productDescription}</Text>
            </View>
          )}

          {/* CONDITION Card */}
          {productCondition && (
            <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>CONDITION</Text>
              <Text style={styles.cardValue}>{productCondition}</Text>
            </View>
          )}

          {/* CONDITION DETAILS Card */}
          {productConditionDetails && (
            <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>CONDITION DETAILS</Text>
              <Text style={styles.cardDescription}>{productConditionDetails}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleEditInfo}>
          <Text style={styles.editInfoText}>Edit Info</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.confirmButton} onPress={handleSubmit}>
          <Text style={styles.confirmButtonText}>Confirm Details</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 100,
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
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontWeight: '600',
    fontSize: 16,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    paddingTop: 0,
    alignItems: 'flex-start',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    width: '100%',
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
    textAlign: 'left',
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
  },
  stepTextThird: {
    position: 'absolute',
    left: '50%',
  },
  stepTextFourth: {
    position: 'absolute',
    left: '75%',
  },
  banner: {
    backgroundColor: '#BED7FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 30,
    marginBottom: 32,
  },
  bannerText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
  imageContainer: {
    marginBottom: 16,
  },
  imageScrollView: {
    width: '100%',
  },
  imageScrollContent: {
    alignItems: 'center',
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  singleImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  imageContainerInner: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  productImage: {
    height: 300,
    width: '100%',
    backgroundColor: '#F3F4F6',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  dotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
  titleContainer: {
    paddingHorizontal: 24,
    marginTop: 35,
    marginBottom: 24,
    alignItems: 'center',
  },
  productTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    lineHeight: 35,
    textAlign: 'center',
  },
  cardsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 92,
  },
  editInfoText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  confirmButton: {
    backgroundColor: '#171715',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 160,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
