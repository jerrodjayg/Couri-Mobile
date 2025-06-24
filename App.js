import React, { useState, useEffect } from 'react';
import {View, Text, ActivityIndicator, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './lib/supabase';
import 'react-native-url-polyfill/auto';

import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import CreateAccountScreen from './screens/CreateAccountScreen';
import LogInScreen from './screens/LogInScreen';
import Welcomepage from './screens/Welcomepage'; // ✅ Make sure file name and default export are correct

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current session + listen for auth changes
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ 
        headerBackImage: () => (
          <Image
          source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons//back-icon.png' }}
          style={{ width: 24, height: 24 }} 
        />
        ),
        headerBackTitleVisible: false,
      }}
      >
        {/* SplashScreen is only shown briefly on launch */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        {/* Conditional navigation based on Supabase session */}
        {session ? (
          <>
            <Stack.Screen name="Welcomepage" component={Welcomepage} />
            <Stack.Screen name="Home" component={HomeScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
            <Stack.Screen name="Login" component={LogInScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
