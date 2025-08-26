import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';

export default function UpdatePasswordScreen({ navigation }) {
  const [current, setCurrent] = useState('');
  const [nextPwd, setNextPwd] = useState('');
  const [confirm, setConfirm] = useState('');

  const canSubmit =
    current.length > 0 &&
    nextPwd.length > 0 &&
    confirm.length > 0 &&
    nextPwd === confirm;

  const onSubmit = () => {
    if (!canSubmit) return;
    console.log('Update password tapped', { current, nextPwd, confirm });
    // TODO: Add password update logic
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header (same format as CreatePassword) */}
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()}>
              <Image 
                source={require('../assets/backarrow.png')} 
                style={styles.backArrowImage}
              />
            </Pressable>
            <Text style={styles.headerTitle}>UPDATE PASSWORD</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Current Password (position unchanged) */}
          <View style={[styles.inputWrapper, styles.gapLarge]}>
            <TextInput
              secureTextEntry
              style={[styles.input, styles.placeholderText]}
              value={current}
              onChangeText={setCurrent}
              placeholder="Current Password"
              placeholderTextColor="#000"
            />
          </View>

          {/* New Password (same increased gap as above for equal spacing) */}
          <View style={[styles.inputWrapper, styles.gapLarge]}>
            <TextInput
              secureTextEntry
              style={[styles.input, styles.placeholderText]}
              value={nextPwd}
              onChangeText={setNextPwd}
              placeholder="New Password"
              placeholderTextColor="#000"
            />
          </View>

          {/* Confirm New Password (follows the same spacing rhythm) */}
          <View style={styles.inputWrapper}>
            <TextInput
              secureTextEntry
              style={[styles.input, styles.placeholderText]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirm New Password"
              placeholderTextColor="#000"
            />
          </View>

          {/* Button nudged down a tiny bit to follow the new spacing */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: canSubmit ? '#000' : '#fff',
                borderWidth: 1,
                borderColor: '#000',
              },
            ]}
            disabled={!canSubmit}
            onPress={onSubmit}
          >
            <Text
              style={[
                styles.continueText,
                { color: canSubmit ? '#fff' : '#000' },
              ]}
            >
              Update Password
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // scaffolding
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff' },

  // header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 66,
  },
  backArrowImage: { width: 36, height: 36, resizeMode: 'contain' },
  headerTitle: { fontSize: 16, color: '#000', fontWeight: '600' },

  // inputs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16, // base gap
  },
  // increased, equal spacing between rows (Current→New, New→Confirm)
  gapLarge: {
    marginBottom: 28, // larger than base; both rows use same value => equidistant
  },
  input: { flex: 1, height: 40 },
  placeholderText: { fontSize: 18, fontWeight: '200', color: '#000' },

  // button, nudged slightly down to follow the pushed content
  continueButton: {
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 36, // was ~32; tiny nudge down
  },
  continueText: { fontWeight: '400', fontSize: 18 },
});
