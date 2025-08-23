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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../screens/supabaseClient';

export default function ConfirmAddress({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user, customUser, setCustomUser } = useUser();
  
  const { productUrl, productPrice } = route.params || {};

  useEffect(() => {
    console.log('🔄 ConfirmAddress useEffect triggered');
    console.log('🔗 Product URL from route params:', productUrl);
    console.log('💰 Product Price from route params:', productPrice);
    
    loadUserProfile();
    loadUserAddress();
  }, []);

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
      
      // First try to get address from AsyncStorage
      const addressData = await AsyncStorage.getItem('userAddress');
      if (addressData) {
        const parsedAddress = JSON.parse(addressData);
        setUserAddress(parsedAddress);
        console.log('✅ Address loaded from AsyncStorage:', parsedAddress);
        setLoading(false);
        return;
      }

      // If no address in AsyncStorage, try to get from user profile
      const profileData = await AsyncStorage.getItem('userProfileData');
      if (profileData) {
        const profile = JSON.parse(profileData);
        if (profile.address1 || profile.address_line_1) {
          const address = {
            street: profile.address1 || profile.address_line_1 || '',
            city: profile.city || '',
            state: profile.state || '',
            zipCode: profile.zip || profile.zip_code || ''
          };
          setUserAddress(address);
          console.log('✅ Address loaded from user profile:', address);
          setLoading(false);
          return;
        }
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
          setUserAddress(address);
          console.log('✅ Address loaded from database:', address);
          
          // Cache the address for future use
          await AsyncStorage.setItem('userAddress', JSON.stringify(address));
          setLoading(false);
          return;
        }
      }

      // If all else fails, set a placeholder address
      const placeholderAddress = {
        street: '1234 Address Street',
        city: 'Richmond',
        state: 'VA',
        zipCode: '23220'
      };
      setUserAddress(placeholderAddress);
      console.log('⚠️ No address found, using placeholder:', placeholderAddress);
      
    } catch (error) {
      console.error('❌ Error loading user address:', error);
      // Set placeholder address on error
      const placeholderAddress = {
        street: '1234 Address Street',
        city: 'Richmond',
        state: 'VA',
        zipCode: '23220'
      };
      setUserAddress(placeholderAddress);
      console.log('⚠️ Error occurred, using placeholder address:', placeholderAddress);
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

  const handleConfirm = () => {
    console.log('✅ Address confirmed, navigating to next step');
    // Navigate to next step (Payment screen)
    // navigation.navigate('Payment', { productUrl, productPrice, userAddress });
  };

  const handleUseDifferentAddress = () => {
    console.log('🔄 User wants to use different address');
    // Navigate to address input screen
    // navigation.navigate('AddressInput', { productUrl, productPrice });
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
        <Text style={styles.mainTitle}>Confirm your delivery address</Text>
        <Text style={styles.subtitle}>
          Once the product is picked up, is this where it should be delivered?
        </Text>

        {/* Address Display */}
        {!loading && userAddress && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>{userAddress.street}</Text>
            <Text style={styles.addressText}>
              {userAddress.city}, {userAddress.state} {userAddress.zipCode}
            </Text>
          </View>
        )}

        {/* Use Different Address Link */}
        <TouchableOpacity onPress={handleUseDifferentAddress}>
          <Text style={styles.differentAddressLink}>
            Use a different delivery address
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Button */}
      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>Confirm</Text>
      </TouchableOpacity>
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
    width: 24,
    height: 24,
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
    color: '#000000',
  },
  stepTextThird: {
    position: 'absolute',
    left: '50%',
  },
  stepTextFourth: {
    position: 'absolute',
    left: '75%',
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
  },
  addressText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  differentAddressLink: {
    fontSize: 16,
    color: '#000',
    textDecorationLine: 'underline',
    fontWeight: '500',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginHorizontal: 24,
    marginBottom: 24,
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
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
