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
  const { userInfo, savedUser, isGoogleAuth, googleUserData } = route.params;
  
  // Log the received parameters for debugging
  useEffect(() => {
    console.log('🔄 CreatePasswordScreen received params:', {
      hasUserInfo: !!userInfo,
      hasSavedUser: !!savedUser,
      isGoogleAuth,
      hasGoogleUserData: !!googleUserData,
      googleUserData: googleUserData
    });
    
    // DEBUG: Log the actual userInfo content to see what data we have
    if (userInfo) {
      console.log('🔍 CreatePasswordScreen DEBUG - userInfo content:', {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        phone: userInfo.phone,
        address1: userInfo.address1,
        address2: userInfo.address2,
        city: userInfo.city,
        state: userInfo.state,
        zip: userInfo.zip
      });
    }
  }, [userInfo, savedUser, isGoogleAuth, googleUserData]);
  
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
      console.log('=== USER CREATION PROCESS START ===');
      console.log('Saved user from params:', savedUser);
      console.log('User info:', userInfo);
      console.log('Password to save:', password);
      console.log('Is Google auth:', isGoogleAuth);
      
      // For Google auth users, save the password to the database so they can use both methods
      if (isGoogleAuth) {
        console.log('✅ Google auth user - saving password to database for hybrid login');
        
        try {
          // Check if user already exists in database
          const { data: existingGoogleUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .ilike('email', userInfo.email)
            .maybeSingle();
            
          if (checkError) {
            console.error('Error checking existing Google user:', checkError);
            setError('Failed to verify account. Please try again.');
            return;
          }
          
          if (existingGoogleUser) {
            // Update existing Google user with password
            console.log('Updating existing Google user with password:', existingGoogleUser.id);
            const { data: updateData, error: updateError } = await supabase
              .from('users')
              .update({ 
                password_hash: password, // Store password for hybrid login
                updated_at: new Date().toISOString()
              })
              .eq('id', existingGoogleUser.id)
              .select();
              
            if (updateError) {
              console.error('Password update error for Google user:', updateError);
              setError('Failed to set password. Please try again.');
              return;
            }
            
            console.log('✅ Google user password saved successfully:', updateData);
            console.log('🔍 Google user password being stored:', {
              password: password,
              passwordLength: password.length,
              passwordType: typeof password,
              passwordFirst3Chars: password.substring(0, 3) + '...',
              userId: existingGoogleUser.id
            });
            
            // Verify the password was stored correctly
            const { data: verifyGoogleUser, error: verifyGoogleUserError } = await supabase
              .from('users')
              .select('password_hash')
              .eq('id', existingGoogleUser.id)
              .single();
              
            if (verifyGoogleUserError) {
              console.error('Verification error for Google user:', verifyGoogleUserError);
            } else {
              console.log('🔍 Google user password verification:', {
                storedPassword: verifyGoogleUser.password_hash,
                storedPasswordLength: verifyGoogleUser.password_hash?.length,
                storedPasswordType: typeof verifyGoogleUser.password_hash,
                storedPasswordFirst3Chars: verifyGoogleUser.password_hash ? verifyGoogleUser.password_hash.substring(0, 3) + '...' : 'undefined',
                matchesInput: verifyGoogleUser.password_hash === password
              });
            }
            
            // Create formatted user object with password
            const formattedGoogleUser = {
              ...existingGoogleUser,
              password_hash: password,
              id: updateData[0].id,
              firstName: updateData[0].first_name,
              lastName: updateData[0].last_name,
              email: updateData[0].email,
              phone: updateData[0].phone || '',
              address1: updateData[0].address_line_1 || '',
              address2: updateData[0].address_line_2 || '',
              city: updateData[0].city || '',
              state: updateData[0].state || '',
              zip: updateData[0].zip_code || '',
              created_at: updateData[0].created_at,
              updated_at: updateData[0].updated_at
            };
            
            console.log('🔍 CreatePasswordScreen DEBUG - Navigating to FaceID with userInfo:', {
              firstName: userInfo.firstName,
              lastName: userInfo.lastName,
              email: userInfo.email,
              phone: userInfo.phone,
              address1: userInfo.address1,
              city: userInfo.city,
              state: userInfo.state,
              zip: userInfo.zip
            });
            
            navigation.navigate('FaceID', { 
              userInfo, 
              savedUser: formattedGoogleUser,
              isGoogleAuth: true,
              googleUserData: googleUserData
            });
          } else {
            // Create new Google user with password
            console.log('Creating new Google user with password');
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                email: userInfo.email,
                first_name: userInfo.firstName || '',
                last_name: userInfo.lastName || '',
                password_hash: password, // Store password for hybrid login
                avatar_url: userInfo.avatar_url || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select();
              
            if (createError) {
              console.error('Error creating Google user with password:', createError);
              setError('Failed to create account. Please try again.');
              return;
            }
            
            console.log('✅ New Google user with password created successfully:', newUser);
            
            // Create formatted user object
            const formattedNewGoogleUser = {
              ...newUser[0],
              id: newUser[0].id,
              firstName: newUser[0].first_name,
              lastName: newUser[0].last_name,
              email: newUser[0].email,
              phone: newUser[0].phone || '',
              address1: newUser[0].address_line_1 || '',
              address2: newUser[0].address_line_2 || '',
              city: newUser[0].city || '',
              state: newUser[0].state || '',
              zip: newUser[0].zip_code || '',
              created_at: newUser[0].created_at,
              updated_at: newUser[0].updated_at
            };
            
            console.log('🔍 CreatePasswordScreen DEBUG - Navigating to FaceID with userInfo (new user):', {
              firstName: userInfo.firstName,
              lastName: userInfo.lastName,
              email: userInfo.email,
              phone: userInfo.phone,
              address1: userInfo.address1,
              city: userInfo.city,
              state: userInfo.state,
              zip: userInfo.zip
            });
            
            navigation.navigate('FaceID', { 
              userInfo, 
              savedUser: formattedNewGoogleUser,
              isGoogleAuth: true,
              googleUserData: googleUserData
            });
          }
        } catch (error) {
          console.error('Error handling Google user password setup:', error);
          setError('Failed to set up password. Please try again.');
          return;
        }
        return;
      }
      
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
        console.log('🔍 Password being stored:', {
          password: password,
          passwordLength: password.length,
          passwordType: typeof password,
          passwordFirst3Chars: password.substring(0, 3) + '...'
        });
        
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
          console.log('🔍 Stored password verification:', {
            storedPassword: verifyData.password_hash,
            storedPasswordLength: verifyData.password_hash?.length,
            storedPasswordType: typeof verifyData.password_hash,
            storedPasswordFirst3Chars: verifyData.password_hash ? verifyData.password_hash.substring(0, 3) + '...' : 'undefined',
            matchesInput: verifyData.password_hash === password
          });
        }
        
        // Create a properly formatted user object that matches what the UI expects
        const formattedUser = {
          id: updateData[0].id,
          firstName: updateData[0].first_name,
          lastName: updateData[0].last_name,
          email: updateData[0].email,
          phone: updateData[0].phone,
          address1: updateData[0].address_line_1,
          address2: updateData[0].address_line_2,
          city: updateData[0].city,
          state: updateData[0].state,
          zip: updateData[0].zip_code,
          created_at: updateData[0].created_at,
          updated_at: updateData[0].updated_at
        };
        
        console.log('🔍 CreatePasswordScreen DEBUG - Navigating to FaceID with userInfo (regular user):', {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          phone: userInfo.phone,
          address1: userInfo.address1,
          city: userInfo.city,
          state: userInfo.state,
          zip: userInfo.zip
        });
        
        navigation.navigate('FaceID', { userInfo, savedUser: formattedUser });
      } else {
        console.log('No saved user found, checking if email already exists...');
        
        // Check if email already exists in the database (case insensitive)
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .ilike('email', userInfo.email)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing email:', checkError);
          setError('emailCheckFailed');
          return;
        }

        if (existingUser) {
          console.log('Email already exists:', existingUser.email);
          
          // For Google Auth users, redirect them to the welcome page since they already have an account
          if (isGoogleAuth) {
            const fullName = existingUser.first_name && existingUser.last_name
              ? `${existingUser.first_name} ${existingUser.last_name}`
              : 'there';
            
            navigation.replace('Home');
            return;
          }
          
          // For regular users, show error
          setError('emailAlreadyExists');
          return;
        }
        
        console.log('Email is unique, creating new user record...');
        
        // Create a new user record with all information including password
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
              avatar_path: null, // Initialize avatar fields
              avatar_url: null,
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
        console.log('🔍 Password being stored for new user:', {
          password: password,
          passwordLength: password.length,
          passwordType: typeof password,
          passwordFirst3Chars: password.substring(0, 3) + '...',
          userId: data[0].id
        });
        
        // Verify the password was stored correctly
        const { data: verifyNewUser, error: verifyNewUserError } = await supabase
          .from('users')
          .select('password_hash')
          .eq('id', data[0].id)
          .single();
          
        if (verifyNewUserError) {
          console.error('Verification error for new user:', verifyNewUserError);
        } else {
          console.log('🔍 New user password verification:', {
            storedPassword: verifyNewUser.password_hash,
            storedPasswordLength: verifyNewUser.password_hash?.length,
            storedPasswordType: typeof verifyNewUser.password_hash,
            storedPasswordFirst3Chars: verifyNewUser.password_hash ? verifyNewUser.password_hash.substring(0, 3) + '...' : 'undefined',
            matchesInput: verifyNewUser.password_hash === password
          });
        }
        
        // Create a properly formatted user object that matches what the UI expects
        const formattedUser = {
          id: data[0].id,
          firstName: data[0].first_name,
          lastName: data[0].last_name,
          email: data[0].email,
          phone: data[0].phone,
          address1: data[0].address_line_1,
          address2: data[0].address_line_2,
          city: data[0].city,
          state: data[0].state,
          zip: data[0].zip_code,
          created_at: data[0].created_at
        };
        
        navigation.navigate('FaceID', { userInfo, savedUser: formattedUser });
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
            <View style={{ marginBottom: 10, alignItems: 'center' }}>
              <Text style={{ color: 'red', textAlign: 'center' }}>
                {error === 'passwordUpdateFailed' && 'Failed to update password. Please try again.'}
                {error === 'userInsertFailed' && 'Failed to create user account. Please try again.'}
                {error === 'emailAlreadyExists' && 'An account with that email already exists.'}
                {error === 'emailCheckFailed' && 'Failed to check email availability. Please try again.'}
                {error === 'generalError' && 'An error occurred. Please try again.'}
                {error !== 'passwordUpdateFailed' && error !== 'userInsertFailed' && error !== 'emailAlreadyExists' && error !== 'emailCheckFailed' && error !== 'generalError' && error}
              </Text>
            </View>
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
