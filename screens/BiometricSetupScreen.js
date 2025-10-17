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

export default function BiometricSetupScreen({ navigation, route }) {
  const [authLabel, setAuthLabel] = useState('Biometric');
  const [isChecking, setIsChecking] = useState(true);
  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);

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

  const handleAllowBiometric = async () => {
    try {
      // Save that user enabled biometrics
      await AsyncStorage.setItem('biometricEnabled', 'true');
      console.log('✅ User enabled biometric authentication');
      
      // Navigate to PushNoti screen
      navigation.navigate('PushNoti', route.params);
    } catch (error) {
      console.error('❌ Error saving biometric preference:', error);
      // Still navigate even if saving fails
      navigation.navigate('PushNoti', route.params);
    }
  };

  const handleMaybeLater = async () => {
    try {
      // Save that user skipped biometrics
      await AsyncStorage.setItem('biometricEnabled', 'false');
      console.log('⚠️ User skipped biometric authentication');
      
      // Navigate to PushNoti screen
      navigation.navigate('PushNoti', route.params);
    } catch (error) {
      console.error('❌ Error saving biometric preference:', error);
      // Still navigate even if saving fails
      navigation.navigate('PushNoti', route.params);
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
          resizeMode="contain"
        />
        
        <Text style={styles.title}>
          Login with {authLabel}
        </Text>
        
        <Text style={styles.subtitle}>
          Enabling {authLabel} allows you quick and secure access to your account.
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
  biometricIcon: {
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
    marginBottom: 60,
    marginTop: -1,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  allowButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  allowButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  maybeLaterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  maybeLaterText: {
    color: '#000',
    fontSize: 16,
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
});
