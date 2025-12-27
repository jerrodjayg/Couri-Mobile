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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../screens/supabaseClient';

export default function ProductScreen({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [sizeWarningModalVisible, setSizeWarningModalVisible] = useState(false);
  const { user, customUser, setCustomUser } = useUser();
  
  // Get the transaction type from route params
  const { type, showSizeWarning } = route.params || {};
  const isSelling = type === 'sell';

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUrlChange = (text) => {
    setUrlInput(text);
    
    // Auto-navigate when a valid URL is entered
    if (text.startsWith('https://') && text.length > 10) {
      console.log('✅ Valid HTTPS URL detected, navigating to ProductPreview');
      setTimeout(() => {
        navigation.navigate('ProductPreview', { 
          productUrl: text,
          userAddress: userProfile,
          transactionType: type,
          userProfile: userProfile
        });
      }, 500); // Small delay to ensure smooth transition
    }
  };


  // Show size warning modal after 1 second when screen loads if showSizeWarning is true
  useEffect(() => {
    if (showSizeWarning) {
      const timer = setTimeout(() => {
        setSizeWarningModalVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [showSizeWarning]);

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
      
      {/* Size Warning Modal */}
      <Modal visible={sizeWarningModalVisible} transparent animationType="fade" onRequestClose={() => setSizeWarningModalVisible(false)}>
        <View style={sizeWarningModalStyles.overlay}>
          <View style={sizeWarningModalStyles.modalContent}>
            {/* Icon */}
            <View style={sizeWarningModalStyles.iconContainer}>
              <View style={sizeWarningModalStyles.iconCircle}>
                <Image 
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Mark 2 Dark.png' }}
                  style={sizeWarningModalStyles.iconImage}
                  resizeMode="contain"
                  onError={() => console.log('❌ Failed to load mark2_dark.png from Supabase')}
                />
              </View>
            </View>
            
            {/* Title */}
            <Text style={sizeWarningModalStyles.title}>Heads up!</Text>
            
            {/* Body Text */}
            <Text style={sizeWarningModalStyles.bodyText}>
              Couri drivers use their personal cars, so all{'\n'} items need to fit in a standard trunk or back {'\n'} seat. Large items (like couches or large{'\n'} appliances) can't be delivered at this time. <Text style={sizeWarningModalStyles.boldText}>Oversized items may be canceled.</Text>
            </Text>
            
            {/* Buttons */}
            <TouchableOpacity
              style={sizeWarningModalStyles.understandButton}
              onPress={() => setSizeWarningModalVisible(false)}
            >
              <Text style={sizeWarningModalStyles.understandButtonText}>I understand</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={sizeWarningModalStyles.cancelButton}
              onPress={() => {
                setSizeWarningModalVisible(false);
                navigation.goBack();
              }}
            >
              <Text style={sizeWarningModalStyles.cancelButtonText}>Cancel transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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

      {/* Progress Tabs */}
      <View style={styles.progressContainer}>
        {!isSelling ? (
          // Buyer flow: Only 2 tabs side by side
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
          // Seller flow: 4 tabs (existing)
          <>
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
          </>
        )}
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {isSelling ? 'What are you selling?' : 'What are you buying?'}
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={urlInput.length === 0 ? "Paste listing URL (optional)" : ""}
            placeholderTextColor="#9CA3AF"
            value={urlInput}
            onChangeText={handleUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <View style={styles.inputUnderline} />
        </View>
        
        <Text style={styles.instructionText}>
          Enter a product URL from Facebook Marketplace, Craigslist, or any other P2P site. We'll connect it to your Couri service.
        </Text>

        {!isSelling && (
          <>
            {/* OR Separator */}
            <View style={styles.separatorContainer}>
              <Text style={styles.separatorText}>or</Text>
            </View>

            {/* Manual Input Button */}
            <TouchableOpacity 
              style={styles.manualInputButton}
              onPress={() => navigation.navigate('ManualProductInput', {
                type,
                userProfile
              })}
            >
              <Text style={styles.manualInputButtonText}>Input product info manually</Text>
            </TouchableOpacity>
          </>
        )}
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
    paddingHorizontal: 15,
    paddingTop: 16,
    paddingBottom: 0,
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
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 100,
  },
  progressLabels: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 0,
    position: 'relative',
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 0,
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
    fontSize: 28,
    fontWeight: '500',
    color: '#000',
    textAlign: 'left',
    fontStyle: 'Areal Normal',
    marginTop: 30,
  },
  inputContainer: {
    marginTop: 35,
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 26,
    fontWeight: '400',
    color: '#',
    marginBottom: 12,
    textAlign: 'left',
    fontStyle: 'Regular'
  },
  textInput: {
    fontSize: 28,
    color: '#000',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 0,
    marginBottom: 0,
    textAlign: 'left',
    fontWeight: 400,
    fontFamily: 'Areal Normal'
  },
  inputUnderline: {
    height: 2,
    backgroundColor: '#000000',
    marginBottom: -0,
  },
  instructionText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    textAlign: 'left',
    paddingHorizontal: 0,
    fontWeight: 400,
    fontFamily: "Area Normal Trial"
  },
  separatorContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  separatorText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '600',
    fontStyle: 'semibold'
  },
  manualInputButton: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  manualInputButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Arer Normal Trial'
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

const sizeWarningModalStyles = StyleSheet.create({
  overlay: {
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
    maxWidth: 352,
    width: '110%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 30,
    height: 30,
  },
  title: {
    fontSize: 32,
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '400',
    fontFamily: 'Area Normal'
  },
  bodyText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontStyle: 'normal',
    fontWeight: '400',
    fontFamily: 'Area Normal'
  },
  boldText: {
    fontWeight: 'bold',
  },
  understandButton: {
    backgroundColor: '#171715',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  understandButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '600',
    fontStyle: 'semibold'
  },
});
