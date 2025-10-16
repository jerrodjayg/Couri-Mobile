// screens/Transactions.js
import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getTransactionsByMonth, cleanupUntitledTransactions } from '../utils/transactionService';

export default function Transactions({ navigation }) {
  const [transactionsByMonth, setTransactionsByMonth] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Clean up any untitled transactions first
      const removedCount = await cleanupUntitledTransactions();
      if (removedCount > 0) {
        console.log(`🧹 Removed ${removedCount} untitled transactions`);
      }
      
      const transactions = await getTransactionsByMonth();
      setTransactionsByMonth(transactions);
      console.log('📱 Loaded transactions:', transactions);
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionPress = (transaction) => {
    // Navigate to transaction details screen
    navigation.navigate('TransactionDetails', { transaction });
  };

  const renderTransactionRow = (transaction) => (
    <TouchableOpacity
      key={transaction.id}
      style={styles.cardRow}
      onPress={() => handleTransactionPress(transaction)}
    >
      {/* Product Image */}
      <View style={styles.thumbnailContainer}>
        {transaction.productImage ? (
          <Image source={{ uri: transaction.productImage }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbPlaceholder} />
        )}
      </View>

      {/* Transaction Details */}
      <View style={styles.textCol}>
        <Text style={styles.transactionTitle} numberOfLines={2}>
          {transaction.productTitle || 'Untitled Product'}
        </Text>
        <Text style={styles.transactionSubtitle} numberOfLines={1}>
          {transaction.userProfile?.full_name || transaction.userProfile?.name || 'Unknown User'}
        </Text>
        
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {transaction.status || 'Buyer inspecting the product'}
          </Text>
        </View>
      </View>

      {/* Right chevron */}
      <Icon name="chevron-forward" size={18} color="#000" />
    </TouchableOpacity>
  );

  const renderMonthSection = (month, transactions) => (
    <View key={month}>
      {/* Month Header */}
      <View style={styles.sectionHeaderWrap}>
        <Text style={styles.sectionHeaderText}>{month}</Text>
      </View>

      {/* Transactions for this month */}
      {transactions.map(renderTransactionRow)}

      {/* Divider */}
      <View style={styles.bottomDivider} />
    </View>
  );

  const hasTransactions = Object.keys(transactionsByMonth).length > 0;

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : hasTransactions ? (
          Object.entries(transactionsByMonth).map(([month, transactions]) =>
            renderMonthSection(month, transactions)
          )
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete a transaction to see it here
            </Text>
          </View>
        )}
      </ScrollView>
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

  /* ScrollView */
  scrollView: { flex: 1 },

  /* Section label */
  sectionHeaderWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },

  /* Transaction Row */
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  
  /* Thumbnail */
  thumbnailContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  
  /* Text Content */
  textCol: { 
    flex: 1,
    paddingRight: 8,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
    lineHeight: 20,
  },
  transactionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  
  /* Status Badge */
  statusContainer: {
    backgroundColor: '#FCE7F3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#BE185D',
    fontWeight: '500',
  },

  /* Loading and Empty States */
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  bottomDivider: { height: 1, backgroundColor: '#e6e6e6', marginLeft: 16 },
});
