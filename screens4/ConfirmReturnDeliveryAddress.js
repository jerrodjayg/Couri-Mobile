import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  TextInput,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../screens/supabaseClient';
import Svg, { Path } from 'react-native-svg';

// Warning/Alert Icon SVG Component
const WarningIcon = () => (
  <Svg width={21} height={20} viewBox="0 0 21 20" fill="none">
    <Path
      d="M10.5 2L1 18H20L10.5 2Z"
      stroke="#171715"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M10.5 7V11"
      stroke="#171715"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10.5 14H10.51"
      stroke="#171715"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Chat Icon SVG Component
const ChatIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
      stroke="#171715"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// Checkmark Icon SVG Component (Green circle with white checkmark)
const CheckmarkIcon = () => (
  <Svg width={31} height={31} viewBox="0 0 31 31" fill="none">
    <Path
      d="M15.5 31C24.0604 31 31 24.0604 31 15.5C31 6.93959 24.0604 0 15.5 0C6.93959 0 0 6.93959 0 15.5C0 24.0604 6.93959 31 15.5 31Z"
      fill="#27C193"
    />
    <Path
      d="M9 15.5L13.5 20L22 11"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function ConfirmReturnDeliveryAddress({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDropOffModal, setShowDropOffModal] = useState(false);
  const [dropOffInstructions, setDropOffInstructions] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const slideAnim = useRef(new Animated.Value(400)).current;

  const { 
    transactionData, 
    returnDetails, 
    productDetails, 
    deliveryAddress: routeDeliveryAddress,
    userProfile: routeUserProfile 
  } = route.params || {};

  useEffect(() => {
    loadUserProfile();
    loadUserAddress();
  }, []);

  const loadUserProfile = async () => {
    try {
      // First check if we have user profile from route params
      if (routeUserProfile) {
        setUserProfile(routeUserProfile);
        return;
      }

      // Try to get user data from AsyncStorage
      const userProfileData = await AsyncStorage.getItem('userProfileData');
      if (userProfileData) {
        const parsedUserData = JSON.parse(userProfileData);
        setUserProfile(parsedUserData);
      }
    } catch (error) {
      console.log('⚠️ Error fetching user profile:', error);
    }
  };

  const getUserInitials = () => {
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

    if (userProfile?.firstName && userProfile?.lastName) {
      return (userProfile.firstName.charAt(0) + userProfile.lastName.charAt(0)).toUpperCase();
    }
    
    return 'U';
  };

  const loadUserAddress = async () => {
    try {
      setLoading(true);
      
      // Check if we have delivery address from route params
      if (routeDeliveryAddress) {
        setUserAddress(routeDeliveryAddress);
        setLoading(false);
        return;
      }

      // Try to get address from user profile data
      const profileData = await AsyncStorage.getItem('userProfileData');
      if (profileData) {
        const profile = JSON.parse(profileData);
        if (profile.address1 || profile.address_line_1 || profile.street) {
          const address = {
            street: profile.address1 || profile.address_line_1 || profile.street || '',
            city: profile.city || '',
            state: profile.state || '',
            zipCode: profile.zip || profile.zip_code || profile.zipCode || ''
          };
          
          if (address.street && address.city && address.state && address.zipCode) {
            setUserAddress(address);
            setLoading(false);
            return;
          }
        }
      }

      // If no address found in profile, try database
      let userEmail = userProfile?.email;
      if (userEmail) {
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('address_line_1, city, state, zip_code')
          .eq('email', userEmail.toLowerCase())
          .maybeSingle();

        if (!error && dbUser && dbUser.address_line_1) {
          const address = {
            street: dbUser.address_line_1 || '',
            city: dbUser.city || '',
            state: dbUser.state || '',
            zipCode: dbUser.zip_code || ''
          };
          
          if (address.street && address.city && address.state && address.zipCode) {
            setUserAddress(address);
            setLoading(false);
            return;
          }
        }
      }

      // No address found
      setUserAddress(null);
    } catch (error) {
      console.error('❌ Error loading user address:', error);
      setUserAddress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    // Show the confirmation modal
    setShowConfirmModal(true);
  };

  const handleIUnderstand = () => {
    // Close the confirmation modal
    setShowConfirmModal(false);
    
    // Show the drop-off instructions modal with slide animation
    setTimeout(() => {
      setShowDropOffModal(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 200);
  };

  const handleContactSupport = () => {
    setShowConfirmModal(false);
    navigation.navigate('Support');
  };

  const handleDropOffSubmit = async () => {
    // Validate that text has been entered
    if (!dropOffInstructions.trim()) {
      setSubmitError('Must Enter Text');
      return;
    }

    // Clear any error
    setSubmitError('');

    // Close drop-off modal with animation
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowDropOffModal(false);
      // Show success modal after drop-off modal closes
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 200);
    });

    try {
      await AsyncStorage.setItem('userJourney_returnAddressConfirmed', 'true');
      await AsyncStorage.setItem('returnDropOffInstructions', dropOffInstructions);
      console.log('✅ Return delivery address confirmed with drop-off instructions');
    } catch (error) {
      console.error('Error tracking user journey:', error);
    }
  };

  const handleNoInstructions = async () => {
    // Clear any error
    setSubmitError('');

    // Close drop-off modal with animation
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowDropOffModal(false);
      // Show success modal after drop-off modal closes
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 200);
    });

    try {
      await AsyncStorage.setItem('userJourney_returnAddressConfirmed', 'true');
      console.log('✅ Return delivery address confirmed (no drop-off instructions)');
    } catch (error) {
      console.error('Error tracking user journey:', error);
    }
  };

  const handleGotIt = () => {
    setShowSuccessModal(false);
    
    // Navigate to next screen in return flow
    navigation.navigate('ReturnTrackingScreen', {
      ...transactionData,
      returnStatus: 'address_confirmed',
      deliveryAddress: userAddress,
      dropOffInstructions: dropOffInstructions,
      returnDetails: returnDetails,
      productDetails: productDetails,
      userProfile: userProfile
    });
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };

  const handleCloseDropOffModal = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowDropOffModal(false);
      setDropOffInstructions('');
      setSubmitError('');
    });
  };

  const handleUseDifferentAddress = () => {
    console.log('🔄 User wants to use different delivery address for return');
    navigation.navigate('EditReturnDeliveryAddress', {
      transactionData,
      returnDetails,
      productDetails,
      currentAddress: userAddress,
      userProfile
    });
  };

  const handleProfilePress = () => {
    if (userProfile) {
      navigation.navigate('MyAccount', { userData: userProfile });
    } else {
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBF9" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../assets/backarrow.png')} 
            style={styles.backArrowImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleProfilePress} style={styles.profileContainer}>
          {userProfile?.avatar_url ? (
            <Image 
              source={{ uri: userProfile.avatar_url }} 
              style={styles.profileImage}
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

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>Confirm your return delivery address</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Once the returned product is picked up, is this where it should be delivered?
        </Text>

        {/* Address Card */}
        {loading ? (
          <View style={styles.addressCard}>
            <Text style={styles.loadingText}>Loading your address...</Text>
          </View>
        ) : userAddress ? (
          <View style={styles.addressCard}>
            <Text style={styles.addressLine}>{userAddress.street}</Text>
            <Text style={styles.addressLine}>
              {userAddress.city}, {userAddress.state} {userAddress.zipCode}
            </Text>
          </View>
        ) : (
          <View style={styles.addressCard}>
            <Text style={styles.noAddressText}>No address on file</Text>
          </View>
        )}

        {/* Use Different Address Link */}
        <TouchableOpacity onPress={handleUseDifferentAddress}>
          <Text style={styles.differentAddressLink}>
            Use a different delivery address
          </Text>
        </TouchableOpacity>

        {/* Confirm Button with 3D Effect */}
        <View style={styles.buttonContainer}>
          {/* Shadow/border layer for 3D effect */}
          <View style={styles.buttonShadowLayer} />
          {/* Main button */}
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={!userAddress}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Warning Icon */}
            <View style={styles.warningIconContainer}>
              <WarningIcon />
            </View>

            {/* Modal Message */}
            <Text style={styles.modalMessage}>
              Once the item is picked up, delivery will begin immediately and you'll be able to track your driver in real-time. If you're not home, your order will be safely left at your doorstep.
            </Text>

            {/* I Understand Button with 3D Effect */}
            <View style={styles.modalButtonContainer}>
              {/* Shadow/border layer for 3D effect */}
              <View style={styles.modalButtonShadowLayer} />
              {/* Main button */}
              <TouchableOpacity 
                style={styles.understandButton}
                onPress={handleIUnderstand}
              >
                <Text style={styles.understandButtonText}>I understand</Text>
              </TouchableOpacity>
            </View>

            {/* Contact Support Link */}
            <TouchableOpacity onPress={handleContactSupport}>
              <Text style={styles.contactSupportLink}>Contact support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Drop-off Instructions Bottom Sheet Modal */}
      <Modal
        visible={showDropOffModal}
        transparent
        animationType="none"
        onRequestClose={handleCloseDropOffModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.bottomSheetOverlay}>
            {/* Close button - positioned above modal */}
            <TouchableOpacity 
              style={styles.bottomSheetCloseButton}
              onPress={handleCloseDropOffModal}
            >
              <Text style={styles.bottomSheetCloseButtonText}>×</Text>
            </TouchableOpacity>

            <Animated.View 
              style={[
                styles.bottomSheetContent,
                { transform: [{ translateY: slideAnim }] }
              ]}
            >
              {/* Header with Icon and Title */}
              <View style={styles.dropOffHeader}>
                <View style={styles.chatIconContainer}>
                  <ChatIcon />
                </View>
                <Text style={styles.dropOffTitle}>Drop-off instructions (optional)</Text>
              </View>

              {/* Text Input Field */}
              <View style={[
                styles.dropOffInputContainer,
                submitError ? styles.dropOffInputContainerError : null
              ]}>
                <TextInput
                  style={styles.dropOffInput}
                  value={dropOffInstructions}
                  onChangeText={(text) => {
                    setDropOffInstructions(text);
                    if (submitError) setSubmitError('');
                  }}
                  placeholder={`Add drop-off instructions in case you aren't at home at the time of delivery.\nI.e. "Leave package at my side entrance".`}
                  placeholderTextColor="#82827F"
                  multiline={true}
                  textAlignVertical="top"
                />
              </View>

              {/* Error Message */}
              {submitError ? (
                <Text style={styles.errorText}>{submitError}</Text>
              ) : null}

              {/* Submit Button with 3D Effect */}
              <View style={styles.dropOffButtonContainer}>
                {/* Shadow/border layer for 3D effect */}
                <View style={styles.dropOffButtonShadowLayer} />
                {/* Main button */}
                <TouchableOpacity 
                  style={styles.dropOffSubmitButton}
                  onPress={handleDropOffSubmit}
                >
                  <Text style={styles.dropOffSubmitButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>

              {/* No Instructions Link */}
              <TouchableOpacity onPress={handleNoInstructions}>
                <Text style={styles.noInstructionsLink}>No instructions to add</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.successModalOverlay}>
          {/* Close button - positioned above modal */}
          <TouchableOpacity 
            style={styles.successCloseButton}
            onPress={handleCloseSuccessModal}
          >
            <Text style={styles.successCloseButtonText}>×</Text>
          </TouchableOpacity>

          <View style={styles.successModalContent}>
            {/* Checkmark Icon */}
            <View style={styles.checkmarkContainer}>
              <CheckmarkIcon />
            </View>

            {/* Success Message */}
            <Text style={styles.successMessage}>
              As soon as the we've picked up the item from the buyer, we'll notify you and we'll begin delivery.
            </Text>

            {/* Got it Button with 3D Effect */}
            <View style={styles.gotItButtonContainer}>
              {/* Shadow/border layer for 3D effect */}
              <View style={styles.gotItButtonShadowLayer} />
              {/* Main button */}
              <TouchableOpacity 
                style={styles.gotItButton}
                onPress={handleGotIt}
              >
                <Text style={styles.gotItButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBF9',
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
    alignItems: 'flex-start',
  },
  backArrowImage: {
    width: 29,
    height: 19,
    tintColor: '#171715',
  },
  profileContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#171715',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#171715',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 24,
    letterSpacing: 0.2,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 24,
    letterSpacing: 0.28,
    marginBottom: 32,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 24,
    // Subtle shadow for the card
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  addressLine: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 23,
    letterSpacing: 0.13,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  noAddressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  differentAddressLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    textDecorationLine: 'underline',
    letterSpacing: 0.15,
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    position: 'relative',
    width: '100%',
    height: 56,
    marginBottom: 40,
  },
  buttonShadowLayer: {
    position: 'absolute',
    top: 5,
    left: 4,
    right: 0,
    height: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#171715',
    backgroundColor: 'transparent',
  },
  confirmButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 4,
    backgroundColor: '#171715',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#171715',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.15,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(89, 89, 89, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 382,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  warningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE8FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.14,
    marginBottom: 32,
  },
  modalButtonContainer: {
    position: 'relative',
    width: '100%',
    height: 56,
    marginBottom: 20,
  },
  modalButtonShadowLayer: {
    position: 'absolute',
    top: 5,
    left: 4,
    right: 0,
    height: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#171715',
    backgroundColor: 'transparent',
  },
  understandButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 4,
    backgroundColor: '#242422',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#171715',
  },
  understandButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.15,
    lineHeight: 20,
  },
  contactSupportLink: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
    textDecorationLine: 'underline',
  },
  // Drop-off Instructions Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetCloseButton: {
    position: 'absolute',
    bottom: 395,
    right: 22,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bottomSheetCloseButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  bottomSheetContent: {
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 16,
  },
  dropOffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  chatIconContainer: {
    marginRight: 12,
  },
  dropOffTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171715',
    lineHeight: 20,
  },
  dropOffInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dropOffInput: {
    minHeight: 109,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#171715',
    lineHeight: 24,
  },
  dropOffButtonContainer: {
    position: 'relative',
    width: '100%',
    height: 56,
    marginBottom: 20,
  },
  dropOffButtonShadowLayer: {
    position: 'absolute',
    top: 5,
    left: 4,
    right: 0,
    height: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#171715',
    backgroundColor: 'transparent',
  },
  dropOffSubmitButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 4,
    backgroundColor: '#242422',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#171715',
  },
  dropOffSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.15,
    lineHeight: 20,
  },
  noInstructionsLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    textDecorationLine: 'underline',
    textAlign: 'center',
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  // Error styles
  dropOffInputContainerError: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
    textAlign: 'center',
    marginTop: -16,
    marginBottom: 16,
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successCloseButton: {
    position: 'absolute',
    top: 280,
    right: 22,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  successCloseButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 382,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  checkmarkContainer: {
    marginBottom: 24,
  },
  successMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.28,
    marginBottom: 32,
  },
  gotItButtonContainer: {
    position: 'relative',
    width: 232,
    height: 56,
  },
  gotItButtonShadowLayer: {
    position: 'absolute',
    top: 5,
    left: 3,
    right: 0,
    height: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#171715',
    backgroundColor: 'transparent',
  },
  gotItButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 3,
    backgroundColor: '#171715',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#171715',
  },
  gotItButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.16,
    lineHeight: 20,
  },
});
