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
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Logo from '../assets/Logo_Dark.png';

export default function FaceIDScreen({ navigation, route }) {
  const { userInfo, savedUser, isGoogleAuth, googleUserData } = route.params || {};
  const [authLabel, setAuthLabel] = useState('Biometric');

  // Log the received parameters for debugging
  useEffect(() => {
    console.log('🔄 FaceIDScreen received params:', {
      isGoogleAuth,
      hasGoogleUserData: !!googleUserData,
      googleUserData: googleUserData,
      hasUserInfo: !!userInfo,
      hasSavedUser: !!savedUser,
      routeParams: route?.params
    });
  }, [isGoogleAuth, googleUserData, userInfo, savedUser, route?.params]);

  useEffect(() => {
    const detectBiometricType = async () => {
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

        if (Platform.OS === 'ios') {
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setAuthLabel('Face ID');
          } else {
            setAuthLabel('Touch ID');
          }
        } else {
          if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setAuthLabel('Fingerprint');
          } else {
            setAuthLabel('Biometric');
          }
        }
      } catch (error) {
        console.error('Biometric detection error:', error);
        setAuthLabel('Biometric');
      }
    };

    detectBiometricType();
  }, []);

  const handleBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        Alert.alert('Error', 'Biometric hardware not available on this device.');
        return;
      }

      if (!isEnrolled) {
        Alert.alert('Error', `No ${authLabel} data found. Please enroll first.`);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate using ${authLabel}`,
        fallbackLabel: 'Use device passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // ✅ After Face ID step, go straight to PushNoti with user data
        // Prioritize savedUser (from database) over userInfo (from form)
        const userData = route.params?.savedUser || route.params?.userInfo;
        navigation.navigate('PushNoti', { 
          user: userData,
          isGoogleAuth: isGoogleAuth,
          googleUserData: googleUserData
        });
      } else {
        Alert.alert('Authentication Failed', 'Please try again.');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Something went wrong during authentication.');
    }
  };

  const handleMaybeLater = () => {
    // ✅ Even if they skip, proceed to PushNoti with user data
    // Prioritize savedUser (from database) over userInfo (from form)
    const userData = route.params?.savedUser || route.params?.userInfo;
    navigation.navigate('PushNoti', { 
      user: userData,
      isGoogleAuth: isGoogleAuth,
      googleUserData: googleUserData
    });
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
        <Text style={styles.title}>Login with {authLabel}</Text>
        <Text style={styles.subtitle}>
          Enabling {authLabel} allows you quick and secure access to your account.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleBiometricAuth}>
          <Text style={styles.buttonText}>Allow {authLabel} access</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleMaybeLater}>
          <Text style={styles.linkText}>Maybe later</Text>
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
  faceIcon: {
    width: 100,
    height: 90,
    marginBottom: 24,
    marginTop: -37,
  },
  title: {
    fontSize: 27,
    fontWeight: '250',
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
    fontWeight: '250',
    fontSize: 16,
  },
  linkText: {
    color: '#000',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
