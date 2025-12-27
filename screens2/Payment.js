import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from 'react-native';

export default function Payment({ navigation, route }) {
  const { productUrl, productPrice, userAddress, pickupAddress, transactionType, userProfile } = route.params || {};
  const [showCancelModal, setShowCancelModal] = useState(false);

  const getUserInitials = (profile) => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    if (profile?.name) {
      const names = profile.name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    return 'U';
  };

  const handleLinkPayment = () => {
    console.log('💳 User wants to link payment method');
    // Navigate to Plaid connection screen
    navigation.navigate('PlaidConnect', {
      ...(route.params || {}),            // ✅ forward everything (title/image, etc.)
      productUrl,
      productPrice,
      userAddress,
      pickupAddress,
      transactionType,
      userProfile
    });
  };

  const handleCancelTransaction = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    console.log('❌ User confirmed cancellation');
    setShowCancelModal(false);
    navigation.navigate('Welcomepage');
  };

  const handleGoBack = () => {
    setShowCancelModal(false);
  };

  const handleProfilePress = () => {
    // Navigate to profile/account screen with user data
    navigation.navigate('MyAccount', { userData: userProfile });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../assets/backarrow1.png')} 
            style={styles.backButtonImage}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleProfilePress} style={styles.profileContainer}>
          {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
            <Image 
              source={{ uri: userProfile.avatar_url }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>
                {userProfile ? getUserInitials(userProfile) : 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {/* Bars on top */}
        <View style={styles.progressBar}>
          <View style={[styles.stepIndicator, styles.stepActive]} />
          <View style={[styles.stepIndicator, styles.stepActive]} />
          <View style={[styles.stepIndicator, styles.stepActive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
        </View>
        
        {/* Words underneath the bars */}
        <View style={styles.progressLabels}>
          <Text style={[styles.stepText, styles.stepTextFirst]}>Product</Text>
          <Text style={[styles.stepText, styles.stepTextSecond]}>Address</Text>
          <Text style={[styles.stepText, styles.stepTextThird]}>Payment</Text>
          <Text style={[styles.stepText, styles.stepTextFourth]}>Share</Text>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={styles.mainTitle}>Link a payment method</Text>
          <Text style={styles.subtitle}>
            You won’t be charged until delivery is complete! Your total will include a <Text style={styles.boldText}> $x.xx Couri service fee.</Text> 
          </Text>

          {/* Transaction Fee Information Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}> <Text style={styles.boldText}>
              4-Hour Return Window </Text>
            </Text>
            <Text style={styles.infoText}>
              You’ll have 4 hours after delivery to check the product. If it doesn’t match the seller’s description, you can return it for a full refund.
            </Text>
          </View>

          {/* Action Buttons - Moved up */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.linkPaymentButton} onPress={handleLinkPayment}>
              <Text style={styles.linkPaymentButtonText}>Link payment method</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTransaction}>
              <Text style={styles.cancelButtonText}>Cancel transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Cancel Transaction Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCancelModal}
        onRequestClose={handleGoBack}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Warning Icon */}
            <View style={styles.warningIconContainer}>
              <View style={styles.warningIcon}>
                <Image 
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/danger.png' }}
                  style={styles.warningIconImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>Are you sure?</Text>

            {/* Body Text */}
            <Text style={styles.modalBody}>
              If you cancel now, this transaction will be closed and it cannot be reopened.
            </Text>

            {/* Cancel Transaction Button */}
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={handleConfirmCancel}
            >
              <Text style={styles.modalCancelButtonText}>
                Cancel Transaction
              </Text>
            </TouchableOpacity>

            {/* Nevermind Link */}
            <TouchableOpacity 
              style={styles.modalGoBackLink}
              onPress={handleGoBack}
            >
              <Text style={styles.modalGoBackLinkText}>
                Nevermind, go back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  profileContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#000',
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#444444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
    paddingTop: 0,
    alignItems: 'flex-start',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 0,
  },
  progressLabels: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 0,
    position: 'relative',
  },
  stepIndicator: {
    width: 80,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  stepActive: {
    backgroundColor: '#10B981',
  },
  stepInactive: {
    backgroundColor: '#E5E7EB',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#9CA3AF',
  },
  stepTextFirst: {
    position: 'absolute',
    left: '0%',
    color: '#000000',
    marginLeft: 11,
  },
  stepTextSecond: {
    position: 'absolute',
    left: '25%',
    color: '#000000',
    marginLeft: 17,
  },
  stepTextThird: {
    position: 'absolute',
    left: '50%',
    color: '#000000',
    marginLeft: 19,
  },
  stepTextFourth: {
    position: 'absolute',
    left: '75%',
    marginLeft: 35,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 20,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    maxWidth: 350,
    alignSelf: 'center',
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#FCE7F3',
    borderWidth: 1,
    borderColor: '#F472B6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    alignSelf: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    marginTop: 24,
    width: '100%',
    alignSelf: 'center',
  },
  linkPaymentButton: {
    backgroundColor: '#000000',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  linkPaymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Cancel Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    height: '350',
    alignItems: 'center',
  },
  warningIconContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  warningIcon: {
    width: 35,
    height: 35,
    borderRadius: 30,
    backgroundColor: '#FFE8FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIconImage: {
    width: 25,
    height: 25,
  },
  modalTitle: {
    fontSize: 32,
    fontStyle: 'Area Normal',
    fontWeight: '400',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalBody: {
    fontSize: 16,
    fontStyle: "Area Normal",
    fontWeight: '400',
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalCancelButton: {
    backgroundColor: '#242422',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fff',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalGoBackLink: {
    paddingVertical: 8,
  },
  modalGoBackLinkText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
});
