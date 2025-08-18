import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from './supabaseClient';

export default function ConfirmInfoScreen({ route, navigation }) {
  const { form } = route.params;

  const handleConfirm = async () => {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (signUpError) {
        console.error(signUpError);
        alert('Account creation failed: ' + signUpError.message);
        return;
      }

      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: data.user.id,
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          address_line_1: form.address1,
          address_line_2: form.address2,
          city: form.city,
          state: form.state,
          zip_code: form.zip,
        },
      ]);

      if (profileError) {
        console.error(profileError);
        alert('Profile saving failed: ' + profileError.message);
        return;
      }

      navigation.navigate('Home');
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Confirm Your Information</Text>

      {Object.entries(form).map(([key, value]) => (
        <View key={key} style={styles.infoRow}>
          <Text style={styles.label}>{key.replace(/([A-Z])/g, ' $1')}:</Text>
          <Text style={styles.value}>{value || '-'}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={handleConfirm}>
        <Text style={styles.buttonText}>Confirm & Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.editText}>Go back and edit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  value: {
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  editText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#000',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
});