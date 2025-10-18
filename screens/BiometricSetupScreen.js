import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function BiometricSetupScreen({ navigation, route }) {
  const [authLabel, setAuthLabel] = useState('Biometric');
  const [isChecking, setIsChecking] = useState(true);
  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        setHasBiometricHardware(hasHardware && isEnrolled);
        
        if (!hasHardware || !isEnrolled) {
          // If no biometric hardware or not enrolled, skip to PushNoti
          console.log('⚠️ No biometric hardware or not enrolled, skipping to PushNoti');
          navigation.replace('PushNoti', route.params);
          return;
        }

        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

        if (Platform.OS === 'ios') {
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setAuthLabel('Face ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setAuthLabel('Touch ID');
          } else {
            setAuthLabel('Biometric');
          }
        } else {
          if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setAuthLabel('Fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setAuthLabel('Face Recognition');
          } else {
            setAuthLabel('Biometric');
          }
        }
      } catch (error) {
        console.error('❌ Biometric detection error:', error);
        setAuthLabel('Biometric');
        // On error, skip to PushNoti
        navigation.replace('PushNoti', route.params);
      } finally {
        setIsChecking(false);
      }
    };

    checkBiometricAvailability();
  }, [navigation, route.params]);

  const handleAllowBiometric = () => {
    // Show the iOS-style modal when user presses the button
    setShowModal(true);
  };

  const handleModalOK = async () => {
    try {
      // Save that user enabled biometrics
      await AsyncStorage.setItem('biometricEnabled', 'true');
      console.log('✅ User enabled biometric authentication');
      
      setShowModal(false);
      // Navigate to PushNoti screen
      navigation.replace('PushNoti', route.params);
    } catch (error) {
      console.error('❌ Error saving biometric preference:', error);
      // Still navigate even if saving fails
      setShowModal(false);
      navigation.replace('PushNoti', route.params);
    }
  };

  const handleModalDontAllow = () => {
    setShowModal(false);
    // User chose not to allow, just close the modal
  };

  const handleMaybeLater = async () => {
    try {
      // Save that user skipped biometrics
      await AsyncStorage.setItem('biometricEnabled', 'false');
      console.log('⚠️ User skipped biometric authentication');
      
      // Navigate to PushNoti screen
      navigation.replace('PushNoti', route.params);
    } catch (error) {
      console.error('❌ Error saving biometric preference:', error);
      // Still navigate even if saving fails
      navigation.replace('PushNoti', route.params);
    }
  };

  // Show loading while checking biometric availability
  if (isChecking) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Image source={require('../assets/Logo_Dark.png')} style={styles.logoImage} resizeMode="contain" />
        
        <View style={styles.contentWrapper}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Checking biometric availability...</Text>
        </View>
      </View>
    );
  }

  // If no biometric hardware, skip this screen
  if (!hasBiometricHardware) {
    return null; // This should not render as we navigate away in useEffect
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Image source={require('../assets/Logo_Dark.png')} style={styles.logoImage} resizeMode="contain" />

      <View style={styles.contentWrapper}>
        <Image
          source={
            authLabel === 'Face ID' || authLabel === 'Face Recognition'
              ? require('../assets/face-id.png')
              : require('../assets/face-id.png') // You can create a fingerprint icon if needed
          }
          style={styles.biometricIcon}
          resizeMode="cover"
        />
        
        <Text style={styles.title}>
          Login with {authLabel}
        </Text>
        
        <Text style={styles.subtitle}>
          Enabling {authLabel} allows you quick and{'\n'}secure access to your account.
        </Text>

        <TouchableOpacity 
          style={styles.allowButton} 
          onPress={handleAllowBiometric}
        >
          <Text style={styles.allowButtonText}>Allow {authLabel} access</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.maybeLaterButton} 
          onPress={handleMaybeLater}
        >
          <Text style={styles.maybeLaterText}>Maybe later</Text>
        </TouchableOpacity>
      </View>

      {/* iOS-style Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleModalDontAllow}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Do you want to allow "Couri"{'\n'}to use {authLabel}?
            </Text>
            
            <Text style={styles.modalSubtitle}>
              Enabling {authLabel} allows you quick and secure access to your account.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalDontAllowButton}
                onPress={handleModalDontAllow}
              >
                <Text style={styles.modalDontAllowText}>Don't Allow</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalOKButton}
                onPress={handleModalOK}
              >
                <Text style={styles.modalOKText}>OK</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  logoImage: {
    width: 105,
    height: 30,
    marginBottom: 20,
    color: '#5D72FB'
  },
  contentWrapper: {
    marginTop: 150,
    alignItems: 'center',
    width: '100%',
  },
  biometricIcon: {
    width: 110, // Slightly larger for better clarity
    height: 110, // Slightly larger for better clarity
    marginBottom: 24,
    marginTop: -37,
    tintColor: '#5D72FB', // Blue color for Face ID icon
  },
  title: {
    fontSize: 40,
    fontWeight: 'normal', // Un-bold the title
    marginBottom: 16,
    marginTop: -3,
    color: '#000',
    textAlign: 'center',
    weight: '400',
    fontStyle: 'Area Normal Trial',
    fontFamily: 'Area Normal Trial'

  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#000',
    marginBottom: 60,
    marginTop: -1,
    lineHeight: 20,
    paddingHorizontal: 20,
    fontFamily: 'Area Normal'
  },
  allowButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 34,
    borderRadius: 30,
    marginBottom: 20,
    width: '110%',
    alignItems: 'center',
  },
  allowButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Area Normal'
  },
  maybeLaterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontFamily: 'Area Normal'
  },
  maybeLaterText: {
    color: '#000',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#555',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 270,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
  },
  modalDontAllowButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#C6C6C8',
  },
  modalDontAllowText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalOKButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOKText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});
