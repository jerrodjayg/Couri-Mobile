import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../screens/supabaseClient';

export default function ProductScreen({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const { user, customUser, setCustomUser } = useUser();
  
  // Get the transaction type from route params
  const { type } = route.params || {};
  const isSelling = type === 'sell';

  const handleBack = () => {
    navigation.goBack();
  };

  // Fetch user profile from AsyncStorage or context
  useEffect(() => {
    const fetchUserProfile = async () => {
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
        console.log('⚠️ Error fetching user profile in URL screen:', error);
      }
    };

    fetchUserProfile();
  }, [user, route?.params?.userData]);

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

  const handleProfilePress = () => {
    if (userProfile) {
      // Pass user profile data to MyAccount screen
      navigation.navigate('MyAccount', { userData: userProfile });
    } else {
      // If not signed in, go to login
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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
        
        {/* Title underneath the progress bar */}
        <Text style={styles.title}>
          {isSelling ? 'What are you selling?' : 'What are you buying?'}
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Paste listing URL (optional)"
            placeholderTextColor="#9CA3AF"
            value={urlInput}
            onChangeText={setUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <View style={styles.inputUnderline} />
        </View>
        
        <Text style={styles.instructionText}>
          Enter a product URL from Facebook Marketplace, Craigslist, or any other P2P site. We'll connect it to your Couri service.
        </Text>
        
        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={() => {
            console.log('🚀 Continue button pressed');
            console.log('🔗 URL Input value:', urlInput);
            
            // Validate URL before navigating
            if (urlInput.startsWith('https://')) {
              console.log('✅ Valid HTTPS URL, navigating directly to ProductDetails');
              navigation.navigate('ProductDetails', { 
                productUrl: urlInput,
                userAddress: userProfile,
                transactionType: type, // Pass along the transaction type
                userProfile: userProfile
              });
            } else if (urlInput.trim() === '') {
              console.log('✅ No URL provided, navigating to ProductDetails for manual input');
              navigation.navigate('ProductDetails', { 
                productUrl: '',
                userAddress: userProfile,
                transactionType: type, // Pass along the transaction type
                userProfile: userProfile
              });
            } else {
              console.log('❌ Invalid URL - does not start with https://');
              // Show error message for non-HTTPS URLs
              Alert.alert(
                'Invalid Link',
                'We weren\'t able to recognize that link. Please try again, or input product info manually.',
                [
                  {
                    text: 'OK',
                    style: 'default'
                  }
                ]
              );
            }
          }}
        >
          <Text style={styles.submitButtonText}>Continue</Text>
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
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 62,
    marginBottom: 4,
    textAlign: 'left',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 26,
    fontWeight: '400',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'left',
  },
  textInput: {
    fontSize: 26,
    color: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 0,
    marginBottom: 0,
    textAlign: 'left',
  },
  inputUnderline: {
    height: 2,
    backgroundColor: '#000000',
    marginBottom: -0,
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'left',
    paddingHorizontal: 0,
  },
  submitButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 32,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
