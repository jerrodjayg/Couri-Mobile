import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../screens/supabaseClient';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Function to set user from custom auth
  const setCustomUser = (userData) => {
    console.log('setCustomUser called with:', userData);
    setUser(userData);
    console.log('User state updated in context');
  };

  useEffect(() => {
    // Try to get initial session from Supabase auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, setCustomUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}