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
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../assets/Logo_Dark.png';

export default function BiometricAuthScreen({ navigation }) {
  const [authLabel, setAuthLabel] = useState('Biometric');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);

  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        setHasBiometricHardware(hasHardware && isEnrolled);
        
        if (!hasHardware || !isEnrolled) {
          // If no biometric hardware or not enrolled, skip to Welcomepage
          console.log('⚠️ No biometric hardware or not enrolled, skipping to Welcomepage');
          navigation.replace('Welcomepage');
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
        // On error, skip to Welcomepage
        navigation.replace('Welcomepage');
      }
    };

    checkBiometricAvailability();
  }, [navigation]);

  // Auto-trigger biometric authentication on mount
  useEffect(() => {
    if (hasBiometricHardware && authLabel) {
      // Delay slightly to ensure UI is ready
      const timer = setTimeout(() => {
        handleBiometricAuth();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [hasBiometricHardware, authLabel]);

  const handleBiometricAuth = async () => {
    if (isAuthenticating) return;
    
    try {
      setIsAuthenticating(true);
      
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        console.log('⚠️ No biometric hardware, skipping to Welcomepage');
        navigation.replace('Welcomepage');
        return;
      }

      if (!isEnrolled) {
        console.log('⚠️ No biometric enrolled, skipping to Welcomepage');
        navigation.replace('Welcomepage');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate to continue`,
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log('✅ Biometric authentication successful');
        navigation.replace('Welcomepage');
      } else {
        console.log('❌ Biometric authentication failed');
        setIsAuthenticating(false);
        Alert.alert(
          'Authentication Failed', 
          'Please try again or use your device passcode.',
          [
            {
              text: 'Try Again',
              onPress: () => handleBiometricAuth(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // Exit app or stay on biometric screen
                // User must authenticate to proceed
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      setIsAuthenticating(false);
      
      // If authentication was cancelled by user
      if (error.code === 'USER_CANCEL' || error.code === 'AUTHENTICATION_CANCELED') {
        Alert.alert(
          'Authentication Required', 
          'You must authenticate to access the app.',
          [
            {
              text: 'Try Again',
              onPress: () => handleBiometricAuth(),
            }
          ]
        );
      } else {
        Alert.alert(
          'Error', 
          'Something went wrong during authentication. Please try again.',
          [
            {
              text: 'Try Again',
              onPress: () => handleBiometricAuth(),
            },
            {
              text: 'Skip',
              onPress: () => navigation.replace('Welcomepage'),
            }
          ]
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Image source={Logo} style={styles.logoImage} resizeMode="contain" />

      <View style={styles.contentWrapper}>
        <Image
          source={require('../assets/face-id.png')}
          style={styles.faceIcon}
          resizeMode="contain"
        />
        <Text style={styles.title}>Authenticate to Continue</Text>
        <Text style={styles.subtitle}>
          Use {authLabel} to securely access your Couri account.
        </Text>

        {isAuthenticating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Authenticating...</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleBiometricAuth}
          >
            <Text style={styles.buttonText}>Use {authLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
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
    paddingTop: 60,
  },
  logoImage: {
    width: 105,
    height: 25,
    marginBottom: 20,
  },
  contentWrapper: {
    marginTop: 150,
    alignItems: 'center',
    width: '100%',
  },
  faceIcon: {
    width: 100,
    height: 90,
    marginBottom: 24,
    marginTop: -37,
  },
  title: {
    fontSize: 27,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: -3,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
    marginBottom: 60,
    marginTop: -1,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 28,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
});

