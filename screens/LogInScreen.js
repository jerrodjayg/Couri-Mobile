import React, { useState } from 'react';
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
} from 'react-native';

export default function LogInScreen({ navigation }) {
  const [phone, setPhone] = useState('');

  // Phone formatting (XXX) XXX-XXXX
  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return text;
    if (match[2]) return `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
    return match[1];
  };

  const handlePhoneChange = (text) => {
    setPhone(formatPhoneNumber(text));
  };

  const handleContinue = () => {
    // Simple navigation without authentication
    navigation.navigate('Welcomepage');
  };

  const handlePasswordLogin = () => {
    // Simple navigation without authentication
    navigation.navigate('Welcomepage');
  };

  const handleSocialLogin = (provider) => {
    // Simple navigation without authentication
    console.log(`${provider} login pressed`);
    navigation.navigate('Welcomepage');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>LOG IN</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Phone Input */}
          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor="#000"
            value={phone}
            onChangeText={handlePhoneChange}
            autoCapitalize="none"
            keyboardType="phone-pad"
            maxLength={14}
          />
          <Text style={styles.subText}>Message and data rates may apply.</Text>

          {/* Continue Button */}
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          {/* Social Logins */}
          <View style={styles.socialBox}>
            <Text style={styles.socialLabel}>or continue with</Text>
            <TouchableOpacity 
              style={styles.passwordButton}
              onPress={handlePasswordLogin}
            >
              <Text style={styles.passwordButtonText}>Password Log In</Text>
            </TouchableOpacity>
            <View style={styles.providerRow}>
              <TouchableOpacity 
                style={styles.providerButton} 
                onPress={() => handleSocialLogin('Apple')}
              >
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/appleicon.png' }}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.providerButton} 
                onPress={() => handleSocialLogin('Google')}
              >
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/googleicon.png' }}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.providerButton} 
                onPress={() => handleSocialLogin('Facebook')}
              >
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/facebookicon.png' }}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.signUpRow}>
            <Text style={styles.bottomText}>Don't have an account? </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('CreateAccount')}
            >
              <Text style={[styles.bottomText, styles.link]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
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
  socialLabel: { 
    fontSize: 14,
    marginBottom: 16,
    color: '#000' 
  },
  passwordButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    width: '100%',
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 20,
    elevation: 3,
  },
  passwordButtonText: { 
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '450',
    color: '#000' 
  },
  providerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-evenly', 
    width: '100%' 
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
  providerLogo: {
    width: 24,
    height: 24,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
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
});