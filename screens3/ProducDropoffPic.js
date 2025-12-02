import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProducDropoffPic({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get route parameters
  const {
    userProfile: routeUserProfile,
    productDetails,
    orderDetails,
    deliveryPhotoUri,
    buyerInstructions = "Leave at my front door.",
  } = route.params || {};

  // Disable swipe back gesture
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        gestureEnabled: false,
      });
      
      return () => {
        navigation.getParent()?.setOptions({
          gestureEnabled: true,
        });
      };
    }, [navigation])
  );

  // Load user profile
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      // Try to get from route params first
      if (routeUserProfile) {
        setUserProfile(routeUserProfile);
        console.log('✅ ProducDropoffPic - Loaded user profile from route params');
        return;
      }

      // Otherwise load from AsyncStorage
      const storedProfile = await AsyncStorage.getItem('userProfileData');
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      
      if (storedProfile || tempUserData) {
        const profileData = storedProfile ? JSON.parse(storedProfile) : {};
        const tempData = tempUserData ? JSON.parse(tempUserData) : {};
        const mergedProfile = { ...profileData, ...tempData };
        
        console.log('✅ ProducDropoffPic - Loaded user profile from AsyncStorage:', mergedProfile);
        setUserProfile(mergedProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Get user initials for profile fallback
  const getUserInitials = () => {
    if (!userProfile) return 'U';
    const firstName = userProfile.firstName || userProfile.first_name || '';
    const lastName = userProfile.lastName || userProfile.last_name || '';
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return userProfile.email?.charAt(0)?.toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  // Get profile image
  const getProfileImage = () => {
    if (userProfile?.avatar_url || userProfile?.profileImageUri) {
      return userProfile.avatar_url || userProfile.profileImageUri;
    }
    return null;
  };

  // Handle taking a photo
  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission Denied', 'We need permission to access your camera.');
        setIsLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle retake
  const handleRetake = () => {
    setCapturedPhoto(null);
    setShowPreview(false);
    handleTakePhoto();
  };

  // Handle use photo - go back to main screen with photo
  const handleUsePhoto = () => {
    setShowPreview(false);
    // Photo is already in capturedPhoto state, just hide preview
  };

  // Handle Delivery Complete button
  const handleDeliveryComplete = () => {
    if (!capturedPhoto) return;
    
    // Navigate to next screen
    navigation.navigate('Welcomepage', {
      dropoffPhotoUri: capturedPhoto,
      deliveryPhotoUri,
      productDetails,
      orderDetails,
      userProfile,
      deliveryComplete: true,
    });
  };

  // Handle contact support
  const handleContactSupport = () => {
    navigation.navigate('Support');
  };

  // Render camera preview screen
  if (showPreview && capturedPhoto) {
    return (
      <View style={styles.previewContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* Photo preview */}
        <Image 
          source={{ uri: capturedPhoto }} 
          style={styles.previewImage}
          resizeMode="cover"
        />
        
        {/* Bottom buttons */}
        <View style={styles.previewButtonsContainer}>
          <TouchableOpacity 
            style={styles.previewButton}
            onPress={handleRetake}
          >
            <Text style={styles.previewButtonText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.previewButton}
            onPress={handleUsePhoto}
          >
            <Text style={styles.previewButtonText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render main screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image 
              source={require('../assets/backarrow.png')} 
              style={styles.backArrowImage}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DELIVERY</Text>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('MyAccount')}
          >
            {getProfileImage() ? (
              <Image
                source={{ uri: getProfileImage() }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileFallback}>
                <Text style={styles.profileInitials}>{getUserInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.dropoffLabel}>DROP-OFF</Text>
          <Text style={styles.title}>Product drop-off</Text>
          <Text style={styles.description}>
            Place the product in a Couri delivery bag, follow the buyer's drop-off instructions, and take a photo of the delivery.
          </Text>

          {/* Buyer's drop-off instructions section */}
          <View style={styles.instructionsSection}>
            <View style={styles.instructionsHeader}>
              <Text style={styles.clipboardIcon}>📋</Text>
              <Text style={styles.instructionsTitle}>Buyer's drop-off instructions</Text>
            </View>
            <Text style={styles.instructionsText}>"{buyerInstructions}"</Text>
          </View>

          {/* Divider */}
          <View style={styles.sectionDivider} />

          {/* Take a photo section */}
          <View style={styles.photoSection}>
            <Text style={styles.photoSectionTitle}>Take a photo</Text>
            <Text style={styles.photoSectionSubtitle}>Photo will be shared with the buyer.</Text>

            {/* Photo Box */}
            <TouchableOpacity 
              style={styles.takePhotoContainer}
              onPress={handleTakePhoto}
              disabled={isLoading}
            >
              {capturedPhoto ? (
                <Image 
                  source={{ uri: capturedPhoto }} 
                  style={styles.capturedPhotoImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.takePhotoBox}>
                  <View style={styles.photoIconContainer}>
                    <Image 
                      source={require('../assets/gallery.png')} 
                      style={styles.photoIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.takePhotoText}>Take Photo</Text>
                  <View style={styles.plusButton}>
                    <Text style={styles.plusText}>+</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Delivery Complete Button */}
          <TouchableOpacity 
            style={[
              styles.completeButton,
              !capturedPhoto && styles.completeButtonDisabled
            ]}
            onPress={handleDeliveryComplete}
            disabled={!capturedPhoto}
          >
            <Text style={[
              styles.completeButtonText,
              !capturedPhoto && styles.completeButtonTextDisabled
            ]}>
              Delivery complete
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.divider} />
          <Text style={styles.wrongText}>Did something go wrong?</Text>
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={handleContactSupport}
          >
            <Text style={styles.supportIcon}>🎧</Text>
            <Text style={styles.supportButtonText}>Contact support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  backArrowImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#000',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dropoffLabel: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: '#000',
    marginBottom: 12,
    lineHeight: 36,
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 24,
  },
  instructionsSection: {
    marginBottom: 20,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clipboardIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 24,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },
  photoSection: {
    marginBottom: 20,
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  photoSectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  takePhotoContainer: {
    alignItems: 'center',
  },
  takePhotoBox: {
    alignItems: 'center',
    position: 'relative',
  },
  photoIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoIcon: {
    width: 32,
    height: 32,
    opacity: 0.5,
  },
  takePhotoText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  plusButton: {
    position: 'absolute',
    bottom: 28,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  plusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '300',
    marginTop: -2,
  },
  capturedPhotoImage: {
    width: 100,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  completeButton: {
    backgroundColor: '#000',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  completeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButtonTextDisabled: {
    color: '#fff',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },
  wrongText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  supportIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  supportButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  // Preview screen styles
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  previewButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: 50,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

