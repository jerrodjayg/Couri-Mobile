import React, { useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { useGoogleAuth } from '../auth/googleauth'; 


export default function LogInScreen({navigation}) {
  const [error, setError] = useState('');
  const { promptAsync } = useGoogleAuth(navigation);
  const [phone, setPhone] = useState('');
  const recaptchaVerifier = useRef(null);

   const handleContinue = async () => {

    if (phone.length !== 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    try {
      const fullPhone = `+1${phone}`;
      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(fullPhone, recaptchaVerifier.current);

      setError('');
      navigation.navigate('CodeVerify',{
        verificationId,
        phone: fullPhone,
      });
    } catch (error) {
      Alert.alert('Failed to send code', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>SIGN UP</Text>
            <View style={{ width: 24 }} />
          </View>

      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
      />

          {/* Email / Phone Input */}
          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor="#000"
            value={phone}
            onChangeText={setPhone}
            autoCapitalize="none"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <Text style={styles.subText}>Message and data rates may apply.</Text>

          {/* Error Message */}
          

          {/* Continue Button */}
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          {/* Sign Up Prompt */}
          <View style={styles.socialBox}>
            <Text style={styles.socialLabel}>or signup with</Text>
            <View style={styles.providerRow}>
            <TouchableOpacity style={styles.providerButton}>
              <Image
              source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons//appleicon.png' }}
              style={styles.providerLogo}
              resizeMode="contain"
              />
              </TouchableOpacity>
              <TouchableOpacity style={styles.providerButton} onPress={() => promptAsync()}>
                <Image
                source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons//googleicon.png' }}
                style={styles.providerLogo}
                resizeMode="contain"
                />
                </TouchableOpacity>
              <TouchableOpacity style={styles.providerButton}>
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons//facebookicon.png' }}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Already have an account */}
          <View style={styles.signUpRow}>
            <Text style={styles.bottomText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.bottomText, styles.link]}>Login</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.toastWrapper}>
            <View style={styles.errorToast}>
    <View style={styles.errorIconCircle}>
      <Text style={styles.errorIconText}>!</Text>
    </View>
    <Text style={styles.errorMessage}>Phone number must be at least 10 digits</Text>
  </View>
  </View>
          ) : null}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: 'white',
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 66,
  },
  backArrow: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 16,
    color: '#000',
  },
  label: {
    fontSize: 22,
    fontWeight: '400',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 12,
    marginBottom: 8,
    fontSize: 41,
  },
  subText: {
    fontSize: 12,
    color: '#000',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 22,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  errorOverlay: {
  position: 'absolute',
  bottom: 100, // adjust this value as needed
  left: 0,
  right: 0,
  alignItems: 'center',
  zIndex: 999,
},
  errorBox: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  padding: 12,
  borderRadius: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 5,
  marginBottom: 16,
},
errorIconCircle:{
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: '#fff',
  borderWidth: 2,
  borderColor: '#f44336',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 10,
},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  socialBox: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  socialLabel: {
    fontSize: 14,
    marginBottom: 12,
    color: '#000',
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  providerButton: {
    width: 90,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  providerLogo: {
    width: 24,
    height: 24,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  toastWrapper: {
  position: 'absolute',
  bottom: 24,
  left: 20,
  right: 20,
  alignItems: 'center',
  justifyContent: 'center',
},
  errorToast: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: 16,
  paddingVertical: 12,
  paddingHorizontal: 20,
  marginTop: 12,
  marginBottom: 12,
  alignSelf: 'center',
  elevation: 5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
},
  bottomText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#000',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    color: '#000',
  },
  errorIcon: {
  color: '#f44336',
  fontSize: 20,
  marginRight: 8,
},
errorMessage: {
  color: '#000',
  fontSize: 14,
  fontWeight: '500',
},
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  errorText: {
    color: 'red',
    fontWeight: '500',
    textAlign: 'center',
  },
  errorIconText: {
  color: '#f44336',
  fontSize: 16,
  fontWeight: 'bold',
  lineHeight: 16,
},
});
