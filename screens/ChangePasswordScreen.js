import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChangePasswordScreen({ navigation, route }) {
  const { userEmail } = route.params || {};
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isValid, setIsValid] = useState({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedUserEmail, setResolvedUserEmail] = useState(userEmail);

  useEffect(() => {
    if (password.length > 0) {
      validatePassword(password);
    } else {
      setIsValid({});
    }
  }, [password]);

  // Try to resolve user email if not provided in route params
  useEffect(() => {
    const resolveUserEmail = async () => {
      if (!userEmail) {
        try {
          const userProfileData = await AsyncStorage.getItem('userProfileData');
          if (userProfileData) {
            const parsedData = JSON.parse(userProfileData);
            if (parsedData.email) {
              console.log('Resolved user email from AsyncStorage:', parsedData.email);
              setResolvedUserEmail(parsedData.email);
            }
          }
        } catch (error) {
          console.log('Error reading AsyncStorage for user email:', error);
        }
      }
    };

    resolveUserEmail();
  }, [userEmail]);

  const validatePassword = (pwd) => {
    const rules = {
      minLength: pwd.length >= 8,
      maxLength: pwd.length <= 80,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      symbol: /[!%&@#$^*?_~]/.test(pwd),
      noEmoji: /^[\u0000-\u007F]*$/.test(pwd),
    };
    setIsValid(rules);
  };

  const allValid =
    Object.values(isValid).length > 0 &&
    Object.values(isValid).every(Boolean) &&
    password === confirmPassword;

  const RuleItem = ({ rule, valid, show }) => (
    <Text style={styles.requirement}>
      {show ? (
        <Ionicons
          name={valid ? 'checkmark-circle' : 'close-circle'}
          size={16}
          color={valid ? 'green' : 'red'}
        />
      ) : (
        <Ionicons name="ellipse-outline" size={16} color="gray" />
      )}
      {'  '}
      {rule}
    </Text>
  );

  const handleContinue = async () => {
    if (!allValid) return;
    setError('');

    // Check if we have a valid email
    if (!resolvedUserEmail) {
      setError('User email not available. Please go back and try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('=== PASSWORD CHANGE PROCESS START ===');
      console.log('User email from route params:', userEmail);
      console.log('Resolved user email:', resolvedUserEmail);
      console.log('User email type:', typeof resolvedUserEmail);
      console.log('User email length:', resolvedUserEmail?.length);
      console.log('New password to save:', password);
      console.log('Password length:', password.length);
      console.log('Password characters:', password.split('').map(c => c.charCodeAt(0)));
      
      // Update the user's password in the database
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ 
          password_hash: password, // Note: In production, this should be hashed
          updated_at: new Date().toISOString()
        })
        .ilike('email', resolvedUserEmail);

      if (updateError) {
        console.error('Password update error:', updateError);
        console.error('Error details:', updateError);
        setError('passwordUpdateFailed');
        return;
      }

      console.log('Password updated successfully');
      
      // Verify the password was stored correctly by reading it back
      const { data: verifyData, error: verifyError } = await supabase
        .from('users')
        .select('password_hash')
        .ilike('email', resolvedUserEmail)
        .single();
        
      if (verifyError) {
        console.error('Verification error:', verifyError);
        setError('passwordUpdateFailed');
        return;
      }
      
      console.log('Stored password hash:', verifyData.password_hash);
      console.log('Stored password length:', verifyData.password_hash?.length);
      console.log('Passwords match?', verifyData.password_hash === password);
      console.log('Password comparison details:');
      console.log('  Original password:', `"${password}"`);
      console.log('  Stored password:', `"${verifyData.password_hash}"`);
      console.log('  Original length:', password.length);
      console.log('  Stored length:', verifyData.password_hash?.length);
      
      if (verifyData.password_hash !== password) {
        console.error('PASSWORD MISMATCH DETECTED!');
        setError('Password was not stored correctly. Please try again.');
        return;
      }
      
      console.log('Password verification successful - stored password matches input');
      
      // Navigate to PasswordChangedConfirmation after successful password change
      navigation.replace('PasswordChangedConfirmation');
    } catch (error) {
      console.error('Continue error:', error);
      setError('generalError');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()}>
              <Image 
                source={require('../assets/backarrow.png')} 
                style={styles.backArrowImage}
              />
            </Pressable>
            <Text style={styles.headerTitle}>CHANGE PASSWORD</Text>
            <View style={{ width: 24 }} />
          </View>

          {resolvedUserEmail && (
            <View style={styles.emailInfo}>
              <Text style={styles.emailLabel}>Changing password for:</Text>
              <Text style={styles.emailText}>{resolvedUserEmail}</Text>
            </View>
          )}
          
          {!resolvedUserEmail && (
            <View style={styles.emailInfo}>
              <Text style={styles.emailWarning}>
                ⚠️ User email not available. Please go back and try again.
              </Text>
            </View>
          )}

          <View style={styles.inputWrapper}>
            <TextInput
              secureTextEntry={!showPassword}
              style={[styles.input, styles.placeholderText]}
              value={password}
              onChangeText={setPassword}
              placeholder="New Password"
              placeholderTextColor="#000"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="gray" />
            </TouchableOpacity>
          </View>

          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password requirements:</Text>
            <RuleItem rule="Min. 8 characters" valid={isValid.minLength} show={password.length > 0} />
            <RuleItem rule="Max. 80 characters" valid={isValid.maxLength} show={password.length > 0} />
            <RuleItem rule="Must include uppercase letter" valid={isValid.upper} show={password.length > 0} />
            <RuleItem rule="Must include lowercase letter" valid={isValid.lower} show={password.length > 0} />
            <RuleItem rule="Must include a symbol (!%&@#$^*?_~)" valid={isValid.symbol} show={password.length > 0} />
            <RuleItem rule="Can't include emojis" valid={isValid.noEmoji} show={password.length > 0} />
            <RuleItem
              rule="Passwords match"
              valid={password === confirmPassword && confirmPassword.length > 0}
              show={confirmPassword.length > 0}
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              secureTextEntry={!showConfirm}
              style={[styles.input, styles.placeholderText]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm New Password"
              placeholderTextColor="#000"
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye' : 'eye-off'} size={20} color="gray" />
            </TouchableOpacity>
          </View>

          {error !== '' && (
            <Text style={{ color: 'red', marginBottom: 10 }}>
              {error === 'passwordUpdateFailed' && 'Failed to update password. Please try again.'}
              {error === 'generalError' && 'An error occurred. Please try again.'}
              {error !== 'passwordUpdateFailed' && error !== 'generalError' && error}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: allValid && !isLoading ? '#000' : '#fff',
                borderWidth: 1,
                borderColor: '#000',
                opacity: isLoading ? 0.6 : 1,
              },
            ]}
            disabled={!allValid || isLoading}
            onPress={handleContinue}
          >
            <Text
              style={[
                styles.continueText,
                {
                  color: allValid && !isLoading ? '#fff' : '#000',
                },
              ]}
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 66,
  },
  backArrowImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  emailInfo: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  emailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  emailWarning: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: '500',
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
  },
  placeholderText: {
    fontSize: 26,
    fontWeight: '200',
    color: '#000',
  },
  requirementsBox: {
    paddingVertical: 12,
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueButton: {
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 32,
  },
  continueText: {
    fontWeight: '700',
    fontSize: 18,
  },
});
