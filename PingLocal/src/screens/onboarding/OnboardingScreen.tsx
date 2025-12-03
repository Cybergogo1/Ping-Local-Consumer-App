import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Dimensions,
  FlatList,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';

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
    image: require('../../../assets/images/useronboard1_graphic.png'),
  },
  {
    id: '2',
    title: 'Love',
    description: 'Hidden gems, real smiles, warm welcomes, and stories to share - Ping Local helps you love where you live.',
    image: require('../../../assets/images/useronboard2_graphic.png'),
  },
  {
    id: '3',
    title: 'Support',
    description: "This is where it starts. You've made a choice to support real people—and that's something to be proud of.",
    image: require('../../../assets/images/useronboard3_graphic.png'),
  },
  {
    id: '4',
    title: "Don't Miss Out",
    description: 'Be first to hear about exclusive promotions, fresh finds, and local events.',
    secondaryText: "Turn on notifications—it's the smart way to stay in the loop.",
    image: require('../../../assets/images/useronboard4_graphic.png'),
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const { completeOnboarding, updateNotificationPermission, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const requestNotificationPermission = async () => {
    try {
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

      // Update permission status in database
      if (finalStatus === 'granted') {
        await updateNotificationPermission('granted');
      } else if (finalStatus === 'denied') {
        await updateNotificationPermission('denied');
      } else {
        await updateNotificationPermission('dismissed');
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
      await updateNotificationPermission('dismissed');
      return false;
    }
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last slide - request notifications and complete onboarding
      await requestNotificationPermission();

      const { error } = await completeOnboarding();

      if (error) {
        console.error('Error completing onboarding:', error);
        Alert.alert('Error', 'Failed to save onboarding progress. Please try again.');
        return;
      }

      // Force navigation reset to Main app
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
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
      <ImageBackground
        source={require('../../../assets/images/onboardbg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
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
                <Image source={require('../../../assets/images/iconback.png')} style={styles.backButtonIcon} />
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
          </View>
        </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  backgroundImage: {
    flex: 1,
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
    width: 300,
    height: 300,
  },
  slideTitle: {
    fontSize: 45,
    fontFamily: fontFamily.headingBold,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDescription: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bodyMedium,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 30,
  },
  slideSecondaryText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.accent,
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
    backgroundColor: '#203C50',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonIcon: {
    width: 16,
    height: 16,
  },
  spacer: {
    width: 40,
  },
  nextButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.full,
  },
  nextButtonText: {
    color: colors.primary,
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.md,
  },
});
