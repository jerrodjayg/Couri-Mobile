import { supabase } from './supabaseClient';
import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();

    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        if (data?.session) {
          navigation.replace('Welcomepage'); // user is already signed in
        } else {
          navigation.replace('Home'); // go to landing page
        }
      });
    }, 2000);
  };

  checkSession();
}, [fadeAnim]);


  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../assets/Logo_Dark.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 100,
    marginBottom: 60,
  },
});