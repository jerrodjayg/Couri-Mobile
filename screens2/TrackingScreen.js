import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_MIN_HEIGHT = 120;
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.8;

export default function TrackingScreen({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [productDetails, setProductDetails] = useState({
    price: 0,
    title: '',
    description: '',
  });
  const [userLocation, setUserLocation] = useState(null);
  const [pickupAddress, setPickupAddress] = useState(null);
  const [locationError, setLocationError] = useState(null);
  
  // Modal animation
  const [modalHeight, setModalHeight] = useState(MODAL_MIN_HEIGHT);
  const modalTranslateY = useRef(new Animated.Value(0)).current;

  // Get route parameters
  const {
    productPrice,
    productTitle,
    productDescription,
    pickupAddress: routePickupAddress,
    userAddress,
    userProfile: routeUserProfile
  } = route.params || {};

  // Load user profile and product details
  useEffect(() => {
    loadUserProfile();
    loadProductDetails();
    loadPickupAddress();
    getCurrentLocation();
  }, []);

  const loadUserProfile = async () => {
    try {
      // Try to get from route params first
      if (routeUserProfile) {
        setUserProfile(routeUserProfile);
        return;
      }

      // Otherwise load from AsyncStorage
      const storedProfile = await AsyncStorage.getItem('userProfileData');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadProductDetails = () => {
    if (productPrice && productTitle) {
      setProductDetails({
        price: parseFloat(productPrice) || 0,
        title: productTitle || '',
        description: productDescription || '',
      });
    }
  };

  const loadPickupAddress = async () => {
    if (routePickupAddress) {
      setPickupAddress(routePickupAddress);
    } else if (userAddress) {
      // If no pickup address provided, use user address as pickup location
      try {
        const geocoded = await Location.geocodeAsync(userAddress);
        if (geocoded.length > 0) {
          setPickupAddress({
            latitude: geocoded[0].latitude,
            longitude: geocoded[0].longitude,
            address: userAddress,
          });
        }
      } catch (error) {
        console.error('Error geocoding user address:', error);
      }
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        return;
      }

      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      setLocationError(null);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Unable to get current location');
    }
  };

  // Set up real-time location tracking
  useEffect(() => {
    let locationSubscription;
    
    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          return;
        }

        // Get initial location
        await getCurrentLocation();

        // Start watching position for real-time updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // Update every 5 seconds
            distanceInterval: 10, // Update when moved 10 meters
          },
          (location) => {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            setLocationError(null);
          }
        );
      } catch (error) {
        console.error('Error setting up location tracking:', error);
        setLocationError('Location tracking failed');
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Calculate pricing
  const deliveryFee = productDetails.price * 0.0893; // 8.93%
  const totalPrice = productDetails.price + deliveryFee;

  // Get initial map region
  const getInitialRegion = () => {
    if (userLocation) {
      return userLocation;
    }
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  };


  // Pan responder for modal
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = MODAL_MIN_HEIGHT - gestureState.dy;
        if (newHeight >= MODAL_MIN_HEIGHT && newHeight <= MODAL_MAX_HEIGHT) {
          setModalHeight(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldExpand = gestureState.dy < -50;
        const targetHeight = shouldExpand ? MODAL_MAX_HEIGHT : MODAL_MIN_HEIGHT;
        
        Animated.spring(modalTranslateY, {
          toValue: targetHeight - MODAL_MIN_HEIGHT,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        
        setModalHeight(targetHeight);
      },
    })
  ).current;

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/couri-logo.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.messageButton}>
            <Image
              source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/message-icon.png' }}
              style={styles.messageIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileButton}>
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
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {userLocation ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={getInitialRegion()}
            region={userLocation}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsCompass={true}
            showsScale={true}
            showsTraffic={false}
            showsIndoors={false}
            mapType="standard"
            userLocationAnnotationTitle="Your Location"
          >
            {/* User location marker */}
            <Marker
              coordinate={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              title="Your Location"
              description="Current position"
              pinColor="#FFE8FD"
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>

            {/* Pickup location marker */}
            {pickupAddress && pickupAddress.latitude && pickupAddress.longitude && 
             (pickupAddress.latitude !== userLocation.latitude || pickupAddress.longitude !== userLocation.longitude) && (
              <Marker
                coordinate={{
                  latitude: pickupAddress.latitude,
                  longitude: pickupAddress.longitude,
                }}
                title="Pickup Location"
                description={pickupAddress.address || "Pickup point"}
                pinColor="red"
              />
            )}
          </MapView>
        ) : locationError ? (
          <View style={[styles.map, styles.errorContainer]}>
            <Text style={styles.errorText}>{locationError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.map, styles.loadingContainer]}>
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}
      </View>

      {/* Bottom Modal */}
      <Animated.View 
        style={[
          styles.modal,
          {
            height: modalHeight,
            transform: [{ translateY: modalTranslateY }],
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.modalHandle} />
        
        <View style={styles.modalContent}>
          {modalHeight <= MODAL_MIN_HEIGHT + 50 ? (
            // Collapsed view - show price only
            <View style={styles.collapsedContent}>
              <Text style={styles.priceLabel}>Product Price</Text>
              <Text style={styles.priceValue}>${productDetails.price.toFixed(2)}</Text>
            </View>
          ) : (
            // Expanded view - show full details
            <View style={styles.expandedContent}>
              <Text style={styles.productTitle}>{productDetails.title}</Text>
              
              <View style={styles.priceBreakdown}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Product Price</Text>
                  <Text style={styles.priceValue}>${productDetails.price.toFixed(2)}</Text>
                </View>
                
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Couri Delivery & Service Fee</Text>
                  <Text style={styles.priceValue}>${deliveryFee.toFixed(2)}</Text>
                </View>
                
                <View style={[styles.priceRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 30,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  messageIcon: {
    width: 20,
    height: 20,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  profileInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFE8FD',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF69B4',
  },
  modal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d0d0d0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  collapsedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    flex: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  priceBreakdown: {
    flex: 1,
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 10,
    paddingTop: 15,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});
