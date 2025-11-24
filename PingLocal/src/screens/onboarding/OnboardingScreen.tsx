import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  FlatList,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  secondaryText?: string;
  image: any;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Discover',
    description: "The best of Wirral's independents - tailored just for you",
    image: require('../../../assets/images/useronboard1_graphic.avif'),
  },
  {
    id: '2',
    title: 'Love',
    description: 'Hidden gems, real smiles, warm welcomes, and stories to share - Ping Local helps you love where you live.',
    image: require('../../../assets/images/useronboard2_graphic.avif'),
  },
  {
    id: '3',
    title: 'Support',
    description: "This is where it starts. You've made a choice to support real people—and that's something to be proud of.",
    image: require('../../../assets/images/useronboard3_graphic.avif'),
  },
  {
    id: '4',
    title: "Don't Miss Out",
    description: 'Be first to hear about exclusive promotions, fresh finds, and local events.',
    secondaryText: "Turn on notifications—it's the smart way to stay in the loop.",
    image: require('../../../assets/images/useronboard4_graphic.avif'),
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const requestNotificationPermission = async () => {
    // Notifications are not supported in Expo Go (SDK 53+)
    // This will work properly in a development build
    try {
      const Notifications = await import('expo-notifications');

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notifications',
          'You can enable notifications later in your device settings.',
          [{ text: 'OK' }]
        );
      }

      return finalStatus === 'granted';
    } catch (error) {
      // Notifications not available (e.g., in Expo Go)
      console.log('Notifications not available:', error);
      return false;
    }
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last slide - request notifications and navigate to main app
      await requestNotificationPermission();
      // Navigate back to main app (onboarding complete)
      navigation.goBack();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1 });
      setCurrentIndex(currentIndex - 1);
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width }]}>
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={styles.slideImage}
          resizeMode="contain"
        />
      </View>

      {/* Title */}
      <Text style={styles.slideTitle}>
        {item.title}
      </Text>

      {/* Description */}
      <Text style={styles.slideDescription}>
        {item.description}
      </Text>

      {/* Secondary text (for notifications slide) */}
      {item.secondaryText && (
        <Text style={styles.slideSecondaryText}>
          {item.secondaryText}
        </Text>
      )}
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={slides}
            renderItem={renderSlide}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
            scrollEnabled={true}
          />
        </View>

        {/* Bottom navigation */}
        <View style={styles.bottomNav}>
          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={styles.navButtons}>
            {/* Back button - only show after first slide */}
            {currentIndex > 0 ? (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.spacer} />
            )}

            {/* Next button */}
            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>

            {/* Spacer for alignment */}
            <View style={styles.spacer} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  carouselContainer: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  imageContainer: {
    marginBottom: spacing.xxl,
  },
  slideImage: {
    width: 256,
    height: 256,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDescription: {
    fontSize: fontSize.md,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
  },
  slideSecondaryText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  bottomNav: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotInactive: {
    backgroundColor: colors.grayMedium,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: fontSize.xl,
  },
  spacer: {
    width: 48,
  },
  nextButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.full,
  },
  nextButtonText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
});
