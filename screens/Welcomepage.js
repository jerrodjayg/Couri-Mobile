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
   Bottom-sheet choice modal
------------------------------*/
const CouriModal = ({ visible, onClose, onGetStarted }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isGetStartedEnabled, setIsGetStartedEnabled] = useState(false);
  const panAnim = useRef(new Animated.Value(0)).current;

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
            toValue: 400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            panAnim.setValue(0);
          });
        } else {
          Animated.spring(panAnim, {
            toValue: 0,
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.overlayTouchable} onPress={onClose} activeOpacity={1} />
        <Animated.View
          style={[modalStyles.modalContainer, { transform: [{ translateY: panAnim }] }]}
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
      <View style={transactionCardStyles.content}>
        <View style={transactionCardStyles.details}>
          <Text style={transactionCardStyles.productTitle}>
            "{transactionData?.productTitle || 'Product'}"
          </Text>
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
   WELCOME PAGE
------------------------------*/
export default function Welcomepage({ route, navigation }) {
  // All state hooks must be called in the same order every time
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [justCompletedAccountCreation, setJustCompletedAccountCreation] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [invite, setInvite] = useState(null); // 👈 incoming invite payload
  const [transactionData, setTransactionData] = useState(null); // 👈 transaction data from Share.js
  const [successModalVisible, setSuccessModalVisible] = useState(false); // 👈 success modal for accepted transaction

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

  /* ----- Deep link handling: parse ?data=... or ?id=... ----- */
  const handleIncomingUrl = async (url) => {
    if (!url) return;
    try {
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
        // TODO: fetch by ID from your backend if using short links
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

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user && !user && !customUser) {
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

  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      console.log('🚨 Console error in Welcomepage:', args);
      originalConsoleError.apply(console, args);
      // Use setTimeout to avoid updating state during render
      setTimeout(() => setHasError(true), 0);
    };
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {});
    const focusListener = navigation.addListener('focus', () => {});
    const blurListener = navigation.addListener('blur', () => {});
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
      
      refreshProfilePicture();
      checkTransactionStatus();
      
      return () => {
        isMounted = false;
      };
    }, [transactionData])
  );

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
      } catch {}
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
      } catch {}
      if (setCustomUser) setCustomUser(null);
      try {
        await supabase.auth.signOut();
      } catch {}
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
      console.log('Error checking transaction acceptance:', error);
    }
  };

  const getUserInitials = () => {
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      if (names.length >= 2) return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      if (names.length === 1) return names[0].charAt(0).toUpperCase();
    }
    if (userProfile?.name) {
      const names = userProfile.name.split(' ');
      if (names.length >= 2) return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      if (names.length === 1) return names[0].charAt(0).toUpperCase();
    }
    if (route?.params?.userData?.firstName && route?.params?.userData?.lastName) {
      return (
        route.params.userData.firstName.charAt(0) + route.params.userData.lastName.charAt(0)
      ).toUpperCase();
    }
    if (route?.params?.userData?.userInitials) return route.params.userData.userInitials;
    return 'U';
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
      <SafeAreaView style={styles.safeArea}>
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
      </SafeAreaView>
    );
  }

  // Check if we should make the screen scrollable (when there's transaction data)
  const shouldBeScrollable = transactionData !== null;

  const renderContent = () => (
    <>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Image source={require('../assets/Logo_Dark.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <TouchableOpacity onPress={userProfile ? () => navigation.navigate('MyAccount', { userData: userProfile }) : () => navigation.navigate('Login')} style={styles.profileContainer}>
          {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
            <OptimizedImage 
              source={{ uri: userProfile.avatar_url }} 
              style={styles.profileImage}
              showLoadingIndicator={false}
              placeholder={
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitials}>{userProfile ? getUserInitials() : '?'}</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>{userProfile ? getUserInitials() : '?'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* White Block */}
      <View style={styles.whiteBlock}>
        <View style={styles.whiteBlockInner}>
          <View style={styles.welcomeRow}>
            <Animated.Text
              style={[
                styles.wave,
                {
                  transform: [
                    {
                      rotate: waveAnim.interpolate({
                        inputRange: [-15, 15],
                        outputRange: ['-15deg', '15deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              👋🏻
            </Animated.Text>
            <Text style={styles.welcomeText}>WELCOME, {name.toUpperCase()}!</Text>
          </View>

          {/* Headline / subheadline switch when invite exists, transaction data exists, or new Google user */}
          <Text style={styles.headline}>
            {invite ? "You've been invited to a transaction" : 
             transactionData ? "The seller is reviewing your transaction" :
             "Let's get started."}
          </Text>

          {/* Status message for transaction review */}
          {transactionData && (
            <Text style={styles.transactionStatusText}>
              {transactionData.status === 'accepted' 
                ? 'Your transaction was accepted! Driver is on the way.' 
                : "We'll notify you as soon as it's confirmed."}
            </Text>
          )}

          {/* NEW: inviter row directly under headline, outside the card */}
          {invite ? (
            <InviterRow seller={invite?.seller} sellerAvatar={invite?.sellerAvatar} />
          ) : transactionData ? null : (
            <Text style={styles.subheadline}>You don't have any active Couri transactions.</Text>
          )}

          {/* Transaction review card OR invite preview OR placeholder */}
          {transactionData ? (
            <>
              <TransactionReviewCard
                transactionData={transactionData}
                onViewDetails={() => {
                  // TODO: Navigate to transaction details screen
                  console.log('View transaction details');
                }}
                onCancel={() => {
                  setTransactionData(null);
                  // TODO: Handle transaction cancellation
                  console.log('Cancel transaction');
                }}
              />
              
              {/* Buttons outside the card */}
              <TouchableOpacity 
                style={styles.viewDetailsButton} 
                onPress={() => {
                  // TODO: Navigate to transaction details screen
                  console.log('View transaction details');
                }}
              >
                <Text style={styles.viewDetailsText}>View Transaction Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelTransactionButton} 
                onPress={() => {
                  setTransactionData(null);
                  // TODO: Handle transaction cancellation
                  console.log('Cancel transaction');
                }}
              >
                <Text style={styles.cancelTransactionText}>Cancel transaction</Text>
              </TouchableOpacity>

            </>
          ) : invite ? (
            <InvitePreviewCard
              invite={invite}
              onPress={() => setConfirmVisible(true)}
            />
          ) : (
            <View style={styles.placeholderBox} />
          )}

          {/* CTA switches label & behavior */}
          {userProfile ? (
            !invite && !transactionData && (
              <TouchableOpacity
                style={styles.beginButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.beginButtonText}>
                  + Begin a Transaction
                </Text>
              </TouchableOpacity>
            )
          ) : (
            !transactionData && (
              <TouchableOpacity style={styles.beginButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.beginButtonText}>Sign In to Continue</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* Pink Section */}
      <View style={styles.pinkBackground}>
        <View style={styles.infoBlock}>
          <Image source={require('../assets/mark2_dark.png')} style={styles.infoLogoImage} resizeMode="contain" />
          <Text style={styles.infoTitle}>Couri is transforming{'\n'}peer-to-peer transactions.</Text>
          <Text style={styles.infoSub}>Check out how it works.</Text>

          <TouchableOpacity 
            style={styles.learnMoreButton} 
            onPress={() => RNLinking.openURL('https://gocouri.com')}
          >
            <Text style={styles.learnMoreText}>Learn More</Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* Modals */}
      <CouriModal
        key={modalVisible ? 'open' : 'closed'}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setTimeout(() => {}, 300);
        }}
        onGetStarted={(option) => {
          setModalVisible(false);
          navigation.navigate('URL', { type: option, userProfile });
        }}
      />

      <ConfirmInviteModal
        visible={confirmVisible}
        invite={invite}
        onClose={() => setConfirmVisible(false)}
        onAccept={async () => {
          try {
            // TODO: send accept to backend here
            setConfirmVisible(false);
            console.log('🎉 Person 2 accepted invite, transactionId:', invite?.transactionId);
            // Simulate triggering success modal on Person 1's screen
            // In a real app, this would be handled via push notifications or real-time updates
            setTimeout(async () => {
              console.log('⏰ Triggering transaction accepted after 1 second delay');
              await triggerTransactionAccepted(invite?.transactionId);
            }, 1000);
            Alert.alert('Invitation accepted', 'The buyer will be notified.');
          } catch (e) {
            Alert.alert('Something went wrong', 'Please try again.');
          }
        }}
      />

      <TransactionAcceptedModal
        visible={successModalVisible}
        onClose={() => setSuccessModalVisible(false)}
      />
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {shouldBeScrollable ? (
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wrapper}>
            {renderContent()}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.wrapper}>
          {renderContent()}
        </View>
      )}
    </SafeAreaView>
  );
}

/* -----------------------------
   Styles (yours, unchanged)
------------------------------*/
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  wrapper: { flex: 1, justifyContent: 'space-between' },
  scrollContainer: { flex: 1 },
  scrollContentContainer: { flexGrow: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
  },
  logoContainer: { width: 70, height: 30, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 70, height: 30 },
  profileContainer: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  profileImage: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#000' },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: { color: '#444444', fontWeight: 'bold', fontSize: 16 },
  whiteBlock: {
    width: '100%',
    paddingTop: 20,
    paddingBottom: 43,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 400,
  },
  whiteBlockInner: { width: '100%', alignItems: 'center' },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  wave: { fontSize: 28, marginRight: 8 },
  welcomeText: { fontSize: 16, fontWeight: '600' },
  headline: { fontSize: 35, fontWeight: '400', textAlign: 'center', marginTop: 20, marginBottom: 6 },
  subheadline: { fontSize: 16, color: '#444', textAlign: 'center', marginBottom: 20 },
  transactionStatusText: { fontSize: 16, color: '#444', textAlign: 'center', marginBottom: 20 },
  placeholderBox: { width: '95%', height: 140, backgroundColor: '#eee', borderRadius: 8, marginBottom: 20 },
  viewDetailsButton: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelTransactionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelTransactionText: {
    color: '#FF0000',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  beginButton: { backgroundColor: '#000', paddingVertical: 19, paddingHorizontal: 33, borderRadius: 50, marginTop: 20 },
  beginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  pinkBackground: { backgroundColor: '#FDEAFF', alignItems: 'center', paddingBottom: 30, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: '#000' },
  infoBlock: { width: '100%', paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
  infoLogoImage: { width: 50, height: 50, marginBottom: 12 },
  infoTitle: { fontSize: 28, fontWeight: '300', textAlign: 'center', marginBottom: 8 },
  infoSub: { fontSize: 14, color: '#444', marginBottom: 20 },
  learnMoreButton: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 19, paddingHorizontal: 33, borderWidth: 2, borderColor: '#000' },
  learnMoreText: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#000' },
});

const modalStyles = StyleSheet.create({
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