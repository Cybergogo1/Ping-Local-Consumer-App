import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Image,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontWeight, fontFamily, responsiveSpacing } from '../../theme';
import { constrainedImageSize } from '../../utils/responsive';
import { WelcomeScreenProps } from '../../types/navigation';

// Calculate responsive image size (aspect ratio ~1.43:1 based on original 400x280)
const illustrationSize = constrainedImageSize(400, 280, 0.95, 0.30);

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../../../assets/images/welcomescreen_background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Blob decoration - bottom layer, outside safe area */}
        <SafeAreaView style={styles.safeArea} edges={[]}>
          <View style={styles.content}>
            {/* Top section with illustration */}
            <View style={styles.illustrationContainer}>
              <Image
                source={require('../../../assets/images/welcomescreen_graphic.png')}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>

            {/* Middle section with logo and tagline */}
            <View style={styles.logoSection}>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.headline}>
                Local Treasures,{'\n'}Tailored to You
              </Text>
              <Text style={styles.tagline}>
                Love, Discover, Support!
              </Text>
            </View>

            {/* Bottom section with buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>Log In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
                style={styles.registerButton}
              >
                <Text style={styles.registerButtonText}>Register</Text>
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
    position: 'relative',
  },
  backgroundImage: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  illustration: {
    width: illustrationSize.width,
    height: illustrationSize.height,
    marginBottom: spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 80,
  },
  headline: {
    fontSize: 32,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  tagline: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bodyMedium,
    color: colors.white,
    marginTop: spacing.sm,
  },
  buttonContainer: {
    width: '100%',
    marginTop: spacing.xxl,
  },
  loginButton: {
    backgroundColor: colors.accent,
    paddingVertical: responsiveSpacing.buttonPaddingVertical,
    borderRadius: borderRadius.full,
  },
  loginButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bodyBold,
  },
  registerButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: responsiveSpacing.buttonPaddingVertical,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  registerButtonText: {
    color: colors.white,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bodyBold,
  },
});
