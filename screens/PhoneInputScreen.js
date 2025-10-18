import { supabase } from './supabaseClient';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function PhoneInputScreen({ navigation }) {
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

  const [phone, setPhone] = useState('');

  const handleSendCode = async () => {
    // Validate phone number - must be exactly 10 digits
    const cleanedPhone = phone.replace(/\D/g, ''); // Remove all non-digits
    
    if (cleanedPhone.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    const fullPhone = `+1${cleanedPhone}`;

    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });

    if (error) {
      Alert.alert('Error', `Failed to send verification code: ${error.message}`);
      return;
    }

    Alert.alert('Success', 'Verification code sent successfully!');
    navigation.navigate('CodeVerify', { phone: fullPhone });
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your phone number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={10}
        placeholder="e.g. 8043171234"
        style={styles.input}
      />
      <TouchableOpacity style={styles.button} onPress={handleSendCode}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    color: '#000',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 20,
    fontSize: 16,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
});