/**
 * Only sync user data to Supabase when running in a production build (TestFlight, standalone).
 * In Expo Go we skip writing to the users table so dev data doesn't pollute production.
 *
 * TestFlight / EAS Build (internal or store) uses appOwnership 'standalone', so sync runs.
 * Expo Go uses appOwnership 'expo', so we skip. Undefined is treated as "sync" for safety in custom builds.
 */
import Constants from 'expo-constants';

/**
 * @returns {boolean} true if we should write/update user data in Supabase (TestFlight/standalone).
 *                   false when running in Expo Go.
 */
export function shouldSyncUserToSupabase() {
  const ownership = Constants.appOwnership ?? null;
  // Explicitly sync for standalone (TestFlight/store builds); skip only for Expo Go
  if (ownership === 'expo') return false;
  return true;
}
