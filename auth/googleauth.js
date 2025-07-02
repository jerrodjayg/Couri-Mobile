import { IOS_CLIENT_ID, EXPO_CLIENT_ID } from '@env';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth(navigation) {
  const redirectUri = 'https://auth.expo.io/@jeanluc.folly/jerrod';

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    expoClientId: EXPO_CLIENT_ID,
    redirectUri,
  });
  console.log('Using redirect URI:', redirectUri);

  useEffect(() => {
    if (response?.type === 'success') {
      navigation.replace('HomeScreen'); // Redirect on login
    }
  }, [response]);

  return { request, promptAsync };
}