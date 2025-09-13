import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function TransactionDetails({ navigation, route }) {
  const { transaction } = route.params || {};
  const [returnEligible, setReturnEligible] = useState(true);
  const [returnDeadline, setReturnDeadline] = useState('');

  useEffect(() => {
    // Calculate return deadline (7 days from transaction date)
    if (transaction?.createdAt) {
      const transactionDate = new Date(transaction.createdAt);
      const returnDate = new Date(transactionDate.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      const options = { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      };
      
      const formattedDate = returnDate.toLocaleDateString('en-US', options);
      setReturnDeadline(formattedDate);
    }
  }, [transaction]);

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    // Remove any existing $ and add it back consistently
    const cleanPrice = price.replace(/^\$/, '');
    return `$${cleanPrice}`;
  };

  const getProductSource = () => {
    if (transaction?.productUrl?.includes('facebook.com')) {
      return 'Facebook Marketplace';
    }
    return 'Online Marketplace';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Buyer inspecting the product':
        return { bg: '#FCE7F3', text: '#BE185D' };
      case 'In transit':
        return { bg: '#EFF6FF', text: '#2563EB' };
      case 'Delivered':
        return { bg: '#ECFDF5', text: '#059669' };
      case 'Completed':
        return { bg: '#F3F4F6', text: '#6B7280' };
      default:
        return { bg: '#FCE7F3', text: '#BE185D' };
    }
  };

  if (!transaction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Transaction not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = getStatusColor(transaction.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TRANSACTION DETAILS</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Return Eligibility Banner */}
        {returnEligible && returnDeadline && (
          <View style={styles.returnBanner}>
            <Text style={styles.returnText}>
              Return eligible until {returnDeadline}
            </Text>
          </View>
        )}

        {/* Product Information Card */}
        <View style={styles.productCard}>
          <View style={styles.productInfo}>
            {/* Product Image */}
            <View style={styles.imageContainer}>
              {transaction.productImage ? (
                <Image 
                  source={{ uri: transaction.productImage }} 
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Icon name="image-outline" size={40} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Product Details */}
            <View style={styles.productDetails}>
              <Text style={styles.productTitle} numberOfLines={2}>
                "{transaction.productTitle || 'Product Name'}"
              </Text>
              
              {/* Source */}
              <View style={styles.sourceContainer}>
                <View style={styles.facebookIcon}>
                  <Icon name="logo-facebook" size={16} color="#1877F2" />
                </View>
                <Text style={styles.sourceText}>
                  from {getProductSource()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Product Price Card */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>PRODUCT PRICE</Text>
          <Text style={styles.priceValue}>
            {formatPrice(transaction.productPrice)}
          </Text>
        </View>

        {/* Transaction Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>STATUS</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {transaction.status || 'Buyer inspecting the product'}
            </Text>
          </View>
        </View>


        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  // Return Banner
  returnBanner: {
    backgroundColor: '#FCE7F3',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F472B6',
  },
  returnText: {
    fontSize: 14,
    color: '#BE185D',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Product Card
  productCard: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageContainer: {
    marginRight: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    lineHeight: 22,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facebookIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E7F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sourceText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Price Card
  priceCard: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },

  // Status Card
  statusCard: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },


  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Spacer
  spacer: {
    height: 32,
  },
});
