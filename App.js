import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider } from './contexts/UserContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { supabase } from './screens/supabaseClient';

import UploadPhotoScreen from './screens/UploadPhotoScreen';
import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import CreateAccountScreen from './screens/CreateAccountScreen';
import LogInScreen from './screens/LogInScreen';
import Welcomepage from './screens/Welcomepage';
import CodeVerify from './screens/CodeVerify';
import AccountSetupScreen from './screens/AccountSetupScreen';
import MyAccountScreen from './screens/MyAccountScreen';
import LoginSecurityScreen from './screens/LoginSecurityScreen';
import ProfileScreen from './screens/ProfileScreen';
import PersonalInfoScreen from './screens/PersonalInfoScreen';
import PushNotiScreen from './screens/PushNotiScreen';
import FaceIDScreen from './screens/FaceIDScreen';
import PhoneInputScreen from './screens/PhoneInputScreen';
import SupportScreen from './screens/SupportScreen';
import BankInfo from './screens/BankInfo';
import Transactions from './screens/Transactions';
import TransactionDetails from './screens/TransactionDetails';
import ChatHistory from './screens/ChatHistory';
import Notification from './screens/Notification';
import Legal from './screens/Legal';
import URL from './screens2/URL';
import ProductPrice from './screens2/ProductPrice';
import ConfirmAddress from './screens2/ConfirmAddress';
import PickupAddress from './screens2/PickupAddress';
import TrackingScreen from './screens2/TrackingScreen';
import ConfirmAvailability from './screens2/ConfirmAvailability';
import DelayArrival from './screens2/delayArrival';
import Payment from './screens2/Payment';
import PlaidConnect from './screens2/PlaidConnect';
import Share from './screens2/Share';
import ProductDetails from './screens2/ProductDetails';
import InviteScreen from './src/screens/InviteScreen';

const Stack = createNativeStackNavigator();
const prefix = Linking.createURL('/');
const linking = { 
  prefixes: [
    "com.anonymous.jerrod://",  // Current scheme from app.json
    "couri://",  // Alternative simpler scheme
    "https://gocouri.com",  // Universal Links (when configured)
  ],
  config: {
    screens: {
      Splash: 'splash',
      Home: 'home',
      CreateAccount: 'create-account',
      Login: 'login',
      Welcomepage: {
        path: 'welcome',
        screens: {
          transaction: 'transaction/:transactionId'
        }
      },
      // Add other screens as needed
    }
  }
};

export default function App() {
  console.log('🚀 App component rendering');
  const navigationRef = useRef();
  
  // Handle deep linking for OAuth callbacks
  useEffect(() => {
    const handleDeepLink = async (url) => {
      console.log('🔗 Deep link received:', url);
      
      // Handle OAuth callbacks
      if (url && url.includes('code=')) {
        console.log('🔑 OAuth callback detected with authorization code');
        
        try {
          // Extract the authorization code from the URL
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          
          if (code) {
            console.log('✅ OAuth authorization code detected');
            console.log('🔄 PKCE will handle session establishment automatically');
            // Don't manually exchange - Supabase PKCE handles this via auth listener
          }
        } catch (error) {
          console.error('❌ Error handling OAuth callback:', error);
        }
      }
      
      // Handle transaction deep links (both schemes)
      else if (url && (url.includes('transaction/'))) {
        console.log('💼 Transaction deep link detected');
        
        try {
          const urlObj = new URL(url);
          const pathSegments = urlObj.pathname.split('/').filter(s => s);
          const transactionIdIndex = pathSegments.indexOf('transaction');
          const transactionId = transactionIdIndex !== -1 && transactionIdIndex < pathSegments.length - 1
            ? pathSegments[transactionIdIndex + 1]
            : pathSegments[pathSegments.length - 1];
          
          if (transactionId && navigationRef.current) {
            console.log('💼 Fetching transaction details:', transactionId);
            
            // Fetch transaction details from Supabase
            const projectRef = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF || 'nfkykasruwdzpcjuufdu';
            const fetchUrl = `https://${projectRef}.functions.supabase.co/accept-invite-by-id?transactionId=${transactionId}`;
            
            fetch(fetchUrl)
              .then(res => res.json())
              .then(data => {
                console.log('✅ Transaction fetched:', data);
                
                if (data.transaction) {
                  // Navigate to Welcomepage with invite data
                  navigationRef.current.navigate('Welcomepage', {
                    inviteTransaction: {
                      id: data.transaction.id,
                      status: data.transaction.status,
                      title: data.transaction.metadata?.item_title || 'Product',
                      price: data.transaction.metadata?.amount || 0,
                      image: data.transaction.metadata?.item_image,
                      description: data.transaction.metadata?.item_description,
                      seller: data.transaction.inviter?.name || 'Unknown',
                      sellerId: data.transaction.inviter?.id,
                      source: data.transaction.metadata?.source || 'Facebook Marketplace',
                      fromDeepLink: true
                    }
                  });
                }
              })
              .catch(error => {
                console.error('❌ Error fetching transaction:', error);
                // Still navigate to Welcomepage but without invite data
                navigationRef.current.navigate('Welcomepage');
              });
          }
        } catch (error) {
          console.error('❌ Error handling transaction deep link:', error);
        }
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 Initial deep link URL:', url);
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('🔗 Deep link event received:', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);
  
  return (
   <UserProvider>
   <GestureHandlerRootView style={{ flex: 1 }}>
   {/* Only one NavigationContainer */}
   <NavigationContainer 
     ref={navigationRef}
     linking={linking}
     onStateChange={(state) => {
       console.log('🔄 App navigation state changed:', state?.routes?.map(r => r.name));
     }}
     onReady={() => {
       console.log('✅ App navigation ready');
     }}
   >
   <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
 <Stack.Screen name="Splash" component={SplashScreen} />
 <Stack.Screen name="Home" component={HomeScreen} />
 <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
 <Stack.Screen name="Login" component={LogInScreen} />
 <Stack.Screen name="CodeVerify" component={CodeVerify} />
 <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
 <Stack.Screen name="Welcomepage" component={Welcomepage} />
 <Stack.Screen name="UploadPhoto" component={UploadPhotoScreen} />
 <Stack.Screen name="MyAccount" component={MyAccountScreen} />
 <Stack.Screen name="LoginSecurity" component={LoginSecurityScreen} />
 <Stack.Screen name="Profile" component={ProfileScreen} />
 <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
 <Stack.Screen name="PushNoti" component={PushNotiScreen} />
 <Stack.Screen name="FaceID" component={FaceIDScreen} />
 <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
 <Stack.Screen name="Support" component={SupportScreen} />
 <Stack.Screen name="BankInfo" component={BankInfo} />
 <Stack.Screen name="Transactions" component={Transactions} />
 <Stack.Screen name="TransactionDetails" component={TransactionDetails} />
 <Stack.Screen name="ChatHistory" component={ChatHistory} />
 <Stack.Screen name="Notification" component={Notification} />
 <Stack.Screen name="Legal" component={Legal} />
         <Stack.Screen name="URL" component={URL} />
        <Stack.Screen name="ProductDetails" component={ProductDetails} />
        <Stack.Screen name="ProductPrice" component={ProductPrice} />
        <Stack.Screen name="PickupAddress" component={PickupAddress} />
        <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
        <Stack.Screen name="ConfirmAvailability" component={ConfirmAvailability} />
        <Stack.Screen name="delayArrival" component={DelayArrival} />
        <Stack.Screen name="ConfirmAddress" component={ConfirmAddress} />
        <Stack.Screen name="Payment" component={Payment} />
        <Stack.Screen name="PlaidConnect" component={PlaidConnect} />
        <Stack.Screen name="Share" component={Share} />
        <Stack.Screen name="Invite" component={InviteScreen} />
</Stack.Navigator>
 </NavigationContainer>
 </GestureHandlerRootView>
 </UserProvider>
 );
}

