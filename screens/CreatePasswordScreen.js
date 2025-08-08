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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabaseClient';

export default function CreatePasswordScreen({ navigation, route }) {
  const { userInfo, savedUser } = route.params;
  
  // Test database connection and permissions on component mount
  useEffect(() => {
    const testDatabaseAccess = async () => {
      try {
        console.log('=== TESTING DATABASE ACCESS ===');
        
        // Test 1: Can we read from users table?
        const { data: testRead, error: readError } = await supabase
          .from('users')
          .select('*')
          .limit(1);
          
        if (readError) {
          console.error('Read test failed:', readError);
        } else {
          console.log('Read test successful:', testRead);
        }
        
        // Test 2: If we have a savedUser, can we read that specific user?
        if (savedUser && savedUser.id) {
          const { data: specificUser, error: specificError } = await supabase
            .from('users')
            .select('*')
            .eq('id', savedUser.id)
            .single();
            
          if (specificError) {
            console.error('Specific user read failed:', specificError);
          } else {
            console.log('Specific user read successful:', specificUser);
          }
        }
        
      } catch (error) {
        console.error('Database access test error:', error);
      }
    };
    
    testDatabaseAccess();
  }, [savedUser]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isValid, setIsValid] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (password.length > 0) {
      validatePassword(password);
    } else {
      setIsValid({});
    }
  }, [password]);

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

    try {
      console.log('=== PASSWORD UPDATE PROCESS START ===');
      console.log('Saved user from params:', savedUser);
      console.log('User info:', userInfo);
      console.log('Password to save:', password);
      
      if (savedUser && savedUser.id) {
        console.log('Updating existing user with ID:', savedUser.id);
        console.log('Current savedUser data:', savedUser);
        
        // Update the existing user record with password
        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .update({ 
            password_hash: password, // Note: In production, this should be hashed
            updated_at: new Date().toISOString()
          })
          .eq('id', savedUser.id)
          .select();

        if (updateError) {
          console.error('Password update error:', updateError);
          console.error('Error details:', updateError);
          setError('passwordUpdateFailed');
          return;
        }

        console.log('Password updated successfully:', updateData);
        console.log('Updated user data:', updateData[0]);
        
        // Verify the update worked by checking the database
        const { data: verifyData, error: verifyError } = await supabase
          .from('users')
          .select('*')
          .eq('id', savedUser.id)
          .single();
          
        if (verifyError) {
          console.error('Verification error:', verifyError);
        } else {
          console.log('Verification - User in database:', verifyData);
          console.log('Password hash in database:', verifyData.password_hash);
        }
        
        navigation.navigate('FaceID', { userInfo, savedUser: updateData[0] });
      } else {
        console.log('No saved user found, creating new user record...');
        console.log('This should not happen if PersonalInfoScreen worked correctly');
        
        // Fallback: Create a new user record with password
        const { data, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              first_name: userInfo.firstName,
              last_name: userInfo.lastName,
              email: userInfo.email,
              phone: userInfo.phone,
              address_line_1: userInfo.address1,
              address_line_2: userInfo.address2 || null,
              city: userInfo.city,
              state: userInfo.state,
              zip_code: userInfo.zip,
              password_hash: password, // Note: In production, this should be hashed
              created_at: new Date().toISOString(),
            }
          ])
          .select();

        if (insertError) {
          console.error('User insert error:', insertError);
          setError('userInsertFailed');
          return;
        }

        console.log('User created successfully:', data);
        navigation.navigate('FaceID', { userInfo, savedUser: data[0] });
      }
    } catch (error) {
      console.error('Continue error:', error);
      setError('generalError');
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
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>CREATE PASSWORD</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              secureTextEntry={!showPassword}
              style={[styles.input, styles.placeholderText]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
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
              placeholder="Confirm Password"
              placeholderTextColor="#000"
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye' : 'eye-off'} size={20} color="gray" />
            </TouchableOpacity>
          </View>

          {error !== '' && (
            <Text style={{ color: 'red', marginBottom: 10 }}>
              {error === 'passwordUpdateFailed' && 'Failed to update password. Please try again.'}
              {error === 'userInsertFailed' && 'Failed to create user account. Please try again.'}
              {error === 'generalError' && 'An error occurred. Please try again.'}
              {error !== 'passwordUpdateFailed' && error !== 'userInsertFailed' && error !== 'generalError' && error}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: allValid ? '#000' : '#fff',
                borderWidth: 1,
                borderColor: '#000',
              },
            ]}
            disabled={!allValid}
            onPress={handleContinue}
          >
            <Text
              style={[
                styles.continueText,
                {
                  color: allValid ? '#fff' : '#000',
                },
              ]}
            >
              Continue
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
  backArrow: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
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
