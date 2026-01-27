import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Pressable,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { useFocusEffect } from '@react-navigation/native';

const VALID_CODE = '1111'; // Placeholder until real SMS is set up

export default function CodeVerify({ route, navigation }) {
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({ gestureEnabled: false });
      return () => navigation.getParent()?.setOptions({ gestureEnabled: true });
    }, [navigation])
  );

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { phone = '', type, userData } = route.params || {};

  const displayPhone = phone || '(XXX) XXX-XXXX';

  const handleVerify = async () => {
    if (code.length !== 4) {
      Alert.alert('Error', 'Please enter the 4-digit code');
      return;
    }

    setLoading(true);
    try {
      if (type === 'login') {
        // Placeholder: accept only 1111 until real SMS is set up
        if (code !== VALID_CODE) {
          Alert.alert('Invalid Code', 'Please enter the correct 4-digit code we sent to you.');
          setLoading(false);
          return;
        }
        if (userData) {
          await AsyncStorage.setItem('tempUserData', JSON.stringify(userData));
          await AsyncStorage.setItem('userProfileData', JSON.stringify(userData));
          await AsyncStorage.setItem('userProfile', JSON.stringify(userData));
          await AsyncStorage.setItem('userSavedToDatabase', 'true');
          await AsyncStorage.setItem('hasLoggedInBefore', 'true');
        }
        const firstName = userData?.firstName || userData?.first_name || 'there';
        navigation.replace('Welcomepage', {
          name: firstName,
          userData: userData || {},
        });
        return;
      }

      if (type === 'create') {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token: code,
          type: 'sms',
        });
        if (error) {
          Alert.alert('Error', error.message);
          return;
        }
        navigation.replace('PersonalInfoScreen', { user: data?.user });
        return;
      }

      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (type === 'login') {
      Alert.alert('Resend Code', 'SMS is not set up yet. Use code 1111 to continue.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) Alert.alert('Error', error.message);
      else Alert.alert('Success', 'Verification code resent');
    } catch (e) {
      Alert.alert('Error', 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Image
              source={require('../assets/backarrow1.png')}
              style={styles.backArrowImage}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Verify</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.innerContainer}>
          <Text style={styles.instructionText}>
            Enter the code we sent to {displayPhone}
          </Text>

          <View style={styles.codeContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={styles.codeSlot}>
                <Text style={[styles.codeDigit, code[index] && styles.codeDigitFilled]}>
                  {code[index] || '_'}
                </Text>
                <View style={styles.underline} />
              </View>
            ))}
            <TextInput
              style={styles.hiddenInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, loading && { opacity: 0.7 }]}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.verifyText}>
              {loading ? 'Verifying...' : 'Verify'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.resendInfo}>Didn't receive a code?</Text>
          <TouchableOpacity onPress={handleResendCode} disabled={loading}>
            <Text style={[styles.resendLink, loading && { opacity: 0.7 }]}>
              Resend Code
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backArrowImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    marginBottom: 36,
    color: '#000',
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 16,
    position: 'relative',
  },
  codeSlot: {
    alignItems: 'center',
    flex: 1,
  },
  codeDigit: {
    fontSize: 32,
    color: '#999',
    textAlign: 'center',
  },
  codeDigitFilled: {
    color: '#000',
  },
  underline: {
    height: 2,
    backgroundColor: '#222',
    width: '80%',
    marginTop: 8,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  verifyButton: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
  },
  verifyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resendLink: {
    fontSize: 16,
    color: '#000',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
