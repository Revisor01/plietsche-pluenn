import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors, fonts, spacing } from '../../theme';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const { width: WINDOW_WIDTH } = Dimensions.get('window');

const slides = [
  {
    title: 'Willkommen bei Plietsche Plünn!',
    text: 'Dein Tausch-Laden in Büsum. Bring Kleidung, die du nicht mehr brauchst — nimm mit, was du liebst.',
    color: colors.gradientStart,
  },
  {
    title: 'QR-Code scannen',
    text: 'Jedes Item hat einen QR-Code. Scan ihn mit der App und sieh, was dahintersteckt.',
    color: colors.primary,
  },
  {
    title: 'Punkte sammeln',
    text: 'Fürs Einchecken und Scannen bekommst du Plietsch-Punkte — als Dankeschön fürs Mitmachen.',
    color: colors.primaryLight,
  },
  {
    title: 'Komm vorbei!',
    text: 'Neue Items kommen regelmäßig. Schau rein, tausch aus, komm wieder.',
    color: colors.gradientEnd,
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / WINDOW_WIDTH);
    setCurrentSlide(index);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      scrollViewRef.current?.scrollTo({ x: (currentSlide + 1) * WINDOW_WIDTH, animated: true });
    } else {
      onComplete();
    }
  };

  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
        <Text style={styles.skipText}>Überspringen</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            {/* Illustration placeholder */}
            <View style={[styles.illustration, { backgroundColor: slide.color }]} />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.text}>{slide.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot Indicators */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentSlide ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Next / Finish Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.nextButton, isLastSlide && styles.nextButtonFinish]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, isLastSlide && styles.nextButtonTextFinish]}>
            {isLastSlide ? "Los geht's!" : 'Weiter'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: WINDOW_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dot: {
    borderRadius: 5,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 10,
    height: 10,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: colors.border,
  },
  buttonContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  nextButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  nextButtonFinish: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nextButtonText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.primary,
  },
  nextButtonTextFinish: {
    color: colors.white,
  },
});
