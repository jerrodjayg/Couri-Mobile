import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#14171b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2c3a4b' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#98a5be' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2c3a4b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1626' }],
  },
];

export default function HeadToBuyer({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showTipPopup, setShowTipPopup] = useState(true); // Show tip popup on mount

  // Get route parameters
  const {
    userProfile: routeUserProfile,
    productDetails,
    orderDetails,
    buyerInfo,
    deliveryLocation,
    earnings,
    arrivalTime,
    distance,
    arrivalNotes,
    tipAmount,
  } = route.params || {};

  // Default buyer info
  const defaultBuyer = {
    name: 'Lana H.',
    address: '1234 Melrose Ave',
    city: 'Los Angeles, CA',
    phone: '+1234567890',
    avatar: null,
  };

  // Default delivery location (Los Angeles area)
  const defaultDelivery = {
    latitude: 34.0837,
    longitude: -118.3610,
  };

  // Current driver location (simulated)
  const driverLocation = {
    latitude: 34.0922,
    longitude: -118.3280,
  };

  const buyer = buyerInfo || defaultBuyer;
  const delivery = deliveryLocation || defaultDelivery;
  const tip = tipAmount || '$4.50';

  // Calculate map region
  const getMapRegion = () => {
    const midLat = (driverLocation.latitude + delivery.latitude) / 2;
    const midLng = (driverLocation.longitude + delivery.longitude) / 2;
    const latDelta = Math.abs(driverLocation.latitude - delivery.latitude) * 2.5;
    const lngDelta = Math.abs(driverLocation.longitude - delivery.longitude) * 2.5;

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(latDelta, 0.03),
      longitudeDelta: Math.max(lngDelta, 0.03),
    };
  };

  // Disable swipe back gesture
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        gestureEnabled: false,
      });

      return () => {
        navigation.getParent()?.setOptions({
          gestureEnabled: true,
        });
      };
    }, [navigation])
  );

  // Load user profile
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      if (routeUserProfile) {
        setUserProfile(routeUserProfile);
        console.log('✅ HeadToBuyer - Loaded user profile from route params');
        return;
      }

      const storedProfile = await AsyncStorage.getItem('userProfileData');
      const tempUserData = await AsyncStorage.getItem('tempUserData');

      if (storedProfile || tempUserData) {
        const profileData = storedProfile ? JSON.parse(storedProfile) : {};
        const tempData = tempUserData ? JSON.parse(tempUserData) : {};
        const mergedProfile = { ...profileData, ...tempData };

        console.log('✅ HeadToBuyer - Loaded user profile from AsyncStorage:', mergedProfile);
        setUserProfile(mergedProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Get user initials for profile fallback
  const getUserInitials = () => {
    if (!userProfile) return 'U';
    const firstName = userProfile.firstName || userProfile.first_name || '';
    const lastName = userProfile.lastName || userProfile.last_name || '';
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return userProfile.email?.charAt(0)?.toUpperCase() || 'U';
    return name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase();
  };

  // Get profile image
  const getProfileImage = () => {
    if (userProfile?.avatar_url || userProfile?.profileImageUri) {
      return userProfile.avatar_url || userProfile.profileImageUri;
    }
    return null;
  };

  // Handle Navigate to buyer - opens maps app
  const handleNavigateToBuyer = () => {
    const address = `${buyer.address}, ${buyer.city}`;
    const encodedAddress = encodeURIComponent(address);

    if (Platform.OS === 'ios') {
      // Open Apple Maps
      Linking.openURL(`maps://app?daddr=${encodedAddress}`);
    } else {
      // Open Google Maps on Android
      Linking.openURL(`google.navigation:q=${encodedAddress}`);
    }
  };

  // Handle Arrived at buyer's location
  const handleArrivedAtBuyer = () => {
    navigation.navigate('DeliverToBuyerPhoto2', {
      productDetails,
      orderDetails,
      userProfile,
      buyerInfo: buyer,
    });
  };

  // Handle Call buyer
  const handleCallBuyer = () => {
    const phoneNumber = buyer.phone || '+1234567890';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  // Toggle more details modal
  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  // Handle tip popup dismiss
  const handleDismissTip = () => {
    setShowTipPopup(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBF9" />

      {/* Top Header Section */}
      <SafeAreaView style={styles.headerSection}>
        <View style={styles.headerContent}>
          {/* Couri Logo */}
          <Image
            source={require('../assets/Logo_Dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Profile Picture */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('MyAccount')}
          >
            {getProfileImage() ? (
              <Image source={{ uri: getProfileImage() }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileFallback}>
                <Text style={styles.profileInitials}>{getUserInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Head to the buyer for product delivery</Text>

          {/* Navigate to buyer link */}
          <TouchableOpacity style={styles.navigateLink} onPress={handleNavigateToBuyer}>
            <Text style={styles.navigateLinkText}>Navigate to buyer</Text>
            <Text style={styles.navigateArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={getMapRegion()}
          customMapStyle={darkMapStyle}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {/* Route line */}
          <Polyline
            coordinates={[
              { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
              { latitude: delivery.latitude, longitude: delivery.longitude },
            ]}
            strokeColor="#FFFFFF"
            strokeWidth={2}
            lineDashPattern={[10, 5]}
          />

          {/* Driver location marker */}
          <Marker coordinate={driverLocation}>
            <View style={styles.driverMarker}>
              <View style={styles.driverMarkerInner}>
                <Text style={styles.markerIcon}>∞</Text>
              </View>
            </View>
          </Marker>

          {/* Buyer location marker */}
          <Marker coordinate={delivery}>
            <View style={styles.buyerMarker}>
              <Text style={styles.markerIcon}>🏠</Text>
            </View>
          </Marker>

          {/* Previous seller marker (faded) */}
          <Marker
            coordinate={{
              latitude: delivery.latitude + 0.01,
              longitude: delivery.longitude - 0.02,
            }}
          >
            <View style={[styles.buyerMarker, { opacity: 0.5 }]}>
              <Text style={styles.markerIcon}>👤</Text>
            </View>
          </Marker>
        </MapView>

        {/* Arrived Button overlaid on map */}
        <View style={styles.arrivedButtonContainer}>
          <TouchableOpacity style={styles.arrivedButton} onPress={handleArrivedAtBuyer}>
            <Text style={styles.arrivedButtonText}>Arrived at buyer's location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Info Row */}
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            {arrivalTime || '12 min'} arrival {'  |  '} {distance || '4 miles'}
          </Text>
          <Text style={styles.earningsText}>{earnings || '$21.50'}</Text>
        </View>

        <View style={styles.divider} />

        {/* Buyer Info */}
        <View style={styles.buyerSection}>
          <View style={styles.buyerAvatar}>
            {buyer.avatar ? (
              <Image source={{ uri: buyer.avatar }} style={styles.buyerAvatarImage} />
            ) : (
              <View style={styles.buyerAvatarFallback}>
                <Text style={styles.buyerAvatarInitial}>{buyer.name?.charAt(0) || 'L'}</Text>
              </View>
            )}
          </View>

          <View style={styles.buyerInfo}>
            <Text style={styles.buyerName}>{buyer.name}</Text>
            <Text style={styles.buyerAddress}>{buyer.address}</Text>
            <Text style={styles.buyerCity}>{buyer.city}</Text>
          </View>

          <TouchableOpacity style={styles.callButton} onPress={handleCallBuyer}>
            <Text style={styles.callIcon}>📞</Text>
            <Text style={styles.callText}>Call</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* More Details */}
        <TouchableOpacity style={styles.moreDetailsRow} onPress={toggleModal}>
          <Text style={styles.moreDetailsText}>More details</Text>
          <Text style={styles.chevron}>{isModalVisible ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {/* More Details Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={toggleModal} />
          <View style={styles.modalContent}>
            {/* Info Row */}
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                {arrivalTime || '12 min'} arrival {'  |  '} {distance || '4 miles'}
              </Text>
              <Text style={styles.earningsText}>{earnings || '$21.50'}</Text>
            </View>

            <View style={styles.divider} />

            {/* More Details Header */}
            <TouchableOpacity style={styles.moreDetailsRow} onPress={toggleModal}>
              <Text style={styles.moreDetailsText}>More details</Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Arrival Notes */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Delivery notes</Text>
              <Text style={styles.detailContent}>
                {arrivalNotes || 'Leave at front door if no answer.'}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Product being delivered */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Product being delivered</Text>
              <Text style={styles.detailContent}>
                {productDetails?.name || 'Item details will appear here'}
              </Text>
            </View>

            {/* Close button area */}
            <View style={styles.modalCloseArea}>
              <TouchableOpacity style={styles.closeButton} onPress={toggleModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tip Received Popup */}
      <Modal
        visible={showTipPopup}
        animationType="slide"
        transparent={true}
        onRequestClose={handleDismissTip}
      >
        <View style={styles.tipModalOverlay}>
          <View style={styles.tipModalBackdrop} />
          <View style={styles.tipModalContent}>
            {/* Coin Illustration */}
            <View style={styles.coinContainer}>
              <View style={styles.sparkleLeft}>
                <Text style={styles.sparkle}>✦</Text>
              </View>
              <View style={styles.coinWrapper}>
                <View style={styles.coin}>
                  <Text style={styles.coinSymbol}>∞</Text>
                </View>
              </View>
              <View style={styles.sparkleRight}>
                <Text style={styles.sparkle}>✦</Text>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.tipTitle}>You received a tip!</Text>

            {/* Description */}
            <Text style={styles.tipDescription}>
              A customer sent you a{' '}
              <Text style={styles.tipAmount}>{tip}</Text>
              {' '}tip for your service.{' '}
              <Text style={styles.tipBold}>100% of the tip goes to you.</Text>
            </Text>

            {/* Got it Button */}
            <TouchableOpacity style={styles.gotItButton} onPress={handleDismissTip}>
              <Text style={styles.gotItButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBF9',
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
  },
  logo: {
    width: 65,
    height: 30,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#171715',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D2691E',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  titleSection: {
    paddingHorizontal: 26,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171715',
    lineHeight: 29,
    marginBottom: 12,
  },
  navigateLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigateLinkText: {
    fontSize: 16,
    color: '#171715',
    textDecorationLine: 'underline',
  },
  navigateArrow: {
    fontSize: 20,
    color: '#171715',
    marginLeft: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  driverMarker: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE8FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  buyerMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFE8FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerIcon: {
    fontSize: 16,
  },
  arrivedButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 22,
    right: 22,
  },
  arrivedButton: {
    backgroundColor: '#FFE8FD',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE8FD',
    // Shadow effect
    shadowColor: '#171715',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  arrivedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171715',
  },
  bottomSheet: {
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#171715',
  },
  earningsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171715',
  },
  divider: {
    height: 1,
    backgroundColor: '#82827F',
    opacity: 0.3,
    marginVertical: 12,
  },
  buyerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  buyerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  buyerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  buyerAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerAvatarInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  buyerInfo: {
    flex: 1,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#171715',
    marginBottom: 4,
  },
  buyerAddress: {
    fontSize: 14,
    color: '#171715',
    lineHeight: 20,
  },
  buyerCity: {
    fontSize: 14,
    color: '#171715',
    lineHeight: 20,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECECE8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 60,
  },
  callIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  callText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171715',
  },
  moreDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  moreDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171715',
  },
  chevron: {
    fontSize: 12,
    color: '#171715',
  },
  // More Details Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  detailSection: {
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#171715',
    marginBottom: 8,
  },
  detailContent: {
    fontSize: 14,
    color: '#171715',
    lineHeight: 24,
  },
  modalCloseArea: {
    marginTop: 20,
    alignItems: 'center',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171715',
    textDecorationLine: 'underline',
  },
  // Tip Popup Modal Styles
  tipModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tipModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  tipModalContent: {
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 40,
    paddingHorizontal: 50,
    paddingBottom: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  sparkleLeft: {
    marginRight: 10,
  },
  sparkleRight: {
    marginLeft: 10,
  },
  sparkle: {
    fontSize: 16,
    color: '#FEB635',
  },
  coinWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEB635',
    justifyContent: 'center',
    alignItems: 'center',
    // 3D effect
    shadowColor: '#1C1D21',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 6,
  },
  coinSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1D21',
  },
  tipTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 40,
  },
  tipDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  tipAmount: {
    color: '#5D72FB',
    fontWeight: '800',
  },
  tipBold: {
    fontWeight: '700',
  },
  gotItButton: {
    backgroundColor: '#242422',
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#171715',
    // Shadow effect for 3D look
    shadowColor: '#171715',
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 4,
  },
  gotItButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.14,
  },
});
