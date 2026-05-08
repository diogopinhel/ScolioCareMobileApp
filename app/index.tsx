import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function Index() {
  useEffect(() => {
    async function redirect() {
      const seen = await SecureStore.getItemAsync('onboardingVisto');
      if (seen) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/onboarding');
      }
    }
    redirect();
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
}
