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
  static async checkUserExists(email) {
    try {
      if (!email) {
        console.log('🔍 checkUserExists: No email provided');
        return { exists: false, user: null };
      }
      
      console.log('🔍 checkUserExists: Checking for email:', email);
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar_url')
        .ilike('email', email.toLowerCase())
        .maybeSingle();
      
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
