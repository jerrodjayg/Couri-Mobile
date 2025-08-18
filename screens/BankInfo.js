// screens/BankInfo.js
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function BankInfo({ navigation }) {
  const [banks, setBanks] = useState([]);

  const onRowPress = (bank) => {
    Alert.alert('Bank', `${bank.name} ••••${bank.last4}`);
  };

  const addNewBank = () => {
    Alert.alert('Add a new bank', 'Hook this up to your Plaid/Link flow.');
  };

  const renderBank = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => onRowPress(item)} activeOpacity={0.7}>
      <View style={styles.logo} />
      <View style={styles.rowTextWrap}>
        <View style={styles.nameLine}>
          <Text style={styles.bankName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <Text style={styles.bankMasked}>••••{item.last4}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color="#000" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BANKS & CARDS</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Divider under header */}
      <View style={styles.topDivider} />

      {/* Banks list */}
      <FlatList
        data={banks}
        keyExtractor={(item) => item.id}
        renderItem={renderBank}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          <>
            {/* Removed top separator here */}
            <TouchableOpacity style={styles.addRow} onPress={addNewBank} activeOpacity={0.7}>
              <Text style={styles.addText}>Add a new bank</Text>
              <Text style={styles.addPlus}>+</Text>
            </TouchableOpacity>
            <View style={styles.bottomDivider} />
          </>
        }
        contentContainerStyle={{ backgroundColor: '#fff' }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  topDivider: {
    height: 1,
    backgroundColor: '#e6e6e6',
  },

  /* List row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#ddd',
  },
  rowTextWrap: {
    flex: 1,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankName: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  bankMasked: {
    color: '#000',
    fontSize: 13,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 16,
  },

  /* Add a new bank row */
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 26, // bigger box
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  addText: {
    color: '#000',
    fontSize: 18, // bigger font
    fontWeight: '500',
  },
  addPlus: {
    color: '#000',
    fontSize: 24, // bigger plus
    fontWeight: '600',
  },

  bottomDivider: {
    height: 1,
    backgroundColor: '#e6e6e6',
  },
});
