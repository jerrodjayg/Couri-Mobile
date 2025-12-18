import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom dark map style - matching the screenshot design
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0d' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#0d0d0d' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#121212' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1f1f1f' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#141414' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a8a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b3b3b3' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#080808' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3d3d3d' }],
  },
];

export default function DriverAcceptDelivery({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const mapRef = useRef(null);

  // Get route parameters
  const {
    userProfile: routeUserProfile,
    productDetails,
    orderDetails,
    pickupLocation,
    deliveryLocation,
    earnings,
    distance,
    expectedTime,
  } = route.params || {};

  // Default locations (Los Angeles/West Hollywood area as shown in design)
  const defaultPickup = {
    latitude: 34.0837,
    longitude: -118.3610,
    address: 'Melrose Ave, Los Angeles',
    title: 'Pickup from seller',
  };

  const defaultDelivery = {
    latitude: 34.0522,
    longitude: -118.2437,
    address: 'Main St, Los Angeles',
    title: 'Deliver to buyer',
  };

  const pickup = pickupLocation || defaultPickup;
  const delivery = deliveryLocation || defaultDelivery;

  // Generate a destination point (random street nearby for the home icon)
  const getDestinationFromDriverLocation = (driverLoc) => {
    if (!driverLoc) return null;
    // Generate a point ~0.5-1km away (roughly 0.005-0.01 degrees)
    const latOffset = 0.006 + Math.random() * 0.004;
    const lngOffset = 0.003 + Math.random() * 0.003;
    return {
      latitude: driverLoc.latitude + latOffset,
      longitude: driverLoc.longitude + lngOffset,
    };
  };

  const [destinationLocation, setDestinationLocation] = useState(null);
  
  // Calculate map region to show driver and destination
  const getMapRegion = () => {
    if (driverLocation && destinationLocation) {
      const midLat = (driverLocation.latitude + destinationLocation.latitude) / 2;
      const midLng = (driverLocation.longitude + destinationLocation.longitude) / 2;
      const latDelta = Math.abs(driverLocation.latitude - destinationLocation.latitude) * 2.5;
      const lngDelta = Math.abs(driverLocation.longitude - destinationLocation.longitude) * 2.5;
      
      return {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.max(latDelta, 0.015),
        longitudeDelta: Math.max(lngDelta, 0.015),
      };
    }
    // Fallback to default West Hollywood area
    return {
      latitude: 34.0900,
      longitude: -118.3617,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  };

  // Get user's current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        setLocationLoading(true);
        setLocationError(null);

        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          // Use fallback location (West Hollywood)
          const fallbackLocation = {
            latitude: 34.0900,
            longitude: -118.3617,
          };
          setDriverLocation(fallbackLocation);
          setDestinationLocation(getDestinationFromDriverLocation(fallbackLocation));
          setLocationLoading(false);
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setDriverLocation(currentLocation);
        setDestinationLocation(getDestinationFromDriverLocation(currentLocation));
        setLocationLoading(false);
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationError('Could not get location');
        // Use fallback location
        const fallbackLocation = {
          latitude: 34.0900,
          longitude: -118.3617,
        };
        setDriverLocation(fallbackLocation);
        setDestinationLocation(getDestinationFromDriverLocation(fallbackLocation));
        setLocationLoading(false);
      }
    };

    getLocation();
  }, []);

  // Get the seller/person marker location
  const getSellerMarkerLocation = () => {
    if (!driverLocation) return null;
    return {
      latitude: driverLocation.latitude + 0.002,
      longitude: driverLocation.longitude - 0.003,
    };
  };

  // Generate dotted line path between home icon and person icon
  const getDottedLineCoordinates = () => {
    if (!driverLocation || !destinationLocation) return [];
    
    const sellerLocation = getSellerMarkerLocation();
    if (!sellerLocation) return [];
    
    // Create a smooth curved path from home to person icon
    const midPoint = {
      latitude: (sellerLocation.latitude + destinationLocation.latitude) / 2,
      longitude: (sellerLocation.longitude + destinationLocation.longitude) / 2 - 0.001,
    };
    
    return [
      destinationLocation,  // Start at home icon
      midPoint,
      sellerLocation,       // End at person icon
    ];
  };

  // Get the position for the pink dot (on the dotted line)
  const getPinkDotPosition = () => {
    if (!driverLocation || !destinationLocation) return null;
    
    const sellerLocation = getSellerMarkerLocation();
    if (!sellerLocation) return null;
    
    // Position the pink dot at about 40% along the line from home to person, shifted slightly left
    return {
      latitude: destinationLocation.latitude + (sellerLocation.latitude - destinationLocation.latitude) * 0.4,
      longitude: destinationLocation.longitude + (sellerLocation.longitude - destinationLocation.longitude) * 0.4 - 0.00069,
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
        console.log('✅ DriverAcceptDelivery - Loaded user profile from route params');
        return;
      }

      const storedProfile = await AsyncStorage.getItem('userProfileData');
      const tempUserData = await AsyncStorage.getItem('tempUserData');
      
      if (storedProfile || tempUserData) {
        const profileData = storedProfile ? JSON.parse(storedProfile) : {};
        const tempData = tempUserData ? JSON.parse(tempUserData) : {};
        const mergedProfile = { ...profileData, ...tempData };
        
        console.log('✅ DriverAcceptDelivery - Loaded user profile from AsyncStorage:', mergedProfile);
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
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  // Get profile image
  const getProfileImage = () => {
    if (userProfile?.avatar_url || userProfile?.profileImageUri) {
      return userProfile.avatar_url || userProfile.profileImageUri;
    }
    return null;
  };

  // Handle Accept delivery
  const handleAccept = () => {
    navigation.navigate('HeadToSeller', {
      productDetails,
      orderDetails,
      userProfile,
      pickupLocation: pickup,
      deliveryLocation: delivery,
      earnings: earnings || '$21.50',
      arrivalTime: '12 min',
      distance: distance || '4 miles',
    });
  };

  // Handle Decline delivery
  const handleDecline = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Map Background */}
      <View style={styles.mapContainer}>
        {locationLoading ? (
          <View style={styles.mapLoadingContainer}>
            <ActivityIndicator size="large" color="#FF69B4" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={getMapRegion()}
            customMapStyle={darkMapStyle}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {/* Dotted route line from driver to destination */}
            {driverLocation && destinationLocation && (
              <Polyline
                coordinates={getDottedLineCoordinates()}
                strokeColor="#FFFFFF"
                strokeWidth={2}
                lineDashPattern={[8, 6]}
              />
            )}
            
            {/* Destination Marker (home icon) - Start of dotted line */}
            {destinationLocation && (
              <Marker
                coordinate={destinationLocation}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.homeMarker}>
                  <View style={styles.homeMarkerInner}>
                    <Text style={styles.homeMarkerIcon}>🏠</Text>
                  </View>
                </View>
              </Marker>
            )}

            {/* Pink dot marker - positioned on the dotted line */}
            {driverLocation && destinationLocation && getPinkDotPosition() && (
              <Marker
                coordinate={getPinkDotPosition()}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.pinkDotMarkerOuter}>
                  <View style={styles.pinkDotMarkerInner} />
                </View>
              </Marker>
            )}
            
            {/* Seller/Person Marker (blue) - End of dotted line */}
            {driverLocation && getSellerMarkerLocation() && (
              <Marker
                coordinate={getSellerMarkerLocation()}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.sellerMarker}>
                  <Text style={styles.sellerMarkerIcon}>👤</Text>
                </View>
              </Marker>
            )}
          </MapView>
        )}
        
        {/* Gradient overlay at top */}
        <View style={styles.gradientOverlay} />
      </View>

      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/Logo_Dark.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('MyAccount')}
          >
            {getProfileImage() ? (
              <Image
                source={{ uri: getProfileImage() }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileFallback}>
                <Text style={styles.profileInitials}>{getUserInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Green Banner */}
        <View style={styles.greenBanner}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconContainer}>
              <Text style={styles.bannerIconText}>∞</Text>
            </View>
            <Text style={styles.bannerText}>Pickup & deliver</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.sheetContent}>
          {/* Earnings Section */}
          <View style={styles.earningsSection}>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsAmount}>{earnings || '$21.50'}+</Text>
              <Text style={styles.earningsTip}>Final earnings may include tips</Text>
            </View>
            <Text style={styles.distanceTime}>
              {distance || '4 min (0.2 mi)'} from me  •  {expectedTime || '22 min'} expected time
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Locations Section */}
          <View style={styles.locationsSection}>
            {/* Pickup Location */}
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <View style={[styles.locationIcon, styles.pickupIcon]}>
                  <Text style={styles.locationIconText}>📍</Text>
                </View>
                <View style={styles.locationLine} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Pickup from seller</Text>
                <Text style={styles.locationAddress}>{pickup.address}</Text>
              </View>
            </View>

            {/* Delivery Location */}
            <View style={styles.locationRow}>
              <View style={styles.locationIconContainer}>
                <View style={[styles.locationIcon, styles.deliveryIcon]}>
                  <Text style={styles.locationIconText}>🏠</Text>
                </View>
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Deliver to buyer</Text>
                <Text style={styles.locationAddress}>{delivery.address}</Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={handleAccept}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.declineButton}
              onPress={handleDecline}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d0d0d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#757575',
    marginTop: 12,
    fontSize: 14,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'transparent',
    // Creates a subtle fade effect
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  logo: {
    width: 65,
    height: 30,
    tintColor: '#fff',
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  // Pink dot marker (smaller, positioned on dotted line)
  pinkDotMarkerOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 182, 193, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinkDotMarkerInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFB6C1',
    shadowColor: '#FFB6C1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  // Seller marker (blue/teal)
  sellerMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4FC3F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#4FC3F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  sellerMarkerIcon: {
    fontSize: 14,
  },
  // Home/Destination marker
  homeMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4FC3F7',
  },
  homeMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4FC3F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeMarkerIcon: {
    fontSize: 14,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FBFBF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 35,
    elevation: 20,
  },
  greenBanner: {
    backgroundColor: '#27C193',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerIconText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  bannerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#171715',
  },
  sheetContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
  },
  earningsSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '600',
    color: '#171715',
    marginRight: 12,
  },
  earningsTip: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  distanceTime: {
    fontSize: 13,
    color: '#4A4A4A',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#82827F',
    opacity: 0.3,
    marginVertical: 16,
  },
  locationsSection: {
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationIconContainer: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  locationIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupIcon: {
    backgroundColor: '#FFE8FD',
  },
  deliveryIcon: {
    backgroundColor: '#FFE8FD',
  },
  locationIconText: {
    fontSize: 10,
  },
  locationLine: {
    width: 1,
    height: 40,
    backgroundColor: '#171715',
    marginTop: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171715',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  buttonsContainer: {
    alignItems: 'center',
  },
  acceptButton: {
    width: '100%',
    backgroundColor: '#171715',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    // Shadow effect for 3D button look
    shadowColor: '#171715',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FBFBF9',
    letterSpacing: 0.15,
  },
  declineButton: {
    paddingVertical: 8,
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171715',
    textDecorationLine: 'underline',
    letterSpacing: 0.15,
  },
});
