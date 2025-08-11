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
} from 'react-native';
import { supabase } from './supabaseClient';

export default function CodeVerify({ route, navigation }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { phone, type } = route.params;

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit code');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: code,
        type: 'sms'
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        // Successfully verified - navigate to account setup for create account flow
        if (type === 'create') {
          navigation.replace('PersonalInfoScreen', { user: data.user });
        } else {
          navigation.replace('Home');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Verification code resent');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.instructionText}>
          Enter the code we sent to {phone}
        </Text>
        
        <View style={styles.codeContainer}>
          {[...Array(6)].map((_, index) => (
            <View key={index} style={styles.codeSlot}>
              <Text style={[styles.codeDigit, code[index] && styles.codeDigitFilled]}>
                {code[index] ? code[index] : '0'}
              </Text>
              <View style={styles.underline} />
            </View>
          ))}
          <TextInput
            style={styles.hiddenInput}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
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
    marginBottom: 7,
    paddingHorizontal: 20,
    position: 'relative',
  },
  codeSlot: {
    alignItems: 'center',
    flex: 1,
  },
  codeDigit: {
    fontSize: 32,
    color: 'gray',
    textAlign: 'center',
  },
  codeDigitFilled: {
    color: 'black',
  },
  underline: {
    height: 2,
    backgroundColor: '#000',
    width: '60%',
    marginTop: 8,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  verifyButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    width: 300,
    marginBottom: 40,
  },
  verifyText: {
    color: '#000',
    fontSize: 20,
  },
  resendInfo: {
    fontSize: 20.5,
    color: 'gray',
    marginBottom: 4,
  },
  resendLink: {
    fontSize: 18,
    color: '#000',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
