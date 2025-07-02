// PhoneInputScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { auth } from '../firebase';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

export default function PhoneInputScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

  const handleSendCode = async () => {
    if (phone.length !== 10) {
      Alert.alert('Error', 'Please enter a 10-digit phone number');
      return;
    }

    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        `+1${phone}`,
        recaptchaVerifier
      );

      navigation.navigate('CodeVerify', {
        verificationId,
        phone,
      });
    } catch (error) {
      Alert.alert('Verification Failed', error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <FirebaseRecaptchaVerifierModal
        ref={ref => setRecaptchaVerifier(ref)}
        firebaseConfig={auth.app.options}
      />
      <Text>Enter your phone number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={10}
        placeholder="e.g. 8043171234"
        style={{ borderBottomWidth: 1, marginBottom: 20 }}
      />
      <TouchableOpacity onPress={handleSendCode}>
        <Text>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}
