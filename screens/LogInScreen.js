import React, { useState } from 'react';
import { Image } from 'react-native';
import { supabase } from '../lib/supabase';
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
} from 'react-native';

export default function LogInScreen({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onContinue = async() => {
    setError('');

    if (!emailOrPhone.trim() || !password.trim()) {
      setError('invalidLogin');
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: emailOrPhone,
    password: password,
  });

  if (authError || !data.user) {
    setError('invalidLogin');
    return;
  }

  // Get user's first name from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    setError('Could not retrieve profile');
    return;
  }

  // Success: go to welcome screen
  navigation.navigate('Welcomepage', { name: profile.first_name });
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>!</Text>
        </View>
        <Text style={styles.errorText}>Invalid email or password</Text>
      </View>
    );
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
            <Text style={styles.headerTitle}>LOG IN</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Show error */}
          {renderError()}

          {/* Email / Phone Input */}
          <TextInput
            style={styles.input}
            placeholder="Email or Mobile Number"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            autoCapitalize="none"
          />

          {/* Password Input */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Continue Button */}
          <TouchableOpacity style={styles.button} onPress={onContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          {/* Sign Up with Providers */}
          <View style={styles.providerRow}>
            <TouchableOpacity style={styles.providerButton}>
              <Image source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/appleicon.png' }}
               style={styles.providerLogo} 
               resizeMode="contain" 
               />
            </TouchableOpacity>
            <TouchableOpacity style={styles.providerButton}>
              <Image
               source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/googleicon.png' }} 
               style={styles.providerLogo} 
               resizeMode="contain" 
               />
            </TouchableOpacity>
            <TouchableOpacity style={styles.providerButton}>
              <Image
              source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/facebookicon.png' }} 
              style={styles.providerLogo} 
              resizeMode="contain" 
              />
            </TouchableOpacity>
          </View>



          {/* Sign Up Prompt */}
          <View style={styles.signUpRow}>
            <Text style={styles.bottomText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
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
    backgroundColor: 'transparent',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 12,
    marginBottom: 24,
    fontSize: 18,
  },
  link: {
    textDecorationLine: 'underline',
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#000',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  errorIconText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    lineHeight: 14,
  },
  errorText: {
    color: 'red',
    fontWeight: '600',
  },
  signUpBox: {
  alignItems: 'center',
  borderColor: '#000',
  borderWidth: 1,
  borderRadius: 16,
  paddingVertical: 16,
  paddingHorizontal: 12,
  marginBottom: 24,
  backgroundColor: '#fff',
},
signUpWithText: {
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
  borderWidth: 1,
  borderColor: '#000',
  borderRadius: 28,
  paddingVertical: 10,
  paddingHorizontal: 20,
  marginHorizontal: 6,
  backgroundColor: '#fff',
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
},
providerIcon: {
  fontSize: 18,
  fontWeight: '600',
  color: '#000',
},
providerLogo: {
  width: 24,
  height: 24,
}
});
