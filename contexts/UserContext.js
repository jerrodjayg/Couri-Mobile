import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../screens/supabaseClient';

const UserContext = createContext();

export function UserProvider({ children }) {
 const [user, setUser] = useState(null);
 const [customUser, setCustomUser] = useState(null);
 const [loading, setLoading] = useState(true);
 
 console.log('🔍 UserProvider initializing with setCustomUser:', typeof setCustomUser);

 // Ensure setCustomUser is properly initialized
 useEffect(() => {
   console.log('🔍 UserProvider useEffect - setCustomUser type:', typeof setCustomUser);
   console.log('🔍 UserProvider useEffect - setCustomUser value:', setCustomUser);
 }, [setCustomUser]);

 useEffect(() => {
 // Get initial session
 supabase.auth.getSession().then(({ data: { session } }) => {
   console.log('🔍 UserProvider - Initial session:', session?.user?.id);
   setUser(session?.user ?? null);
   setLoading(false);
 });

 // Listen for auth changes
 const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
   console.log('🔄 Auth state changed:', _event, session?.user?.id);
   setUser(session?.user ?? null);
   setLoading(false);
 });

 return () => subscription.unsubscribe();
 }, []);

 // Create a stable reference to setCustomUser
 const setCustomUserStable = React.useCallback((userData) => {
   console.log('🔍 setCustomUserStable called with:', userData?.id);
   setCustomUser(userData);
 }, []);

 const contextValue = { 
   user, 
   customUser, 
   setCustomUser: setCustomUserStable, 
   loading 
 };
 
 console.log('🔍 UserProvider context value:', {
   user: contextValue.user?.id,
   customUser: contextValue.customUser?.id,
   setCustomUser: typeof contextValue.setCustomUser,
   loading: contextValue.loading
 });

 return (
 <UserContext.Provider value={contextValue}>
 {children}
 </UserContext.Provider>
 );
}

export const useUser = () => {
 const context = useContext(UserContext);
 if (context === undefined) {
 throw new Error('useUser must be used within a UserProvider');
 }
 
 // Debug logging to help troubleshoot
 console.log('🔍 useUser context values:', {
   user: context.user?.id,
   customUser: context.customUser?.id,
   setCustomUser: typeof context.setCustomUser,
   loading: context.loading
 });
 
 return context;
};