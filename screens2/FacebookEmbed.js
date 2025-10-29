import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';

export default function FacebookEmbed({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const webViewRef = useRef(null);
  
  const { productUrl, userAddress, transactionType, userProfile } = route.params || {};
  
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
    // Navigate directly to ConfirmAddress (skipping PickupAddress and ProductDetails)
    navigation.navigate('ConfirmAddress', {
      productUrl,
      productPrice: '$', // Will be filled by user
      productTitle: 'Facebook Marketplace Item',
      productDescription: 'Product from Facebook Marketplace',
      productImage: '',
      userAddress,
      userProfile,
      transactionType
    });
  };

  // Block navigation to other pages - keep user on the listing URL only
  const handleShouldStartLoadWithRequest = (request) => {
    console.log('🔒 Navigation attempt to:', request.url);
    
    // Only allow the initial product URL to load
    if (!request.url || !productUrl) {
      return true;
    }
    
    // Allow the initial URL to load
    if (request.url === productUrl || request.url.includes(productUrl.split('/?')[0])) {
      console.log('✅ Allowed: Initial product URL');
      return true;
    }
    
    // Block all other navigation attempts
    console.log('🚫 Blocked: Navigation to different URL');
    return false;
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
        
        <View style={styles.profileContainer}>
          {userProfile?.avatar_url ? (
            <Image 
              source={{ uri: userProfile.avatar_url }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profilePlaceholderText}>
                {getUserInitials(userProfile)}
              </Text>
            </View>
          )}
        </View>
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

      {/* Loading Indicator */}
      {loading && !loadError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading Facebook listing...</Text>
        </View>
      )}

      {/* Error State */}
      {loadError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load Facebook listing</Text>
          <Text style={styles.errorSubtext}>This listing may require authentication</Text>
        </View>
      )}

      {/* WebView Container */}
      {!loadError && (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: productUrl }}
            style={styles.webView}
            onLoadStart={() => {
              setLoading(true);
              setLoadError(false);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log('WebView error: ', nativeEvent);
              setLoadError(true);
              setLoading(false);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log('WebView HTTP error: ', nativeEvent);
              if (nativeEvent.statusCode !== 200 && nativeEvent.statusCode !== 302) {
                setLoadError(true);
              }
            }}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            bounces={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            scalesPageToFit={true}
            injectedJavaScript={`
              (function() {
                // Remove Facebook's "Open in App" button and similar elements
                const removeAppButtons = () => {
                  // Remove any element containing "Open in" or "Get the app" text
                  const allElements = document.querySelectorAll('*');
                  allElements.forEach(el => {
                    const text = el.textContent || el.innerText || '';
                    if (text.includes('Open in') || text.includes('Get the app') || 
                        text.includes('Open App') || text.includes('Get App')) {
                      el.style.display = 'none';
                      el.remove();
                    }
                  });
                  
                  // Remove elements by common Facebook mobile web buttons class names
                  const buttonSelectors = [
                    '[data-testid*="open-app"]',
                    '[data-testid*="open_in"]',
                    '[role="button"][aria-label*="Open"]',
                    'div[role="button"]:has-text("Open")',
                    'a[href*="facebook.com/download"]',
                    'a[href*="facebook.com/mobile"]'
                  ];
                  
                  buttonSelectors.forEach(selector => {
                    try {
                      document.querySelectorAll(selector).forEach(el => el.remove());
                    } catch(e) {}
                  });
                  
                  // Remove any buttons in fixed positions (usually app banners)
                  document.querySelectorAll('button, a, div').forEach(el => {
                    const position = window.getComputedStyle(el).position;
                    const text = el.textContent || '';
                    if ((position === 'fixed' || position === 'sticky') && 
                        (text.includes('Open') || text.includes('Get App') || text.includes('Install'))) {
                      el.style.display = 'none';
                      el.remove();
                    }
                  });
                };
                
                // Run immediately and set up observer
                removeAppButtons();
                
                const observer = new MutationObserver(removeAppButtons);
                observer.observe(document.body, {
                  childList: true,
                  subtree: true
                });
                
                // Block all links from being clicked
                document.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }, true);
                
                // Disable all links
                var links = document.querySelectorAll('a');
                links.forEach(function(link) {
                  link.style.pointerEvents = 'none';
                });
                
                // Prevent any navigation
                window.open = function() { return null; };
                
                console.log('🔒 Navigation lockdown and app button removal activated');
                true;
              })();
            `}
          />
        </View>
      )}

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
        >
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
  profilePlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
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
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 150,
    left: 16,
    right: 16,
    bottom: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  webView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  continueButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

