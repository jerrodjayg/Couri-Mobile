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
  const { userInfo, savedUser } = route.params || {};

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
    if (!selectedImage) {
      Alert.alert('Photo Required', 'Please select or take a photo to continue.');
      return;
    }

    try {
      // Store the image URI in multiple places for consistent access
      const userData = {
        ...userInfo,
        profileImageUri: selectedImage,
        avatar_url: selectedImage, // Add this for consistency
        isGoogleAuth: route.params?.isGoogleAuth || false,
      };

      // Store in AsyncStorage for the welcome screen to access
      await AsyncStorage.setItem('tempUserData', JSON.stringify(userData));
      
      // Also store in userProfileData for other screens
      await AsyncStorage.setItem('userProfileData', JSON.stringify({
        id: userInfo?.id || 'temp_user',
        name: userInfo?.firstName || userInfo?.name || '',
        full_name: `${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`.trim(),
        avatar_url: selectedImage,
        email: userInfo?.email || ''
      }));
      
      console.log('✅ User data with photo stored in AsyncStorage (tempUserData and userProfileData)');

      // Navigate to Welcomepage with the user data
      navigation.replace('Welcomepage', { 
        name: userInfo?.firstName || userInfo?.name || 'there',
        userData: userData
      });
    } catch (error) {
      console.error('Error storing user data:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    }
  };

  const handleSkip = async () => {
    try {
      // Generate user initials for profile picture
      let userInitials = '?';
      if (userInfo?.firstName && userInfo?.lastName) {
        userInitials = (userInfo.firstName.charAt(0) + userInfo.lastName.charAt(0)).toUpperCase();
      } else if (userInfo?.name) {
        const names = userInfo.name.split(' ');
        if (names.length >= 2) {
          userInitials = (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
        } else if (names.length === 1) {
          userInitials = names[0].charAt(0).toUpperCase();
        }
      }

      // Store user data without photo but with initials - EXPLICITLY NO PROFILE PICTURE
      const userData = {
        ...userInfo,
        isGoogleAuth: route.params?.isGoogleAuth || false,
        userInitials: userInitials,
        hasSkippedPhoto: true,
        avatar_url: '', // Explicitly set to empty
        profileImageUri: '', // Explicitly set to empty
      };

      await AsyncStorage.setItem('tempUserData', JSON.stringify(userData));
      
      // Also store in userProfileData for other screens - EXPLICITLY NO PROFILE PICTURE
      await AsyncStorage.setItem('userProfileData', JSON.stringify({
        id: userInfo?.id || 'temp_user',
        name: userInfo?.firstName || userInfo?.name || '',
        full_name: `${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`.trim(),
        avatar_url: '', // Explicitly set to empty
        email: userInfo?.email || ''
      }));
      
      // CLEAR any existing profile pictures from previous sessions
      await AsyncStorage.removeItem('previousProfilePicture');
      await AsyncStorage.removeItem('storedProfilePicture');
      
      console.log('✅ User data with initials stored in AsyncStorage (photo skipped) - NO PROFILE PICTURE');
      console.log('🗑️ Cleared any previous profile picture data');

      // Navigate to Welcomepage
      navigation.replace('Welcomepage', { 
        name: userInfo?.firstName || userInfo?.name || 'there',
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
