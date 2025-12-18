import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Alert, Platform, Modal,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from './supabaseClient';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PushNotiScreen({ navigation, route }) {
  const { user } = useUser();
  const userFromParams = route?.params?.user;
  const isGoogleAuth = route?.params?.isGoogleAuth;
  const googleUserData = route?.params?.googleUserData;
  const isDriverFlow = route?.params?.isDriverFlow || false;
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Disable swipe back gesture
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({
        gestureEnabled: false,
      });
      
      return () => {
        navigation.getParent()?.setOptions({
          gestureEnabled: true,
        });
      };
    }, [navigation])
  );

  // Ensure Android channel exists
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    
    // Check if location permission is already granted
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        // Already has permission, proceed to notifications
        console.log('✅ Location permission already granted');
      }
    } catch (error) {
      console.log('⚠️ Error checking location permission:', error);
    }
  };

  const handleAllowLocation = () => {
    setShowModal(true);
  };

  const handleModalOK = async () => {
    try {
      setLoading(true);
      console.log('📍 Requesting location permission...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Location permission granted');
        await AsyncStorage.setItem('locationEnabled', 'true');
      } else {
        console.log('❌ Location permission denied');
        await AsyncStorage.setItem('locationEnabled', 'false');
      }
      
      setShowModal(false);
      // Continue to notification setup
      await handleEnableNotifications();
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      setShowModal(false);
      await AsyncStorage.setItem('locationEnabled', 'false');
      // Still proceed to notifications
      await handleEnableNotifications();
    } finally {
      setLoading(false);
    }
  };

  const handleModalDontAllow = () => {
    setShowModal(false);
  };

  // If permission already granted when landing here, save silently
  useFocusEffect(
    useCallback(() => {
      (async () => {
        console.log('🔄 PushNotiScreen: useFocusEffect triggered');
        console.log('🔄 isGoogleAuth:', isGoogleAuth);
        console.log('🔄 userFromParams:', userFromParams);
        console.log('🔍 Route params full object:', route?.params);
        console.log('🔍 User context object:', user);
        console.log('🔍 User context ID:', user?.id);
        console.log('🔍 User context email:', user?.email);
        
        // DEBUG: Add comprehensive logging for user data flow
        console.log('🔍 PushNotiScreen DEBUG - Starting user data processing');
        console.log('🔍 PushNotiScreen DEBUG - User from params:', userFromParams);
        console.log('🔍 PushNotiScreen DEBUG - Is Google auth:', isGoogleAuth);
        console.log('🔍 PushNotiScreen DEBUG - Google user data:', googleUserData);
        
        // OPTIMIZATION: Don't block UI with database operations
        // Save user data to database in background
        if (isGoogleAuth) {
          console.log('🔄 Calling saveGoogleUserToDatabase in background...');
          console.log('🔍 PushNotiScreen DEBUG - Starting Google user database save');
          // Don't await - let it run in background
          saveGoogleUserToDatabase().catch(error => 
            console.log('⚠️ Background save error:', error)
          );
        } else {
          console.log('🔄 Calling saveRegularUserToDatabase in background...');
          console.log('🔍 PushNotiScreen DEBUG - Starting regular user database save');
          // Don't await - let it run in background
          saveRegularUserToDatabase().catch(error => 
            console.log('⚠️ Background save error:', error)
          );
        }
        

        // Handle notifications without blocking
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          // Check if we already have a token stored
          const existingToken = await AsyncStorage.getItem('expoPushToken');
          if (!existingToken) {
            // Don't await - let it run in background
            getTokenAndSave().catch(error => 
              console.log('⚠️ Background token save error:', error)
            );
          }
        }
      })();
    }, [isGoogleAuth])
  );

    // Create profiles table if it doesn't exist
  // const createProfilesTable = async () => {
  //   try {
  //     console.log('🔄 Creating profiles table...');
      
  //     if (error) {
  //       console.log('⚠️ Could not create table via RPC, table may already exist');
  //     } else {
  //       console.log('✅ Profiles table created successfully');
  //     }
  //   } catch (error) {
  //     console.log('⚠️ Error creating profiles table:', error);
  //     // Table creation will be handled by Supabase migrations
  //   }
  // };

  // Create users table if it doesn't exist
  // const createUsersTable = async () => {
  //   try {
  //     console.log('🔄 Creating users table...');
     
      
  //     if (error) {
  //       console.log('⚠️ Could not create table via RPC, table may already exist');
  //     } else {
  //       console.log('✅ Users table created successfully');
  //     }
  //   } catch (error) {
  //     console.log('⚠️ Error creating users table:', error);
  //     // Table creation will be handled by Supabase migrations
  //   }
  // };

  // Debug function to check table structure
  // const debugTableStructure = async () => {
  //   try {
  //     console.log('🔍 Debugging table structure...');
      
  //     // Check profiles table structure
  //     const { data: profilesData, error: profilesError } = await supabase
  //       .from('profiles')
  //       .select('*')
  //       .limit(0);
      
  //     if (profilesError) {
  //       console.log('❌ Profiles table error:', profilesError);
  //     } else {
  //       console.log('✅ Profiles table accessible');
  //     }
      
  //     // Check users table structure
  //     const { data: usersData, error: usersError } = await supabase
  //       .from('users')
  //       .select('*')
  //       .limit(0);
      
  //     if (usersError) {
  //       console.log('❌ Users table error:', usersError);
  //     } else {
  //       console.log('✅ Users table accessible');
  //     }
      
  //     // Try to get table info from information_schema
  //     const { data: schemaInfo, error: schemaError } = await supabase
  //       .rpc('get_table_columns', { table_name: 'users' });
      
  //     if (schemaError) {
  //       console.log('⚠️ Could not get schema info via RPC:', schemaError);
  //     } else {
  //       console.log('🔍 Users table columns:', schemaInfo);
  //     }
      
  //   } catch (error) {
  //     console.log('⚠️ Error debugging table structure:', error);
  //   }
  // };

  // Function to handle database schema mismatch and fix ID type issues
  // const handleDatabaseSchemaMismatch = async (userId, userDataForUsersTable) => {
  //   try {
  //     console.log('🔧 Handling database schema mismatch...');
  //     console.log('🔍 Current user ID causing issue:', userId);
  //     console.log('🔍 Current user ID type:', typeof userId);
      
  //     // Check if the ID is a temporary ID that needs to be converted
  //     if (typeof userId === 'string' && userId.startsWith('temp_')) {
  //       console.log('🔍 Detected temporary ID format, attempting to fix...');
        
  //       // Generate a proper UUID for the database
  //       let newUserId;
  //       if (typeof crypto !== 'undefined' && crypto.randomUUID) {
  //         newUserId = crypto.randomUUID();
  //         console.log('✅ Generated new UUID using crypto.randomUUID():', newUserId);
  //       } else {
  //         // Fallback for environments without crypto.randomUUID
  //         newUserId = 'uuid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  //         console.log('✅ Generated fallback UUID:', newUserId);
  //       }
        
  //       // Update the data with the new ID
  //       const fixedUserData = { ...userDataForUsersTable, id: newUserId };
  //       console.log('🔍 Fixed user data with new ID:', JSON.stringify(fixedUserData, null, 2));
        
  //       // Try to insert with the fixed ID
  //       console.log('🔍 Attempting database insert with fixed ID...');
  //       const { data: insertResult, error: insertError } = await supabase
  //         .from('users')
  //         .insert(fixedUserData);
        
  //       if (insertError) {
  //         console.error('❌ Insert with fixed ID still failed:', insertError);
  //         console.error('❌ Error details:', {
  //           code: insertError.code,
  //           message: insertError.message,
  //           details: insertError.details
  //         });
          
  //         // If still failing, let's check the database schema
  //         console.log('🔍 Schema mismatch persists, checking database structure...');
  //         await checkDatabaseSchema();
          
  //           return false;
  //         } else {
  //           console.log('✅ Successfully inserted user with fixed ID:', insertResult);
          
  //           // Update AsyncStorage with the new ID
  //           const updatedUserData = {
  //             ...userDataForUsersTable,
  //             id: newUserId
  //           };
          
  //           await AsyncStorage.setItem('tempUserData', JSON.stringify(updatedUserData));
  //           await AsyncStorage.setItem('userProfileData', JSON.stringify(updatedUserData));
  //           console.log('✅ Updated AsyncStorage with new user ID:', newUserId);
          
  //           return true;
  //         }
  //       } else {
  //         console.log('⚠️ User ID is not a temporary format, cannot auto-fix');
  //         return false;
  //       }
      
  //     } catch (error) {
  //       console.error('❌ Error handling database schema mismatch:', error);
  //       return false;
  //     }
  //   };

  // Function to attempt to fix the database schema by altering the column type
  // const attemptDatabaseSchemaFix = async () => {
  //   try {
  //     console.log('🔧 Attempting to fix database schema...');
  //     console.log('🔍 The issue is that your users table has id as TEXT but expects BIGINT');
  //     console.log('🔍 We will try to alter the column type to accept TEXT properly');
      
  //     // Try to alter the column type using SQL
  //     const { data: alterResult, error: alterError } = await supabase
  //       .rpc('alter_column_type', {
  //         table_name: 'users',
  //         column_name: 'id',
  //         new_type: 'text'
  //       });
      
  //     if (alterError) {
  //       console.log('⚠️ Could not alter column type via RPC:', alterError);
  //       console.log('🔍 This is expected if the RPC function does not exist');
  //       console.log('🔍 You may need to manually fix this in your Supabase dashboard');
  //       console.log('🔍 Go to: SQL Editor > Run this command:');
  //       console.log('🔍 ALTER TABLE users ALTER COLUMN id TYPE text;');
  //       return false;
  //     } else {
  //       console.log('✅ Successfully altered column type:', alterResult);
  //       return true;
  //     }
      
  //     } catch (error) {
  //       console.log('⚠️ Error attempting database schema fix:', error);
  //       return false;
  //     }
  //   };

  // Enhanced function to check database schema and constraints
  // const checkDatabaseSchema = async () => {
  //   try {
  //     console.log('🔍 Checking database schema and constraints...');
      
  //     // First, let's check the actual table structure
  //     console.log('🔍 Querying users table structure...');
  //     const { data: tableInfo, error: tableError } = await supabase
  //       .from('users')
  //       .select('*')
  //       .limit(0);
      
  //     if (tableError) {
  //       console.error('❌ Could not query users table structure:', tableError);
  //       return;
  //     }
      
  //     console.log('✅ Users table structure query successful');
  //     console.log('🔍 Table columns accessible:', Object.keys(tableInfo || {}));
      
  //     // Try to get column information
  //     try {
  //       const { data: columnInfo, error: columnError } = await supabase
  //         .rpc('get_table_columns', { table_name: 'users' });
        
  //       if (columnError) {
  //         console.log('⚠️ Could not get column info via RPC, trying alternative method');
          
  //         // Alternative: Try to insert a minimal record to see what columns are required
  //         const minimalTestData = {
  //           id: 'schema_test_' + Date.now(),
  //           email: 'schema@test.com'
  //         };
          
  //         console.log('🔍 Testing minimal insert with data:', minimalTestData);
          
  //         const { data: minResult, error: minError } = await supabase
  //           .from('users')
  //           .insert(minimalTestData);
          
  //         if (minError) {
  //           console.error('❌ Minimal test insert failed:', minError);
  //           console.error('❌ Error details:', {
  //             code: minError.code,
  //             message: minError.message,
  //             details: minError.details
  //           });
  //         } else {
  //           console.log('✅ Minimal test insert successful:', minResult);
            
  //           // Clean up
  //           const { error: cleanupError } = await supabase
  //             .from('users')
  //             .delete()
  //             .eq('id', minimalTestData.id);
            
  //           if (cleanupError) {
  //           console.log('⚠️ Could not clean up minimal test data:', cleanupError);
  //         }
  //       } else {
  //         console.log('🔍 Column information retrieved:', columnInfo);
  //       }
  //     } catch (rpcError) {
  //       console.log('⚠️ RPC call failed:', rpcError);
  //     }
      
  //   } catch (error) {
  //     console.log('⚠️ Error checking database schema:', error);
  //   }
  // };

  // Resolve the best email we can (context -> params -> AsyncStorage -> Supabase auth)
  const resolveEmailLower = async () => {
    if (user?.email) return user.email.toLowerCase();
    if (userFromParams?.email) return userFromParams.email.toLowerCase();

    const storedEmail = await AsyncStorage.getItem('currentUserEmail');
    if (storedEmail) return storedEmail.toLowerCase();

    // Try to get user from current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) return session.user.email.toLowerCase();

    return null;
  };

  // Store user email in AsyncStorage if we have it from route params
  useEffect(() => {
    const storeUserEmail = async () => {
      if (userFromParams?.email) {
        await AsyncStorage.setItem('currentUserEmail', userFromParams.email);
        console.log('User email stored in AsyncStorage from route params:', userFromParams.email);
      }
    };
    
    storeUserEmail();
  }, [userFromParams]);

  const resolveUserId = async () => {
    console.log('🔍 resolveUserId called');
    console.log('🔍 User context ID:', user?.id);
    
    // Prefer context if it has id
    if (user?.id) {
      console.log('✅ Using user context ID:', user.id);
      return user.id;
    }

    // Try to get user from current session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔍 Session user ID:', session?.user?.id);
    if (session?.user?.id) {
      console.log('✅ Using session user ID:', session.user.id);
      return session.user.id;
    }

    // Fallback to route params if available
    console.log('🔍 Route params user ID:', userFromParams?.id);
    if (userFromParams?.id) {
      console.log('✅ Using route params user ID:', userFromParams.id);
      return userFromParams.id;
    }

    console.log('⚠️ No user ID found from any source');
    return null;
  };

  // Save regular (non-Google) user to DB using Option A (no 'id' writes; use auth_user_id)
const saveRegularUserToDatabase = async () => {
  try {
    console.log('🔄 [saveRegularUserToDatabase] starting...');

    // 1) Validate input from previous screen
    if (!userFromParams) {
      console.log('❌ [saveRegularUserToDatabase] No userFromParams; nothing to save.');
      return;
    }
    if (!userFromParams.email || !String(userFromParams.email).includes('@')) {
      console.log('❌ [saveRegularUserToDatabase] Missing/invalid email:', userFromParams.email);
      return;
    }

    // 2) Get auth user (UUID) for RLS-friendly writes
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      console.log('⚠️ [saveRegularUserToDatabase] getSession error:', sessionErr);
    }
    const authUserId = session?.user?.id ?? null;
    if (!authUserId) {
      // With RLS policies that require auth.uid(), inserting without a session will fail.
      console.log('⚠️ [saveRegularUserToDatabase] No Supabase session user; upsert may be blocked by RLS.');
    } else {
      console.log('✅ [saveRegularUserToDatabase] auth_user_id:', authUserId);
    }

    // 3) Build row — DO NOT include 'id'
    const row = {
      auth_user_id: authUserId,                                  // uuid from auth.users (nullable if no session)
      email: String(userFromParams.email).toLowerCase(),         // normalize email
      first_name: userFromParams.firstName ?? null,
      last_name: userFromParams.lastName ?? null,
      phone: userFromParams.phone ?? null,
      address_line_1: userFromParams.address1 ?? null,
      address_line_2: userFromParams.address2 ?? null,
      city: userFromParams.city ?? null,
      state: userFromParams.state ?? null,
      zip_code: userFromParams.zip ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('🧪 [saveRegularUserToDatabase] Upserting row:', JSON.stringify(row, null, 2));

    // 4) Upsert on a UNIQUE column you actually have (email or auth_user_id)
    // If you added a unique constraint on auth_user_id, you can switch onConflict to 'auth_user_id'
    const { data, error } = await supabase
      .from('users')
      .upsert(row, { onConflict: 'email' }) // or 'auth_user_id' if you made it UNIQUE
      .select();

    if (error) {
      console.error('❌ [saveRegularUserToDatabase] Upsert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return; // Don't throw; just log so the UI flow can proceed
    }

    console.log('✅ [saveRegularUserToDatabase] Upsert success:', data);

    // 5) Cache a lightweight profile locally for next screens (no DB surrogate id here)
    const cached = {
      auth_user_id: authUserId,
      email: String(userFromParams.email).toLowerCase(),
      firstName: userFromParams.firstName ?? null,
      lastName: userFromParams.lastName ?? null,
      name: `${userFromParams.firstName ?? ''} ${userFromParams.lastName ?? ''}`.trim(),
      full_name: `${userFromParams.firstName ?? ''} ${userFromParams.lastName ?? ''}`.trim(),
      phone: userFromParams.phone ?? null,
      address1: userFromParams.address1 ?? null,
      address2: userFromParams.address2 ?? null,
      city: userFromParams.city ?? null,
      state: userFromParams.state ?? null,
      zip: userFromParams.zip ?? null,
      // Also include database format for consistency
      address_line_1: userFromParams.address1 ?? null,
      address_line_2: userFromParams.address2 ?? null,
      zip_code: userFromParams.zip ?? null,
      avatar_url: '',
      isGoogleAuth: false,
    };

    await AsyncStorage.setItem('userProfileData', JSON.stringify(cached));
    await AsyncStorage.setItem('tempUserData', JSON.stringify(cached));
    console.log('💾 [saveRegularUserToDatabase] Cached userProfileData & tempUserData');

  } catch (err) {
    console.error('❌ [saveRegularUserToDatabase] Unexpected error:', err);
    // Don't rethrow; keep the flow resilient
  }
};

  // Save Google Auth user to database
  const saveGoogleUserToDatabase = async () => {
    try {
      console.log('🔄 Saving Google Auth user to database...');
      console.log('🔍 PushNotiScreen DEBUG - saveGoogleUserToDatabase started');
      console.log('🔍 PushNotiScreen DEBUG - User from params:', userFromParams);
      
      if (!userFromParams) {
        console.log('❌ No user data available to save');
        console.log('🔍 PushNotiScreen DEBUG - userFromParams is null/undefined');
        return; // This is fine - it's not in a hook
      }

      // CRITICAL FIX: First check AsyncStorage for personal info data from PersonalInfoScreen
      let personalInfoData = null;
      try {
        const tempUserData = await AsyncStorage.getItem('tempUserData');
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        
        if (tempUserData) {
          personalInfoData = JSON.parse(tempUserData);
          console.log('✅ PushNotiScreen - Found personal info data in AsyncStorage:', personalInfoData);
        } else if (userProfileData) {
          personalInfoData = JSON.parse(userProfileData);
          console.log('✅ PushNotiScreen - Found personal info data in userProfileData:', personalInfoData);
        }
      } catch (storageError) {
        console.log('⚠️ PushNotiScreen - Error reading AsyncStorage:', storageError);
      }

      // Merge personal info data with userFromParams, prioritizing personal info data
      const mergedUserData = {
        ...userFromParams,
        ...personalInfoData, // Personal info takes precedence
        // Ensure we have the most complete data
        firstName: personalInfoData?.firstName || userFromParams.firstName || '',
        lastName: personalInfoData?.lastName || userFromParams.lastName || '',
        email: personalInfoData?.email || userFromParams.email || '',
        phone: personalInfoData?.phone || userFromParams.phone || '',
        address1: personalInfoData?.address1 || userFromParams.address1 || '',
        address2: personalInfoData?.address2 || userFromParams.address2 || '',
        city: personalInfoData?.city || userFromParams.city || '',
        state: personalInfoData?.state || userFromParams.state || '',
        zip: personalInfoData?.zip || userFromParams.zip || '',
        // Also include database format for consistency
        address_line_1: personalInfoData?.address1 || userFromParams.address1 || '',
        address_line_2: personalInfoData?.address2 || userFromParams.address2 || '',
        zip_code: personalInfoData?.zip || userFromParams.zip || ''
      };

      console.log('✅ PushNotiScreen - Merged user data with personal info:', mergedUserData);

      // Try to get user ID from multiple sources
      let userId = user?.id;
      console.log('🔍 Google user ID resolution attempt 1 - from context:', userId);
      
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
        console.log('🔍 Google user ID resolution attempt 2 - from session:', userId);
      }
      
      if (!userId && userFromParams?.id) {
        userId = userFromParams.id;
        console.log('🔍 Google user ID resolution attempt 3 - from route params:', userId);
      }

      if (!userId) {
        console.log('⚠️ No user ID available from context, session, or route params');
        console.log('🔍 Checking if we should generate a temporary UUID instead of "temp_user"');
        
        // Generate a proper UUID instead of "temp_user" string
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          userId = crypto.randomUUID();
          console.log('✅ Generated temporary UUID for Google user:', userId);
        } else {
          // Fallback for environments without crypto.randomUUID
          userId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          console.log('✅ Generated fallback temporary ID for Google user:', userId);
        }
      } else {
        console.log('✅ Valid Google user ID found:', userId);
      }

      // Prepare user data for database using merged data
      const userDataForDatabase = {
        id: userId || 'temp_user',
        email: mergedUserData.email,
        first_name: mergedUserData.firstName,
        last_name: mergedUserData.lastName,
        full_name: `${mergedUserData.firstName} ${mergedUserData.lastName}`.trim(),
        phone: mergedUserData.phone,
        address_line_1: mergedUserData.address1,
        address_line_2: mergedUserData.address2,
        city: mergedUserData.city,
        state: mergedUserData.state,
        zip_code: mergedUserData.zip,
        avatar_url: '', // Don't use Google avatar by default
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🔍 Google user database schema mapping:');
      console.log('  address1 -> address_line_1:', mergedUserData.address1);
      console.log('  address2 -> address_line_2:', mergedUserData.address2);
      console.log('  zip -> zip_code:', mergedUserData.zip);

      console.log('📋 User data prepared for database:', userDataForDatabase);
      
      // Validate data before inserting
      console.log('🔍 Validating user data...');
      const requiredFields = ['id', 'email', 'first_name', 'last_name'];
      const missingFields = requiredFields.filter(field => !userDataForDatabase[field]);
      
      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
        console.error('❌ Cannot proceed with database insert');
        return;
      }
      
      if (!userDataForDatabase.email.includes('@')) {
        console.error('❌ Invalid email format:', userDataForDatabase.email);
        return;
      }
      
      console.log('✅ User data validation passed');

      // ALSO save to users table for authentication
      console.log('🔄 Saving Google user data to Supabase users table...');
      const userDataForUsersTable = {
        // Don't include 'id' field - let database auto-generate it
        // Store the Supabase Auth UUID in auth_user_id field for reference
        auth_user_id: userId || null,
        email: mergedUserData.email,
        first_name: mergedUserData.firstName,
        last_name: mergedUserData.lastName,
        phone: mergedUserData.phone,
        address_line_1: mergedUserData.address1,
        address_line_2: mergedUserData.address2,
        city: mergedUserData.city,
        state: mergedUserData.state,
        zip_code: mergedUserData.zip,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🔍 Google users table data prepared:', userDataForUsersTable);
      console.log('🔍 Google user data types check:');
      console.log('  - id type:', typeof userDataForUsersTable.id, 'value:', userDataForUsersTable.id);
      console.log('  - email type:', typeof userDataForUsersTable.email, 'value:', userDataForUsersTable.email);
      console.log('  - first_name type:', typeof userDataForUsersTable.first_name, 'value:', userDataForUsersTable.first_name);
      console.log('  - last_name type:', typeof userDataForUsersTable.last_name, 'value:', userDataForUsersTable.last_name);
      console.log('  - phone type:', typeof userDataForUsersTable.phone, 'value:', userDataForUsersTable.phone);
      console.log('  - address_line_1 type:', typeof userDataForUsersTable.address_line_1, 'value:', userDataForUsersTable.address_line_1);
      console.log('  - city type:', typeof userDataForUsersTable.city, 'value:', userDataForUsersTable.city);
      console.log('  - state type:', typeof userDataForUsersTable.state, 'value:', userDataForUsersTable.state);
      console.log('  - zip_code type:', typeof userDataForUsersTable.zip_code, 'value:', userDataForUsersTable.zip_code);
      console.log('🔍 Attempting to save Google user to users table with data:', JSON.stringify(userDataForUsersTable, null, 2));

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .upsert(userDataForUsersTable, {
          onConflict: 'email'  // Use email for conflict resolution since we're not providing an ID
        });

      if (usersError) {
        console.error('❌ Error saving to users table:', usersError);
        console.error('❌ Users table error details:', {
          code: usersError.code,
          message: usersError.message,
          details: usersError.details,
          hint: usersError.hint
        });
        
        // Log the error for debugging
        console.error('❌ Error saving to users table:', usersError);
        console.log('🔍 Error details:', {
          code: usersError.code,
          message: usersError.message,
          details: usersError.details,
          hint: usersError.hint
        });
        
        // Don't throw the error, just log it so the UI flow can continue
        console.log('⚠️ Continuing despite database error - user data saved to AsyncStorage');
        

      } else {
        console.log('✅ Google user data successfully saved to users table:', usersData);
      }

      // CRITICAL FIX: Store complete user data in AsyncStorage for the welcome screen
      const userDataToStore = {
        id: userId || 'temp_user',
        email: mergedUserData.email,
        firstName: mergedUserData.firstName,
        lastName: mergedUserData.lastName,
        phone: mergedUserData.phone,
        address1: mergedUserData.address1,
        address2: mergedUserData.address2,
        city: mergedUserData.city,
        state: mergedUserData.state,
        zip: mergedUserData.zip,
        // Also include database format for consistency
        address_line_1: mergedUserData.address1,
        address_line_2: mergedUserData.address2,
        zip_code: mergedUserData.zip,
        avatar_url: '', // No avatar - will show initials
        isGoogleAuth: true,
        // Create name fields for consistency
        name: `${mergedUserData.firstName} ${mergedUserData.lastName}`.trim(),
        full_name: `${mergedUserData.firstName} ${mergedUserData.lastName}`.trim()
      };

      // Store in both AsyncStorage keys for consistency
      await AsyncStorage.setItem('tempUserData', JSON.stringify(userDataToStore));
      await AsyncStorage.setItem('userProfileData', JSON.stringify({
        id: userDataToStore.id,
        firstName: userDataToStore.firstName,
        lastName: userDataToStore.lastName,
        name: userDataToStore.firstName,
        full_name: `${userDataToStore.firstName} ${userDataToStore.lastName}`.trim(),
        avatar_url: userDataToStore.avatar_url,
        email: userDataToStore.email,
        phone: userDataToStore.phone,
        address1: userDataToStore.address1,
        address2: userDataToStore.address2,
        city: userDataToStore.city,
        state: userDataToStore.state,
        zip: userDataToStore.zip,
        // Also include database format for consistency
        address_line_1: userDataToStore.address1,
        address_line_2: userDataToStore.address2,
        zip_code: userDataToStore.zip
      }));
      
      console.log('✅ User data stored in AsyncStorage');
      console.log('🔍 PushNotiScreen DEBUG - User data stored in AsyncStorage:', userDataToStore);
      console.log('🔍 PushNotiScreen DEBUG - User data also stored in userProfileData');

    } catch (error) {
      console.error('❌ Error saving Google Auth user to database:', error);
      console.log('🔍 PushNotiScreen DEBUG - Database save error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      // Don't throw error, just log it and continue
      console.log('⚠️ Continuing with flow despite error');
    }
  };

  const getTokenAndSave = async () => {
    try {
      if (!Device.isDevice) {
        Alert.alert('Push notifications require a physical device.');
        return;
      }

      // Resolve current user UUID (auth.users.id)
      const userId = await resolveUserId();
      console.log('PushNotiScreen: resolved userId:', userId);

      // Even if no userId, still try to get and store the token
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

      const tokenObj = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const expoToken = tokenObj?.data;
      console.log('Expo push token:', expoToken);
      if (!expoToken) return;

      // Store token in AsyncStorage
      await AsyncStorage.setItem('expoPushToken', expoToken);
      if (userId) {
        console.log('✅ Push token stored in AsyncStorage for user', userId);
      } else {
        console.log('✅ Push token stored in AsyncStorage (no user ID)');
      }
      
    } catch (e) {
      console.log('getTokenAndSave error:', e?.message || String(e));
    }
  };

  const handleEnableNotifications = async () => {
    try {
      if (!Device.isDevice) {
        Alert.alert('Push notifications require a physical device.');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in Settings to get updates.',
          [
            { text: 'Settings', onPress: () => Notifications.openSettingsAsync?.() },
            { text: 'OK' },
          ]
        );
        return;
      }

      await getTokenAndSave();
      
      console.log('🔍 PushNotiScreen DEBUG - Navigating to Welcomepage');
      console.log('🔍 PushNotiScreen DEBUG - Navigation data:', {
        userInfo: userFromParams,
        isGoogleAuth: isGoogleAuth || false,
        googleUserData: googleUserData
      });
      
      // Navigate based on flow type
      if (isDriverFlow) {
        navigation.replace('DriverPortal');
      } else {
        // Navigate to Tutorial for new users (account creation flow)
        navigation.replace('Tutorial', { 
          userInfo: userFromParams,
          isNewUser: true,
          isGoogleAuth: isGoogleAuth || false,
          googleUserData: googleUserData
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      Alert.alert('Error', 'Failed to enable push notifications. Please try again.');
    }
  };

     const handleMaybeLater = async () => {
       console.log('🔍 PushNotiScreen DEBUG - handleMaybeLater called');
       console.log('🔍 PushNotiScreen DEBUG - Navigating based on flow type');
       
       // Save location preference as disabled
       await AsyncStorage.setItem('locationEnabled', 'false');
       
       // Navigate based on flow type
       if (isDriverFlow) {
         navigation.replace('DriverPortal');
       } else {
         // Navigate to Tutorial for new users (account creation flow)
         navigation.replace('Tutorial', { 
           userInfo: userFromParams,
           isNewUser: true,
           isGoogleAuth: isGoogleAuth || false,
           googleUserData: googleUserData
         });
       }
     };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* App Logo */}
      <Image 
        source={require('../assets/Logo_Dark.png')} 
        style={styles.logoImage} 
        resizeMode="contain" 
      />
      
      <View style={styles.contentWrapper}>
        {/* Location Icon */}
        <View style={styles.locationIconContainer}>
          <Image
            source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/location.png' }} // Location icon from Supabase storage
            style={styles.locationIcon}
            resizeMode="contain"
            onError={() => console.log('❌ Failed to load location.png from Supabase')}
          />
        </View>
        
        {/* Title */}
        <Text style={styles.title}>
          Allow location access
        </Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          We use your location to make the pickup &{'\n'}delivery experience easy and reliable
        </Text>
        
        {/* Allow Button */}
        <TouchableOpacity
          style={styles.allowButton}
          onPress={handleAllowLocation}
          disabled={loading}
        >
          <Text style={styles.allowButtonText}>
            {loading ? 'Requesting...' : 'Allow location access'}
          </Text>
        </TouchableOpacity>
        
        {/* Maybe Later Button */}
        <TouchableOpacity
          style={styles.maybeLaterButton}
          onPress={handleMaybeLater}
        >
          <Text style={styles.maybeLaterText}>Maybe later</Text>
        </TouchableOpacity>
      </View>

      {/* iOS-style Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleModalDontAllow}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Do you want to allow "Couri"{'\n'} to access your location while using the app?
            </Text>
            <Text style={styles.modalSubtitle}>
              Enabling location access enhances the pickup & delivery experience.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalDontAllowButton}
                onPress={handleModalDontAllow}
              >
                <Text style={styles.modalDontAllowText}>Don't Allow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOKButton}
                onPress={handleModalOK}
              >
                <Text style={styles.modalOKText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  logoImage: {
    width: 105,
    height: 30,
    marginBottom: 20,
  },
  contentWrapper: {
    marginTop: 140,
    alignItems: 'center',
    width: '100%',
  },
  locationIconContainer: {
    width: 90,
    height: 90,
    backgroundColor: '#E8E9FF', // Light blue background like in the image
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#5D72FB', // Thin gray border around the circle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -37,
  },
  locationIcon: {
    width: 50,
    height: 60,
    tintColor: '#5D72FB', // Blue color for location icon
  },
  title: {
    fontSize: 36,
    fontWeight: 'normal',
    marginBottom: 18,
    marginTop: 10,
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Area Normal Trial',
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#000',
    marginBottom: 60,
    marginTop: -1,
    lineHeight: 20,
    paddingHorizontal: 15,
    fontFamily: 'Area Normal'
  },
  allowButton: {
    backgroundColor: '#242422',
    paddingVertical: 16,
    paddingHorizontal: 34,
    borderRadius: 30,
    marginBottom: 20,
    width: '110%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  allowButtonText: {
    color: '#fff',
    fontWeight: '450',
    fontSize: 17,
    fontFamily: 'Area Normal'
  },
  maybeLaterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  maybeLaterText: {
    color: '#000',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 270,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
    fontFamily: 'SF Pro Text'
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 20,
    fontweight: '400'
  },
  modalButtons: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
  },
  modalDontAllowButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#C6C6C8',
  },
  modalDontAllowText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalOKButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOKText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});
