import React, { useRef, useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserService } from '../utils/userService';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Linking as RNLinking } from 'react-native';
import { Buffer } from 'buffer';
import OptimizedImage from '../components/OptimizedImage';
import imagePreloader from '../utils/imagePreloader';
import { getInviteCache, clearInviteCache } from '../utils/inviteCache';
import { listMyInvites, acceptInvite } from '../utils/inviteApi';
import { useInviteRealtime } from '../hooks/useInviteRealtime';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  PanResponder,
  ScrollView,
  Pressable,
} from 'react-native';

// polyfill (RN sometimes needs this)
if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

/* -----------------------------
   Invite payload + decoder
------------------------------*/
const decodeInvite = (data) => {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(b64, 'base64').toString('utf8');
  return JSON.parse(json); // { fbUrl, price, title?, seller?, sellerAvatar?, image?, offerId? }
};

/* -----------------------------
   Small helper: initials from a name
------------------------------*/
const initialsFromName = (name = '') => {
  const parts = String(name).trim().split(/\s+/);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U';
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/* -----------------------------
   Inviter row (outside the card)
------------------------------*/
const InviterRow = ({ seller, sellerAvatar }) => {
  const initials = initialsFromName(seller);
  return (
    <View style={inviteRowStyles.container}>
      <Text style={inviteRowStyles.text}>
        with {seller || 'Seller'}
      </Text>
      {sellerAvatar ? (
        <Image source={{ uri: sellerAvatar }} style={inviteRowStyles.avatar} />
      ) : (
        <View style={inviteRowStyles.avatarFallback}>
          <Text style={inviteRowStyles.initials}>{initials}</Text>
        </View>
      )}
    </View>
  );
};

const inviteRowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eee',
    marginLeft: 8,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eee',
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { fontSize: 12, fontWeight: '700', color: '#333' },
  // "keep the word font the exact same" as your old in-card label:
  text: { fontSize: 14, color: '#333' },
});

/* -----------------------------
   Simplified invite preview card
   (product name + product image only)
------------------------------*/
const InvitePreviewCard = ({ invite, onPress }) => {
  return (
    <View
      style={{
        width: '95%',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#000',
        padding: 24,
        backgroundColor: '#fff',
        minHeight: 140,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={{ fontSize: 21, fontWeight: '600' }}>
            "{invite?.title || 'Product Name'}"
          </Text>
        </View>

        {invite?.image ? (
          <Image
            source={{ uri: invite.image }}
            style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' }}
          />
        ) : (
          <View style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' }} />
        )}
      </View>

      <TouchableOpacity
        onPress={onPress}
        style={{
          marginTop: 16,
          backgroundColor: '#000',
          paddingVertical: 16,
          borderRadius: 50,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
          View & Confirm Invitation
        </Text>
      </TouchableOpacity>
    </View>
  );
};

/* -----------------------------
   Size Warning Modal
------------------------------*/
const SizeWarningModal = ({ visible, onClose, onUnderstand, onCancel }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={sizeWarningModalStyles.overlay}>
        <View style={sizeWarningModalStyles.modalContent}>
          {/* Icon */}
          <View style={sizeWarningModalStyles.iconContainer}>
            <View style={sizeWarningModalStyles.iconCircle}>
              <Text style={sizeWarningModalStyles.iconText}>co</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={sizeWarningModalStyles.title}>Heads up!</Text>

          {/* Body Text */}
          <Text style={sizeWarningModalStyles.bodyText}>
            Couri drivers use their personal cars, so all items need to fit in a standard trunk or back seat. Large items (like couches or large appliances) can't be delivered at this time. Oversized items may be canceled.
          </Text>

          {/* Buttons */}
          <TouchableOpacity
            style={sizeWarningModalStyles.understandButton}
            onPress={onUnderstand}
          >
            <Text style={sizeWarningModalStyles.understandButtonText}>I understand</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={sizeWarningModalStyles.cancelButton}
            onPress={onCancel}
          >
            <Text style={sizeWarningModalStyles.cancelButtonText}>Cancel transaction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/* -----------------------------
   Bottom-sheet choice modal
------------------------------*/
const CouriModal = ({ visible, onClose, onGetStarted }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isGetStartedEnabled, setIsGetStartedEnabled] = useState(false);
  const panAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(500)).current;

  // Animate modal in when visible
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(500);
      panAnim.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderGrant: () => {
        panAnim.setOffset(panAnim._value);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        panAnim.flattenOffset();
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(panAnim, {
            toValue: 500,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            panAnim.setValue(0);
          });
        } else {
          Animated.timing(panAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setIsGetStartedEnabled(true);
  };

  const handleGetStarted = () => {
    if (isGetStartedEnabled) onGetStarted(selectedOption);
  };

  const getDescriptionText = () => {
    if (selectedOption === 'buy') return 'Buy anything from anyone with complete trust and protection.';
    if (selectedOption === 'sell') return 'Sell your items safely with our secure payment system.';
    return 'Couri takes the hassle out of peer-to-peer buying and selling.';
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.overlayTouchable} onPress={onClose} activeOpacity={1} />
        <Animated.View
          style={[
            modalStyles.modalContainer,
            {
              transform: [{
                translateY: Animated.add(slideAnim, panAnim)
              }]
            }
          ]}
          {...panResponder.panHandlers}
        >
          <View style={modalStyles.dragHandle} />
          <View style={modalStyles.headerContainer}>
            <Text style={modalStyles.headerLine1}>How will you</Text>
            <Text style={modalStyles.headerLine2}>use Couri today?</Text>
          </View>

          <View style={modalStyles.choiceContainer}>
            <TouchableOpacity
              style={[modalStyles.choiceButton, selectedOption === 'buy' && modalStyles.choiceButtonActive]}
              onPress={() => handleOptionSelect('buy')}
            >
              <View style={modalStyles.choiceIconContainer}>
                <Image source={require('../assets/shoppingcart.png')} style={[modalStyles.choiceIcon]} resizeMode="contain" />
              </View>
              <Text style={[modalStyles.choiceText]}>Buy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[modalStyles.choiceButton, selectedOption === 'sell' && modalStyles.choiceButtonActive]}
              onPress={() => handleOptionSelect('sell')}
            >
              <View style={modalStyles.choiceIconContainer}>
                <Image source={require('../assets/sell.png')} style={[modalStyles.choiceIcon]} resizeMode="contain" />
              </View>
              <Text style={[modalStyles.choiceText]}>Sell</Text>
            </TouchableOpacity>
          </View>

          <Text style={modalStyles.description}>{getDescriptionText()}</Text>

          <TouchableOpacity
            style={[modalStyles.getStartedButton, isGetStartedEnabled && modalStyles.getStartedButtonActive]}
            onPress={handleGetStarted}
            disabled={!isGetStartedEnabled}
          >
            <Text style={[modalStyles.getStartedText, isGetStartedEnabled && modalStyles.getStartedTextActive]}>
              Get Started
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

/* -----------------------------
   Transaction Review Card Component
------------------------------*/
const TransactionReviewCard = ({ transactionData, onViewDetails, onCancel }) => {
  return (
    <View style={transactionCardStyles.container}>
      {/* Warning message for scheduled deliveries */}
      {transactionData?.deliveryStatus === 'scheduled' && (
        <View style={transactionCardStyles.warningContainer}>
          <Text style={transactionCardStyles.warningIcon}>⚠️</Text>
          <Text style={transactionCardStyles.warningText}>
            You must be home to meet your Couri driver
          </Text>
        </View>
      )}

      <View style={transactionCardStyles.content}>
        <View style={transactionCardStyles.details}>
          <Text style={transactionCardStyles.productTitle}>
            "{transactionData?.productTitle || 'Product'}"
          </Text>
          {transactionData?.productDescription && (
            <Text style={transactionCardStyles.productDescription}>
              {transactionData.productDescription}
            </Text>
          )}
        </View>

        <View style={transactionCardStyles.imageContainer}>
          {transactionData?.productImage ? (
            <Image
              source={{ uri: transactionData.productImage }}
              style={transactionCardStyles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={transactionCardStyles.placeholderImage}>
              <Text style={transactionCardStyles.placeholderText}>📦</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const transactionCardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
  details: {
    flex: 1,
    marginRight: 12,
  },
  productTitle: {
    fontSize: 21,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
    flex: 1,
  },
});

/* -----------------------------
   Transaction Accepted Success Modal
------------------------------*/
const TransactionAcceptedModal = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={successModalStyles.overlay}>
        <View style={successModalStyles.modalContent}>
          {/* Success icon */}
          <View style={successModalStyles.successIconContainer}>
            <View style={successModalStyles.successIcon}>
              <Text style={successModalStyles.checkmark}>✓</Text>
            </View>
          </View>

          {/* Main heading */}
          <Text style={successModalStyles.mainHeading}>
            Your transaction was accepted
          </Text>

          {/* Body text */}
          <Text style={successModalStyles.bodyText}>
            We're dispatching a Couri driver now to pickup the product. We'll notify you as soon as it's ready for delivery.
          </Text>

          {/* Got it button */}
          <TouchableOpacity style={successModalStyles.gotItButton} onPress={onClose}>
            <Text style={successModalStyles.gotItText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/* -----------------------------
   Transaction Details Modal
-------------------------------*/
const TransactionDetailsModal = ({ visible, onClose, transactionData, navigation }) => {
  // Determine if user is buyer or seller based on transaction type
  const isBuyer = transactionData?.transactionType === 'sell';

  const handleGotIt = async () => {
    try {
      // Track that user clicked "Got it" in the transaction details modal
      await AsyncStorage.setItem('userJourney_gotItClicked', 'true');
      console.log('✅ User journey: Got it clicked in transaction details modal');
    } catch (error) {
      console.error('Error tracking user journey:', error);
    }

    onClose();
    // Navigate to ConfirmAvailability page
    navigation.navigate('ConfirmAvailability', {
      transactionData
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={transactionDetailsModalStyles.overlay}>
        <View style={transactionDetailsModalStyles.modalContent}>
          {/* Close button */}
          <TouchableOpacity
            style={transactionDetailsModalStyles.closeButton}
            onPress={onClose}
          >
            <Text style={transactionDetailsModalStyles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={transactionDetailsModalStyles.title}>
            How long will{'\n'}transaction review{'\n'}take?
          </Text>

          {/* Description */}
          <Text style={transactionDetailsModalStyles.description}>
            {isBuyer
              ? "We've notified the seller that your\ntransaction is awaiting review. Most sellers\nreview within an hour, but it depends on how\nquickly they respond. If it's been a while,\nconsider nudging them on the original\nplatform where you contacted them."
              : "We've notified the buyer that your\ntransaction is awaiting review. Most buyers\nreview within an hour, but it depends on how\nquickly they respond. If it's been a while,\nconsider nudging them on the original\nplatform where you contacted them."
            }
          </Text>

          {/* Action button */}
          <TouchableOpacity
            style={transactionDetailsModalStyles.actionButton}
            onPress={handleGotIt}
          >
            <Text style={transactionDetailsModalStyles.actionButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const successModalStyles = StyleSheet.create({
  overlay: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: 16,
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
  mainHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  gotItButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  gotItText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

const transactionDetailsModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
    minHeight: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: -45,
    right: 1,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 36,
    fontWeight: 'normal',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#000',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 40,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

const cancelConfirmModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  keepButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  keepButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  cancelButtonText: {
    color: '#FF0000',
    fontSize: 16,
    fontWeight: '600',
  },
});

/* -----------------------------
   Accept/Decline modal (same screen)
------------------------------*/
const ConfirmInviteModal = ({ visible, onClose, invite, onAccept }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Confirm Invitation</Text>
          <Text style={{ marginBottom: 16 }}>
            {invite?.title || ''}
          </Text>

          <TouchableOpacity
            style={{ backgroundColor: '#000', padding: 14, borderRadius: 10, marginBottom: 10 }}
            onPress={onAccept}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' }}
            onPress={onClose}
          >
            <Text style={{ textAlign: 'center' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/* -----------------------------
   WELCOME PAGE (Redesigned)
------------------------------*/
export default function Welcomepage({ route, navigation }) {
  // All state hooks must be called in the same order every time
  const { user: contextUser } = useUser();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [justCompletedAccountCreation, setJustCompletedAccountCreation] = useState(false);

  // New States for Home Screen Redesign
  const [selectedHomeOption, setSelectedHomeOption] = useState(null); // 'buy' or 'sell'

  // Existing states needed for invite/transaction logic
  const [modalVisible, setModalVisible] = useState(false); // Kept for backward compat or other modals
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [invite, setInvite] = useState(null);
  const [transactionData, setTransactionData] = useState(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [transactionDetailsModalVisible, setTransactionDetailsModalVisible] = useState(false);
  const [myInvites, setMyInvites] = useState([]);
  const [inviteError, setInviteError] = useState(null);
  const [cancelConfirmModalVisible, setCancelConfirmModalVisible] = useState(false);

  // Check for cached invite from deep link on mount
  useEffect(() => {
    const cachedInvite = getInviteCache();
    if (cachedInvite) {
      console.log('📦 Found cached invite from deep link:', cachedInvite.id);
      setInvite(cachedInvite);
      clearInviteCache(); // Clear after loading
    }

    // Check for invite error from route params
    if (route?.params?.inviteError) {
      console.log('❌ Invite error from deep link:', route.params.inviteError);
      setInviteError(route.params.inviteError);
    }
  }, [route?.params?.inviteError]);

  // Show error alert when inviteError is set
  useEffect(() => {
    if (inviteError) {
      Alert.alert(
        'Invitation Error',
        inviteError,
        [
          {
            text: 'Request New Invite',
            onPress: () => {
              setInviteError(null);
              // Could navigate to a screen to request new invite
            }
          },
          { text: 'OK', onPress: () => setInviteError(null) }
        ]
      );
    }
  }, [inviteError]);

  // Animation values - removed duplicate declaration

  useEffect(() => {
    // (Simplified for this replacement block to fit logic)
    const checkUser = async () => {
      const savedUser = await AsyncStorage.getItem('userProfile');
      if (savedUser) {
        setUserProfile(JSON.parse(savedUser));
      } else if (contextUser) {
        // Fallback to context user if no saved profile
        setUserProfile(contextUser);
      }
      setLoading(false);
    };
    checkUser();
  }, [contextUser]);

  const handleHomeOptionSelect = (option) => {
    setSelectedHomeOption(option);
  };

  const handleDeselect = () => {
    setSelectedHomeOption(null);
  };

  const handleGetStarted = () => {
    if (!selectedHomeOption) return;

    // Sellers go to SellerProductForm, Buyers go to URL screen
    if (selectedHomeOption === 'sell') {
      navigation.navigate('SellerProductForm', { type: selectedHomeOption, userProfile, showSizeWarning: true });
    } else {
      navigation.navigate('URL', { type: selectedHomeOption, userProfile, showSizeWarning: true });
    }
  };

  const renderContent = () => (
    <>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Image source={require('../assets/logowhite.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <TouchableOpacity onPress={userProfile ? () => navigation.navigate('MyAccount', { userData: userProfile }) : () => navigation.navigate('Login')} style={styles.profileContainer}>
          {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
            <OptimizedImage
              source={{ uri: userProfile.avatar_url }}
              style={styles.profileImage}
              showLoadingIndicator={false}
              placeholder={
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitials}>{initialsFromName(userProfile?.name)}</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>{userProfile ? initialsFromName(userProfile?.name) : '?'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Map Visualization */}
      <View style={styles.mapContainer}>
          {/* Map background image */}
          <Image 
            source={require('../assets/maph.png')} 
            style={styles.mapBackgroundImage}
            resizeMode="cover"
          />
          
          {/* Route line overlay */}
          <Image 
            source={require('../assets/routeh.png')} 
            style={styles.routeImage}
            resizeMode="contain"
          />
          
          {/* Driver icon at top of route */}
          <Image 
            source={require('../assets/drivericon.png')} 
            style={styles.driverIcon}
            resizeMode="contain"
          />
          
          {/* Shoes image at origin/start of route */}
          <Image 
            source={require('../assets/shoesimage.png')} 
            style={styles.shoesImage}
            resizeMode="contain"
          />
          
          {/* Home logo at destination/end of route */}
          <Image 
            source={require('../assets/newhomelogo.png')} 
            style={styles.homeLogo}
            resizeMode="contain"
          />
          
          {/* Gradient overlay at top for fading effect - TEMPORARILY REMOVED */}
          {/* <Image 
            source={require('../assets/gradienttop.png')} 
            style={styles.gradientTop}
            resizeMode="cover"
          /> */}
        </View>

      {/* Main Content - Pressable to deselect on outside click */}
      <Pressable style={styles.mainContent} onPress={handleDeselect}>
        {/* Headings */}
        <Text style={styles.mainHeading}>
          Buy or sell anything with{'\n'}complete trust and fast{'\n'}pickup and delivery.
        </Text>

        <Text style={styles.subHeading}>
          How will you use Couri today?
        </Text>

        {/* Selection Buttons */}
        <View style={styles.selectionRow}>
          <Pressable
            style={[styles.selectionCard, selectedHomeOption === 'buy' && styles.selectionCardActive]}
            onPress={(e) => {
              e.stopPropagation();
              handleHomeOptionSelect('buy');
            }}
          >
            <Image
              source={require('../assets/shoppingcart.png')}
              style={styles.selectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.selectionText}>Buy</Text>
          </Pressable>

          <Pressable
            style={[styles.selectionCard, selectedHomeOption === 'sell' && styles.selectionCardActive]}
            onPress={(e) => {
              e.stopPropagation();
              handleHomeOptionSelect('sell');
            }}
          >
            <Image
              source={require('../assets/sell.png')}
              style={styles.selectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.selectionText}>Sell</Text>
          </Pressable>
        </View>

        {/* Get Started Button */}
        <Pressable
          style={[styles.getStartedButton, !selectedHomeOption && styles.getStartedButtonDisabled]}
          onPress={(e) => {
            e.stopPropagation();
            handleGetStarted();
          }}
          disabled={!selectedHomeOption}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </Pressable>

      </Pressable>

      {/* Keep Modals */}
      <TransactionsModals
        modalVisible={modalVisible}
        confirmVisible={confirmVisible}
        successModalVisible={successModalVisible}
        transactionDetailsModalVisible={transactionDetailsModalVisible}
        cancelConfirmModalVisible={cancelConfirmModalVisible}
        invite={invite}
        transactionData={transactionData}
        setModalVisible={setModalVisible}
        setConfirmVisible={setConfirmVisible}
        setSuccessModalVisible={setSuccessModalVisible}
        setTransactionDetailsModalVisible={setTransactionDetailsModalVisible}
        setCancelConfirmModalVisible={setCancelConfirmModalVisible}
        navigation={navigation}
        setInvite={setInvite}
        setTransactionData={setTransactionData}
        setMyInvites={setMyInvites}
        userProfile={userProfile}
      />
    </>
  );

  // All hooks and logic must be before the return statement

// Separate component for Modals to keep main render clean
const TransactionsModals = ({
  modalVisible, confirmVisible, successModalVisible, transactionDetailsModalVisible, cancelConfirmModalVisible,
  invite, transactionData,
  setModalVisible, setConfirmVisible, setSuccessModalVisible, setTransactionDetailsModalVisible, setCancelConfirmModalVisible,
  navigation, setInvite, setTransactionData, setMyInvites, userProfile
}) => {
  return (
    <>
      <CouriModal
        key={modalVisible ? 'open' : 'closed'}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGetStarted={(option) => {
          setModalVisible(false);
          if (option === 'sell') {
            navigation.navigate('SellerProductForm', { type: option, userProfile, showSizeWarning: true });
          } else {
            navigation.navigate('URL', { type: option, userProfile, showSizeWarning: true });
          }
        }}
      />

      <ConfirmInviteModal
        visible={confirmVisible}
        invite={invite}
        onClose={() => setConfirmVisible(false)}
        onAccept={async () => {
          try {
            setConfirmVisible(false);
            console.log('🎉 Person 2 accepting invite, inviteId:', invite?.id || invite?.transactionId);

            const inviteId = invite?.id || invite?.transactionId;
            if (!inviteId) throw new Error('Invalid invitation');

            const result = await acceptInvite(inviteId);

            console.log('✅ Invitation accepted successfully:', result);
            setInvite(null);

            setMyInvites(prev => prev.map(inv =>
              inv.id === inviteId ? { ...inv, status: 'accepted' } : inv
            ));

            Alert.alert(
              'Invitation Accepted!',
              `The seller (${invite?.seller || 'seller'}) has been notified.`,
              [{ text: 'OK' }]
            );

          } catch (e) {
            console.error('❌ Error accepting invitation:', e);
            Alert.alert('Error', e.message || 'Failed to accept invitation.');
          }
        }}
      />

      <TransactionAcceptedModal
        visible={successModalVisible}
        onClose={() => setSuccessModalVisible(false)}
      />

      <TransactionDetailsModal
        visible={transactionDetailsModalVisible}
        onClose={() => setTransactionDetailsModalVisible(false)}
        transactionData={transactionData}
        navigation={navigation}
      />

      <Modal
        visible={cancelConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelConfirmModalVisible(false)}
      >
        <View style={cancelConfirmModalStyles.overlay}>
          <View style={cancelConfirmModalStyles.modalContent}>
            <Text style={cancelConfirmModalStyles.title}>
              Cancel Transaction?
            </Text>
            <Text style={cancelConfirmModalStyles.description}>
              Are you sure you want to cancel this transaction? This action cannot be undone.
            </Text>

            <View style={cancelConfirmModalStyles.buttonContainer}>
              <TouchableOpacity
                style={cancelConfirmModalStyles.keepButton}
                onPress={() => setCancelConfirmModalVisible(false)}
              >
                <Text style={cancelConfirmModalStyles.keepButtonText}>Keep Transaction</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={cancelConfirmModalStyles.cancelButton}
                onPress={() => {
                  setTransactionData(null);
                  setCancelConfirmModalVisible(false);
                  console.log('Transaction cancelled');
                }}
              >
                <Text style={cancelConfirmModalStyles.cancelButtonText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Show error alert when inviteError is set
useEffect(() => {
  if (inviteError) {
    Alert.alert(
      'Invitation Error',
      inviteError,
      [
        {
          text: 'Request New Invite',
          onPress: () => {
            setInviteError(null);
            // Could navigate to a screen to request new invite
          }
        },
        { text: 'OK', onPress: () => setInviteError(null) }
      ]
    );
  }
}, [inviteError]);

// Real-time subscription for invite acceptance (Person 1 waiting for Person 2)
useInviteRealtime(
  transactionData?.transactionId || transactionData?.id,
  (data) => {
    console.log('🎉 Invite accepted via real-time:', data);
    setSuccessModalVisible(true);
    // Refetch invites to update list
    if (userProfile?.id) {
      listMyInvites({ mine: true }).then(invites => {
        setMyInvites(invites);
      }).catch(err => console.error('Error refetching invites:', err));
    }
  },
  (data) => {
    console.log('❌ Invite declined via real-time:', data);
    Alert.alert('Invitation Declined', 'The other party has declined your invitation.');
    setTransactionData(null);
  }
);

// Preload Welcomepage-specific images when component mounts
useEffect(() => {
  const preloadWelcomepageImages = async () => {
    const welcomepageImages = [
      userProfile?.avatar_url
    ].filter(Boolean);

    await imagePreloader.preloadScreenImages('Welcomepage', welcomepageImages);
  };

  if (userProfile?.avatar_url) {
    preloadWelcomepageImages();
  }
}, [userProfile?.avatar_url]);

// All other hooks must be called in the same order every time
const { user, customUser, setCustomUser } = useUser();
const waveAnim = useRef(new Animated.Value(0)).current;

/* ----- Handle transaction data from Share.js ----- */
useEffect(() => {
  if (route?.params?.transactionData) {
    setTransactionData(route.params.transactionData);
    console.log('✅ Transaction data loaded:', route.params.transactionData);
  }
}, [route?.params?.transactionData]);

/* ----- Deep link handling: handle invitation deep links ----- */
const handleIncomingUrl = async (url) => {
  if (!url) return;
  try {
    console.log('🔗 Handling incoming URL:', url);

    // Check if this is from route params (already passed via navigation)
    if (route?.params?.inviteTransaction) {
      console.log('✅ Invite data from route params:', route.params.inviteTransaction);
      const inviteData = route.params.inviteTransaction;

      setInvite({
        transactionId: inviteData.id,
        title: inviteData.title,
        price: inviteData.price,
        image: inviteData.image,
        description: inviteData.description,
        seller: inviteData.seller,
        sellerId: inviteData.sellerId,
        source: inviteData.source,
        fromDeepLink: true
      });
      return;
    }

    // Parse URL for legacy base64 encoded data
    const parsed = Linking.parse(url);
    if (parsed?.queryParams?.data && typeof parsed.queryParams.data === 'string') {
      const payload = decodeInvite(parsed.queryParams.data);

      // Check if current user is the buyer who created the link
      const isCurrentUserBuyer = userProfile?.id && payload?.buyerId &&
        userProfile.id === payload.buyerId;

      if (isCurrentUserBuyer) {
        // If current user is the buyer, show transaction review state
        setTransactionData({
          productTitle: payload.title,
          productImage: payload.image,
          productPrice: payload.price,
          seller: payload.seller,
          status: 'reviewing',
          transactionType: 'buy',
          transactionId: payload.transactionId
        });
        console.log('✅ Buyer clicked own link - showing transaction review state');
      } else {
        // If someone else clicked the link, show invite modal
        setInvite(payload);
        console.log('✅ Someone else clicked link - showing invite modal');
      }
    } else if (parsed?.queryParams?.id && typeof parsed.queryParams.id === 'string') {
      // Fetch transaction by ID from backend
      const transactionId = parsed.queryParams.id;
      console.log('📥 Fetching transaction by ID:', transactionId);
      // This will be handled by App.js deep link handler
    }
  } catch (e) {
    console.log('❌ Invalid invite link:', e);
  }
};

useEffect(() => {
  (async () => {
    try {
      const initial = await Linking.getInitialURL();
      await handleIncomingUrl(initial);
    } catch (e) {
      console.log('Linking getInitialURL error', e);
    }
  })();
}, [userProfile]);

useEffect(() => {
  const sub = Linking.addEventListener('url', ({ url }) => handleIncomingUrl(url));
  return () => sub.remove();
}, [userProfile]);

/* ----- Realtime listener: Person 1 waits for Person 2 to accept ----- */
useEffect(() => {
  // Only subscribe if we have a transaction ID to listen for
  if (!transactionData?.transactionId) return;

  console.log('📡 Setting up realtime listener for transaction:', transactionData.transactionId);

  const channelName = `transaction:${transactionData.transactionId}`;
  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  channel
    .on('broadcast', { event: 'transaction-accepted' }, (payload) => {
      const { transactionId, acceptedAt, inviteeId } = payload?.payload || {};
      console.log('🎉 Real-time notification: Invite accepted!', {
        transactionId,
        acceptedAt,
        inviteeId
      });

      if (transactionId === transactionData.transactionId) {
        // Show success modal to Person 1
        setSuccessModalVisible(true);
        console.log('✅ Showing acceptance notification to Person 1');
      }
    })
    .on('broadcast', { event: 'transaction-declined' }, (payload) => {
      const { transactionId } = payload?.payload || {};
      console.log('❌ Real-time notification: Invite declined', { transactionId });

      if (transactionId === transactionData.transactionId) {
        // Show alert to Person 1
        Alert.alert(
          'Invitation Declined',
          'The other party has declined your transaction invitation.',
          [{ text: 'OK' }]
        );
        // Clear transaction data
        setTransactionData(null);
      }
    })
    .subscribe((status) => {
      console.log('📡 Realtime channel subscription status:', status);
    });

  return () => {
    console.log('🔌 Unsubscribing from realtime channel:', channelName);
    channel.unsubscribe();
  };
}, [transactionData?.transactionId]);

/* ----- Original safety checks / session logic (unchanged) ----- */
useEffect(() => {
  const checkJustCreatedAccount = async () => {
    const justCreatedAccount = await AsyncStorage.getItem('justCreatedAccount');
    if (justCreatedAccount === 'true') {
      setJustCompletedAccountCreation(true);
      return;
    }
    if (route?.params?.userData) {
      setJustCompletedAccountCreation(true);
      await AsyncStorage.setItem('justCreatedAccount', 'true');
    }
  };
  checkJustCreatedAccount();
}, [route?.params?.userData]);

useEffect(() => {
  const checkAsyncStorage = async () => {
    try {
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      const userProfileData = await AsyncStorage.getItem('userProfileData');
      console.log('🔍 tempUserData:', tempUserData ? JSON.parse(tempUserData) : null);
      console.log('🔍 userProfileData:', userProfileData ? JSON.parse(userProfileData) : null);
    } catch (error) {
      console.log('AsyncStorage check error:', error);
    }
  };
  checkAsyncStorage();

  const checkUserAccess = async () => {
    try {
      if (justCompletedAccountCreation) return;

      const justCreatedAccount = await AsyncStorage.getItem('justCreatedAccount');
      if (justCreatedAccount === 'true') {
        setJustCompletedAccountCreation(true);
        return;
      }
      if (route?.params?.userData) {
        setJustCompletedAccountCreation(true);
        await AsyncStorage.setItem('justCreatedAccount', 'true');
        return;
      }

      // Check if user has saved data in AsyncStorage first
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      const userProfileData = await AsyncStorage.getItem('userProfileData');

      // If user has saved data, they should stay on Welcomepage
      if (tempUserData || userProfileData) {
        console.log('✅ Welcomepage: User has saved data, staying on Welcomepage');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user && !user && !customUser) {
        console.log('⚠️ Welcomepage: No session, no user data, redirecting to Home');
        navigation.replace('Home');
        return;
      }
      if (session?.user) {
        try {
          const { exists } = await UserService.checkUserExists(session.user.email);
          if (!exists) {
            await supabase.auth.signOut();
            navigation.replace('Home');
            return;
          }
        } catch (dbCheckError) {
          console.log('DB check error:', dbCheckError);
        }
      }
    } catch (error) {
      console.log('User access check error:', error);
    }
  };

  const timer = setTimeout(() => checkUserAccess(), 100);
  return () => clearTimeout(timer);
}, [user, customUser, navigation, justCompletedAccountCreation, route?.params?.userData]);

// Temporarily disabled aggressive error catching
// useEffect(() => {
//   const originalConsoleError = console.error;
//   console.error = (...args) => {
//     console.log('🚨 Console error in Welcomepage:', args);
//     originalConsoleError.apply(console, args);
//     // Use setTimeout to avoid updating state during render
//     setTimeout(() => setHasError(true), 0);
//   };
//   return () => {
//     console.error = originalConsoleError;
//   };
// }, []);

useEffect(() => {
  const unsubscribe = navigation.addListener('state', () => { });
  const focusListener = navigation.addListener('focus', () => { });
  const blurListener = navigation.addListener('blur', () => { });
  return () => {
    unsubscribe();
    focusListener();
    blurListener();
  };
}, [navigation]);


const name = userProfile
  ? (userProfile?.firstName ||
    userProfile?.full_name?.split(' ')[0] ||
    userProfile?.name?.split(' ')[0] ||
    route?.params?.userData?.firstName ||
    route?.params?.name ||
    'there')
  : 'there';

// Debug logging to help identify the name duplication issue
console.log('🔍 Welcomepage DEBUG - Name resolution:', {
  userProfile: userProfile ? {
    firstName: userProfile.firstName,
    full_name: userProfile.full_name,
    name: userProfile.name
  } : null,
  routeParams: {
    name: route?.params?.name,
    userDataFirstName: route?.params?.userData?.firstName
  },
  finalName: name
});

const resolveAvatarUrlFromPath = async (path) => {
  if (!path) return null;
  const pub = supabase.storage.from('avatars').getPublicUrl(path)?.data?.publicUrl;
  if (pub) return `${pub}?v=${Date.now()}`;
  try {
    const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 600);
    return data?.signedUrl || null;
  } catch {
    return null;
  }
};

useEffect(() => {
  const fetchUserProfile = async () => {
    try {
      if (route?.params?.userData) {
        const userData = route.params.userData;
        const userProfileData = {
          ...userData,
          id: userData.id || 'temp_user',
          name: userData.firstName || userData.name || userData.full_name || '',
          full_name:
            userData.full_name ||
            `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
            userData.name ||
            '',
          avatar_url: userData.avatar_url || userData.profileImageUri || '',
          profileImageUri: userData.profileImageUri || userData.avatar_url || '',
          email: userData.email || '',
          firstName: userData.firstName || userData.name?.split(' ')[0] || '',
          lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || '',
          phone: userData.phone || '',
          address1: userData.address1 || userData.address_line_1 || '',
          address2: userData.address2 || userData.address_line_2 || '',
          city: userData.city || '',
          state: userData.state || '',
          zip: userData.zip || userData.zip_code || '',
          isGoogleAuth: userData.isGoogleAuth || false,
        };
        setUserProfile(userProfileData);
        try {
          await AsyncStorage.setItem('tempUserData', JSON.stringify(userProfileData));
          await AsyncStorage.setItem('userProfileData', JSON.stringify(userProfileData));
          await AsyncStorage.removeItem('userLastAction');
          setTimeout(async () => {
            await AsyncStorage.removeItem('justCreatedAccount');
            setJustCompletedAccountCreation(false);
          }, 2000);
        } catch (storageError) {
          console.log('Error storing user data in AsyncStorage:', storageError);
        }
        return;
      }

      const userProfileData = await AsyncStorage.getItem('userProfileData');
      if (userProfileData) {
        const parsed = JSON.parse(userProfileData);
        await AsyncStorage.removeItem('userLastAction');
        setTimeout(async () => {
          await AsyncStorage.removeItem('justCreatedAccount');
          setJustCompletedAccountCreation(false);
        }, 2000);
        setUserProfile({
          id: parsed.id,
          name:
            parsed.name ||
            parsed.full_name ||
            `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim(),
          full_name:
            parsed.full_name ||
            parsed.name ||
            `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim(),
          avatar_url: parsed.avatar_url || parsed.profileImageUri || '',
          profileImageUri: parsed.profileImageUri || parsed.avatar_url || '',
          email: parsed.email,
          firstName: parsed.firstName || parsed.name?.split(' ')[0] || '',
          lastName: parsed.lastName || parsed.name?.split(' ').slice(1).join(' ') || '',
          phone: parsed.phone || '',
          address1: parsed.address1 || parsed.address_line_1 || '',
          address2: parsed.address2 || parsed.address_line_2 || '',
          city: parsed.city || '',
          state: parsed.state || '',
          zip: parsed.zip || parsed.zip_code || '',
          isGoogleAuth: parsed.isGoogleAuth || false,
        });
      } else {
        if (user) {
          setUserProfile({
            id: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name,
            full_name: user.user_metadata?.full_name,
            firstName: user.user_metadata?.given_name || user.user_metadata?.name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || '',
            lastName: user.user_metadata?.family_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            avatar_url: user.user_metadata?.avatar_url,
            email: user.email,
          });
        }
      }
    } catch (error) {
      console.log('Error fetching user profile in Welcomepage:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchUserProfile();
}, [user, route?.params?.userData]);

useFocusEffect(
  React.useCallback(() => {
    let isMounted = true;

    const refreshProfilePicture = async () => {
      try {
        const tempUserData = await AsyncStorage.getItem('tempUserData');
        const userProfileData = await AsyncStorage.getItem('userProfileData');
        if (tempUserData || userProfileData) {
          const tempData = tempUserData ? JSON.parse(tempUserData) : {};
          const profileData = userProfileData ? JSON.parse(userProfileData) : {};
          const mergedData = { ...profileData, ...tempData };
          if (mergedData.avatar_url || mergedData.profileImageUri) {
            if (isMounted) {
              setUserProfile((prev) => ({
                ...prev,
                avatar_url: mergedData.avatar_url || mergedData.profileImageUri,
                profileImageUri: mergedData.profileImageUri || mergedData.avatar_url,
              }));
            }
          }
        }
      } catch (error) {
        console.log('Error refreshing profile picture:', error);
      }
    };

    const checkTransactionStatus = async () => {
      if (isMounted) {
        await checkForTransactionAcceptance();
      }
    };

    // Refetch invites when screen comes into focus
    const refetchInvites = async () => {
      if (!userProfile?.id) return;

      try {
        console.log('🔄 Refetching invites on screen focus...');
        const invites = await listMyInvites({ mine: true });
        if (isMounted) {
          setMyInvites(invites);
          console.log('✅ Invites refetched:', invites.length);
        }
      } catch (error) {
        console.error('❌ Error refetching invites:', error);
      }
    };

    refreshProfilePicture();
    checkTransactionStatus();
    refetchInvites();

    return () => {
      isMounted = false;
    };
  }, [transactionData, userProfile?.id])
);

// Disable swipe back gesture - Multiple approaches for reliability
useFocusEffect(
  React.useCallback(() => {
    // Method 1: Disable on parent navigator
    navigation.getParent()?.setOptions({
      gestureEnabled: false,
    });

    // Method 2: Disable on current screen
    navigation.setOptions({
      gestureEnabled: false,
    });

    // Method 3: Disable on the stack navigator if available
    const stackNavigator = navigation.getParent();
    if (stackNavigator) {
      stackNavigator.setOptions({
        gestureEnabled: false,
      });
    }

    return () => {
      // Re-enable gestures when leaving
      navigation.getParent()?.setOptions({
        gestureEnabled: true,
      });
      navigation.setOptions({
        gestureEnabled: true,
      });
      if (stackNavigator) {
        stackNavigator.setOptions({
          gestureEnabled: true,
        });
      }
    };
  }, [navigation])
);

// Additional PanResponder to block any swipe gestures
const panResponder = PanResponder.create({
  onStartShouldSetPanResponder: () => true,
  onMoveShouldSetPanResponder: () => true,
  onPanResponderGrant: () => {
    // Block any pan gestures
  },
  onPanResponderMove: () => {
    // Block any pan gestures
  },
  onPanResponderRelease: () => {
    // Block any pan gestures
  },
});

const handleSignOut = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.auth.signOut();
    }
    try {
      await AsyncStorage.removeItem('tempUserData');
      await AsyncStorage.removeItem('userProfileData');
      await AsyncStorage.setItem('userLastAction', 'sign_out');
      // Clear user journey tracking
      await AsyncStorage.removeItem('userJourney_gotItClicked');
      await AsyncStorage.removeItem('userJourney_yesAvailable');
      await AsyncStorage.removeItem('userJourney_noAvailable');
      await AsyncStorage.removeItem('userJourney_timeConfirmed');
      await AsyncStorage.removeItem('userJourney_confirmationCompleted');
    } catch { }
    if (setCustomUser) setCustomUser(null);
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  } catch {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }
};

const handleDeleteAccount = async () => {
  try {
    setLoading(true);
    try {
      await AsyncStorage.removeItem('tempUserData');
      await AsyncStorage.removeItem('userProfileData');
      await AsyncStorage.setItem('userLastAction', 'delete_account');
      // Clear user journey tracking
      await AsyncStorage.removeItem('userJourney_gotItClicked');
      await AsyncStorage.removeItem('userJourney_yesAvailable');
      await AsyncStorage.removeItem('userJourney_noAvailable');
      await AsyncStorage.removeItem('userJourney_timeConfirmed');
      await AsyncStorage.removeItem('userJourney_confirmationCompleted');
    } catch { }
    if (setCustomUser) setCustomUser(null);
    try {
      await supabase.auth.signOut();
    } catch { }
    navigation.replace('Home');
  } catch {
    navigation.replace('Home');
  } finally {
    setLoading(false);
  }
};

// Function to trigger success modal (simulates Person 2 accepting the invite)
const triggerTransactionAccepted = async (transactionId) => {
  console.log('🚀 triggerTransactionAccepted called with transactionId:', transactionId);
  setSuccessModalVisible(true);
  // Update transaction status to accepted
  if (transactionData) {
    setTransactionData(prev => ({
      ...prev,
      status: 'accepted'
    }));
  }
  // Store in AsyncStorage to simulate cross-device notification
  await AsyncStorage.setItem('transactionAccepted', transactionId || 'true');
  console.log('💾 Stored transactionAccepted in AsyncStorage:', transactionId || 'true');
};

// Check for transaction acceptance from other devices
const checkForTransactionAcceptance = async () => {
  try {
    const transactionAccepted = await AsyncStorage.getItem('transactionAccepted');
    console.log('🔍 Checking transaction acceptance:', {
      transactionAccepted,
      currentTransactionId: transactionData?.transactionId,
      currentStatus: transactionData?.status
    });

    if (transactionAccepted && transactionData && transactionData.status !== 'accepted') {
      // Check if the accepted transaction matches the current transaction
      // Be more lenient - if there's any transactionAccepted flag, show the modal
      if (transactionAccepted === transactionData.transactionId ||
        transactionAccepted === 'true' ||
        transactionAccepted.length > 0) {
        console.log('✅ Transaction accepted! Showing success modal');
        setSuccessModalVisible(true);
        setTransactionData(prev => ({
          ...prev,
          status: 'accepted'
        }));
        // Clear the flag
        await AsyncStorage.removeItem('transactionAccepted');
      }
    }
  } catch (error) {
    console.error('Error checking transaction acceptance:', error);
  }
};

useEffect(() => {
  Animated.sequence([
    Animated.timing(waveAnim, { toValue: 15, duration: 300, useNativeDriver: true }),
    Animated.timing(waveAnim, { toValue: -10, duration: 300, useNativeDriver: true }),
    Animated.timing(waveAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
  ]).start();
}, []);

// Poll for transaction acceptance when user has an active transaction
useEffect(() => {
  let interval;
  if (transactionData && transactionData.status !== 'accepted') {
    console.log('🔄 Starting polling for transaction acceptance');
    interval = setInterval(async () => {
      await checkForTransactionAcceptance();
    }, 2000); // Check every 2 seconds
  }
  return () => {
    if (interval) {
      console.log('🛑 Stopping polling for transaction acceptance');
      clearInterval(interval);
    }
  };
}, [transactionData]);

// Add error boundary to prevent hooks issues
if (hasError) {
  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.wrapper}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setHasError(false)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          {renderContent()}
        </View>
      </ScrollView>
    </View>
  );
}

/* -----------------------------
   Styles (Redesigned)
------------------------------*/
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1E1E1E' }, // Dark background
  wrapper: { flex: 1 },
  scrollContainer: { flex: 1, backgroundColor: '#1E1E1E' },
  scrollContentContainer: { flexGrow: 1, paddingBottom: 40 },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 50, // Increased to move everything down
    zIndex: 10,
  },
  logo: { width: 90, height: 40 },
  profileContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#fff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Main Content Area
  mainContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 30, // Added padding to push content down
  },

  // Map Container
  mapContainer: {
    height: 300,
    width: '100%',
    marginHorizontal: -24, // Break out of parent padding to cover full width
    marginTop: -120, // Reduced negative margin to move down
    marginBottom: 20,
    position: 'relative',
    overflow: 'visible', // Allow wider images to show
    borderRadius: 0,
  },
  
  // Map background image
  mapBackgroundImage: {
    position: 'absolute',
    top: -50, // Moved down (less negative)
    left: -100, // Extend further horizontally
    right: -100, // Extend further horizontally
    bottom: -20, // Keep bottom in same position
    width: '150%', // Wider horizontally and zoomed in
    height: '200%', // Increased vertical size
  },
  
  // Route line image overlay
  routeImage: {
    position: 'absolute',
    top: 110, // Moved down to match map
    left: '10%', // Center horizontally (10% left margin for 80% width = centered)
    right: '10%',
    bottom: 0,
    width: '80%',
    height: '80%',
    zIndex: 1,
  },
  
  // Driver icon at top of route
  driverIcon: {
    position: 'absolute',
    top: 75, // Position at top of route (matching routeImage top)
    left: '52%', // Match route positioning
    width: 85, // Size of the icon
    height: 80,
    zIndex: 3, // Above route line
  },
  
  // Shoes image at origin/start of route
  shoesImage: {
    position: 'absolute',
    bottom: 80, // Position at bottom/start of route
    left: '19%', // Position on the left side where route starts
    width: 90, // Size of the icon
    height: 90,
    zIndex: 3, // Above route line
    backgroundColor: 'transparent', // Ensure transparent background
  },
  
  // Home logo at destination/end of route
  homeLogo: {
    position: 'absolute',
    bottom: -46, // Position at bottom/end of route
    right: '12%', // Position on the right side where route ends
    width: 85, // Size of the icon
    height: 80,
    zIndex: 3, // Above route line
    backgroundColor: 'transparent', // Ensure transparent background
  },
  
  // Gradient overlay at top
  gradientTop: {
    position: 'absolute',
    top: -100, // Moved up
    left: -50, // Extend beyond edges for full coverage
    right: -80,
    width: '120%', // Wider than container for full screen coverage
    height: 200, // Cover top portion for fade effect
    zIndex: 2,
  },

  // Headings
  mainHeading: {
    fontSize: 28,
    fontWeight: '400',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subHeading: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 32,
  },

  // Selection Buttons
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
    gap: 20,
  },
  selectionCard: {
    flex: 1,
    aspectRatio: 1, // Square
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectionCardActive: {
    borderColor: '#5D72FB', // Border color when selected
    backgroundColor: 'rgba(84, 102, 222, 0.29)', // Background color when selected
    elevation: 10,
    shadowColor: '#5D72FB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  selectionIcon: {
    width: 32,
    height: 32,
    marginBottom: 12,
    tintColor: '#fff', // Make icons white
  },
  selectionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },

  // Get Started Button
  getStartedButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#000',
  },
  getStartedButtonDisabled: {
    opacity: 0.5,
  },
  getStartedButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },

  // Existing component styling needed for Invites/Transactions if they appear
  // ... adapt these to dark mode if needed
  transactionStatusText: { fontSize: 16, color: '#fff', textAlign: 'center', marginBottom: 20 },
  headline: { fontSize: 24, fontWeight: '400', textAlign: 'center', marginTop: 20, marginBottom: 10, color: '#fff' },
  subheadline: { fontSize: 16, color: '#ccc', textAlign: 'center', marginBottom: 20 },
  noLongerAvailableText: { fontSize: 16, color: '#5d72fb', textDecorationLine: 'underline' },
  viewDetailsButton: { backgroundColor: '#fff', borderRadius: 25, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12, alignItems: 'center', width: '100%' },
  viewDetailsText: { color: '#000', fontSize: 16, fontWeight: '600' },

  // Modals (keep mostly same, maybe update overlay opacity)
  // ...
});

const modalStyles = StyleSheet.create({
  // ... existing modal styles (can be kept or updated if used)
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayTouchable: { flex: 1 },
  modalContainer: {
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 32,
    paddingTop: 24,
    width: '100%',
    minHeight: 500,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: { width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, marginBottom: 32 },
  headerContainer: { alignItems: 'center', marginBottom: 32 },
  headerLine1: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#000', lineHeight: 36, marginBottom: 4 },
  headerLine2: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#000', lineHeight: 36 },
  choiceContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 32, gap: 16 },
  choiceButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    minHeight: 120,
    justifyContent: 'center',
  },
  choiceButtonActive: { borderColor: '#10b981', backgroundColor: '#fff' },
  choiceIconContainer: { marginBottom: 12, alignItems: 'center' },
  choiceIcon: { width: 36, height: 36, marginBottom: 12 },
  choiceText: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  description: { fontSize: 16, color: '#000', textAlign: 'center', marginBottom: 32, lineHeight: 22, paddingHorizontal: 8 },
  getStartedButton: { backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 50, borderWidth: 1, borderColor: '#000', width: '100%' },
  getStartedButtonActive: { backgroundColor: '#000', borderColor: '#000' },
  getStartedText: { color: '#666', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  getStartedTextActive: { color: '#fff' },
  // Error boundary styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

const sizeWarningModalStyles = StyleSheet.create({
  overlay: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  bodyText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  understandButton: {
    backgroundColor: '#242422',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  understandButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});