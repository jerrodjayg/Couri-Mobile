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
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';

export default function SellerProductForm({ navigation, route }) {
  const { type, showSizeWarning, userProfile: routeUserProfile } = route.params || {};
  const { user } = useUser();
  
  const [userProfile, setUserProfile] = useState(null);
  const [sizeWarningModalVisible, setSizeWarningModalVisible] = useState(false);
  
  // Form fields
  const [productImages, setProductImages] = useState([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  const [conditionDetails, setConditionDetails] = useState('');
  const [showConditionPicker, setShowConditionPicker] = useState(false);

  // Condition options
  const conditionOptions = [
    'New',
    'Used - Like New',
    'Used - Good',
    'Used - Fair',
  ];

  // Show size warning modal after 1 second when screen loads if showSizeWarning is true
  useEffect(() => {
    if (showSizeWarning) {
      const timer = setTimeout(() => {
        setSizeWarningModalVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [showSizeWarning]);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (routeUserProfile) {
          setUserProfile(routeUserProfile);
          return;
        }

        const userProfileData = await AsyncStorage.getItem('userProfileData');
        if (userProfileData) {
          const parsedUserData = JSON.parse(userProfileData);
          setUserProfile(parsedUserData);
        } else if (user) {
          setUserProfile({
            id: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name,
            full_name: user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.avatar_url,
            email: user.email
          });
        }
      } catch (error) {
        console.log('⚠️ Error fetching user profile in SellerProductForm:', error);
      }
    };

    fetchUserProfile();
  }, [user, routeUserProfile]);

  const getUserInitials = () => {
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    if (userProfile?.name) {
      const names = userProfile.name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    return 'U';
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleProfilePress = () => {
    if (userProfile) {
      navigation.navigate('MyAccount', { userData: userProfile });
    } else {
      navigation.navigate('Login');
    }
  };

  const pickImages = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setProductImages([...productImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your camera to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setProductImages([...productImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleSave = () => {
    // Validate required fields
    if (productImages.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one product photo or video.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please enter a product title.');
      return;
    }

    if (!price.trim()) {
      Alert.alert('Missing Information', 'Please enter a price.');
      return;
    }

    if (!condition) {
      Alert.alert('Missing Information', 'Please select a condition.');
      return;
    }

    if (!conditionDetails.trim()) {
      Alert.alert('Missing Information', 'Please enter condition details.');
      return;
    }

    // Navigate to ProductPrice screen with the data
    navigation.navigate('ProductPrice', {
      productUrl: null,
      productTitle: title,
      productName: title,
      productImage: productImages.length > 0 ? productImages[0] : null,
      imageUrl: productImages.length > 0 ? productImages[0] : null,
      userProfile: userProfile,
      transactionType: type,
      extractedData: {
        productName: title,
        price: `$${price}`,
        description: description,
        imageUrl: productImages.length > 0 ? productImages[0] : null,
        images: productImages,
        condition: condition,
        conditionDetails: conditionDetails,
      },
    });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  // Check if all required fields are filled
  const isFormValid = 
    productImages.length > 0 &&
    title.trim() !== '' &&
    price.trim() !== '' &&
    condition !== '' &&
    conditionDetails.trim() !== '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Size Warning Modal */}
      <Modal visible={sizeWarningModalVisible} transparent animationType="fade" onRequestClose={() => setSizeWarningModalVisible(false)}>
        <View style={sizeWarningModalStyles.overlay}>
          <View style={sizeWarningModalStyles.modalContent}>
            <View style={sizeWarningModalStyles.iconContainer}>
              <View style={sizeWarningModalStyles.iconCircle}>
                <Image 
                  source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/Mark 2 Dark.png' }}
                  style={sizeWarningModalStyles.iconImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            
            <Text style={sizeWarningModalStyles.title}>Heads up!</Text>
            
            <Text style={sizeWarningModalStyles.bodyText}>
              Couri drivers use their personal cars, so all{'\n'} items need to fit in a standard trunk or back {'\n'} seat. Large items (like couches or large{'\n'} appliances) can't be delivered at this time. <Text style={sizeWarningModalStyles.boldText}>Oversized items may be canceled.</Text>
            </Text>
            
            <TouchableOpacity
              style={sizeWarningModalStyles.understandButton}
              onPress={() => setSizeWarningModalVisible(false)}
            >
              <Text style={sizeWarningModalStyles.understandButtonText}>I understand</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={sizeWarningModalStyles.cancelButton}
              onPress={() => {
                setSizeWarningModalVisible(false);
                navigation.goBack();
              }}
            >
              <Text style={sizeWarningModalStyles.cancelButtonText}>Cancel transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image 
            source={require('../assets/backarrow1.png')} 
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
                {userProfile ? getUserInitials() : '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.stepIndicator, styles.stepActive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
          <View style={[styles.stepIndicator, styles.stepInactive]} />
        </View>
        
        <View style={styles.progressLabels}>
          <Text style={[styles.stepText, styles.stepTextFirst]}>Product</Text>
          <Text style={[styles.stepText, styles.stepTextSecond]}>Address</Text>
          <Text style={[styles.stepText, styles.stepTextThird]}>Payment</Text>
          <Text style={[styles.stepText, styles.stepTextFourth]}>Share</Text>
        </View>
        
        <Text style={styles.title}>What are you selling?</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
        >
          {/* Product Photos or Videos Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Product Photos or Videos*</Text>
            <Text style={styles.sectionSubLabel}>At least one is required</Text>
            
            {productImages.length > 0 ? (
              /* Swipeable Container for Photos and Upload Buttons (when photos exist) */
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.swipeableContainer}
                style={styles.swipeableScrollView}
                pagingEnabled={false}
                decelerationRate="fast"
              >
                {/* Display selected images */}
                {productImages.map((uri, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <View style={styles.imagePreview}>
                      <Image source={{ uri }} style={styles.previewImage} />
                    </View>
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => {
                        const newImages = productImages.filter((_, i) => i !== index);
                        setProductImages(newImages);
                      }}
                    >
                      <Text style={styles.removeImageButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {/* Upload Buttons */}
                <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
                  <Image 
                    source={{ uri: 'https://img.icons8.com/ios/50/000000/add-image.png' }}
                    style={styles.uploadIcon}
                  />
                  <Text style={styles.uploadButtonText}>Add photos or videos</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                  <Image 
                    source={{ uri: 'https://img.icons8.com/ios/50/000000/camera.png' }}
                    style={styles.uploadIcon}
                  />
                  <Text style={styles.uploadButtonText}>Take photos or videos</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              /* Static Upload Buttons (when no photos) */
              <View style={styles.uploadButtonsContainer}>
                <TouchableOpacity style={styles.uploadButtonStatic} onPress={pickImages}>
                  <Image 
                    source={{ uri: 'https://img.icons8.com/ios/50/000000/add-image.png' }}
                    style={styles.uploadIcon}
                  />
                  <Text style={styles.uploadButtonText}>Add photos or videos</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.uploadButtonStatic} onPress={takePhoto}>
                  <Image 
                    source={{ uri: 'https://img.icons8.com/ios/50/000000/camera.png' }}
                    style={styles.uploadIcon}
                  />
                  <Text style={styles.uploadButtonText}>Take photos or videos</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title*</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder=""
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.inputUnderline} />
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Price*</Text>
            <TextInput
              style={styles.textInput}
              value={price}
              onChangeText={(text) => {
                // Remove dollar sign and any non-numeric characters except decimal point
                const numericValue = text.replace(/[^0-9.]/g, '');
                setPrice(numericValue);
              }}
              onBlur={() => {
                // Add dollar sign when user finishes typing (if there's a value and it doesn't already have $)
                if (price && price.trim() !== '' && !price.startsWith('$')) {
                  setPrice(`$${price}`);
                }
              }}
              onFocus={() => {
                // Remove dollar sign when user starts typing again for easier editing
                if (price && price.startsWith('$')) {
                  setPrice(price.replace('$', ''));
                }
              }}
              placeholder=""
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            <View style={styles.inputUnderline} />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (recommended)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Add key details—age, features, or what's included."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Condition */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Condition*</Text>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => setShowConditionPicker(true)}
            >
              <Text style={[styles.textInput, condition ? {} : { color: '#9CA3AF' }]}>
                {condition || ''}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
            <View style={styles.inputUnderline} />
          </View>

          {/* Condition Details */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Condition Details*</Text>
            <TextInput
              style={styles.descriptionInput}
              value={conditionDetails}
              onChangeText={setConditionDetails}
              placeholder="Note any scratches, wear, or other defects."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.saveButton,
            isFormValid && styles.saveButtonActive
          ]} 
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Condition Picker Modal */}
      <Modal
        visible={showConditionPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConditionPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowConditionPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Condition</Text>
              <TouchableOpacity 
                style={styles.pickerCloseButtonContainer}
                onPress={() => setShowConditionPicker(false)}
              >
                <Text style={styles.pickerCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerOptions}>
              {conditionOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerOption}
                  onPress={() => {
                    setCondition(option);
                  }}
                >
                  <View style={styles.radioButtonContainer}>
                    <View style={[
                      styles.radioButton,
                      condition === option && styles.radioButtonSelected
                    ]}>
                      {condition === option && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </View>
                  <Text style={styles.pickerOptionText}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowConditionPicker(false)}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    borderWidth: 1,
    borderColor: '#000',
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 62,
    marginBottom: 4,
    textAlign: 'left',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 4,
  },
  sectionSubLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  swipeableScrollView: {
    marginBottom: 16,
  },
  swipeableContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingRight: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 0,
    paddingTop: 8,
    paddingRight: 8,
  },
  imagePreview: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  uploadButton: {
    width: 160,
    height: 140,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F9FAFB',
    flexShrink: 0,
  },
  uploadButtonStatic: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F9FAFB',
  },
  uploadIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
    tintColor: '#000',
  },
  uploadButtonText: {
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  inputGroup: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginTop: 4,
  },
  descriptionInput: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 92,
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  saveButton: {
    backgroundColor: '#9CA3AF',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 48,
    minWidth: 120,
  },
  saveButtonActive: {
    backgroundColor: '#000',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  pickerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  pickerCloseButtonContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCloseButton: {
    fontSize: 24,
    color: '#000',
    fontWeight: '300',
  },
  pickerOptions: {
    paddingVertical: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  radioButtonContainer: {
    marginRight: 16,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  radioButtonInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#14B8A6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#171715',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginHorizontal: 24,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: {
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
    maxWidth: 352,
    width: '110%',
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
    width: 50,
    height: 50,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 30,
    height: 30,
  },
  title: {
    fontSize: 32,
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '400',
    fontFamily: 'Area Normal'
  },
  bodyText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontStyle: 'normal',
    fontWeight: '400',
    fontFamily: 'Area Normal'
  },
  boldText: {
    fontWeight: 'bold',
  },
  understandButton: {
    backgroundColor: '#171715',
    borderRadius: 25,
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
    fontSize: 28,
    textDecorationLine: 'underline',
    fontWeight: '600',
    fontFamily: 'Area Normal'
  },
});

