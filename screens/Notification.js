// screens/Notification.js
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

export default function Notification({ navigation }) {
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

  const [pushEnabled, setPushEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const onInfoPress = () => {
    Alert.alert(
      'Text messages',
      'Standard message and data rates may apply. You can opt out anytime.'
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Row 1 */}
        <View style={styles.row}>
          <Text style={styles.label}>Allow push notifications</Text>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} />
        </View>

        <View style={styles.divider} />

        {/* Row 2 */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.label}>Allow text messages</Text>
            <TouchableOpacity onPress={onInfoPress} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Icon name="information-circle-outline" size={18} color="#9AA0A6" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
          <Switch value={smsEnabled} onValueChange={setSmsEnabled} />
        </View>

        <View style={styles.divider} />

        {/* Row 3 */}
        <View style={styles.row}>
          <Text style={styles.label}>Allow emails</Text>
          <Switch value={emailEnabled} onValueChange={setEmailEnabled} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#000' },

  card: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9D9D1',
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', maxWidth: '75%' },

  label: { fontSize: 15, color: '#000' },

  divider: { height: 1, backgroundColor: '#EEEEEE', marginHorizontal: 0 },
});
