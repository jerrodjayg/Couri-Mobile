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
  Alert,
} from 'react-native';
import { Clipboard } from 'react-native';

export default function Share({ navigation, route }) {
  const [modalVisible, setModalVisible] = useState(false);
  const { productUrl, productPrice, userAddress, pickupAddress, transactionType, userProfile } = route.params || {};
  
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
  
  // Get the transaction type from route params - SWAPPED LOGIC
  const isSelling = transactionType === 'buy'; // Changed from 'sell' to 'buy'

  const handleCopyMessage = async () => {
    const message = "Please confirm our transaction in the Couri app for seamless pickup, delivery, and secure payment. Join me here: https://shorturl.at/msBLS646";
    
    try {
      Clipboard.setString(message);
      Alert.alert('Copied!', 'Message copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy message to clipboard');
    }
  };

  const handleSentInvite = () => {
    console.log('📤 User sent the invite');
    setModalVisible(true);
  };

  const handleModalGotIt = () => {
    console.log('✅ User acknowledged modal');
    setModalVisible(false);
    // Navigate back to welcome screen
    navigation.navigate('Welcomepage');
  };

  const handleCancelTransaction = () => {
    console.log('❌ User wants to cancel transaction');
    navigation.navigate('Welcomepage');
  };

  const handleProfilePress = () => {
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
            source={require('../assets/backarrow.png')} 
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
          <View style={[styles.stepIndicator, styles.stepActive]} />
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
          {/* Warning Icon */}
          <View style={styles.warningIconContainer}>
            <View style={styles.warningIcon}>
              <Text style={styles.exclamationMark}>!</Text>
            </View>
          </View>

          {/* Main Title */}
          <Text style={styles.mainTitle}>
            {isSelling ? 'Invite seller to begin' : 'Invite buyer to begin'}
          </Text>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            {/* Step 1 */}
            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {isSelling ? 'Share the link:' : 'Invite the buyer.'}
                </Text>
                <Text style={styles.stepDescription}>
                  {isSelling 
                    ? 'Copy and send this message to the seller:'
                    : 'Copy the invite link & message below and send it to the buyer:'
                  }
                </Text>
                
                {/* Message Box */}
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>
                    Please confirm our transaction in the Couri app for seamless pickup, delivery, and secure payment. Join me here: https://shorturl.at/msBLS646
                  </Text>
                  
                  {/* Copy Button */}
                  <TouchableOpacity style={styles.copyButton} onPress={handleCopyMessage}>
                    <View style={styles.copyIcon}>
                      <View style={styles.copySquare1} />
                      <View style={styles.copySquare2} />
                    </View>
                    <Text style={styles.copyButtonText}>Copy message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {isSelling ? 'Seller confirms:' : 'Buyer confirms:'}
                </Text>
                <Text style={styles.stepDescription}>
                  They'll review and confirm the transaction details.
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Pickup & delivery begins.</Text>
                <Text style={styles.stepDescription}>
                  We'll notify you once they confirm, and delivery will begin.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.sentInviteButton} onPress={handleSentInvite}>
          <Text style={styles.sentInviteButtonText}>I sent the invite</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTransaction}>
          <Text style={styles.cancelButtonText}>Cancel transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIcon}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </View>

            {/* Modal Message */}
            <Text style={styles.modalMessage}>
              {isSelling 
                ? 'As soon as the seller confirms the transaction details, we\'ll notify you and we\'ll begin pickup.'
                : 'As soon as the buyer confirms the transaction details, we\'ll notify you and we\'ll begin pickup.'
              }
            </Text>

            {/* Got It Button */}
            <TouchableOpacity style={styles.gotItButton} onPress={handleModalGotIt}>
              <Text style={styles.gotItButtonText}>Got it</Text>
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
  },
  stepTextSecond: {
    position: 'absolute',
    left: '25%',
    color: '#000000',
  },
  stepTextThird: {
    position: 'absolute',
    left: '50%',
    color: '#000000',
  },
  stepTextFourth: {
    position: 'absolute',
    left: '75%',
    color: '#000000',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 20,
    alignItems: 'center',
  },
  warningIconContainer: {
    marginBottom: 24,
  },
  warningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exclamationMark: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 32,
  },
  instructionsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 24,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
    marginBottom: 16,
  },
  messageBox: {
    backgroundColor: '#FCE7F3',
    borderWidth: 1,
    borderColor: '#F472B6',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
    marginBottom: 16,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  copyIcon: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  copySquare1: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 2,
  },
  copySquare2: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 12,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 2,
  },
  copyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sentInviteButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  sentInviteButtonText: {
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  modalMessage: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  gotItButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  gotItButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
