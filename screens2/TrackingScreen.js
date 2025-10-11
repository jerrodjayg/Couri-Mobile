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
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_MIN_HEIGHT = 180;
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.5;

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
  const [mapHtml, setMapHtml] = useState('');
  
  // Modal animation
  const [modalHeight, setModalHeight] = useState(MODAL_MIN_HEIGHT);

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
    console.log('🔍 DEBUG: Route params:', route.params);
    console.log('🔍 DEBUG: userAddress from params:', userAddress);
    console.log('🔍 DEBUG: pickupAddress from params:', routePickupAddress);
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
    try {
      let addressToUse = null;
      
      // Priority 1: Check route params
      if (routePickupAddress) {
        console.log('🔍 DEBUG: routePickupAddress from params:', routePickupAddress);
        addressToUse = routePickupAddress;
      } 
      // Priority 2: Check AsyncStorage
      else {
        const storedAddress = await AsyncStorage.getItem('currentPickupAddress');
        if (storedAddress) {
          console.log('🔍 DEBUG: Found address in AsyncStorage:', storedAddress);
          addressToUse = JSON.parse(storedAddress);
        }
      }
      
      if (addressToUse) {
        // Format the pickup address from the object structure
        let formattedAddress = '';
        if (typeof addressToUse === 'string') {
          formattedAddress = addressToUse;
        } else if (addressToUse.street || addressToUse.address) {
          // Build address string from components
          const parts = [];
          if (addressToUse.street) parts.push(addressToUse.street);
          if (addressToUse.address2) parts.push(addressToUse.address2);
          if (addressToUse.city) parts.push(addressToUse.city);
          if (addressToUse.state) parts.push(addressToUse.state);
          if (addressToUse.zipCode) parts.push(addressToUse.zipCode);
          formattedAddress = parts.join(', ');
        } else if (addressToUse.address) {
          formattedAddress = addressToUse.address;
        }
        
        console.log('✅ Formatted address:', formattedAddress);
        
        // Geocode the address to get coordinates
        if (formattedAddress) {
          try {
            const geocoded = await Location.geocodeAsync(formattedAddress);
            if (geocoded.length > 0) {
              setPickupAddress({
                ...addressToUse,
                latitude: geocoded[0].latitude,
                longitude: geocoded[0].longitude,
                address: formattedAddress,
              });
              console.log('✅ Pickup address set with coordinates');
            } else {
              setPickupAddress({
                ...addressToUse,
                address: formattedAddress,
              });
              console.log('✅ Pickup address set without coordinates');
            }
          } catch (geocodeError) {
            console.error('Error geocoding pickup address:', geocodeError);
            setPickupAddress({
              ...addressToUse,
              address: formattedAddress,
            });
          }
        }
      } else if (userAddress) {
        // If no pickup address provided, use user address as pickup location
        console.log('🔍 DEBUG: Using userAddress:', userAddress);
        try {
          const geocoded = await Location.geocodeAsync(userAddress);
          if (geocoded.length > 0) {
            setPickupAddress({
              latitude: geocoded[0].latitude,
              longitude: geocoded[0].longitude,
              address: userAddress,
            });
            console.log('✅ User address set with coordinates');
          }
        } catch (geocodeError) {
          console.error('Error geocoding user address:', geocodeError);
          setPickupAddress({
            address: userAddress,
          });
        }
      } else {
        console.log('❌ No pickup address or user address found');
      }
    } catch (error) {
      console.error('❌ Error loading pickup address:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('🔍 DEBUG: Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🔍 DEBUG: Location permission status:', status);
      
      if (status !== 'granted') {
        console.error('❌ DEBUG: Location permission denied');
        setLocationError('Location permission denied');
        return;
      }

      console.log('🔍 DEBUG: Getting current location with high accuracy...');
      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      console.log('✅ DEBUG: Location obtained:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      setLocationError(null);
    } catch (error) {
      console.error('❌ DEBUG: Error getting location:', error);
      console.error('❌ DEBUG: Error details:', error.message);
      setLocationError('Unable to get current location: ' + error.message);
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

  // Generate HTML for live Google Maps with WebView
  const generateMapHtml = () => {
    const userLat = userLocation?.latitude || 37.78825;
    const userLng = userLocation?.longitude || -122.4324;
    const pickupLat = pickupAddress?.latitude || userLat;
    const pickupLng = pickupAddress?.longitude || userLng;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html { 
              margin: 0; 
              padding: 0; 
              height: 100%; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            #map { 
              width: 100%; 
              height: 100%; 
            }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(255,255,255,0.95);
              padding: 20px;
              border-radius: 10px;
              text-align: center;
              z-index: 1000;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .error {
              color: #ff4444;
              font-weight: bold;
            }
            .coordinates {
              font-size: 12px;
              color: #666;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div class="loading" id="loading">
            <div>🗺️ Loading Google Maps...</div>
            <div class="coordinates">
              📍 Your Location: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}
            </div>
          </div>
          <script>
            let map;
            let userMarker;
            let loadingElement = document.getElementById('loading');
            
            // Helper function to send messages to React Native
            function sendToReactNative(type, level, message) {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: type,
                  level: level,
                  message: message
                }));
              }
            }
            
            // Override console.log to send messages to React Native
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            
            console.log = function(...args) {
              originalLog.apply(console, args);
              sendToReactNative('console', 'log', args.join(' '));
            };
            
            console.error = function(...args) {
              originalError.apply(console, args);
              sendToReactNative('console', 'error', args.join(' '));
            };
            
            console.warn = function(...args) {
              originalWarn.apply(console, args);
              sendToReactNative('console', 'warn', args.join(' '));
            };
            
            // Comprehensive debugging
            console.log('🔍 DEBUG: Starting Google Maps initialization...');
            console.log('🔍 DEBUG: User location:', { lat: ${userLat}, lng: ${userLng} });
            console.log('🔍 DEBUG: Pickup location:', { lat: ${pickupLat}, lng: ${pickupLng} });
            console.log('🔍 DEBUG: API Key:', 'AIzaSyDb06-8lffU7CmFoZtJJkR0d6dQkZqA_mw');
            
            // Error handling with detailed logging
            window.gm_authFailure = function() {
              console.error('❌ DEBUG: Google Maps API authentication failed');
              console.error('❌ DEBUG: This usually means:');
              console.error('   - API key is invalid or expired');
              console.error('   - API key restrictions are blocking this domain');
              console.error('   - Billing is not enabled on the Google Cloud project');
              console.error('   - Required APIs are not enabled');
              loadingElement.innerHTML = '<div class="error">❌ Google Maps API Error</div><div>Check console for details</div>';
            };
            
            function showError(message) {
              console.error('❌ DEBUG: Error:', message);
              loadingElement.innerHTML = '<div class="error">❌ ' + message + '</div>';
            }
            
            // Test network connectivity
            function testNetworkConnectivity() {
              console.log('🔍 DEBUG: Testing network connectivity...');
              
              // Test 1: Check if we can reach Google Maps API
              fetch('https://maps.googleapis.com/maps/api/js?key=AIzaSyDb06-8lffU7CmFoZtJJkR0d6dQkZqA_mw')
                .then(response => {
                  console.log('✅ DEBUG: Network test successful, status:', response.status);
                  if (response.status === 200) {
                    console.log('✅ DEBUG: Google Maps API endpoint is accessible');
                  } else {
                    console.error('❌ DEBUG: Google Maps API returned status:', response.status);
                  }
                })
                .catch(error => {
                  console.error('❌ DEBUG: Network test failed:', error);
                  console.error('❌ DEBUG: This could mean no internet connection or firewall blocking');
                });
                
              // Test 2: Check if API key is valid by testing Geocoding API
              fetch('https://maps.googleapis.com/maps/api/geocode/json?address=New+York&key=AIzaSyDb06-8lffU7CmFoZtJJkR0d6dQkZqA_mw')
                .then(response => response.json())
                .then(data => {
                  console.log('🔍 DEBUG: Geocoding API test response:', data.status);
                  if (data.status === 'OK') {
                    console.log('✅ DEBUG: API key is valid and working');
                  } else if (data.status === 'REQUEST_DENIED') {
                    console.error('❌ DEBUG: API key is invalid or restricted:', data.error_message);
                  } else if (data.status === 'OVER_QUERY_LIMIT') {
                    console.error('❌ DEBUG: API quota exceeded');
                  } else {
                    console.error('❌ DEBUG: API test failed with status:', data.status);
                  }
                })
                .catch(error => {
                  console.error('❌ DEBUG: Geocoding API test failed:', error);
                });
            }
            
            // Test JavaScript execution
            console.log('🔍 DEBUG: JavaScript execution test - WebView is working');
            sendToReactNative('debug', 'info', 'JavaScript execution test - WebView is working');
            
            // Test basic HTTP request
            console.log('🔍 DEBUG: Testing basic HTTP request...');
            fetch('https://httpbin.org/get')
              .then(response => response.json())
              .then(data => {
                console.log('✅ DEBUG: Basic HTTP request successful');
                sendToReactNative('debug', 'success', 'Basic HTTP request successful');
              })
              .catch(error => {
                console.error('❌ DEBUG: Basic HTTP request failed:', error);
                sendToReactNative('error', 'error', 'Basic HTTP request failed: ' + error.message);
              });
            
            // Run network test
            testNetworkConnectivity();
            
            // Check if Google Maps script loads
            window.addEventListener('load', function() {
              console.log('🔍 DEBUG: Window load event fired');
              setTimeout(function() {
                if (!window.google) {
                  console.error('❌ DEBUG: Google Maps script failed to load after 5 seconds');
                  showError('Google Maps script failed to load. Check API key and internet connection.');
                } else {
                  console.log('✅ DEBUG: Google Maps script loaded successfully');
                }
              }, 5000);
            });
            
            function initMap() {
              try {
                console.log('🔍 DEBUG: initMap() called');
                console.log('🔍 DEBUG: window.google exists:', !!window.google);
                console.log('🔍 DEBUG: window.google.maps exists:', !!(window.google && window.google.maps));
                
                if (!window.google) {
                  console.error('❌ DEBUG: window.google is undefined - API script failed to load');
                  showError('Google Maps API script failed to load');
                  return;
                }
                
                if (!window.google.maps) {
                  console.error('❌ DEBUG: window.google.maps is undefined - Maps library failed to load');
                  showError('Google Maps library failed to load');
                  return;
                }
                
                console.log('✅ DEBUG: Google Maps API loaded successfully');
                console.log('🔍 DEBUG: Available Google Maps objects:', Object.keys(window.google.maps));
                
              const userLocation = { lat: ${userLat}, lng: ${userLng} };
              const pickupLocation = { lat: ${pickupLat}, lng: ${pickupLng} };
              
                console.log('🔍 DEBUG: Creating map with locations:', { userLocation, pickupLocation });
                console.log('🔍 DEBUG: Map container element:', document.getElementById("map"));
                
                map = new google.maps.Map(document.getElementById("map"), {
                zoom: 13,
                center: userLocation,
                  mapTypeId: 'roadmap',
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                  zoomControl: true,
                  gestureHandling: 'greedy',
                  styles: [
                    {
                      "elementType": "geometry",
                      "stylers": [
                        {
                          "color": "#212121"
                        }
                      ]
                    },
                    {
                      "elementType": "labels.icon",
                      "stylers": [
                        {
                          "visibility": "off"
                        }
                      ]
                    },
                    {
                      "elementType": "labels.text.fill",
                      "stylers": [
                        {
                          "color": "#757575"
                        }
                      ]
                    },
                    {
                      "elementType": "labels.text.stroke",
                      "stylers": [
                        {
                          "color": "#212121"
                        }
                      ]
                    },
                    {
                      "featureType": "administrative",
                      "elementType": "geometry",
                      "stylers": [
                        {
                          "color": "#757575"
                        }
                      ]
                    },
                    {
                      "featureType": "administrative.country",
                      "elementType": "labels.text.fill",
                      "stylers": [
                        {
                          "color": "#9e9e9e"
                        }
                      ]
                    },
                    {
                      "featureType": "administrative.land_parcel",
                      "stylers": [
                        {
                          "visibility": "off"
                        }
                      ]
                    },
                    {
                      "featureType": "administrative.locality",
                      "elementType": "labels.text.fill",
                      "stylers": [
                        {
                          "color": "#bdbdbd"
                        }
                      ]
                    },
                    {
                      "featureType": "poi",
                      "elementType": "labels.text.fill",
                      "stylers": [
                        {
                          "color": "#757575"
                        }
                      ]
                    },
                    {
                      "featureType": "poi.park",
                      "elementType": "geometry",
                      "stylers": [
                        {
                          "color": "#181818"
                        }
                      ]
                    },
                    {
                      "featureType": "poi.park",
                      "elementType": "labels.text.fill",
                      "stylers": [
                        {
                          "color": "#616161"
                        }
                      ]
                    },
                    {
                      "featureType": "poi.park",
                      "elementType": "labels.text.stroke",
                      "stylers": [
                        {
                          "color": "#1b1b1b"
                        }
                      ]
                    },
                    {
                      "featureType": "road",
                      "elementType": "geometry.fill",
                      "stylers": [
                        {
                          "color": "#2c2c2c"
                        }
                      ]
                    },
                    {
                      "featureType": "road",
                      "elementType": "labels.text.fill",
                      "stylers": [
                        {
                          "color": "#8a8a8a"
                        }
                      ]
                    },
                    {
                      "featureType": "road.arterial",
                      "elementType": "geometry",
                      "stylers": [
                        {
                          "color": "#373737"
                        }
                      ]
                    },
                    {
                      "featureType": "road.highway",
                      "elementType": "geometry",
                      "stylers": [
                        {
                          "color": "#3c3c3c"
                        }
                      ]
                    },
                    {
                      "featureType": "road.highway.controlled_access",
                      "elementType": "geometry",
                      "stylers": [
                        {
                          "color": "#4e4e4e"
                        }
                      ]
                    },
                    {
                      "featureType": "road.local",
                      "elementType": "labels.text.fill",
                      "stylers": [
                        {
                          "color": "#616161"
                        }
                      ]
                    },
                    {
                      "featureType": "transit",
                      "elementType": "labels.text.fill",
                      "stylers": [
                        {
                          "color": "#757575"
                        }
                      ]
                    },
                    {
                      "featureType": "water",
                      "elementType": "geometry",
                      "stylers": [
                        {
                          "color": "#000000"
                        }
                      ]
                    },
                    {
                      "featureType": "water",
                      "elementType": "labels.text.fill",
                      "stylers": [
                        {
                          "color": "#3d3d3d"
                        }
                      ]
                    }
                  ]
                });
                
                // User location marker (Current Location - Blue Dot)
                userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                  title: "Your Current Location",
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                    strokeWeight: 3
                  }
                });
                
                // Draw delivery route using Directions API (no pickup marker)
              if (${pickupLat} !== ${userLat} || ${pickupLng} !== ${userLng}) {
                  console.log('🔍 DEBUG: Initializing Directions API...');
                  
                  if (!google.maps.DirectionsService) {
                    console.error('❌ DEBUG: DirectionsService not available - Directions API not loaded');
                    showError('Directions API not available');
                    return;
                  }
                  
                  const directionsService = new google.maps.DirectionsService();
                  const directionsRenderer = new google.maps.DirectionsRenderer({
                    suppressMarkers: true, // We'll use our custom markers
                    polylineOptions: {
                      strokeColor: '#007AFF',
                      strokeWeight: 5,
                      strokeOpacity: 0.8
                    },
                    directionsText: true
                  });
                  
                  directionsRenderer.setMap(map);
                  console.log('✅ DEBUG: Directions renderer created and attached to map');
                  
                  // Calculate route
                  console.log('🔍 DEBUG: Calculating route from', userLocation, 'to', pickupLocation);
                  directionsService.route({
                    origin: userLocation,
                    destination: pickupLocation,
                    travelMode: google.maps.TravelMode.DRIVING,
                    avoidHighways: false,
                    avoidTolls: false
                  }, (result, status) => {
                    console.log('🔍 DEBUG: Directions API response - Status:', status);
                    
                    if (status === 'OK') {
                      console.log('✅ DEBUG: Route calculated successfully');
                      directionsRenderer.setDirections(result);
                      
                      // Log route information to console only
                      const route = result.routes[0];
                      const leg = route.legs[0];
                      
                      console.log('✅ DEBUG: Route details:');
                      console.log('   Distance:', leg.distance.text);
                      console.log('   Duration:', leg.duration.text);
                      console.log('   Start address:', leg.start_address);
                      console.log('   End address:', leg.end_address);
                      
                    } else {
                      console.error('❌ DEBUG: Directions request failed with status:', status);
                      console.error('❌ DEBUG: Common status codes:');
                      console.error('   - REQUEST_DENIED: API key restrictions or billing issues');
                      console.error('   - INVALID_REQUEST: Invalid parameters');
                      console.error('   - OVER_QUERY_LIMIT: Quota exceeded');
                      console.error('   - NOT_FOUND: Address not found');
                      console.error('   - ZERO_RESULTS: No route found');
                      showError('Could not calculate route: ' + status);
                    }
                  });
                  
                  // Fit map to show both locations
                  const bounds = new google.maps.LatLngBounds();
                  bounds.extend(userLocation);
                  bounds.extend(pickupLocation);
                  map.fitBounds(bounds);
                  
                } else {
                  // If same location, just center on user
                  map.setCenter(userLocation);
                  map.setZoom(15);
                }
                
                // Hide loading
                loadingElement.style.display = 'none';
                console.log('Google Maps with Directions initialized successfully');
                
              } catch (error) {
                console.error('Error initializing map:', error);
                showError('Failed to initialize map: ' + error.message);
              }
            }
            
            // Fallback if Google Maps fails to load
            setTimeout(function() {
              if (!window.google || !window.google.maps) {
                console.error('❌ DEBUG: Google Maps failed to load after 10 seconds');
                showError('Google Maps failed to load. Check your internet connection and API key.');
                
                // Show a simple fallback map
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                  mapContainer.innerHTML = \`
                    <div style="
                      width: 100%;
                      height: 100%;
                      background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">
                      <div style="font-size: 48px; margin-bottom: 20px;">🗺️</div>
                      <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Map Unavailable</div>
                      <div style="font-size: 14px; color: #666; text-align: center; padding: 0 20px;">
                        Google Maps failed to load.<br>
                        Your location: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}
                      </div>
                    </div>
                  \`;
                }
              }
            }, 10000);
          </script>
          <script 
            async 
            defer 
            src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDb06-8lffU7CmFoZtJJkR0d6dQkZqA_mw&callback=initMap&libraries=geometry,places&v=3.52"
            onerror="window.gm_authFailure()"
            onload="console.log('Google Maps script loaded successfully')"
          ></script>
        </body>
      </html>
    `;
  };

  // Update map HTML when locations change
  useEffect(() => {
    console.log('🔍 DEBUG: useEffect triggered - userLocation:', userLocation);
    console.log('🔍 DEBUG: useEffect triggered - pickupAddress:', pickupAddress);
    
    if (userLocation) {
      console.log('🔍 DEBUG: Generating map HTML with userLocation:', userLocation);
      const html = generateMapHtml();
      console.log('🔍 DEBUG: Map HTML generated, length:', html.length);
      setMapHtml(html);
    } else {
      console.log('🔍 DEBUG: No userLocation available, not generating map HTML');
    }
  }, [userLocation, pickupAddress]);

  // Debug effect to log address state changes
  useEffect(() => {
    console.log('🔍 DEBUG: Address state updated!');
    console.log('🔍 DEBUG: pickupAddress state:', pickupAddress);
    console.log('🔍 DEBUG: Display address will be:', getDisplayAddress());
  }, [pickupAddress, userAddress, userProfile]);


  // Pan responder for modal
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Touch started
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

  // Get display address - check all possible sources
  const getDisplayAddress = () => {
    console.log('🔍 DEBUG: Getting display address...');
    console.log('🔍 DEBUG: pickupAddress?.address:', pickupAddress?.address);
    console.log('🔍 DEBUG: userAddress:', userAddress);
    
    // Priority 1: Pickup address from state
    if (pickupAddress?.address) {
      console.log('✅ Using pickupAddress.address:', pickupAddress.address);
      return pickupAddress.address;
    }
    
    // Priority 2: User address from route params
    if (userAddress) {
      console.log('✅ Using userAddress from params:', userAddress);
      return userAddress;
    }
    
    // Priority 3: User profile address
    if (userProfile?.address) {
      console.log('✅ Using userProfile.address:', userProfile.address);
      return userProfile.address;
    }
    
    console.log('❌ No address found');
    return 'Address not available';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Logo_Dark.png' }}
            style={styles.couriLogo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.messageButton}>
            <View style={styles.chatIcon}>
              <Text style={styles.chatIconText}>💬</Text>
              <View style={styles.notificationDot} />
            </View>
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

      {/* Status Section */}
      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>A Couri driver is being assigned</Text>
        <Text style={styles.statusSubtitle}>We'll let you know when they're on the way.</Text>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {mapHtml ? (
          <WebView
            style={styles.map}
            source={{ html: mapHtml }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ DEBUG: WebView error:', nativeEvent);
              console.error('❌ DEBUG: Error details:', nativeEvent.description);
              setLocationError('WebView failed to load: ' + nativeEvent.description);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ DEBUG: WebView HTTP error:', nativeEvent);
              console.error('❌ DEBUG: HTTP status:', nativeEvent.statusCode);
              setLocationError('HTTP error: ' + nativeEvent.statusCode);
            }}
            onLoadStart={() => {
              console.log('🔍 DEBUG: WebView started loading');
            }}
            onLoadEnd={() => {
              console.log('✅ DEBUG: WebView loaded successfully');
            }}
            onMessage={(event) => {
              const data = event.nativeEvent.data;
              console.log('🔍 DEBUG: WebView message:', data);
              
              // Parse and display WebView console messages
              try {
                const message = JSON.parse(data);
                if (message.type === 'console') {
                  console.log('🌐 WebView Console:', message.level, message.message);
                } else if (message.type === 'debug') {
                  console.log('🌐 WebView Debug:', message.message);
                } else if (message.type === 'error') {
                  console.error('🌐 WebView Error:', message.message);
                }
              } catch (e) {
                console.log('🌐 WebView Raw Message:', data);
              }
            }}
            onLoadProgress={(syntheticEvent) => {
              console.log('🔍 DEBUG: WebView load progress:', syntheticEvent.nativeEvent.progress);
            }}
          />
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
          }
        ]}
      >
        <View style={styles.modalHandleContainer} {...panResponder.panHandlers}>
          <View style={styles.modalHandle} />
        </View>
        
        <View style={styles.modalContent} {...panResponder.panHandlers}>
          {modalHeight <= MODAL_MIN_HEIGHT + 50 ? (
            // Collapsed view - show address and total
            <View style={styles.collapsedContent}>
              <View style={styles.addressSection}>
                <Text style={styles.addressLabel}>Your Address</Text>
                <Text style={styles.addressText}>
                  {getDisplayAddress()}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.totalWithArrow}>
                  <Text style={styles.totalAmount}>${totalPrice.toFixed(2)}</Text>
                  <Text style={styles.expandArrow}>^</Text>
                </View>
              </View>
            </View>
          ) : (
            // Expanded view - show full details
            <View style={styles.expandedContent}>
              <View style={styles.addressSection}>
                <Text style={styles.addressLabel}>Your Address</Text>
                <Text style={styles.addressText}>
                  {getDisplayAddress()}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.totalWithArrow}>
                  <Text style={styles.totalAmount}>${totalPrice.toFixed(2)}</Text>
                  <Text style={styles.expandArrow}>⌄</Text>
                </View>
              </View>
              
              <View style={styles.orderDetails}>
                <View style={styles.orderItem}>
                  <Text style={styles.itemName}>"{productDetails.title}"</Text>
                  <Text style={styles.itemPrice}>${productDetails.price.toFixed(2)}</Text>
                </View>
                
                <View style={styles.orderItem}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Couri Delivery & Service Fee</Text>
                    <Text style={styles.infoIcon}>ⓘ</Text>
                  </View>
                  <Text style={styles.feePrice}>${deliveryFee.toFixed(2)}</Text>
                </View>
                
                <View style={[styles.orderItem, styles.totalItem]}>
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
    paddingTop: 30,
    paddingBottom: 15,
    backgroundColor: '#fafafa',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couriLogo: {
    width: 80,
    height: 32,
  },
  messageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  chatIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chatIconText: {
    fontSize: 20,
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#000000',
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
  statusSection: {
    backgroundColor: '#fafafa',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: 'normal',
    color: '#000',
    marginBottom: 8,
    lineHeight: 34,
  },
  statusSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
    lineHeight: 22,
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
  modalHandleContainer: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d0d0d0',
    borderRadius: 2,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  collapsedContent: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingVertical: 5,
  },
  expandedContent: {
    flex: 1,
    paddingVertical: 5,
  },
  addressSection: {
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    lineHeight: 22,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalWithArrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  expandArrow: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  orderDetails: {
    marginTop: 10,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  feeLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 5,
  },
  infoIcon: {
    fontSize: 14,
    color: '#666',
  },
  feePrice: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  totalItem: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 10,
    paddingTop: 15,
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
