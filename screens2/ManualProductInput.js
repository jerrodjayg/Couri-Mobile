import React, { useState } from 'react';
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

export default function ManualProductInput({ navigation, route }) {
  const { type, userProfile } = route.params || {};
  const isSelling = type === 'sell';

  // State for form fields
  const [productImages, setProductImages] = useState([]);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [showConditionPicker, setShowConditionPicker] = useState(false);

  // Condition options
  const conditionOptions = [
    'New',
    'Like New',
    'Excellent',
    'Good',
    'Fair',
    'Poor',
  ];

  const handleBack = () => {
    navigation.goBack();
  };

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

  const handleProfilePress = () => {
    if (userProfile) {
      navigation.navigate('MyAccount', { userData: userProfile });
    } else {
      navigation.navigate('Login');
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setProductImages([...productImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = (index) => {
    const newImages = productImages.filter((_, i) => i !== index);
    setProductImages(newImages);
  };

  const handleSave = () => {
    // Validate required fields
    if (!productName.trim()) {
      Alert.alert('Missing Information', 'Please enter a product name.');
      return;
    }

    if (!price.trim()) {
      Alert.alert('Missing Information', 'Please enter a price.');
      return;
    }

    // Navigate to ProductPrice screen with the manually entered data
    navigation.navigate('ProductPrice', {
      productUrl: null, // No URL for manual input
      productTitle: productName,
      productName: productName,
      productImage: productImages.length > 0 ? productImages[0] : null,
      imageUrl: productImages.length > 0 ? productImages[0] : null,
      userProfile: userProfile,
      transactionType: type,
      extractedData: {
        productName: productName,
        price: `$${price}`,
        description: description,
        imageUrl: productImages.length > 0 ? productImages[0] : null,
        images: productImages,
        condition: condition,
      },
    });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image 
            source={require('../assets/backarrow1.png')} 
            style={styles.backButtonImage}
          />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>PRODUCT DETAILS</Text>
        
        <View style={{ width: 44 }} />
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
        {/* Product Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Product Images</Text>
          
          <View style={styles.imagesContainer}>
            {productImages.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.productImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadButtonIcon}>+</Text>
            <Text style={styles.uploadButtonText}>Upload additional photos or videos</Text>
          </TouchableOpacity>
        </View>

        {/* Product Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}></Text>
          <TextInput
            style={styles.textInput}
            value={productName}
            onChangeText={setProductName}
            placeholder="Product Name"
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.inputUnderline} />
        </View>

        {/* Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}></Text>
          <TextInput
            style={styles.textInput}
            value={price}
            onChangeText={setPrice}
            placeholder="Price"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
          <View style={styles.inputUnderline} />
        </View>

        {/* Condition */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}></Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowConditionPicker(true)}
          >
            <Text style={[styles.textInput, condition ? {} : { color: '#9CA3AF' }]}>
              {condition ||  'Condition'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
          <View style={styles.inputUnderline} />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a product description"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Condition Picker Modal */}
      <Modal
        visible={showConditionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConditionPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowConditionPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Condition</Text>
              <TouchableOpacity onPress={() => setShowConditionPicker(false)}>
                <Text style={styles.pickerCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.pickerOptions}>
              {conditionOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.pickerOption,
                    condition === option && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setCondition(option);
                    setShowConditionPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    condition === option && styles.pickerOptionTextSelected
                  ]}>
                    {option}
                  </Text>
                  {condition === option && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButtonImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 0.5,
    fontFamily: "Overused Grotesk"
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 50,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
    fontWeight: '400',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 52,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F9FAFB',
  },
  uploadButtonIcon: {
    fontSize: 20,
    color: '#000',
    marginRight: 8,
    fontWeight: '400',
  },
  uploadButtonText: {
    fontSize: 13,
    color: '#000',
    fontWeight: '600',
    alignContent: "center",
    fontFamily: 'Area Normal'
  },
  inputGroup: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    fontWeight: '400',
  },
  textInput: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputUnderline: {
    height: 1,
    width: 358,
    backgroundColor: '#000',
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
    backgroundColor: '#F9FAFB',
    minHeight: 120,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 16,
    marginHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    marginHorizontal: 24,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '400', 
    textDecorationLine: 'underline',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  pickerCloseButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  pickerOptions: {
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerOptionSelected: {
    backgroundColor: '#F9FAFB',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
  },
  pickerOptionTextSelected: {
    fontWeight: '600',
    color: '#000',
  },
  checkmark: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: 'bold',
  },
});

