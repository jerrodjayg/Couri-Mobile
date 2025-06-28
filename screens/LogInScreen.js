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
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [error, setError] = useState('');

  const onContinue = () => {
    setError('');

    if (!emailOrPhone.trim()) {
      setError('Mobile Number');
      return;
    }

    // Try to find user by email or phone
    //const user = findUserByEmailOrPhone(Phone);

    // Login success: navigate to Welcomepage with user's first name
    navigation.navigate('Welcomepage', { name: user.firstName });
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

          {/* Email / Phone Input */}
          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor="#000"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            autoCapitalize="none"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <Text style={styles.subText}>Message and data rates may apply.</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Continue Button */}
          <TouchableOpacity style={styles.button} onPress={onContinue}>
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
              <TouchableOpacity style={styles.providerButton}>
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
    fontWeight: '600',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorText: {
    color: 'red',
    fontWeight: '600',
  },
});
