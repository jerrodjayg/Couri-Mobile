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
import * as Location from 'expo-location';
import imagePreloader from '../utils/imagePreloader';
import { useFocusEffect } from '@react-navigation/native';

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

  const handleSplashPress = () => {
    setShowPopup(true);
    setModalVisible(true);
  };

  const handleBuySell = () => {
    setModalVisible(false);
    setShowPopup(false);
    navigation.navigate('CreateAccount');
  };

  const handleDriver = () => {
    setModalVisible(false);
    setShowPopup(false);
    navigation.navigate('DriverPassword');
  };

  const handleContinue = () => {
    setModalVisible(false);
    setShowPopup(false);
    // Navigate to CreateAccount screen
    navigation.navigate('CreateAccount');
  };

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.splashPressable} 
        onPress={handleSplashPress}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Image
            source={require('../assets/Logo_Dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </Pressable>

      {/* Popup Modal */}
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
              setModalVisible(false);
              setShowPopup(false);
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
                style={styles.roleButton}
                onPress={handleBuySell}
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
                style={styles.roleButton}
                onPress={handleDriver}
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

            {/* Continue Button */}
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
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
    width: 77,
    height: 34,
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
    letterSpacing: 0.16,
  },
  driverNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    alignSelf: 'flex-end',
    marginRight: 10,
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
  continueButton: {
    backgroundColor: '#5d72fb',
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 358,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.16,
  },
});