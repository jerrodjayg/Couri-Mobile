import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import CreateAccountScreen from './screens/CreateAccountScreen';
import LogInScreen from './screens/LogInScreen';
import Welcomepage from './screens/Welcomepage'; // ✅ Ensure this matches the actual file and default export

const Stack = createNativeStackNavigator();

export default function App() {
  const [ session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: listener } = supabase.auth.onAuthStateChange((_, sess) => setSession(sess))
    return () => listener.subscription.unsubscribe()
  }, [])
  
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
        <Stack.Screen name="Login" component={LogInScreen} />
        <Stack.Screen name="Welcomepage" component={Welcomepage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
  