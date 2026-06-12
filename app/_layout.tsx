import '../src/i18n';
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
    // Allow post-registration and 2FA activation screens for authenticated users.
    const isEmailConfirmed = inAuthGroup && segs[1] === 'email-confirmed';
    const isTwoFactorVerify = inAuthGroup && segs[1] === 'two-factor-verify';

    if (estaAutenticado && inAuthGroup && !isEmailConfirmed && !isTwoFactorVerify) {
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
