import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from '../src/i18n';

const { width } = Dimensions.get('window');

export default function Onboarding() {
  const { t } = useTranslation();
  const slides = [
    {
      id: '1',
      image: require('../assets/onboarding/img1.jpg'),
      title: t('onboarding.slide1Titulo'),
      subtitle: t('onboarding.slide1Sub'),
      subtitleColor: '#F59E0B',
    },
    {
      id: '2',
      image: require('../assets/onboarding/img2.jpg'),
      title: t('onboarding.slide2Titulo'),
      subtitle: t('onboarding.slide2Sub'),
      subtitleColor: '#1A6FAF',
    },
    {
      id: '3',
      image: require('../assets/onboarding/img3.jpg'),
      title: t('onboarding.slide3Titulo'),
      subtitle: t('onboarding.slide3Sub'),
      subtitleColor: '#6B7280',
    },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const completeOnboarding = async () => {
    await SecureStore.setItemAsync('onboardingVisto', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      completeOnboarding();
    }
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index!);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={completeOnboarding}>
        <Text style={styles.skipText}>{t('onboarding.saltar')}</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={item.image} style={styles.image} resizeMode="cover" />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: item.subtitleColor }]}>
              {item.subtitle}
            </Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? t('onboarding.comecar') : t('onboarding.seguinte')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: { color: '#1A6FAF', fontSize: 16 },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 8,
  },
  image: { width: 220, height: 200, borderRadius: 12, marginBottom: 36 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 23 },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: { height: 10, width: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  dotActive: { width: 24, backgroundColor: '#1A6FAF' },
  button: {
    backgroundColor: '#1A6FAF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
