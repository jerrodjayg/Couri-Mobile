import AsyncStorage from '@react-native-async-storage/async-storage';

const TRANSACTIONS_KEY = 'savedTransactions';

// Generate unique transaction ID
const generateTransactionId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Save transaction to AsyncStorage
export const saveTransaction = async (transactionData) => {
  try {
    console.log('💾 Saving transaction:', transactionData);
    
    // Get existing transactions
    const existingTransactions = await getTransactions();
    
    // Create new transaction object
    const newTransaction = {
      id: generateTransactionId(),
      ...transactionData,
      createdAt: new Date().toISOString(),
      status: 'Buyer inspecting the product', // Default status
      month: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    };
    
    // Add to beginning of array (most recent first)
    const updatedTransactions = [newTransaction, ...existingTransactions];
    
    // Save back to AsyncStorage
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
    
    console.log('✅ Transaction saved successfully:', newTransaction.id);
    return newTransaction;
  } catch (error) {
    console.error('❌ Error saving transaction:', error);
    throw error;
  }
};

// Get all transactions from AsyncStorage
export const getTransactions = async () => {
  try {
    const transactionsJson = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    if (transactionsJson) {
      const transactions = JSON.parse(transactionsJson);
      console.log('📱 Retrieved transactions:', transactions.length);
      return transactions;
    }
    return [];
  } catch (error) {
    console.error('❌ Error getting transactions:', error);
    return [];
  }
};

// Get transactions grouped by month
export const getTransactionsByMonth = async () => {
  try {
    const transactions = await getTransactions();
    
    // Filter out transactions with "Untitled Product" or empty titles
    const validTransactions = transactions.filter(transaction => {
      const title = transaction.productTitle || transaction.title || '';
      return title.trim().length > 0 && title !== 'Untitled Product' && title !== 'Untitled Item';
    });
    
    const grouped = {};
    
    validTransactions.forEach(transaction => {
      const month = transaction.month || new Date(transaction.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(transaction);
    });
    
    console.log('📅 Transactions grouped by month:', Object.keys(grouped));
    console.log('📊 Filtered out', transactions.length - validTransactions.length, 'untitled transactions');
    return grouped;
  } catch (error) {
    console.error('❌ Error grouping transactions by month:', error);
    return {};
  }
};

// Update transaction status
export const updateTransactionStatus = async (transactionId, newStatus) => {
  try {
    const transactions = await getTransactions();
    const updatedTransactions = transactions.map(transaction => {
      if (transaction.id === transactionId) {
        return { ...transaction, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return transaction;
    });
    
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
    console.log('✅ Transaction status updated:', transactionId, 'to', newStatus);
    return true;
  } catch (error) {
    console.error('❌ Error updating transaction status:', error);
    return false;
  }
};

// Delete transaction
export const deleteTransaction = async (transactionId) => {
  try {
    const transactions = await getTransactions();
    const filteredTransactions = transactions.filter(transaction => transaction.id !== transactionId);
    
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(filteredTransactions));
    console.log('✅ Transaction deleted:', transactionId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    return false;
  }
};

// Clean up untitled transactions
export const cleanupUntitledTransactions = async () => {
  try {
    const transactions = await getTransactions();
    
    // Filter out transactions with "Untitled Product" or empty titles
    const validTransactions = transactions.filter(transaction => {
      const title = transaction.productTitle || transaction.title || '';
      return title.trim().length > 0 && title !== 'Untitled Product' && title !== 'Untitled Item';
    });
    
    const removedCount = transactions.length - validTransactions.length;
    
    if (removedCount > 0) {
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(validTransactions));
      console.log(`✅ Cleaned up ${removedCount} untitled transactions`);
    } else {
      console.log('✅ No untitled transactions to clean up');
    }
    
    return removedCount;
  } catch (error) {
    console.error('❌ Error cleaning up untitled transactions:', error);
    return 0;
  }
};
