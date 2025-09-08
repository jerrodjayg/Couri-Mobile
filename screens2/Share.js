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
import * as Linking from 'expo-linking';
import { Buffer } from 'buffer';

// polyfill Buffer (RN sometimes needs it)
if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

/* ---------- invite link helpers ---------- */
const toBase64Url = (s) =>
  Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const createInviteLink = (payload) => {
  const data = toBase64Url(JSON.stringify(payload));
  // In Expo Go this produces exp://.../--/invite?data=...
  return Linking.createURL('/invite', { queryParams: { data } });
};

// URL shortening function using TinyURL API
const shortenUrl = async (longUrl) => {
  try {
    const response = await fetch('https://tinyurl.com/api-create.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `url=${encodeURIComponent(longUrl)}`,
    });
    
    if (response.ok) {
      const shortUrl = await response.text();
      return shortUrl;
    }
  } catch (error) {
    console.log('URL shortening failed:', error);
  }
  
  // Fallback: return original URL if shortening fails
  return longUrl;
};

export default function Share({ navigation, route }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [shortUrl, setShortUrl] = useState('');
  const [isShortening, setIsShortening] = useState(true);

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
  } = route.params || {};

  // Resolve possible aliases from previous screens
  const resolvedTitle = (productTitle && productTitle.trim().length > 0)
    ? productTitle
    : (route?.params?.productName || '');

  const resolvedImage = (productImage && productImage.trim().length > 0)
    ? productImage
    : (route?.params?.productImage || route?.params?.imageUrl || '');

  const getUserInitials = (profile) => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
      if (names.length === 1) return names[0][0].toUpperCase();
    }
    if (profile?.name) {
      const names = profile.name.split(' ');
      if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
      if (names.length === 1) return names[0][0].toUpperCase();
    }
    return 'U';
  };

  // Build the payload that Welcomepage will decode & show.
  const isSelling = transactionType === 'buy';
  const invitePayload = useMemo(
    () => ({
      fbUrl: productUrl,
      price: productPrice,
      title: resolvedTitle || '',
      image: resolvedImage || '',
      seller: userProfile?.full_name || userProfile?.name || '',
      offerId: offerId || undefined,
    }),
    [productUrl, productPrice, resolvedTitle, resolvedImage, userProfile, offerId]
  );

  const inviteLink = useMemo(() => createInviteLink(invitePayload), [invitePayload]);
  const inviteLinkClean = useMemo(() => String(inviteLink).replace(/\s+/g, ''), [inviteLink]);

  // Generate shortened URL on component mount
  useEffect(() => {
    const generateShortUrl = async () => {
      setIsShortening(true);
      try {
        const shortened = await shortenUrl(inviteLinkClean);
        setShortUrl(shortened);
      } catch (error) {
        console.log('Error shortening URL:', error);
        setShortUrl(inviteLinkClean);
      } finally {
        setIsShortening(false);
      }
    };

    generateShortUrl();
  }, [inviteLinkClean]);

  const handleCopyMessage = async () => {
    const linkToUse = shortUrl || inviteLinkClean;
    const message =
      `Please confirm our transaction in the Couri app for seamless pickup, delivery, and secure payment. ` +
      `Join me here: ${linkToUse}`;

    try {
      await Clipboard.setStringAsync(message);
      Alert.alert('Copied!', 'Message copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy message to clipboard');
    }
  };


  const handleSentInvite = () => {
    console.log('📤 User sent the invite', { inviteLink, invitePayload });
    setModalVisible(true);
  };

  const handleModalGotIt = () => {
    setModalVisible(false);
    navigation.navigate('Welcomepage');
  };

  const handleCancelTransaction = () => {
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Image source={require('../assets/backarrow.png')} style={styles.backButtonImage} />
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
                    ? 'Copy and send this message to the seller:'
                    : 'Copy the invite link & message below and send it to the buyer:'}
                </Text>

                {/* Message Box */}
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>
                    Please confirm our transaction in the Couri app for seamless pickup, delivery, and secure payment.{'\n'}
                    Join me here: {isShortening ? 'Generating short link...' : (shortUrl || inviteLinkClean)}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
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
            <View style={styles.successIconContainer}>
              <View style={styles.successIcon}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </View>

            <Text style={styles.modalMessage}>
              {isSelling
                ? "As soon as the seller confirms the transaction details, we'll notify you and we'll begin pickup."
                : "As soon as the buyer confirms the transaction details, we'll notify you and we'll begin pickup."}
            </Text>

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
  stepTextFirst: { position: 'absolute', left: '0%', color: '#000000' },
  stepTextSecond: { position: 'absolute', left: '25%', color: '#000000' },
  stepTextThird: { position: 'absolute', left: '50%', color: '#000000' },
  stepTextFourth: { position: 'absolute', left: '75%', color: '#000000' },
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
  buttonContainer: { paddingHorizontal: 24, paddingBottom: 24 },
  sentInviteButton: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  sentInviteButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center' },
  cancelButtonText: { color: '#000', fontSize: 16, fontWeight: '500', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', maxWidth: 320, width: '100%' },
  successIconContainer: { marginBottom: 24 },
  successIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  modalMessage: { fontSize: 16, color: '#000', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  gotItButton: { backgroundColor: '#374151', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', width: '100%' },
  gotItButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
