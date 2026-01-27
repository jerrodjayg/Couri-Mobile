import { supabase } from './supabaseClient';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Modal,
  Pressable
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import imagePreloader from '../utils/imagePreloader';
import { UserService } from '../utils/userService';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

export default function SplashScreen({ navigation }) {
  // Disable swipe back gesture
  useFocusEffect(
    React.useCallback(() => {
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

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showPopup, setShowPopup] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [sessionResult, setSessionResult] = useState(null); // null | { action: 'welcome', name, userData } | { action: 'newuser' }
  const hasProceededRef = useRef(false);
  const MIN_SPLASH_MS = 1800;

  useEffect(() => {
    const preWarmLocationPermissions = async () => {
      // Pre-warm location permissions for faster location detection later
      try {
        console.log('📍 Pre-warming location permissions...');
        await Location.requestForegroundPermissionsAsync();
        console.log('✅ Location permissions pre-warmed');
      } catch (error) {
        console.log('⚠️ Location permission pre-warm failed (non-blocking):', error);
      }
    };

    const preloadCriticalAssets = async () => {
      // Preload critical images for faster app performance
      try {
        console.log('🖼️ Preloading critical images...');
        await imagePreloader.preloadCriticalImages();
        console.log('✅ Critical images preloaded');
      } catch (error) {
        console.log('⚠️ Image preloading failed (non-blocking):', error);
      }
    };

    // Pre-warm location permissions and images in background (no auto-navigation)
    preWarmLocationPermissions();
    preloadCriticalAssets();
  }, []);

  // Minimum splash display time — then we fade out and continue automatically
  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // If user stayed logged in (session persisted) and didn't sign out/delete account, check DB; result drives Welcomepage vs new-user flow after fade
  useEffect(() => {
    let isMounted = true;
    const checkSessionAndNavigate = async () => {
      try {
        // If app was opened via an invite deep link, let App's handler navigate (with invite params)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && (initialUrl.includes('/i/') || initialUrl.includes('/deeplink/i/'))) {
          if (isMounted) setSessionResult({ action: 'newuser' });
          return;
        }

        // If user explicitly signed out or deleted account before closing, don't auto-login
        const userLastAction = await AsyncStorage.getItem('userLastAction');
        if (userLastAction === 'sign_out' || userLastAction === 'delete_account') {
          await AsyncStorage.removeItem('userLastAction');
          if (isMounted) setSessionResult({ action: 'newuser' });
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.log('⚠️ Splash: getSession error (will show splash):', error?.message);
          setSessionResult({ action: 'newuser' });
          return;
        }

        if (!session?.user) {
          if (isMounted) setSessionResult({ action: 'newuser' });
          return;
        }

        const email = (session.user.email || '').toLowerCase().trim();
        if (!email) {
          if (isMounted) setSessionResult({ action: 'newuser' });
          return;
        }

        const { exists } = await UserService.checkUserExists(email);
        if (!isMounted) return;

        if (!exists) {
          try {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('tempUserData');
            await AsyncStorage.removeItem('userProfileData');
            await AsyncStorage.removeItem('userProfile');
            await AsyncStorage.removeItem('userSavedToDatabase');
            await AsyncStorage.removeItem('hasLoggedInBefore');
          } catch (clearErr) {
            console.log('⚠️ Splash: error clearing session/storage for new-user flow:', clearErr?.message);
          }
          if (isMounted) setSessionResult({ action: 'newuser' });
          return;
        }

        const { user: dbUser } = await UserService.getUserByEmail(email);
        if (!isMounted) return;
        if (!dbUser) {
          setSessionResult({ action: 'newuser' });
          return;
        }

        const userDataForApp = {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.first_name || '',
          lastName: dbUser.last_name || '',
          first_name: dbUser.first_name || '',
          last_name: dbUser.last_name || '',
          name: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ') || dbUser.email,
          full_name: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ') || dbUser.email,
          phone: dbUser.phone || '',
          phoneNumber: dbUser.phone || '',
          address1: dbUser.address_line_1 || '',
          address2: dbUser.address_line_2 || '',
          address_line_1: dbUser.address_line_1 || '',
          address_line_2: dbUser.address_line_2 || '',
          city: dbUser.city || '',
          state: dbUser.state || '',
          zip: dbUser.zip_code || '',
          zip_code: dbUser.zip_code || '',
          avatar_url: dbUser.avatar_url || null,
          isGoogleAuth: session.user.app_metadata?.provider === 'google',
        };

        await AsyncStorage.setItem('tempUserData', JSON.stringify(userDataForApp));
        await AsyncStorage.setItem('userProfileData', JSON.stringify(userDataForApp));
        await AsyncStorage.setItem('userProfile', JSON.stringify(userDataForApp));
        await AsyncStorage.setItem('userSavedToDatabase', 'true');
        await AsyncStorage.setItem('hasLoggedInBefore', 'true');

        const firstName = dbUser.first_name || 'there';
        if (isMounted) setSessionResult({ action: 'welcome', name: firstName, userData: userDataForApp });
      } catch (e) {
        if (isMounted) {
          console.log('⚠️ Splash: checkSession error:', e?.message);
          setSessionResult({ action: 'newuser' });
        }
      }
    };
    checkSessionAndNavigate();
    return () => { isMounted = false; };
  }, [navigation]);

  // When min time has passed and we know welcome vs new-user: fade out, then navigate or show role modal
  useEffect(() => {
    if (!minTimeElapsed || !sessionResult || hasProceededRef.current) return;

    hasProceededRef.current = true;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      if (sessionResult.action === 'welcome') {
        navigation.replace('Welcomepage', {
          name: sessionResult.name,
          userData: sessionResult.userData,
        });
      } else {
        setShowPopup(true);
        setModalVisible(true);
      }
    });
  }, [minTimeElapsed, sessionResult, fadeAnim, navigation]);

  const handleSplashPress = () => {
    setShowPopup(true);
    setModalVisible(true);
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleGetStarted = () => {
    if (!selectedRole) return;

    setModalVisible(false);
    setShowPopup(false);

    if (selectedRole === 'buySell') {
      navigation.navigate('Home');
    } else if (selectedRole === 'driver') {
      setDriverModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.splashPressable}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Image
            source={require('../assets/Logo_Dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Main Role Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setShowPopup(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (selectedRole) {
                setSelectedRole(null);
              } else {
                setModalVisible(false);
                setShowPopup(false);
              }
            }}
          />
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How do you plan to use Couri?</Text>
              <Text style={styles.modalSubtitle}>Choose your role to set up your experience.</Text>
            </View>

            {/* Role Selection Buttons */}
            <View style={styles.roleButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === 'buySell' && styles.roleButtonActive
                ]}
                onPress={() => handleRoleSelect('buySell')}
              >
                <Image
                  source={require('../assets/shopping-cart-modal.png')}
                  style={styles.roleIcon}
                  resizeMode="contain"
                  onError={(error) => {
                    console.log('❌ Error loading shopping cart icon:', error.nativeEvent.error);
                  }}
                  onLoad={() => {
                    console.log('✅ Shopping cart icon loaded successfully');
                  }}
                />
                <Text style={styles.roleButtonText}>Buy / Sell</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === 'driver' && styles.roleButtonActive
                ]}
                onPress={() => handleRoleSelect('driver')}
              >
                <Image
                  source={require('../assets/car-icon.png')}
                  style={styles.roleIcon}
                  resizeMode="contain"
                  onError={(error) => {
                    console.log('❌ Error loading car icon:', error.nativeEvent.error);
                  }}
                  onLoad={() => {
                    console.log('✅ Car icon loaded successfully');
                  }}
                />
                <Text style={styles.roleButtonText}>Drive</Text>
              </TouchableOpacity>
            </View>

            {/* For approved Drivers note */}
            <View style={styles.driverNoteContainer}>
              <Image
                source={require('../assets/lock-icon-modal.png')}
                style={styles.lockIcon}
                resizeMode="contain"
                onError={(error) => {
                  console.log('❌ Error loading lock icon:', error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('✅ Lock icon loaded successfully');
                }}
              />
              <Text style={styles.driverNoteText}>For approved Drivers</Text>
            </View>

            {/* Get Started Button */}
            <TouchableOpacity
              style={[
                styles.getStartedButton,
                selectedRole ? styles.getStartedButtonActive : styles.getStartedButtonInactive
              ]}
              onPress={handleGetStarted}
              disabled={!selectedRole}
            >
              <Text style={[
                styles.getStartedButtonText,
                selectedRole ? styles.getStartedButtonTextActive : styles.getStartedButtonTextInactive
              ]}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Driver Popup Modal */}
      <Modal
        visible={driverModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDriverModalVisible(false)}
      >
        <View style={styles.driverModalOverlay}>
          <View style={styles.driverModalContent}>
            <View style={styles.alertIconContainer}>
              <Feather name="alert-triangle" size={24} color="#000" />
            </View>

            <Text style={styles.driverPopupTitle}>Heads up!</Text>

            <Text style={styles.driverPopupBody}>
              The Driver experience is only available to <Text style={styles.boldText}>previously approved Couri Drivers</Text>. If you're not already a driver, please go back and select Buy / Sell to continue with Couri.
            </Text>

            <TouchableOpacity
              style={styles.proceedButton}
              onPress={() => {
                setDriverModalVisible(false);
                navigation.navigate('Home', { isDriverFlow: true });
              }}
            >
              <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => setDriverModalVisible(false)}
            >
              <Text style={styles.goBackButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  splashPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 154,
    height: 68,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 27, 27, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fbfbf9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 26,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 15,
    minHeight: 500,
    zIndex: 10,
    alignItems: 'center',
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 44,
    paddingHorizontal: 10,
    width: 334,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.13,
    width: 302,
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
    alignItems: 'flex-end',
  },
  roleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#a1a1a1',
    borderRadius: 6,
    width: 152,
    height: 137,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 33,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  roleButtonActive: {
    backgroundColor: 'rgba(93, 114, 251, 0.05)',
    borderColor: '#5d72fb',
  },
  roleIcon: {
    width: 24,
    height: 24,
    marginBottom: 10,
    tintColor: undefined,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  driverNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    alignSelf: 'flex-end',
    marginRight: 24,
  },
  lockIcon: {
    width: 16,
    height: 16,
    marginRight: 3,
    tintColor: undefined,
  },
  driverNoteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5d72fb',
    letterSpacing: 0.11,
  },
  getStartedButton: {
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 358,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
  },
  getStartedButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    // Per image 1: White with grey text.
  },
  getStartedButtonActive: {
    backgroundColor: '#1b1b1b', // Blackish
    borderColor: '#1b1b1b',
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.16,
  },
  getStartedButtonTextInactive: {
    color: '#A1A1A1', // Grey text for inactive
  },
  getStartedButtonTextActive: {
    color: '#FFFFFF', // White text for active
  },

  driverModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 27, 27, 0.75)',
    justifyContent: 'flex-end',
  },
  driverModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 26,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 15,
    minHeight: 500,
    zIndex: 10,
    alignItems: 'center',
    width: '100%',
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F0', // Light pink background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverPopupTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 32,
    textAlign: 'center',
  },
  driverPopupBody: {
    fontSize: 17.4,
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  boldText: {
    fontWeight: '700',
  },
  proceedButton: {
    backgroundColor: '#1b1b1b',
    borderRadius: 100,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 16,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  goBackButton: {
    padding: 8,
  },
  goBackButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});