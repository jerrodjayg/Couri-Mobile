import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider } from './contexts/UserContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';

import SplashScreen from './screens/SplashScreen';
import PasswordLoginScreen from './screens/PasswordLoginScreen';
import HomeScreen from './screens/HomeScreen';
import CreateAccountScreen from './screens/CreateAccountScreen';
import CreatePasswordScreen from './screens/CreatePasswordScreen';
import LogInScreen from './screens/LogInScreen';
import Welcomepage from './screens/Welcomepage';
import CodeVerify from './screens/CodeVerify';
import FaceIDScreen from './screens/FaceIDScreen';
import AccountSetupScreen from './screens/AccountSetupScreen';
import PersonalInfoScreen from './screens/PersonalInfoScreen';
import ConfirmInfoScreen from './screens/ConfirmInfoScreen';
import PushNotiScreen from './screens/PushNotiScreen';

const Stack = createNativeStackNavigator();
const prefix = Linking.createURL('/');
const linking = { prefixes: ["com.anonymous.jerroddd://" ],
};

export default function App() {
 return (
 <UserProvider>
 <GestureHandlerRootView style={{ flex: 1 }}>
 {/* Only one NavigationContainer */}
 <NavigationContainer linking={linking}>
 <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
 <Stack.Screen name="Splash" component={SplashScreen} />
 <Stack.Screen name="Home" component={HomeScreen} />
 <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
 <Stack.Screen name="Login" component={LogInScreen} />
 <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
 <Stack.Screen name="PasswordLogin" component={PasswordLoginScreen} />
 <Stack.Screen name="CodeVerify" component={CodeVerify} />
 <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
 <Stack.Screen name="FaceID" component={FaceIDScreen} />
 <Stack.Screen name="Welcomepage" component={Welcomepage} />
 <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
 <Stack.Screen name="ConfirmInfo" component={ConfirmInfoScreen}/>
 <Stack.Screen name="PushNoti" component={PushNotiScreen} />
 </Stack.Navigator>
 </NavigationContainer>
 </GestureHandlerRootView>
 </UserProvider>
 );
}