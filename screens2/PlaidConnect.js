import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';

export default function PlaidConnect({ navigation, route }) {
  const { productUrl, productPrice, userAddress, pickupAddress, transactionType, userProfile } = route.params || {};
  const [plaidLogoError, setPlaidLogoError] = useState(false);
  
  // Debug: Log the current state
  console.log('🖼️ PlaidConnect - plaidLogoError state:', plaidLogoError);

  const getUserInitials = (profile) => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    if (profile?.name) {
      const names = profile.name.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    return 'U';
  };

  const handleContinue = () => {
    console.log('🔗 User wants to continue with Plaid connection');
    // Here you would typically integrate with Plaid SDK
    // For now, we'll navigate to the next step (Share screen)
    navigation.navigate('Share', {
      ...(route.params || {}),            // ✅ forward everything (title/image, etc.)
      productUrl,
      productPrice,
      userAddress,
      pickupAddress,
      transactionType,
      userProfile
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Image 
            source={require('../assets/backarrow.png')} 
            style={styles.backButtonImage}
          />
        </TouchableOpacity>
        
        {/* Plaid Logo */}
        <View style={styles.plaidLogoContainer}>
          <Image 
            source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/plaid-logo.png' }} 
            style={styles.plaidHeaderLogo}
          />
          <Text style={styles.plaidText}>PLAID</Text>
          <Image 
            source={{ uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/app-icons/plaid-logo2.png' }} 
            style={styles.plaidHeaderLogo2}
          />
        </View>
        
        {/* Profile Section */}
        <TouchableOpacity onPress={() => navigation.navigate('MyAccount', { userData: userProfile })} style={styles.profileContainer}>
          {userProfile?.avatar_url && userProfile.avatar_url !== '' ? (
            <Image 
              source={{ uri: userProfile.avatar_url }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>
                {userProfile ? getUserInitials(userProfile) : 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Central Connection Icon */}
          <View style={styles.connectionIconContainer}>
            <View style={styles.connectionIcon}>
              <View style={styles.couriCircle}>
                <Image 
                  source={require('../assets/mark2_dark.png')} 
                  style={styles.couriIconImage}
                />
              </View>
              <View style={styles.plaidCircle}>
                <Image 
                  source={plaidLogoError ? require('../assets/plaid-logo.png') : { uri: 'https://nfkykasruwdzpcjuufdu.supabase.co/storage/v1/object/public/assets/plaid-logo.png' }} 
                  style={styles.plaidLogoImage}
                  onError={(error) => {
                    console.log('❌ Plaid logo failed to load from Supabase:', error);
                    console.log('🔄 Switching to local asset fallback...');
                    setPlaidLogoError(true);
                  }}
                  onLoad={() => {
                    if (plaidLogoError) {
                      console.log('✅ Plaid logo loaded successfully from local asset (fallback)');
                    } else {
                      console.log('✅ Plaid logo loaded successfully from Supabase');
                    }
                  }}
                />
              </View>
            </View>
          </View>

          {/* Main Title */}
          <Text style={styles.mainTitle}>
            Couri uses Plaid to connect your accounts
          </Text>

          {/* Feature Descriptions */}
          <View style={styles.featuresContainer}>
            {/* Connect Effortlessly */}
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <View style={styles.lightningIcon}>
                  <View style={styles.lightningBolt} />
                  <View style={styles.lightningCircle1} />
                  <View style={styles.lightningCircle2} />
                </View>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Connect effortlessly</Text>
                <Text style={styles.featureDescription}>
                  Plaid lets you securely connect your financial accounts in seconds
                </Text>
              </View>
            </View>

            {/* Private */}
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <View style={styles.privacyIcon}>
                  <View style={styles.eyeIcon} />
                  <View style={styles.privacyLine} />
                </View>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Private</Text>
                <Text style={styles.featureDescription}>
                  Plaid doesn't sell personal info, and will only use it with your permission
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Privacy Policy */}
        <View style={styles.privacyContainer}>
          <Text style={styles.privacyText}>
            By selecting "Continue" you agree to the{'\n'}
            <Text style={styles.privacyLink}>Plaid End-User Privacy Policy</Text>
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
  plaidLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plaidHeaderLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  plaidHeaderLogo2: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  plaidText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 44,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  connectionIconContainer: {
    marginBottom: 32,
  },
  connectionIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -10,
  },
  couriCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  couriIconImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  plaidCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plaidLogoImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 48,
    maxWidth: 300,
    lineHeight: 32,
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 350,
    gap: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightningIcon: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  lightningBolt: {
    position: 'absolute',
    top: 2,
    left: 8,
    width: 8,
    height: 20,
    backgroundColor: '#000',
    transform: [{ rotate: '45deg' }],
  },
  lightningCircle1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
  },
  lightningCircle2: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
  },
  privacyIcon: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 16,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000',
  },
  privacyLine: {
    position: 'absolute',
    top: 8,
    left: 2,
    width: 20,
    height: 2,
    backgroundColor: '#000',
    transform: [{ rotate: '45deg' }],
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  privacyContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  privacyText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    lineHeight: 20,
  },
  privacyLink: {
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Profile Styles
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
});
