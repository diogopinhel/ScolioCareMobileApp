import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

function NavigationGuard() {
  const { estaAutenticado, aCarregar } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (aCarregar) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    // Allow the post-registration confirmation screen even when authenticated,
    // so the 2FA suggestion sheet can be shown before entering the main app.
    const isEmailConfirmed = inAuthGroup && segs[1] === 'email-confirmed';

    if (estaAutenticado && inAuthGroup && !isEmailConfirmed) {
      router.replace('/(tabs)/home');
    } else if (!estaAutenticado && !inAuthGroup && segs[0] !== 'onboarding') {
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
