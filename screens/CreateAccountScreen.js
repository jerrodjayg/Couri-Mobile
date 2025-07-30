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

export default function CreateAccountScreen({ navigation }) {
  const [phone, setPhone] = useState('');

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return text;
    if (match[2]) {
      return `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
    }
    return match[1];
  };

  const handlePhoneChange = (text) => {
    setPhone(formatPhoneNumber(text));
  };

  const handleContinue = () => {
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      // Simple validation without authentication
      console.log('Please enter a valid 10-digit phone number');
      return;
    }

    // Simple navigation without authentication
    navigation.navigate('CodeVerify', {
      phone: `+1${digitsOnly}`,
    });
  };

  const handleSocialSignUp = (provider) => {
    // Simple navigation without authentication
    console.log(`${provider} sign up pressed`);
    navigation.navigate('Welcomepage');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

          {/* Input */}
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
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>

          {/* Social Sign Up */}
          <View style={styles.socialBox}>
            <Text style={styles.socialLabel}>or signup with</Text>
            <View style={styles.providerRow}>
              <TouchableOpacity 
                style={styles.providerButton}
                onPress={() => handleSocialSignUp('Apple')}
              >
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/appleicon.png' }}
                  style={styles.providerLogo}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.providerButton}
                onPress={() => handleSocialSignUp('Google')}
              >
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/googleicon.png' }}
                  style={styles.providerLogo}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.providerButton}
                onPress={() => handleSocialSignUp('Facebook')}
              >
                <Image
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/facebookicon.png' }}
                  style={styles.providerLogo}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Already Have Account */}
          <View style={styles.signUpRow}>
            <Text style={styles.bottomText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.bottomText, styles.link]}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 66 },
  backArrow: { fontSize: 24, color: '#000' },
  headerTitle: { fontSize: 16, color: '#000', fontWeight: '600' },
  input: { borderBottomWidth: 1, borderBottomColor: '#000', fontSize: 41, paddingVertical: 12, marginBottom: 8 },
  subText: { fontSize: 12, color: '#000', marginBottom: 45 },
  continueButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 6,
  },
  continueText: { fontSize: 16, fontWeight: '600', color: '#000' },
  socialBox: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  socialLabel: { fontSize: 16.8, marginBottom: 24, color: '#000' },
  providerRow: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%' },
  providerButton: {
    width: 90,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  providerLogo: { width: 24, height: 24 },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  bottomText: { fontSize: 14, color: '#000' },
  link: { textDecorationLine: 'underline', fontWeight: 'bold' },
});