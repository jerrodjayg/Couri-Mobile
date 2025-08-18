// screens/Transactions.js
import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function Transactions({ navigation }) {
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
        <Text style={styles.headerTitle}>TRANSACTIONS</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Thin divider under header */}
      <View style={styles.topDivider} />

      {/* Month label (you can change or remove) */}
      <View style={styles.sectionHeaderWrap}>
        <Text style={styles.sectionHeaderText}>Start a new Transaction</Text>
      </View>

      {/* Single blank slot (placeholder row) */}
      <View style={styles.cardRow}>
        {/* Left thumbnail placeholder */}
        <View style={styles.thumbPlaceholder} />

        {/* Placeholder lines for title/subtitle */}
        <View style={styles.textCol}>
          <View style={styles.titleBar} />
          <View style={styles.subtitleBar} />
        </View>

        {/* Right chevron to keep the look consistent */}
        <Icon name="chevron-forward" size={18} color="#000" />
      </View>

      {/* Divider under the row like in the mock */}
      <View style={styles.bottomDivider} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  topDivider: { height: 1, backgroundColor: '#e6e6e6' },

  /* Section label */
  sectionHeaderWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A6A6A',
  },

  /* Row (blank slot) */
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  textCol: { flex: 1 },
  titleBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#eee',
    marginBottom: 8,
    width: '80%',
  },
  subtitleBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    width: '45%',
  },

  bottomDivider: { height: 1, backgroundColor: '#e6e6e6', marginLeft: 16 },
});
