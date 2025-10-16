import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UploadPhotoScreen({ navigation, route }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [completeUserInfo, setCompleteUserInfo] = useState(null);
  const { userInfo, savedUser } = route.params || {};

  // DEBUG: Add comprehensive logging for user data flow
  useEffect(() => {
    console.log('🔍 UploadPhotoScreen DEBUG - Component mounted');
    console.log('🔍 UploadPhotoScreen DEBUG - Route params:', route?.params);
    console.log('🔍 UploadPhotoScreen DEBUG - User info from params:', userInfo);
    console.log('🔍 UploadPhotoScreen DEBUG - Saved user from params:', savedUser);
    
    // Check AsyncStorage for existing user data
    const checkAsyncStorage = async () => {
      try {
        const tempUserData = await AsyncStorage.getItem('tempUserData');
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        console.log('🔍 UploadPhotoScreen DEBUG - tempUserData from AsyncStorage:', tempUserData ? JSON.parse(tempUserData) : null);
        console.log('🔍 UploadPhotoScreen DEBUG - userProfileData from AsyncStorage:', userProfileData ? JSON.parse(userProfileData) : null);
        
        // CRITICAL: If we have existing user data in AsyncStorage, merge it with route params
        // This ensures we don't lose any user data when adding a profile picture
        if (tempUserData || userProfileData) {
          const existingTempData = tempUserData ? JSON.parse(tempUserData) : {};
          const existingProfileData = userProfileData ? JSON.parse(userProfileData) : {};
          
          // Merge existing data with route params to ensure complete user information
          const mergedUserInfo = {
            ...existingTempData,
            ...existingProfileData,
            ...userInfo, // Route params take precedence but don't override existing data
          };
          
          console.log('🔍 UploadPhotoScreen DEBUG - Merged user info with existing data:', mergedUserInfo);
          
          // Update the userInfo state to include all existing data
          if (Object.keys(mergedUserInfo).length > 0) {
            // Store the merged data back to ensure consistency
            await AsyncStorage.setItem('tempUserData', JSON.stringify(mergedUserInfo));
            console.log('✅ UploadPhotoScreen DEBUG - Updated tempUserData with merged user info');
            
            // Set the complete user info state
            setCompleteUserInfo(mergedUserInfo);
          }
        }
      } catch (error) {
        console.log('🔍 UploadPhotoScreen DEBUG - AsyncStorage check error:', error);
      }
    };
    
    checkAsyncStorage();
    
    // Fallback: If no existing data found, use route params
    if (!completeUserInfo && userInfo) {
      setCompleteUserInfo(userInfo);
      console.log('🔍 UploadPhotoScreen DEBUG - Using route params as fallback for user info');
    }
  }, []);
  
  // Use completeUserInfo if available, otherwise fall back to route params
  const effectiveUserInfo = completeUserInfo || userInfo;

  // DEBUG: Function to log all user data in AsyncStorage
  const logAllUserData = async (stage) => {
    try {
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      const userProfileData = await AsyncStorage.getItem('userProfileData');
      console.log(`🔍 UploadPhotoScreen DEBUG - [${stage}] tempUserData:`, tempUserData ? JSON.parse(tempUserData) : null);
      console.log(`🔍 UploadPhotoScreen DEBUG - [${stage}] userProfileData:`, userProfileData ? JSON.parse(userProfileData) : null);
    } catch (error) {
      console.log(`🔍 UploadPhotoScreen DEBUG - [${stage}] AsyncStorage check error:`, error);
    }
  };

  useEffect(() => {
    // Request permissions on component mount
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      setIsLoading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      setIsLoading(true);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    console.log('🔍 UploadPhotoScreen DEBUG - handleContinue called');
    console.log('🔍 UploadPhotoScreen DEBUG - Selected image:', selectedImage);
    console.log('🔍 UploadPhotoScreen DEBUG - Effective user info:', effectiveUserInfo);
    
    if (!selectedImage) {
      Alert.alert('Photo Required', 'Please select or take a photo to continue.');
      return;
    }

    try {
      console.log('🔍 UploadPhotoScreen DEBUG - Storing user data with photo');
      
      // Log user data BEFORE storing
      await logAllUserData('BEFORE_STORING_PHOTO');
      
      // CRITICAL FIX: Read existing user data from AsyncStorage to ensure we don't lose any information
      let existingTempData = {};
      let existingProfileData = {};
      
      try {
        const tempUserData = await AsyncStorage.getItem('tempUserData');
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        
        if (tempUserData) {
          existingTempData = JSON.parse(tempUserData);
          console.log('🔍 UploadPhotoScreen DEBUG - Found existing tempUserData:', existingTempData);
        }
        
        if (userProfileData) {
          existingProfileData = JSON.parse(userProfileData);
          console.log('🔍 UploadPhotoScreen DEBUG - Found existing userProfileData:', existingProfileData);
        }
      } catch (error) {
        console.log('🔍 UploadPhotoScreen DEBUG - Error reading existing data:', error);
      }
      
      // Merge all existing data sources to ensure complete user information
      const completeExistingData = {
        ...existingProfileData,  // userProfileData has the most complete info
        ...existingTempData,     // tempUserData may have additional info
        ...effectiveUserInfo,    // route params
      };
      
      console.log('🔍 UploadPhotoScreen DEBUG - Complete merged existing data:', completeExistingData);
      
      // Store the image URI in multiple places for consistent access
      const userData = {
        ...completeExistingData,  // Use merged data instead of just effectiveUserInfo
        profileImageUri: selectedImage,
        avatar_url: selectedImage, // Add this for consistency
        isGoogleAuth: route.params?.isGoogleAuth || false,
      };

      console.log('🔍 UploadPhotoScreen DEBUG - User data to store:', userData);

      // Store in AsyncStorage for the welcome screen to access
      await AsyncStorage.setItem('tempUserData', JSON.stringify(userData));
      
      // Store COMPLETE user data in userProfileData for other screens
      // This ensures all user information is preserved when adding profile picture
      const completeUserProfileData = {
        // PRESERVE ALL EXISTING USER DATA FIRST using merged data
        ...completeExistingData,
        // Then add/update specific fields
        id: completeExistingData?.id || 'temp_user',
        avatar_url: selectedImage,
        profileImageUri: selectedImage,
        // Ensure these fields exist (but don't override if they're already in completeExistingData)
        firstName: completeExistingData?.firstName || completeExistingData?.name?.split(' ')[0] || '',
        lastName: completeExistingData?.name?.split(' ').slice(1).join(' ') || '',
        name: completeExistingData?.firstName || completeExistingData?.name || '',
        full_name: completeExistingData?.full_name || `${completeExistingData?.firstName || ''} ${completeExistingData?.lastName || ''}`.trim(),
        email: completeExistingData?.email || '',
        phone: completeExistingData?.phone || '',
        address1: completeExistingData?.address1 || '',
        address2: completeExistingData?.address2 || '',
        city: completeExistingData?.city || '',
        state: completeExistingData?.state || '',
        zip: completeExistingData?.zip || '',
      };
      
      await AsyncStorage.setItem('userProfileData', JSON.stringify(completeUserProfileData));
      
      // Log user data AFTER storing
      await logAllUserData('AFTER_STORING_PHOTO');
      
      // ADDITIONAL DEBUG: Log the exact data being stored
      console.log('🔍 UploadPhotoScreen DEBUG - COMPLETE userData being stored in tempUserData:', JSON.stringify(userData, null, 2));
      console.log('🔍 UploadPhotoScreen DEBUG - COMPLETE userProfileData being stored:', JSON.stringify(completeUserProfileData, null, 2));
      console.log('🔍 UploadPhotoScreen DEBUG - Data comparison - Original userInfo vs Stored:', {
        originalKeys: Object.keys(userInfo || {}),
        storedKeys: Object.keys(completeUserProfileData),
        hasAllOriginalData: Object.keys(userInfo || {}).every(key => completeUserProfileData.hasOwnProperty(key))
      });
      
      console.log('✅ User data with photo stored in AsyncStorage (tempUserData and userProfileData)');
      console.log('🔍 UploadPhotoScreen DEBUG - Complete userProfileData stored:', completeUserProfileData);
      console.log('🔍 UploadPhotoScreen DEBUG - Navigating to Welcomepage with photo data');

      // Set flag to indicate user just completed account creation - this ensures they stay on Welcomepage
      await AsyncStorage.setItem('justCreatedAccount', 'true');
      console.log('✅ UploadPhotoScreen: justCreatedAccount flag set to true');

      // Navigate to Welcomepage to show user info after completing sign-up flow
      navigation.replace('Welcomepage', { 
        name: completeExistingData?.firstName || completeExistingData?.name || 'there',
        userData: userData
      });
    } catch (error) {
      console.error('Error storing user data:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    }
  };

  const handleSkip = async () => {
    console.log('🔍 UploadPhotoScreen DEBUG - handleSkip called');
    console.log('🔍 UploadPhotoScreen DEBUG - Effective user info for initials:', effectiveUserInfo);
    
    try {
      // Generate user initials for profile picture
      let userInitials = '?';
      if (effectiveUserInfo?.firstName && effectiveUserInfo?.lastName) {
        userInitials = (effectiveUserInfo.firstName.charAt(0) + effectiveUserInfo.lastName.charAt(0)).toUpperCase();
      } else if (effectiveUserInfo?.name) {
        const names = effectiveUserInfo.name.split(' ');
        if (names.length >= 2) {
          userInitials = (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
        } else if (names.length === 1) {
          userInitials = names[0].charAt(0).toUpperCase();
        }
      }
      
      console.log('🔍 UploadPhotoScreen DEBUG - Generated user initials:', userInitials);

      // Log user data BEFORE storing
      await logAllUserData('BEFORE_STORING_SKIP');

      // CRITICAL FIX: Read existing user data from AsyncStorage to ensure we don't lose any information
      let existingTempData = {};
      let existingProfileData = {};
      
      try {
        const tempUserData = await AsyncStorage.getItem('tempUserData');
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        
        if (tempUserData) {
          existingTempData = JSON.parse(tempUserData);
          console.log('🔍 UploadPhotoScreen DEBUG - Found existing tempUserData (skip):', existingTempData);
        }
        
        if (userProfileData) {
          existingProfileData = JSON.parse(userProfileData);
          console.log('🔍 UploadPhotoScreen DEBUG - Found existing userProfileData (skip):', existingProfileData);
        }
      } catch (error) {
        console.log('🔍 UploadPhotoScreen DEBUG - Error reading existing data (skip):', error);
      }
      
      // Merge all existing data sources to ensure complete user information
      const completeExistingData = {
        ...existingProfileData,  // userProfileData has the most complete info
        ...existingTempData,     // tempUserData may have additional info
        ...effectiveUserInfo,    // route params
      };
      
      console.log('🔍 UploadPhotoScreen DEBUG - Complete merged existing data (skip):', completeExistingData);

      // Store user data without NEW photo but PRESERVE existing profile picture if it exists
      const userData = {
        ...completeExistingData,  // Use merged data instead of just effectiveUserInfo
        isGoogleAuth: route.params?.isGoogleAuth || false,
        userInitials: userInitials,
        hasSkippedPhoto: true,
        // PRESERVE existing profile picture if it exists, don't clear it
        avatar_url: completeExistingData?.avatar_url || '', // Keep existing or empty
        profileImageUri: completeExistingData?.profileImageUri || '', // Keep existing or empty
      };

      await AsyncStorage.setItem('tempUserData', JSON.stringify(userData));
      
      // Store COMPLETE user data in userProfileData for other screens - PRESERVE existing profile picture
      // This ensures all user information is preserved even when skipping photo
      const completeUserProfileData = {
        // PRESERVE ALL EXISTING USER DATA FIRST using merged data
        ...completeExistingData,
        // Then add/update specific fields
        id: completeExistingData?.id || 'temp_user',
        // PRESERVE existing profile picture if it exists, don't clear it
        avatar_url: completeExistingData?.avatar_url || '', // Keep existing or empty
        profileImageUri: completeExistingData?.profileImageUri || '', // Keep existing or empty
        hasSkippedPhoto: true,
        userInitials: userInitials,
        // Ensure these fields exist (but don't override if they're already in completeExistingData)
        firstName: completeExistingData?.firstName || completeExistingData?.name?.split(' ')[0] || '',
        lastName: completeExistingData?.name?.split(' ').slice(1).join(' ') || '',
        name: completeExistingData?.firstName || completeExistingData?.name || '',
        full_name: completeExistingData?.full_name || `${completeExistingData?.firstName || ''} ${completeExistingData?.lastName || ''}`.trim(),
        email: completeExistingData?.email || '',
        phone: completeExistingData?.phone || '',
        address1: completeExistingData?.address1 || '',
        address2: completeExistingData?.address2 || '',
        city: completeExistingData?.city || '',
        state: completeExistingData?.state || '',
        zip: completeExistingData?.zip || '',
      };
      
      await AsyncStorage.setItem('userProfileData', JSON.stringify(completeUserProfileData));
      
      // Log user data AFTER storing
      await logAllUserData('AFTER_STORING_SKIP');
      
      // ADDITIONAL DEBUG: Log the exact data being stored
      console.log('🔍 UploadPhotoScreen DEBUG - COMPLETE userData being stored in tempUserData (skip):', JSON.stringify(userData, null, 2));
      console.log('🔍 UploadPhotoScreen DEBUG - COMPLETE userProfileData being stored (skip):', JSON.stringify(completeUserProfileData, null, 2));
      console.log('🔍 UploadPhotoScreen DEBUG - Data comparison - Original userInfo vs Stored (skip):', {
        originalKeys: Object.keys(userInfo || {}),
        storedKeys: Object.keys(completeUserProfileData),
        hasAllOriginalData: Object.keys(userInfo || {}).every(key => completeUserProfileData.hasOwnProperty(key))
      });
      
      // CLEAR any existing profile pictures from previous sessions
      await AsyncStorage.removeItem('previousProfilePicture');
      await AsyncStorage.removeItem('storedProfilePicture');
      
      console.log('✅ User data with initials stored in AsyncStorage (photo skipped) - NO PROFILE PICTURE');
      console.log('🔍 UploadPhotoScreen DEBUG - Complete userProfileData stored (no photo):', completeUserProfileData);
      console.log('🗑️ Cleared any previous profile picture data');
      console.log('🔍 UploadPhotoScreen DEBUG - Navigating to Welcomepage with initials data');

      // Set flag to indicate user just completed account creation - this ensures they stay on Welcomepage
      await AsyncStorage.setItem('justCreatedAccount', 'true');
      console.log('✅ UploadPhotoScreen: justCreatedAccount flag set to true (skip path)');

      // Navigate to Welcomepage to show user info after completing sign-up flow
      navigation.replace('Welcomepage', { 
        name: completeExistingData?.firstName || completeExistingData?.name || 'there',
        userData: userData
      });
    } catch (error) {
      console.error('Error storing user data:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        {/* App Logo */}
        <View style={styles.appTitleContainer}>
          <Image
            source={require('../assets/Logo_Dark.png')}
            style={styles.appLogo}
            resizeMode="contain"
          />
        </View>

        {/* Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Image 
                  source={require('../assets/mountain.png')} 
                  style={styles.placeholderIcon}
                  resizeMode="contain"
                />
              </View>
            )}
            
            {/* Small black circular button with plus sign */}
            <TouchableOpacity 
              style={styles.plusButton}
              onPress={() => setShowModal(true)}
              disabled={isLoading}
            >
              <Text style={styles.plusSign}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Upload a Photo</Text>
          <Text style={styles.subtitle}>
            Your photo will be used on Couri so that people you interact with can put a face to your name.
          </Text>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.savePhotoButton}
            onPress={handleContinue}
            disabled={!selectedImage || isLoading}
          >
            <Text style={styles.savePhotoButtonText}>Save Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        {/* Photo Selection Modal */}
        {showModal && (
          <View style={styles.modalOverlay}>
            {/* Close Button - Outside and on top of modal */}
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            
            <View style={styles.modalContainer}>

              {/* Modal Title */}
              <Text style={styles.modalTitle}>Upload media</Text>
              
              {/* Horizontal line under title */}
              <View style={styles.titleUnderline} />

              {/* Modal Options */}
              <View style={styles.modalOptions}>
                {/* Upload Photo Option */}
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => {
                    setShowModal(false);
                    pickImage();
                  }}
                >
                  <View style={styles.modalIconContainer}>
                    <Image
                      source={require('../assets/gallery.png')} 
                      style={styles.modalIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.modalOptionText}>Upload Photo</Text>
                </TouchableOpacity>
                
                {/* Vertical divider line */}
                <View style={styles.verticalDivider} />
                
                {/* Take Photo Option */}
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => {
                    setShowModal(false);
                    takePhoto();
                  }}
                >
                  <View style={styles.modalIconContainer}>
                    <Image
                      source={require('../assets/camera.png')} 
                      style={styles.modalIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.modalOptionText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  appTitleContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  appLogo: {
    width: 80,
    height: 40,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  selectedImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  placeholderContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    opacity: 0.6,
  },
  plusButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  plusSign: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    marginBottom: 16,
    textAlign: 'center',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 50,
    textAlign: 'center',
    lineHeight: 22,
  },
  savePhotoButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  savePhotoButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#000',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(128, 128, 128, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '91%',
    alignItems: 'center',
    zIndex: 1001,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: '50%',
    right: 15,
    width: 30,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [
      { translateY: -100 }
    ],
    zIndex: 1002,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15,
    marginTop: 5,
  },
  modalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalOption: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalIconContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  modalIcon: {
    width: 30,
    height: 30,
    opacity: 0.8,
  },
  modalPlusSign: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPlusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '300',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  titleUnderline: {
    width: '100%',
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },
  verticalDivider: {
    width: 1,
    height: 80,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
    marginTop: -20,
  },
});
