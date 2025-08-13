import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider } from './contexts/UserContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';

import UploadPhotoScreen from './screens/UploadPhotoScreen';
import SplashScreen from './screens/SplashScreen';
import PasswordLoginScreen from './screens/PasswordLoginScreen';
import HomeScreen from './screens/HomeScreen';
import CreateAccountScreen from './screens/CreateAccountScreen';
import LogInScreen from './screens/LogInScreen';
import Welcomepage from './screens/Welcomepage';
import CodeVerify from './screens/CodeVerify';
import AccountSetupScreen from './screens/AccountSetupScreen';
import MyAccountScreen from './screens/MyAccountScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginSecurityScreen from './screens/LoginSecurityScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import CreatePasswordScreen from './screens/CreatePasswordScreen';
import PersonalInfoScreen from './screens/PersonalInfoScreen';
import PushNotiScreen from './screens/PushNotiScreen';
import FaceIDScreen from './screens/FaceIDScreen';
import PhoneInputScreen from './screens/PhoneInputScreen';
import PasswordChangedConfirmation from './screens/PasswordChangedConfirmation';
import ConfirmInfoScreen from './screens/ConfirmInfoScreen';
import SupportScreen from './screens/SupportScreen';

const Stack = createNativeStackNavigator();
const prefix = Linking.createURL('/');
const linking = { prefixes: ["com.anonymous.jerroddd://" ],
};

export default function App() {
  console.log('🚀 App component rendering');
  
  return (
   <UserProvider>
   <GestureHandlerRootView style={{ flex: 1 }}>
   {/* Only one NavigationContainer */}
   <NavigationContainer 
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
 <Stack.Screen name="PasswordLogin" component={PasswordLoginScreen} />
 <Stack.Screen name="CodeVerify" component={CodeVerify} />
 <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
 <Stack.Screen name="Welcomepage" component={Welcomepage} />
 <Stack.Screen name="UploadPhoto" component={UploadPhotoScreen} />
 <Stack.Screen name="MyAccount" component={MyAccountScreen} />
 <Stack.Screen name="Profile" component={ProfileScreen} />
 <Stack.Screen name="LoginSecurity" component={LoginSecurityScreen} />
 <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
 <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
 <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
 <Stack.Screen name="PushNoti" component={PushNotiScreen} />
 <Stack.Screen name="FaceID" component={FaceIDScreen} />
 <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
 <Stack.Screen name="PasswordChangedConfirmation" component={PasswordChangedConfirmation} />
 <Stack.Screen name="ConfirmInfo" component={ConfirmInfoScreen} />
 <Stack.Screen name="Support" component={SupportScreen} />
 </Stack.Navigator>
 </NavigationContainer>
 </GestureHandlerRootView>
 </UserProvider>
 );
}

