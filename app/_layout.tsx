import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

function NavigationGuard() {
  const { estaAutenticado, aCarregar } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (aCarregar) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (estaAutenticado && inAuthGroup) {
      router.replace('/(tabs)/home');
    } else if (!estaAutenticado && !inAuthGroup && segments[0] !== 'onboarding') {
      router.replace('/(auth)/login');
    }
  }, [estaAutenticado, aCarregar, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
