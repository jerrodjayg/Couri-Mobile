import React, { useState, useMemo, useEffect } from 'react';
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
  Share as RNShare,
} from 'react-native';

import * as Clipboard from 'expo-clipboard';
import { saveTransaction } from '../utils/transactionService';
import { createTransactionInvitation, generateWebInvitationUrl } from '../utils/supabaseTransactionService_temp';

// Web invitation system - no old invitation helpers needed

export default function Share({ navigation, route }) {
  const [modalVisible, setModalVisible] = useState(false);

  const {
    productUrl,
    productPrice,
    userAddress,
    pickupAddress,
    transactionType,
    userProfile,
    productTitle,
    productImage,
    offerId,
    sellerName, // Add seller name
    plaidSuccess, // Plaid connection success data
    plaidLinkToken, // Plaid link token
    plaidExit, // Plaid exit data (if user exited)
  } = route.params || {};

  // Resolve possible aliases from previous screens
  const resolvedTitle = (productTitle && productTitle.trim().length > 0)
    ? productTitle
    : (route?.params?.productName || '');

  const resolvedImage = productImage || route?.params?.productImage || '';

  // Web invitation system only
  const isSelling = transactionType === 'buy';
  
  // State for web invitation
  const [webInviteUrl, setWebInviteUrl] = useState('');
  const [isCreatingWebInvite, setIsCreatingWebInvite] = useState(false);

  // Log Plaid connection status when component mounts
  useEffect(() => {
    if (plaidSuccess) {
      console.log('✅ [Share] Plaid connection successful:', plaidSuccess);
      console.log('✅ [Share] Public token:', plaidSuccess.publicToken);
      console.log('✅ [Share] Metadata:', plaidSuccess.metadata);
    } else if (plaidExit) {
      console.log('⚠️ [Share] Plaid Link exited:', plaidExit);
    } else if (plaidLinkToken) {
      console.log('⚠️ [Share] Plaid link token received but no success/exit data');
    }
  }, [plaidSuccess, plaidExit, plaidLinkToken]);

  // Web invitation system - no URL shortening needed

  // Create web-based invitation
  const createWebInvitation = async () => {
    try {
      setIsCreatingWebInvite(true);
      
      // Create transaction in Supabase
      const transactionData = {
        price: productPrice,
        title: resolvedTitle,
        description: '', // Add description if available
        image: resolvedImage,
        fbUrl: productUrl,
        source: 'Facebook Marketplace',
        offerId: offerId,
        userAddress: userAddress,
        pickupAddress: pickupAddress,
        transactionType: transactionType,
        fbSellerName: sellerName || userProfile?.full_name || userProfile?.name || 'Facebook Seller', // Use seller name if provided
      };

      const transaction = await createTransactionInvitation(transactionData);
      
      // Generate web invitation URL
      const webUrl = generateWebInvitationUrl(transaction.id);
      setWebInviteUrl(webUrl);
      
      // Only save to local storage if we have a valid product title
      if (resolvedTitle && resolvedTitle.trim().length > 0) {
        await saveTransaction({
          productTitle: resolvedTitle,
          productImage: resolvedImage,
          productPrice: productPrice,
          productUrl: productUrl,
          transactionType: transactionType,
          userProfile: userProfile,
          offerId: offerId,
          id: transaction.id,
          supabaseId: transaction.id,
          webInviteUrl: webUrl,
        });
        console.log('✅ Transaction saved to local storage');
      } else {
        console.log('⚠️ Skipping local storage save - no valid product title');
      }

      console.log('✅ Web invitation created:', webUrl);
      return webUrl;
      
    } catch (error) {
      console.error('❌ Error creating web invitation:', error);
      Alert.alert('Error', 'Failed to create web invitation. Please try again.');
      return null;
    } finally {
      setIsCreatingWebInvite(false);
    }
  };

  // Old copy message function removed - using web invitations only

  const handleCopyWebInvite = async () => {
    try {
      let webUrl = webInviteUrl;
      
      // Create web invitation if not already created
      if (!webUrl) {
        webUrl = await createWebInvitation();
        if (!webUrl) return;
      }

      const message = `You've been invited to a transaction on Couri! View and join the transaction here: ${webUrl}`;
      
      await Clipboard.setStringAsync(message);
    } catch (error) {
      console.error('Error copying web invite:', error);
      Alert.alert('Error', 'Failed to copy web invitation');
    }
  };

  const handleShareWebInvite = async () => {
    try {
      let webUrl = webInviteUrl;
      
      // Create web invitation if not already created
      if (!webUrl) {
        webUrl = await createWebInvitation();
        if (!webUrl) return;
      }

      const message = `You've been invited to a transaction on Couri! View and join the transaction here: ${webUrl}`;
      
      await RNShare.share({
        message: message,
        url: webUrl,
        title: 'Couri Transaction Invitation'
      });
    } catch (error) {
      console.error('Error sharing web invite:', error);
      Alert.alert('Error', 'Failed to share web invitation');
    }
  };

  const handleSentInvite = async () => {
    // Create web invitation when user confirms they sent it
    try {
      await createWebInvitation();
      console.log('📤 Web invitation created and sent');
      setModalVisible(true);
    } catch (error) {
      console.error('❌ Error creating web invitation:', error);
      Alert.alert('Error', 'Failed to create web invitation');
    }
  };

  const handleModalGotIt = async () => {
    // Transaction already saved in createWebInvitation, no need to save again
    setModalVisible(false);
    // Pass transaction data to show the review state
    navigation.navigate('Welcomepage', {
      transactionData: {
        productTitle: resolvedTitle,
        productImage: resolvedImage,
        productPrice: productPrice,
        seller: userProfile?.full_name || userProfile?.name || 'Seller',
        status: 'reviewing',
        transactionType: transactionType,
        transactionId: webInviteUrl ? webInviteUrl.split('/').pop() : null
      }
    });
  };

  const handleCancelTransaction = () => {
    navigation.navigate('Welcomepage');
  };

  const handleProfilePress = () => {
    navigation.navigate('MyAccount', { userData: userProfile });
  };

  const getUserInitials = (profile) => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      if (names.length >= 2) return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      if (names.length === 1) return names[0].charAt(0).toUpperCase();
    }
    if (profile?.name) {
      const names = profile.name.split(' ');
      if (names.length >= 2) return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      if (names.length === 1) return names[0].charAt(0).toUpperCase();
    }
    if (profile?.firstName && profile?.lastName) {
      return (profile.firstName.charAt(0) + profile.lastName.charAt(0)).toUpperCase();
    }
    return 'U';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Image source={require('../assets/backarrow1.png')} style={styles.backButtonImage} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleProfilePress} style={styles.profileContainer}>
          {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
            <Image source={{ uri: userProfile.avatar_url }} style={styles.profileImage} />
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
        <View style={styles.progressBar}>
          <View style={[styles.stepIndicator, styles.stepActive]} />
          <View style={[styles.stepIndicator, styles.stepActive]} />
          <View style={[styles.stepIndicator, styles.stepActive]} />
          <View style={[styles.stepIndicator, styles.stepActive]} />
        </View>
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
          <View style={styles.warningIconContainer}>
            <View style={styles.warningIcon}>
              <Text style={styles.exclamationMark}>!</Text>
            </View>
          </View>

          <Text style={styles.mainTitle}>
            {isSelling ? 'Invite seller to begin' : 'Invite buyer to begin'}
          </Text>

          <View style={styles.instructionsContainer}>
            {/* Step 1 */}
            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepDescription}>
                  {isSelling
                    ? 'Create a web invitation link and send it to the seller:'
                    : 'Create a web invitation link and send it to the buyer:'}
                </Text>

                {/* Web Invitation Section */}
                <View style={styles.messageBox}>
                  <Text style={styles.stepTitle}>Share a web invitation</Text>
                  <Text style={styles.stepDescription}>
                    Send a web link that works in any browser. Recipients can view the transaction and download the app to join.
                  </Text>
                  
                  <View style={{ marginTop: 15 }}>
                    <TouchableOpacity 
                      style={[styles.copyButton, isCreatingWebInvite && styles.disabledButton]} 
                      onPress={handleCopyWebInvite}
                      disabled={isCreatingWebInvite}
                    >
                      <View style={styles.copyIcon}>
                        <View style={styles.copySquare1} />
                        <View style={styles.copySquare2} />
                      </View>
                      <Text style={styles.copyButtonText}>
                        {isCreatingWebInvite ? 'Creating...' : 'Copy web link'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.sendButton, isCreatingWebInvite && styles.disabledButton]} 
                      onPress={handleShareWebInvite}
                      disabled={isCreatingWebInvite}
                    >
                      <Text style={styles.sendButtonText}>
                        {isCreatingWebInvite ? 'Creating...' : 'Send Link'}
                      </Text>
                    </TouchableOpacity>
                  </View>
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

            {/* Seller Flow - 4 Hour Return Window */}
            {isSelling && (
              <View style={styles.returnWindowContainer}>
                <Text style={styles.returnWindowText}>
                  Once the product is delivered, you will{'\n'}
                  incur a <Text style={styles.boldText}>$x.xx transaction fee</Text> for using{'\n'}
                  Couri. <Text style={styles.italicText}>This fee is non-refundable.</Text>
                </Text>
              </View>
            )}
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
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close button */}
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            {/* Success icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIcon}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </View>

            {/* Message */}
            <Text style={styles.modalMessage}>
              Your web invitation has been created! The recipient will receive a link to view the transaction details and can download the app to join.
            </Text>

            {/* Got it button */}
            <TouchableOpacity style={styles.gotItButton} onPress={handleModalGotIt}>
              <Text style={styles.gotItButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backButtonImage: { width: 36, height: 36, resizeMode: 'contain' },
  profileContainer: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 40, height: 40, borderRadius: 20, resizeMode: 'cover' },
  profilePlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center' },
  profileInitials: { color: '#444444', fontWeight: 'bold', fontSize: 16 },
  progressContainer: { paddingHorizontal: 24, marginBottom: 40, paddingTop: 0, alignItems: 'flex-start' },
  progressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, width: '100%', paddingHorizontal: 0 },
  progressLabels: { flexDirection: 'row', width: '100%', paddingHorizontal: 0, position: 'relative' },
  stepIndicator: { width: 80, height: 6, borderRadius: 3, marginTop: 8 },
  stepActive: { backgroundColor: '#10B981' },
  stepInactive: { backgroundColor: '#E5E7EB' },
  stepText: { fontSize: 14, fontWeight: '500', textAlign: 'center', color: '#9CA3AF' },
  stepTextFirst: { position: 'absolute', left: '0%', color: '#000000', marginLeft: 11 },
  stepTextSecond: { position: 'absolute', left: '25%', color: '#000000', marginLeft: 17 },
  stepTextThird: { position: 'absolute', left: '50%', color: '#000000', marginLeft: 19 },
  stepTextFourth: { position: 'absolute', left: '75%', color: '#000000', marginLeft: 35 },
  mainContent: { flex: 1, paddingHorizontal: 24 },
  contentContainer: { paddingTop: 20, alignItems: 'center' },
  warningIconContainer: { marginBottom: 24 },
  warningIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  exclamationMark: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: 32 },
  instructionsContainer: { width: '100%', maxWidth: 400, gap: 24 },
  stepContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  stepNumberText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  stepDescription: { fontSize: 16, color: '#000', lineHeight: 22, marginBottom: 16 },
  messageBox: { backgroundColor: '#FCE7F3', borderWidth: 1, borderColor: '#F472B6', borderRadius: 12, padding: 20, marginTop: 8 },
  messageText: { fontSize: 16, color: '#000', lineHeight: 22, marginBottom: 10 },
  copyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#000', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  copyIcon: { width: 20, height: 20, position: 'relative' },
  copySquare1: { position: 'absolute', top: 2, left: 2, width: 12, height: 12, borderWidth: 2, borderColor: '#000', borderRadius: 2 },
  copySquare2: { position: 'absolute', top: 6, left: 6, width: 12, height: 12, backgroundColor: '#000', borderRadius: 2 },
  copyButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
  sendButton: { backgroundColor: '#000', borderWidth: 1, borderColor: '#000', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, gap: 8, flex: 1 },
  shareIcon: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  shareIconText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  shareButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
  buttonContainer: { paddingHorizontal: 24, paddingBottom: 24 },
  sentInviteButton: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  sentInviteButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center' },
  cancelButtonText: { color: '#000', fontSize: 16, fontWeight: '500', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 24, 
    alignItems: 'center', 
    maxWidth: 320, 
    width: '100%',
    position: 'relative'
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  closeButtonText: {
    fontSize: 20,
    color: '#000',
    fontWeight: '300'
  },
  successIconContainer: { marginBottom: 16, marginTop: 8 },
  successIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  modalMessage: { 
    fontSize: 16, 
    color: '#000', 
    textAlign: 'center', 
    lineHeight: 22, 
    marginBottom: 24,
    paddingHorizontal: 8
  },
  gotItButton: { 
    backgroundColor: '#000', 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    alignItems: 'center', 
    width: '100%' 
  },
  gotItButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  returnWindowContainer: { 
    backgroundColor: '#FEF3C7', 
    borderWidth: 1, 
    borderColor: '#F59E0B', 
    borderRadius: 12, 
    padding: 16, 
    marginTop: 8 
  },
  returnWindowText: { 
    fontSize: 14, 
    color: '#92400E', 
    textAlign: 'center', 
    lineHeight: 20 
  },
  boldText: { 
    fontWeight: 'bold' 
  },
  italicText: { 
    fontStyle: 'italic' 
  },
});
