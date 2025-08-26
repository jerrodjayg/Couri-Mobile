import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../screens/supabaseClient';


export default function ProductPrice({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [productPrice, setProductPrice] = useState('');
  const { user, customUser, setCustomUser } = useUser();
  
  const { url } = route.params || {};

  useEffect(() => {
    console.log('🔄 ProductPrice useEffect triggered');
    console.log('🔗 URL from route params:', url);
    console.log('🔗 Route params:', route.params);
    
    loadUserProfile();
  }, [url]);

  const loadUserProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        setUserProfile(JSON.parse(profileData));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const validateAndNavigate = async (url) => {
    console.log('🔍 Validating URL:', url);
    
    try {
      // Check if URL starts with https://
      if (url.startsWith('https://')) {
        console.log('✅ Valid HTTPS URL detected, navigating to ConfirmAddress');
        
        // Navigate to the next screen (ConfirmAddress)
        navigation.navigate('ConfirmAddress', { 
          productUrl: url,
          productPrice: productPrice 
        });
      } else {
        console.log('❌ Invalid URL - does not start with https://');
        
        // Show error message for non-HTTPS URLs
        Alert.alert(
          'Invalid Link',
          'We weren\'t able to recognize that link. Please try again, or input product info manually.',
          [
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ URL validation error:', error);
      Alert.alert(
        'Error',
        'There was an error processing your link. Please try again.',
        [
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setCustomUser(null);
      navigation.navigate('Welcome');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (user) {
        await supabase.auth.admin.deleteUser(user.id);
      }
      setCustomUser(null);
      navigation.navigate('Welcome');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleSubmit = () => {
    // Handle the product price submission
    console.log('Product price submitted:', productPrice);
    // Navigate to next step (Address screen)
    // navigation.navigate('Address');
  };

  const clearPrice = () => {
    setProductPrice('');
  };

  const handleManualUrlInput = () => {
    // Navigate back to URL screen to enter a different URL
    navigation.goBack();
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

        <TouchableOpacity style={styles.profileContainer}>
          {userProfile?.profilePicture ? (
            <Image
              source={{ uri: userProfile.profilePicture }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>
                {userProfile?.firstName?.charAt(0) || 'U'}
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
          <View style={[styles.stepIndicator, styles.stepInactive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
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

             

             {/* Product Information Card */}
       <View style={styles.productCard}>
         <View style={styles.infoContainer}>
           <Text style={styles.infoTitle}>Product URL Entered</Text>
           <Text style={styles.infoText}>{url || 'No URL provided'}</Text>
         </View>
       </View>

      {/* Product Price Input Card */}
      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>PRODUCT PRICE</Text>
        <View style={styles.priceInputContainer}>
          <TextInput
            style={styles.priceInput}
            value={productPrice}
            onChangeText={setProductPrice}
            keyboardType="numeric"
            placeholder="$0"
            placeholderTextColor="#9CA3AF"
          />
          {productPrice.length > 0 && (
            <TouchableOpacity onPress={clearPrice} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

             {/* Debug Button */}
       <TouchableOpacity style={styles.debugButton} onPress={() => validateAndNavigate(url)}>
         <Text style={styles.debugButtonText}>Debug: Validate URL</Text>
       </TouchableOpacity>

      {/* Manual URL Input Button */}
      <TouchableOpacity style={styles.manualUrlButton} onPress={handleManualUrlInput}>
        <Text style={styles.manualUrlButtonText}>Enter Different URL</Text>
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
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
    textAlign: 'left',
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
  },
  stepTextThird: {
    position: 'absolute',
    left: '50%',
  },
  stepTextFourth: {
    position: 'absolute',
    left: '75%',
  },
  productCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  priceCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 32,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  clearButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
     errorText: {
     fontSize: 16,
     color: '#EF4444',
     textAlign: 'center',
   },
   infoContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     paddingVertical: 20,
   },
   infoTitle: {
     fontSize: 18,
     color: '#000',
     fontWeight: '600',
     marginBottom: 12,
     textAlign: 'center',
   },
   infoText: {
     fontSize: 14,
     color: '#6B7280',
     textAlign: 'center',
     paddingHorizontal: 16,
   },
  manualUrlButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  manualUrlButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  debugButton: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  debugButtonText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
  },
  
});
