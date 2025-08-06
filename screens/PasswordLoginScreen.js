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
  Alert,
} from 'react-native';
import { supabase } from '../supabase';

export default function PasswordLoginScreen({ navigation }) {
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordLogin = async () => {
    if (!emailOrMobile || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isEmail = emailOrMobile.includes('@');
      
      if (!isEmail) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', emailOrMobile)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        setError('Error checking user account');
        setLoading(false);
        return;
      }

      if (!existingProfile) {
        setError('This email is not registered. Please use Google sign-in first.');
        setLoading(false);
        return;
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailOrMobile,
        password: password,
      });

      if (loginError) {
        if (loginError.message.includes('Invalid login credentials')) {
          setError('Email and password don\'t match');
        } else {
          setError(loginError.message);
        }
        setLoading(false);
        return;
      }

      if (loginData.user) {
        navigation.replace('Welcomepage');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailOrMobile) {
      setError('Please enter your email address first');
      return;
    }

    if (!emailOrMobile.includes('@')) {
      setError('Please enter a valid email address for password reset');
      return;
    }

    try {
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', emailOrMobile)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        setError('Error checking user account');
        return;
      }

      if (!existingProfile) {
        setError('This email is not registered. Please use Google sign-in first.');
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(emailOrMobile, {
        redirectTo: 'com.anonymous.jerrod://',
      });

      if (error) {
        setError(error.message);
      } else {
        Alert.alert(
          'Password Reset',
          'If an account with this email exists, you will receive a password reset link.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Welcomepage'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to send password reset email');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()}>
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
              <Text style={styles.headerTitle}>LOG IN</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Email Input */}
            <TextInput
              style={[
                styles.input,
                { borderBottomColor: error ? '#FF3B30' : '#222' }
              ]}
              placeholder="Email or Mobile Number"
              placeholderTextColor="#000"
              value={emailOrMobile}
              onChangeText={(text) => {
                setEmailOrMobile(text);
                if (error) setError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Password Input */}
            <View style={[
              styles.passwordContainer,
              { borderBottomColor: error ? '#FF3B30' : '#222' }
            ]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#000"
                value={showPassword ? password : '*'.repeat(password.length)}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                }}
                secureTextEntry={false}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIconText}>👁️‍🗨️</Text>
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password</Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handlePasswordLogin}
              disabled={loading}
            >
              <Text style={[styles.buttonText, loading && styles.buttonTextDisabled]}>
                {loading ? 'Signing In...' : 'Continue'}
              </Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpRow}>
              <Text style={styles.bottomText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
                <Text style={[styles.bottomText, styles.link]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconContainer}>
                <Text style={styles.errorIcon}>!</Text>
              </View>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>
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
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 100,
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
    fontWeight: '600',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 12,
    marginBottom: 24,
    fontSize: 24,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 24,
  },
  eyeIcon: {
    padding: 8,
  },
  eyeIconText: {
    fontSize: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#000',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  buttonTextDisabled: {
    color: '#666',
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
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  errorIcon: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
});