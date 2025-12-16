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

export default function DeliverToBuyerPhoto2({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get route parameters
  const {
    userProfile: routeUserProfile,
    productDetails,
    orderDetails,
    buyerInfo,
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
      if (routeUserProfile) {
        setUserProfile(routeUserProfile);
        console.log('✅ DeliverToBuyerPhoto2 - Loaded user profile from route params');
        return;
      }

      const storedProfile = await AsyncStorage.getItem('userProfileData');
      const tempUserData = await AsyncStorage.getItem('tempUserData');

      if (storedProfile || tempUserData) {
        const profileData = storedProfile ? JSON.parse(storedProfile) : {};
        const tempData = tempUserData ? JSON.parse(tempUserData) : {};
        const mergedProfile = { ...profileData, ...tempData };

        console.log('✅ DeliverToBuyerPhoto2 - Loaded user profile from AsyncStorage:', mergedProfile);
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
    return name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase();
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

  // Handle use photo
  const handleUsePhoto = () => {
    setShowPreview(false);
    // Photo is now set, button will be enabled
  };

  // Handle Ready for Delivery
  const handleReadyForDelivery = () => {
    if (!capturedPhoto) return;

    navigation.navigate('DriverAtBuyerDoor', {
      deliveryPhotoUri: capturedPhoto,
      productDetails,
      orderDetails,
      userProfile,
      buyerInfo,
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

        {/* Header text */}
        <SafeAreaView style={styles.previewHeader}>
          <Text style={styles.previewHeaderText}>Deliver to buyer</Text>
        </SafeAreaView>

        {/* Photo preview */}
        <Image
          source={{ uri: capturedPhoto }}
          style={styles.previewImage}
          resizeMode="cover"
        />

        {/* Bottom buttons */}
        <View style={styles.previewButtonsContainer}>
          <TouchableOpacity style={styles.previewButton} onPress={handleRetake}>
            <Text style={styles.previewButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.previewButton} onPress={handleUsePhoto}>
            <Text style={styles.previewButtonText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render main screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBF9" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image source={require('../assets/backarrow.png')} style={styles.backArrowImage} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DELIVERY</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('MyAccount')}
          >
            {getProfileImage() ? (
              <Image source={{ uri: getProfileImage() }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileFallback}>
                <Text style={styles.profileInitials}>{getUserInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Icon - Camera or Checkmark */}
        <View style={styles.iconContainer}>
          {capturedPhoto ? (
            <View style={styles.checkmarkCircle}>
              <Text style={styles.checkmarkIcon}>✓</Text>
            </View>
          ) : (
            <View style={styles.cameraCircle}>
              <Image source={require('../assets/camera.png')} style={styles.cameraIcon} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.conditionLabel}>CONDITION VERIFICATION</Text>
          <Text style={styles.title}>Take a product photo before you deliver</Text>
          <Text style={styles.description}>
            To protect against mishandling claims, take a photo of the product when you arrive at
            the buyer's location, before dropping it off.
          </Text>

          {/* Photo Box */}
          <View style={styles.photoBoxContainer}>
            {capturedPhoto ? (
              <View style={styles.photoWithImage}>
                <Image source={{ uri: capturedPhoto }} style={styles.capturedPhotoImage} />
                {/* Retake button overlay */}
                <TouchableOpacity style={styles.retakeButton} onPress={handleTakePhoto}>
                  <Text style={styles.retakeIcon}>📷</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.takePhotoBox} onPress={handleTakePhoto}>
                <View style={styles.photoIconWrapper}>
                  <Text style={styles.photoIcon}>🖼️</Text>
                </View>
                <Text style={styles.takePhotoText}>Take Photo</Text>
                {/* Plus button */}
                <TouchableOpacity style={styles.plusButton} onPress={handleTakePhoto}>
                  <Text style={styles.plusText}>+</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          </View>

          {/* Ready for Delivery Button */}
          <TouchableOpacity
            style={[styles.readyButton, !capturedPhoto && styles.readyButtonDisabled]}
            onPress={handleReadyForDelivery}
            disabled={!capturedPhoto}
          >
            <Text style={styles.readyButtonText}>Ready for Delivery</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.divider} />
          <Text style={styles.wrongText}>Did something go wrong?</Text>
          <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
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
    backgroundColor: '#FBFBF9',
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
  },
  backButton: {
    padding: 5,
  },
  backArrowImage: {
    width: 30,
    height: 20,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 0.36,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#171715',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D2691E',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  iconContainer: {
    paddingHorizontal: 23,
    paddingTop: 20,
  },
  cameraCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F9F5F1',
    borderWidth: 1,
    borderColor: '#D3D3D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  checkmarkCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2DD4A8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 20,
  },
  conditionLabel: {
    fontSize: 12,
    color: '#82827F',
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#000',
    marginBottom: 16,
    lineHeight: 40,
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    lineHeight: 24,
    marginBottom: 30,
  },
  photoBoxContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  takePhotoBox: {
    width: 115,
    height: 114,
    borderRadius: 6,
    backgroundColor: 'rgba(130, 130, 127, 0.1)',
    borderWidth: 1,
    borderColor: '#D3D3D3',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photoIconWrapper: {
    marginBottom: 7,
  },
  photoIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  takePhotoText: {
    fontSize: 14,
    color: '#171715',
    letterSpacing: 0.14,
  },
  plusButton: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: '#171715',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
  photoWithImage: {
    width: 115,
    height: 114,
    borderRadius: 6,
    position: 'relative',
    overflow: 'visible',
  },
  capturedPhotoImage: {
    width: 115,
    height: 114,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  retakeButton: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: '#171715',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeIcon: {
    fontSize: 16,
    color: '#fff',
  },
  readyButton: {
    backgroundColor: '#171715',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    // Shadow effect
    shadowColor: '#171715',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  readyButtonDisabled: {
    backgroundColor: '#82827F',
  },
  readyButtonText: {
    color: '#FBFBF9',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#82827F',
    opacity: 0.3,
    marginBottom: 20,
  },
  wrongText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 60,
  },
  supportIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171715',
  },
  // Preview screen styles
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  previewHeaderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
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
