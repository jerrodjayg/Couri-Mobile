// utils/userService.js
import { supabase } from '../screens/supabaseClient';
import * as FileSystem from 'expo-file-system';
import { decode as b64decode } from 'base-64';

/** Convert a local file URI → uploadable payload (Blob on iOS, Base64→bytes fallback esp. for Android). */
async function uriToUploadPayload(fileUri) {
  // Try fetch → Blob first (works well on iOS; sometimes on Android too)
  try {
    const res = await fetch(fileUri);
    const blob = await res.blob();
    if (blob && typeof blob.size === 'number' && blob.size > 0) {
      console.log('📦 upload payload via blob size:', blob.size);
      return { data: blob, size: blob.size, contentType: blob.type || 'image/jpeg' };
    }
  } catch (e) {
    // swallow and try Base64
  }

  // Fallback: Base64 → Uint8Array (reliable on Android/Expo)
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
    if (!base64 || base64.length < 8) {
      console.log('⚠️ Base64 read returned too little data');
      return { data: null, size: 0, contentType: 'image/jpeg' };
    }
    const binary = b64decode(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    console.log('📦 upload payload via base64 bytes size:', bytes.length);
    return { data: bytes, size: bytes.length, contentType: 'image/jpeg' };
  } catch (e) {
    console.log('❌ Base64 fallback failed:', e?.message || String(e));
    return { data: null, size: 0, contentType: 'image/jpeg' };
  }
}

function inferExt(contentType, fileUri) {
  if (contentType?.includes('jpeg')) return 'jpg';
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('heic')) return 'heic';
  if (contentType?.includes('webp')) return 'webp';
  // fallback to URI suffix
  const raw = (fileUri.split('.').pop() || '').split('?')[0].toLowerCase();
  if (['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(raw)) return raw === 'jpeg' ? 'jpg' : raw;
  return 'jpg';
}

/**
 * UserService — email-first user persistence
 */
export class UserService {
  // Test database connection
  static async testDatabaseConnection() {
    try {
      console.log('🔍 testDatabaseConnection: Testing database connection...');
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      if (error) {
        console.log('❌ testDatabaseConnection failed:', error);
        return { success: false, error, queryTime };
      }
      
      console.log(`✅ testDatabaseConnection: Success in ${queryTime}ms`);
      return { success: true, queryTime };
    } catch (e) {
      console.log('❌ testDatabaseConnection fatal:', e);
      return { success: false, error: e };
    }
  }

  static async checkUserExists(email) {
    try {
      if (!email) {
        console.log('🔍 checkUserExists: No email provided');
        return { exists: false, user: null };
      }
      
      console.log('🔍 checkUserExists: Starting database query for email:', email);
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar_url, password_hash')
        .ilike('email', email.toLowerCase())
        .maybeSingle();
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      console.log(`🔍 checkUserExists: Database query completed in ${queryTime}ms`);
      console.log('🔍 checkUserExists: Database response - data:', data, 'error:', error);
      
      if (error && error.code !== 'PGRST116') {
        console.log('🔍 checkUserExists error:', error);
      }
      
      const result = { exists: !!data, user: data || null };
      console.log('🔍 checkUserExists: Final result:', result);
      return result;
    } catch (e) {
      console.log('🔍 checkUserExists fatal:', e);
      return { exists: false, user: null };
    }
  }

  static async saveUser(userData) {
    if (!userData?.email) throw new Error('Email is required to save user');

    const payload = {
      email: userData.email.toLowerCase(),
      first_name: userData.firstName ?? userData.first_name ?? '',
      last_name: userData.lastName ?? userData.last_name ?? '',
      phone: userData.phone ?? '',
      address_line_1: userData.address1 ?? userData.address_line_1 ?? '',
      address_line_2: userData.address2 ?? userData.address_line_2 ?? null,
      city: userData.city ?? '',
      state: userData.state ?? '',
      zip_code: userData.zip ?? userData.zip_code ?? '',
      avatar_url: userData.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'email' })
      .select()
      .maybeSingle();

    if (error) {
      console.log('saveUser upsert error:', error);
      return { success: false, error };
    }
    return { success: true, user: data };
  }

  static async saveGoogleAuthUser(googleUser, additionalData = {}) {
    try {
      console.log('🔍 saveGoogleAuthUser: Starting with user:', googleUser.email);
      
      // Filter out camelCase fields that don't match database schema
      const { firstName, lastName, ...filteredAdditionalData } = additionalData;
      
      // Prepare the payload
      const payload = {
        email: googleUser.email || '',
        first_name: (firstName || additionalData.firstName || googleUser.user_metadata?.first_name || googleUser.user_metadata?.name?.split(' ')[0] || '').toString(),
        last_name: (lastName || additionalData.lastName || googleUser.user_metadata?.last_name || googleUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '').toString(),
        phone: (additionalData.phone || googleUser.phone || '').toString(), // Ensure phone is never null
        address_line_1: (additionalData.address1 || additionalData.address_line_1 || '').toString(), // Ensure address fields are never null
        address_line_2: (additionalData.address2 || additionalData.address_line_2 || '').toString(), // Ensure address fields are never null
        city: (additionalData.city || '').toString(), // Ensure city is never null
        state: (additionalData.state || '').toString(), // Ensure state is never null
        zip_code: (additionalData.zip || additionalData.zip_code || '').toString(), // Ensure zip is never null
        avatar_url: googleUser.user_metadata?.avatar_url || googleUser.user_metadata?.picture || null, // Use null if no avatar
        auth_user_id: googleUser.id || null, // Use null instead of empty string for UUID field
        created_at: new Date().toISOString(), // Ensure created_at is set for new users
        updated_at: new Date().toISOString()
      };

      console.log('🔍 saveGoogleAuthUser: Prepared payload:', payload);
      console.log('🔍 saveGoogleAuthUser: Payload details:');
      console.log('  - email:', payload.email);
      console.log('  - first_name:', payload.first_name, '(type:', typeof payload.first_name, ')');
      console.log('  - last_name:', payload.last_name, '(type:', typeof payload.last_name, ')');
      console.log('  - phone:', payload.phone, '(type:', typeof payload.phone, ')');
      console.log('  - address_line_1:', payload.address_line_1, '(type:', typeof payload.address_line_1, ')');
      console.log('  - address_line_2:', payload.address_line_2, '(type:', typeof payload.address_line_2, ')');
      console.log('  - city:', payload.city, '(type:', typeof payload.city, ')');
      console.log('  - state:', payload.state, '(type:', typeof payload.state, ')');
      console.log('  - zip_code:', payload.zip_code, '(type:', typeof payload.zip_code, ')');
      console.log('  - avatar_url:', payload.avatar_url, '(type:', typeof payload.avatar_url, ')');
      console.log('  - auth_user_id:', payload.auth_user_id, '(type:', typeof payload.auth_user_id, ')');
      console.log('  - created_at:', payload.created_at, '(type:', typeof payload.created_at, ')');
      console.log('  - updated_at:', payload.updated_at, '(type:', typeof payload.updated_at, ')');

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .eq('email', payload.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ saveGoogleAuthUser: Error checking existing user:', checkError);
        throw checkError;
      }

      if (existingUser) {
        console.log('🔍 saveGoogleAuthUser: User exists, updating profile...');
        // Update existing user with only non-conflicting fields
        const updatePayload = {
          updated_at: payload.updated_at,
          auth_user_id: payload.auth_user_id, // Update the auth_user_id
        };
        
        // Only update avatar if it's different and not empty
        if (payload.avatar_url && payload.avatar_url !== existingUser.avatar_url) {
          updatePayload.avatar_url = payload.avatar_url;
        }
        
        // Only update names if they're different and not empty
        if (payload.first_name && payload.first_name !== existingUser.first_name) {
          updatePayload.first_name = payload.first_name;
        }
        if (payload.last_name && payload.last_name !== existingUser.last_name) {
          updatePayload.last_name = payload.last_name;
        }
        
        console.log('🔍 saveGoogleAuthUser: Update payload:', updatePayload);
        
        const { data, error } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('email', payload.email)
          .select()
          .single();

        if (error) {
          console.error('❌ saveGoogleAuthUser: Update error:', error);
          throw error;
        }

        console.log('✅ saveGoogleAuthUser: User updated successfully:', data);
        return { success: true, user: data, isUpdate: true };
      } else {
        console.log('🔍 saveGoogleAuthUser: User not found, creating new user...');
        // Insert new user
        const { data, error } = await supabase
          .from('users')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('❌ saveGoogleAuthUser: Insert error:', error);
          throw error;
        }

        console.log('✅ saveGoogleAuthUser: New user created successfully:', data);
        return { success: true, user: data, isUpdate: false };
      }
    } catch (error) {
      console.error('❌ saveGoogleAuthUser: Fatal error:', error);
      throw error;
    }
  }

  // New function specifically for handling existing Google users
  static async handleExistingGoogleUser(googleUser, existingUser) {
    try {
      console.log('🔍 handleExistingGoogleUser: Handling existing user for Google sign-in:', existingUser.email);
      
      // Only update non-conflicting fields
      const updatePayload = {
        updated_at: new Date().toISOString(),
        auth_user_id: googleUser.id || null, // Link the Google auth ID
      };
      
      // Only update avatar if it's different and not empty
      if (googleUser.user_metadata?.avatar_url && 
          googleUser.user_metadata.avatar_url !== existingUser.avatar_url) {
        updatePayload.avatar_url = googleUser.user_metadata.avatar_url;
      }
      
      // Only update names if they're different and not empty
      if (googleUser.user_metadata?.name && 
          googleUser.user_metadata.name !== existingUser.first_name) {
        updatePayload.first_name = googleUser.user_metadata.name;
      }
      
      console.log('🔍 handleExistingGoogleUser: Update payload:', updatePayload);
      
      // Only update if we have changes
      if (Object.keys(updatePayload).length > 1) { // More than just updated_at
        const { data, error } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('email', existingUser.email)
          .select()
          .single();

        if (error) {
          console.error('❌ handleExistingGoogleUser: Update error:', error);
          // Don't throw - just return existing user data
          return { success: true, user: existingUser, isUpdate: false };
        }

        console.log('✅ handleExistingGoogleUser: User updated successfully:', data);
        return { success: true, user: data, isUpdate: true };
      } else {
        console.log('🔍 handleExistingGoogleUser: No updates needed, returning existing user');
        return { success: true, user: existingUser, isUpdate: false };
      }
    } catch (error) {
      console.error('❌ handleExistingGoogleUser: Fatal error:', error);
      // Don't throw - just return existing user data
      return { success: true, user: existingUser, isUpdate: false };
    }
  }

  static async updateUserProfile(userEmail, profileData) {
    if (!userEmail) throw new Error('Email is required to update user profile');
    const patch = { ...profileData, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .ilike('email', userEmail.toLowerCase())
      .select()
      .maybeSingle();

    if (error) {
      console.log('updateUserProfile error:', error);
      return { success: false, error };
    }
    return { success: true, user: data };
  }

  static async getUserByEmail(email) {
    if (!email) return { user: null };
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.toLowerCase())
      .maybeSingle();
    if (error && error.code !== 'PGRST116') console.log('getUserByEmail error:', error);
    return { user: data || null };
  }

  /**
   * Upload an avatar image then persist URL + path to users.{avatar_url, avatar_path}
   */
  static async uploadAvatarAndSave(email, fileUri) {
    try {
      if (!email || !fileUri) return { success: false, reason: 'missing-input' };

      const emailLower = email.toLowerCase();
      // Replace anything not [a-z0-9._-] with underscore so paths are URL-safe and stable
      const safeDir = emailLower.replace(/[^a-z0-9._-]/g, '_');

      // Convert URI → bytes/blob
      const payload = await uriToUploadPayload(fileUri);
      if (!payload || payload.size === 0 || !payload.data) {
        console.log('❌ Empty payload from uriToUploadPayload');
        return { success: false, reason: 'empty-file' };
      }

      const ext = inferExt(payload.contentType, fileUri);
      const fileName = `${Date.now()}.${ext}`;
      const storagePath = `${safeDir}/${fileName}`;

      console.log('🆙 Uploading bytes:', payload.size, 'contentType:', payload.contentType, '→', storagePath);

      // Upload (upsert true is fine; timestamped filenames avoid collisions)
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(storagePath, payload.data, { upsert: true, contentType: payload.contentType || 'image/jpeg' });

      if (uploadErr) {
        console.log('uploadAvatarAndSave upload error:', uploadErr);
        return { success: false, error: uploadErr };
      }

      // Get public URL
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(storagePath);
      const publicUrl = pub?.publicUrl ?? null;
      console.log('✅ Storage public URL:', publicUrl, 'path:', storagePath);

      // Persist BOTH url + path on users
      const upd = await this.updateUserProfile(emailLower, { avatar_url: publicUrl, avatar_path: storagePath });
      console.log('📝 updateUserProfile result:', upd);
      if (!upd.success) return { success: false, error: upd.error };

      return { success: true, user: upd.user, url: publicUrl, path: storagePath };
    } catch (e) {
      console.log('uploadAvatarAndSave fatal:', e);
      return { success: false, error: e };
    }
  }
}
