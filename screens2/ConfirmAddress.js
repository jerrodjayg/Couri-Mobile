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
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../screens/supabaseClient';
import * as Location from 'expo-location';

export default function ConfirmAddress({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasDefaultPickupAddress, setHasDefaultPickupAddress] = useState(false);
  const [showDropOffModal, setShowDropOffModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showDeliveryInfoModal, setShowDeliveryInfoModal] = useState(false);
  const [dropOffInstructions, setDropOffInstructions] = useState('');
  const [newAddress, setNewAddress] = useState({
    street: '',
    address2: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { user, customUser, setCustomUser } = useUser();
  
  const { productUrl, productPrice, userAddress: routeUserAddress, pickupAddress, transactionType } = route.params || {};

  useEffect(() => {
    console.log('🔄 ConfirmAddress useEffect triggered');
    console.log('🔗 Product URL from route params:', productUrl);
    console.log('💰 Product Price from route params:', productPrice);
    console.log('📍 Pickup Address from route params:', route.params?.pickupAddress);
    
    loadUserProfile();
    loadUserAddress();
    checkDefaultPickupAddress();
    // Show safety modal on screen load
    setShowSafetyModal(true);
  }, [route.params?.pickupAddress]);

  // Keyboard event listeners for drop-off modal
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  const checkDefaultPickupAddress = async () => {
    try {
      // Check if there's a default pickup address and no current pickup address
      if (!route.params?.pickupAddress) {
        const defaultAddress = await AsyncStorage.getItem('defaultPickupAddress');
        if (defaultAddress) {
          const parsed = JSON.parse(defaultAddress);
          console.log('📍 Found default pickup address:', parsed);
          setHasDefaultPickupAddress(true);
          // You could optionally auto-set this as the current pickup address
          // navigation.setParams({ pickupAddress: parsed });
        } else {
          setHasDefaultPickupAddress(false);
        }
      } else {
        setHasDefaultPickupAddress(false);
      }
    } catch (error) {
      console.log('⚠️ Error checking default pickup address:', error);
      setHasDefaultPickupAddress(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      // First check if we have userData from route params (from Google Auth flow)
      if (route?.params?.userData) {
        const userData = route.params.userData;
        setUserProfile(userData);
        return;
      }

      // Then try to get user data from persistent AsyncStorage (from OAuth flow)
      const userProfileData = await AsyncStorage.getItem('userProfileData');
      if (userProfileData) {
        const parsedUserData = JSON.parse(userProfileData);
        setUserProfile(parsedUserData);
      } else {
        // Fallback to user context
        if (user) {
          setUserProfile({
            id: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name,
            full_name: user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.avatar_url,
            email: user.email
          });
        }
      }
    } catch (error) {
      console.log('⚠️ Error fetching user profile in ConfirmAddress screen:', error);
    }
  };

  const getUserInitials = () => {
    // Get initials from userProfile data
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    // Fallback to name if full_name not available
    if (userProfile?.name) {
      const names = userProfile.name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    // Fallback to route params if available
    if (route?.params?.userData?.firstName && route?.params?.userData?.lastName) {
      return (route.params.userData.firstName.charAt(0) + route.params.userData.lastName.charAt(0)).toUpperCase();
    }
    
    // Check if user skipped photo and has initials stored
    if (route?.params?.userData?.userInitials) {
      return route.params.userData.userInitials;
    }
    
    // Final fallback
    return 'U';
  };

  const loadUserAddress = async () => {
    try {
      setLoading(true);
      
      // Clear any potentially corrupted address data first
      await AsyncStorage.removeItem('userAddress');
      
      // First try to get address from user profile data (most recent)
      const profileData = await AsyncStorage.getItem('userProfileData');
      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('🔍 Profile data found:', profile);
        if (profile.address1 || profile.address_line_1 || profile.street) {
          const address = {
            street: profile.address1 || profile.address_line_1 || profile.street || '',
            city: profile.city || '',
            state: profile.state || '',
            zipCode: profile.zip || profile.zip_code || profile.zipCode || ''
          };
          console.log('📍 Address extracted from profile:', address);
          // Only set if we have meaningful address data
          if (address.street && address.city && address.state && address.zipCode) {
            setUserAddress(address);
            console.log('✅ Address loaded from user profile:', address);
            // Cache the address for future use
            await AsyncStorage.setItem('userAddress', JSON.stringify(address));
            setLoading(false);
            return;
          } else {
            console.log('⚠️ Profile address data incomplete:', address);
          }
        } else {
          console.log('⚠️ No address fields found in profile data');
        }
      } else {
        console.log('⚠️ No userProfileData found in AsyncStorage');
      }

      // If still no address, try to fetch from database using user email
      let userEmail = null;
      if (user?.email) {
        userEmail = user.email;
      } else if (userProfile?.email) {
        userEmail = userProfile.email;
      } else if (route?.params?.userData?.email) {
        userEmail = route.params.userData.email;
      }

      if (userEmail) {
        console.log('🔍 Fetching address from database for email:', userEmail);
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('address_line_1, city, state, zip_code')
          .eq('email', userEmail.toLowerCase())
          .maybeSingle();

        if (error) {
          console.error('❌ Error fetching user address from database:', error);
        } else if (dbUser && (dbUser.address_line_1 || dbUser.city)) {
          const address = {
            street: dbUser.address_line_1 || '',
            city: dbUser.city || '',
            state: dbUser.state || '',
            zipCode: dbUser.zip_code || ''
          };
          console.log('📍 Address extracted from database:', address);
          // Only set if we have meaningful address data
          if (address.street && address.city && address.state && address.zipCode) {
            setUserAddress(address);
            console.log('✅ Address loaded from database:', address);
            
            // Cache the address for future use
            await AsyncStorage.setItem('userAddress', JSON.stringify(address));
            setLoading(false);
            return;
          } else {
            console.log('⚠️ Database address data incomplete:', address);
          }
        } else {
          console.log('⚠️ No user found in database or no address data');
        }
      } else {
        console.log('⚠️ No user email available for database lookup');
      }

      // If no address found in any source, don't set a placeholder
      // Instead, set userAddress to null so the address container won't show
      setUserAddress(null);
      console.log('⚠️ No valid address found in user data');
      
    } catch (error) {
      console.error('❌ Error loading user address:', error);
      // Don't set placeholder address on error, let user enter their own
      setUserAddress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setCustomUser(null);
      navigation.navigate('Welcome');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (user) {
        await supabase.auth.admin.deleteUser(user.id);
      }
      setCustomUser(null);
      navigation.navigate('Welcome');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const hasAddress = () => {
    return !!(route.params?.pickupAddress || userAddress);
  };

  const handleConfirm = () => {
    // Don't proceed if no address
    if (!hasAddress()) {
      return;
    }
    
    console.log('✅ Pickup address confirmed, showing delivery info modal');
    
    // Show delivery info modal instead of directly proceeding
    setShowDeliveryInfoModal(true);
  };

  const proceedToNextStep = () => {
    // Get the address to use (pickup address if available, otherwise user's main address)
    const addressToUse = route.params?.pickupAddress || userAddress;
    
    console.log('📍 Address being used for pickup:', addressToUse);
    
    // Navigate to Payment screen with the pickup address and user profile
    navigation.navigate('Payment', { 
      ...(route.params || {}),            // ✅ forward everything (title/image, etc.)
      productUrl, 
      productPrice, 
      userAddress: routeUserAddress,
      pickupAddress: addressToUse,
      transactionType: transactionType,
      userProfile: userProfile
    });
  };

  const handleDropOffSubmit = () => {
    console.log('✅ User submitted drop-off instructions:', dropOffInstructions);
    setShowDropOffModal(false);
    // Navigate directly to Payment screen
    proceedToNextStep();
  };

  const handleNoInstructions = () => {
    console.log('✅ User chose no instructions');
    setShowDropOffModal(false);
    // Navigate directly to Payment screen
    proceedToNextStep();
  };

  const handleIUnderstand = () => {
    setShowSafetyModal(false);
  };

  const handleCancelTransaction = () => {
    setShowSafetyModal(false);
    navigation.navigate('Welcomepage');
  };

  const handleDeliveryIUnderstand = async () => {
    setShowDeliveryInfoModal(false);
    
    // Show drop-off instructions modal for all users
    console.log('📝 Showing drop-off instructions modal');
    setShowDropOffModal(true);
  };

  const handleCancelFromDeliveryModal = () => {
    setShowDeliveryInfoModal(false);
    navigation.goBack();
  };

  const handleBuyerIUnderstand = () => {
    console.log('✅ User acknowledged delivery modal');
    setShowWarningModal(false);
    // Show the drop-off instructions modal next
    setShowDropOffModal(true);
  };

  const handleBuyerCancelTransaction = () => {
    console.log('❌ User cancelled transaction');
    setShowWarningModal(false);
    navigation.navigate('Welcomepage');
  };

  const handleSaveAddress = async () => {
    try {
      console.log('🔍 Saving new address:', newAddress);
      
      // Update local state first (always works)
      const savedAddress = {
        street: newAddress.street,
        city: newAddress.city,
        state: newAddress.state,
        zipCode: newAddress.zipCode
      };
      setUserAddress(savedAddress);

      // Cache the address in AsyncStorage (always works)
      await AsyncStorage.setItem('userAddress', JSON.stringify(savedAddress));

      // Update the userProfileData as well
      const currentProfileData = await AsyncStorage.getItem('userProfileData');
      if (currentProfileData) {
        const profile = JSON.parse(currentProfileData);
        await AsyncStorage.setItem('userProfileData', JSON.stringify({
          ...profile,
          address1: newAddress.street,
          address2: newAddress.address2,
          city: newAddress.city,
          state: newAddress.state,
          zip: newAddress.zipCode,
          zip_code: newAddress.zipCode,
          street: newAddress.street
        }));
        console.log('✅ Address saved to local storage');
      }

      // Try to save to database ONLY if user is authenticated
      if (user?.id) {
        console.log('🔄 User is authenticated, attempting to save to database...');
        
        try {
          // Check if user exists in database
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', user.id)
            .maybeSingle();

          if (existingUser) {
            // User exists - update their address
            console.log('✅ User exists in database, updating address...');
            const { error: updateError } = await supabase
              .from('users')
              .update({
                address_line_1: newAddress.street,
                address_line_2: newAddress.address2 || null,
                city: newAddress.city,
                state: newAddress.state,
                zip_code: newAddress.zipCode,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);

            if (updateError) {
              console.error('⚠️ Error updating address in database:', updateError);
              // Don't show error to user - address is already saved locally
            } else {
              console.log('✅ Address saved to database successfully');
            }
          } else {
            // User doesn't exist - try to insert
            console.log('⚠️ User does not exist in database, creating record...');
            const userName = userProfile?.full_name || userProfile?.name || user.user_metadata?.full_name || 'User';
            const names = userName.split(' ');
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';

            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                first_name: firstName,
                last_name: lastName,
                address_line_1: newAddress.street,
                address_line_2: newAddress.address2 || null,
                city: newAddress.city,
                state: newAddress.state,
                zip_code: newAddress.zipCode,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (insertError) {
              console.error('⚠️ Error creating user record:', insertError);
              // Don't show error to user - address is already saved locally
            } else {
              console.log('✅ User record created with address in database');
            }
          }
        } catch (dbError) {
          console.error('⚠️ Database operation failed (non-critical):', dbError);
          // Address is already saved locally, so this is just a warning
        }
      } else {
        console.log('⚠️ User not authenticated via Supabase, saving address locally only');
      }

      // Close modal and reset form
      setShowAddAddressModal(false);
      setNewAddress({
        street: '',
        address2: '',
        city: '',
        state: '',
        zipCode: ''
      });

      Alert.alert('Success', 'Address saved successfully!');

    } catch (error) {
      console.error('❌ Error in handleSaveAddress:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleCancelAddAddress = () => {
    setShowAddAddressModal(false);
    setNewAddress({
      street: '',
      address2: '',
      city: '',
      state: '',
      zipCode: ''
    });
  };

  const handleUseCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      console.log('📍 Getting current location...');

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use your current location. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check for cached location first (much faster)
      try {
        const cachedLocation = await AsyncStorage.getItem('cachedLocation');
        if (cachedLocation) {
          const { location: cachedLoc, timestamp } = JSON.parse(cachedLocation);
          const age = Date.now() - timestamp;
          
          // Use cached location if less than 5 minutes old
          if (age < 300000) {
            console.log('📍 Using cached location (age:', Math.round(age / 1000), 'seconds)');
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: cachedLoc.coords.latitude,
              longitude: cachedLoc.coords.longitude,
            });
            
            if (reverseGeocode && reverseGeocode.length > 0) {
              const address = reverseGeocode[0];
              const locationAddress = {
                street: address.street ? `${address.street} ${address.streetNumber || ''}`.trim() : '',
                address2: address.district || '',
                city: address.city || '',
                state: address.region || address.regionCode || '',
                zipCode: address.postalCode || ''
              };

              setNewAddress({
                street: locationAddress.street,
                address2: locationAddress.address2,
                city: locationAddress.city,
                state: locationAddress.state,
                zipCode: locationAddress.zipCode
              });
              
              setIsGettingLocation(false);
              return;
            }
          }
        }
      } catch (cacheError) {
        console.log('⚠️ Cache error (non-blocking):', cacheError);
      }

      // Get current position with optimized settings for speed
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Faster than High accuracy
        maximumAge: 30000, // Use cached location if less than 30 seconds old
        timeout: 8000, // Reduced timeout to 8 seconds
      });

      console.log('📍 Current location obtained:', location.coords);

      // Cache the location for future use
      try {
        await AsyncStorage.setItem('cachedLocation', JSON.stringify({
          location: location,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.log('⚠️ Failed to cache location:', cacheError);
      }

      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        console.log('📍 Reverse geocode result:', address);

        // Format the address data
        const locationAddress = {
          street: address.street ? `${address.street} ${address.streetNumber || ''}`.trim() : '',
          address2: address.district || '',
          city: address.city || '',
          state: address.region || address.regionCode || '',
          zipCode: address.postalCode || ''
        };

        console.log('📍 Formatted address:', locationAddress);

        // Populate the form fields with the location data
        setNewAddress({
          street: locationAddress.street,
          address2: locationAddress.address2,
          city: locationAddress.city,
          state: locationAddress.state,
          zipCode: locationAddress.zipCode
        });

      } else {
        Alert.alert(
          'Location Error',
          'Unable to determine your address from your current location. Please try adding your address manually.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('❌ Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Failed to get your current location. Please try adding your address manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };


  const handleUseDifferentAddress = () => {
    console.log('🔄 User wants to use different pickup address');
    // Navigate to PickupAddress screen
    navigation.navigate('PickupAddress', { 
      ...(route.params || {}),            // ✅ keep forwarding
      productUrl, 
      productPrice, 
      userAddress: routeUserAddress,
      transactionType
    });
  };

  const handleProfilePress = () => {
    if (userProfile) {
      // Pass user data including initials to MyAccount screen
      const userDataToPass = {
        ...route?.params?.userData,
        userInitials: getUserInitials(),
      };
      navigation.navigate('MyAccount', { userData: userDataToPass });
    } else {
      // If not signed in, go to login
      navigation.navigate('Login');
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

        <TouchableOpacity onPress={handleProfilePress} style={styles.profileContainer}>
          {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
            <Image 
              source={{ uri: userProfile.avatar_url }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>
                {userProfile ? getUserInitials() : '?'}
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
          <View style={[styles.stepIndicator, styles.stepActive]} />
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
      <View style={styles.mainContent}>
        <Text style={styles.mainTitle}>Confirm your pickup address</Text>
        <Text style={styles.subtitle}>
          {transactionType === 'buy' 
            ? "Once the product is picked up, is this where it should be delivered?"
            : "Once we're ready for pickup, is this where you're located?"
          }
        </Text>

        {/* Address Display */}
        {loading ? (
          <View style={styles.addressContainer}>
            <Text style={styles.loadingText}>Loading your address...</Text>
          </View>
        ) : (route.params?.pickupAddress || userAddress) ? (
          <View style={styles.addressContainer}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressLabel}>
                {route.params?.pickupAddress ? 'Pickup Address' : 'Delivery Address'}
              </Text>
            </View>
            <View style={styles.addressDetails}>
              {route.params?.pickupAddress ? (
                <>
                  <Text style={styles.addressText}>{route.params.pickupAddress.street}</Text>
                  {route.params.pickupAddress.address2 && (
                    <Text style={styles.addressText}>{route.params.pickupAddress.address2}</Text>
                  )}
                  <Text style={styles.addressText}>
                    {route.params.pickupAddress.city}, {route.params.pickupAddress.state} {route.params.pickupAddress.zipCode}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.addressText}>{userAddress.street}</Text>
                  <Text style={styles.addressText}>
                    {userAddress.city}, {userAddress.state} {userAddress.zipCode}
                  </Text>
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* No Address Section - Show when user has no address in database */}
        {!loading && !route.params?.pickupAddress && !userAddress && (
          <View style={styles.noAddressContainer}>
            <View style={styles.noAddressIcon}>
              <Text style={styles.noAddressIconText}>📍</Text>
            </View>
            <Text style={styles.noAddressTitle}>No address on file</Text>
            <Text style={styles.noAddressMessage}>
              We need your address to complete this transaction. Please add your address below.
            </Text>
            <TouchableOpacity 
              style={styles.addAddressButton}
              onPress={() => setShowAddAddressModal(true)}
            >
              <Text style={styles.addAddressButtonText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Default Pickup Address Hint */}
        {!route.params?.pickupAddress && hasDefaultPickupAddress && (
          <View style={styles.defaultAddressHint}>
            <Text style={styles.defaultAddressHintText}>
              💡 You have a saved pickup address. Tap "Use a different pickup address" to use it.
            </Text>
          </View>
        )}

        {/* Address Options */}
        {route.params?.pickupAddress ? (
          <View style={styles.addressOptionsContainer}>
            <TouchableOpacity onPress={handleUseDifferentAddress}>
              <Text style={styles.differentAddressLink}>
                Use a different pickup address
              </Text>
            </TouchableOpacity>
            
            {/* Confirm Button */}
            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                !hasAddress() && styles.confirmButtonDisabled
              ]} 
              onPress={handleConfirm}
              disabled={!hasAddress()}
            >
              <Text style={[
                styles.confirmButtonText,
                !hasAddress() && styles.confirmButtonTextDisabled
              ]}>
                Confirm
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mainAddressLink}
              onPress={() => {
                // Clear pickup address and use main address
                navigation.setParams({ pickupAddress: undefined });
              }}
            >
              <Text style={styles.mainAddressLinkText}>
                Use main address instead
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={handleUseDifferentAddress}>
              <Text style={styles.differentAddressLink}>
                Use a different pickup address
              </Text>
            </TouchableOpacity>
            
            {/* Confirm Button */}
            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                !hasAddress() && styles.confirmButtonDisabled
              ]} 
              onPress={handleConfirm}
              disabled={!hasAddress()}
            >
              <Text style={[
                styles.confirmButtonText,
                !hasAddress() && styles.confirmButtonTextDisabled
              ]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Safety Modal - Shows on screen load */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSafetyModal}
        onRequestClose={handleIUnderstand}
      >
        <View style={styles.safetyModalOverlay}>
          <View style={styles.safetyModalContent}>
            {/* Icon */}
            <View style={styles.safetyModalIconContainer}>
              <View style={styles.safetyModalIcon}>
                <Image 
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Mark 2 Dark.png' }}
                  style={styles.safetyModalIconImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.safetyModalTitle}>
              Help Keep Couri Safe and Trusted.
            </Text>

            {/* Body Text */}
            <Text style={styles.safetyModalBody}>
              To protect our community, buyers have an 8-hour window to return items that are fake, damaged, or misrepresented. Seller payouts are held until this window closes, and you'll incur a $10 Return Fee if your item is found to be inauthentic or inaccurately described.
            </Text>

            <Text style={[styles.safetyModalBody, styles.safetyModalBodyBold]}>
              Violations may result in account suspension.
            </Text>

            {/* I Understand Button */}
            <TouchableOpacity 
              style={styles.safetyModalUnderstandButton}
              onPress={handleIUnderstand}
            >
              <Text style={styles.safetyModalUnderstandButtonText}>
                I understand
              </Text>
            </TouchableOpacity>

            {/* Cancel Transaction Link */}
            <TouchableOpacity 
              style={styles.safetyModalCancelLink}
              onPress={handleCancelTransaction}
            >
              <Text style={styles.safetyModalCancelLinkText}>
                Cancel transaction
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delivery Information Modal - Shows when user confirms address */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeliveryInfoModal}
        onRequestClose={handleCancelFromDeliveryModal}
      >
        <View style={styles.deliveryModalOverlay}>
          <View style={styles.deliveryModalContent}>
            {/* Alert Icon */}
            <View style={styles.deliveryIconContainer}>
              <View style={styles.deliveryIconCircle}>
                <Image 
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/danger.png' }}
                  style={styles.deliveryIconImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Information Text */}
            <Text style={styles.deliveryModalText}>
              Once your item is picked up, delivery will begin immediately and you'll be able to track your driver in real-time. If you're not home, your order will be safely left at your doorstep.
            </Text>

            {/* I Understand Button */}
            <TouchableOpacity 
              style={styles.deliveryModalUnderstandButton}
              onPress={handleDeliveryIUnderstand}
            >
              <Text style={styles.deliveryModalUnderstandButtonText}>
                I understand
              </Text>
            </TouchableOpacity>

            {/* Cancel Transaction Link */}
            <TouchableOpacity 
              style={styles.deliveryModalCancelLink}
              onPress={handleCancelFromDeliveryModal}
            >
              <Text style={styles.deliveryModalCancelLinkText}>
                Cancel transaction
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

            {/* Drop-off Instructions Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDropOffModal}
        onRequestClose={handleNoInstructions}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[
            styles.dropOffModalOverlay,
            keyboardHeight > 0 && { paddingBottom: keyboardHeight }
          ]}>
            <View style={[
              styles.dropOffModalContent,
              keyboardHeight > 0 && { borderRadius: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }
            ]}>
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.dropOffModalCloseButton}
                onPress={handleNoInstructions}
              >
                <Text style={styles.dropOffModalCloseButtonText}>✕</Text>
              </TouchableOpacity>

              {/* Title with Icon */}
              <View style={styles.dropOffModalTitleContainer}>
                <Image 
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/comment.png' }}
                  style={styles.dropOffModalIcon}
                  resizeMode="contain"
                />
                <Text style={styles.dropOffModalTitle}>Drop-off instructions (optional)</Text>
              </View>

              {/* Text Input Field */}
              <TextInput
                style={styles.instructionsInput}
                value={dropOffInstructions}
                onChangeText={setDropOffInstructions}
                placeholder={"Add drop-off instructions in case you aren't at home at the time of delivery. I.e. \"Leave package at my side entrance\""}
                placeholderTextColor="#9CA3AF"
                multiline={true}
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleDropOffSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
              
              {/* No Instructions Link */}
              <TouchableOpacity style={styles.noInstructionsLink} onPress={handleNoInstructions}>
                <Text style={styles.noInstructionsText}>No instructions to add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Warning Modal for Buyers */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showWarningModal}
        onRequestClose={() => setShowWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Warning Icon */}
            <View style={styles.warningIconContainer}>
              <View style={styles.warningIcon}>
                <Text style={styles.exclamationMark}>⚠</Text>
              </View>
            </View>

            {/* Modal Message */}
            <Text style={styles.modalMessage}>
              Once your item is picked up, delivery will begin immediately and you'll be able to track your driver in real-time. If you're not home, your order will be safely left at your doorstep.
            </Text>

            {/* Action Buttons */}
            <TouchableOpacity style={styles.understandButton} onPress={handleBuyerIUnderstand}>
              <Text style={styles.understandButtonText}>I understand</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelTransactionLink} onPress={handleBuyerCancelTransaction}>
              <Text style={styles.cancelTransactionText}>Cancel transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Address Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddAddressModal}
        onRequestClose={() => setShowAddAddressModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.addAddressModalContent}>
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleCancelAddAddress}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              {/* Title */}
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Add Your Address</Text>
                <Text style={styles.modalSubtitle}>
                  We need your address to complete this transaction
                </Text>
              </View>

              {/* Address Form */}
              <View style={styles.addressForm}>
                <TextInput
                  style={styles.addressInput}
                  value={newAddress.street}
                  onChangeText={(text) => setNewAddress({...newAddress, street: text})}
                  placeholder="Street Address"
                  placeholderTextColor="#9CA3AF"
                />
                
                <TextInput
                  style={styles.addressInput}
                  value={newAddress.address2}
                  onChangeText={(text) => setNewAddress({...newAddress, address2: text})}
                  placeholder="Apartment, suite, etc. (optional)"
                  placeholderTextColor="#9CA3AF"
                />
                
                <View style={styles.addressRow}>
                  <TextInput
                    style={[styles.addressInput, styles.cityInput]}
                    value={newAddress.city}
                    onChangeText={(text) => setNewAddress({...newAddress, city: text})}
                    placeholder="City"
                    placeholderTextColor="#9CA3AF"
                  />
                  
                  <TextInput
                    style={[styles.addressInput, styles.stateInput]}
                    value={newAddress.state}
                    onChangeText={(text) => setNewAddress({...newAddress, state: text})}
                    placeholder="State"
                    placeholderTextColor="#9CA3AF"
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                  
                  <TextInput
                    style={[styles.addressInput, styles.zipInput]}
                    value={newAddress.zipCode}
                    onChangeText={(text) => setNewAddress({...newAddress, zipCode: text})}
                    placeholder="ZIP"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>

              {/* Use Current Location Button */}
              <TouchableOpacity 
                style={[
                  styles.useLocationModalButton,
                  isGettingLocation && styles.useLocationModalButtonDisabled
                ]}
                onPress={handleUseCurrentLocation}
                disabled={isGettingLocation}
              >
                <Text style={styles.useLocationModalButtonText}>
                  {isGettingLocation ? '📍 Getting Location...' : '📍 Use Current Location'}
                </Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <TouchableOpacity 
                style={[
                  styles.saveAddressButton,
                  (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode) && styles.saveAddressButtonDisabled
                ]}
                onPress={handleSaveAddress}
                disabled={!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode}
              >
                <Text style={styles.saveAddressButtonText}>Save Address</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelAddressLink} onPress={handleCancelAddAddress}>
                <Text style={styles.cancelAddressText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    marginLeft: 11,
  },
  stepTextSecond: {
    position: 'absolute',
    left: '25%',
    color: '#000000',
    marginLeft: 17,
  },
  stepTextThird: {
    position: 'absolute',
    left: '50%',
    marginLeft: 19,
  },
  stepTextFourth: {
    position: 'absolute',
    left: '75%',
    marginLeft: 35,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  addressContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addressHeader: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressDetails: {
    alignItems: 'center',
  },
  addressText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  noAddressContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  addressOptionsContainer: {
    alignItems: 'center',
    gap: 16,
  },
  differentAddressLink: {
    fontSize: 16,
    color: '#000',
    textDecorationLine: 'underline',
    fontWeight: '500',
    textAlign: 'center',
  },
  mainAddressLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mainAddressLinkText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  defaultAddressHint: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  defaultAddressHintText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginHorizontal: 24,
    marginTop: 21,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  warningIconContainer: {
    marginBottom: 24,
  },
  warningIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#ffd1dc',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exclamationMark: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    transform: [{ rotate: '0deg' }],
  },
  modalMessage: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  understandButton: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  understandButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelTransactionLink: {
    alignItems: 'center',
  },
  cancelTransactionText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Drop-off Instructions Modal Styles
  dropOffModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  dropOffModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    minHeight: '41%',
    position: 'relative',
  },
  dropOffModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dropOffModalIcon: {
    width: 24,
    height: 24,
    marginLeft: 30,
    marginRight: 10,
  },
  dropOffModalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
  },
  dropOffModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dropOffModalCloseButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  modalTitleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  instructionsInput: {
    width: '100%',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#FFF',
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginBottom: 23,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noInstructionsLink: {
    alignItems: 'center',
  },
  noInstructionsText: {
    color: '#000',
    fontStyle: 'Area Normal',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // No Address Section Styles
  noAddressContainer: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  noAddressIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#E5E7EB',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noAddressIconText: {
    fontSize: 24,
  },
  noAddressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  noAddressMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addAddressButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addAddressButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  useLocationModalButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  useLocationModalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  useLocationModalButtonDisabled: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
  },
  // Add Address Modal Styles
  addAddressModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    position: 'relative',
    maxHeight: '90%',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  addressForm: {
    width: '100%',
    marginBottom: 24,
  },
  addressInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cityInput: {
    flex: 2,
    marginBottom: 0,
  },
  stateInput: {
    flex: 1,
    marginBottom: 0,
    textAlign: 'center',
  },
  zipInput: {
    flex: 1.5,
    marginBottom: 0,
  },
  saveAddressButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveAddressButtonDisabled: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
  },
  saveAddressButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelAddressLink: {
    alignItems: 'center',
  },
  cancelAddressText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Safety Modal Styles
  safetyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  safetyModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  safetyModalIconContainer: {
    marginBottom: 20,
  },
  safetyModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  safetyModalIconImage: {
    width: 24,
    height: 24,
  },
  safetyModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  safetyModalBody: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  safetyModalBodyBold: {
    fontWeight: 'bold',
  },
  safetyModalUnderstandButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
  },
  safetyModalUnderstandButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  safetyModalCancelLink: {
    paddingVertical: 8,
  },
  safetyModalCancelLinkText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  // Delivery Information Modal Styles
  deliveryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deliveryModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deliveryIconContainer: {
    marginBottom: 20,
  },
  deliveryIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 30,
    backgroundColor: '#FFE8FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryIconImage: {
    width: 20,
    height: 20,
  },
  deliveryModalText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deliveryModalUnderstandButton: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fff',
  },
  deliveryModalUnderstandButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deliveryModalCancelLink: {
    paddingVertical: 8,
  },
  deliveryModalCancelLinkText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
});
