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
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { WelcomeScreenProps } from '../../types/navigation';

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../../../assets/images/wirralbg.avif')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            {/* Top section with illustration */}
            <View style={styles.illustrationContainer}>
              <Image
                source={require('../../../assets/images/welcomescreen_graphic.avif')}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>

            {/* Middle section with logo and tagline */}
            <View style={styles.logoSection}>
              <Image
                source={require('../../../assets/images/logo.avif')}
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
  },
  backgroundImage: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  illustration: {
    width: 256,
    height: 256,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: -spacing.xl,
  },
  logo: {
    width: 160,
    height: 64,
  },
  headline: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.white,
    marginTop: spacing.sm,
  },
  buttonContainer: {
    width: '100%',
  },
  loginButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  loginButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
  registerButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  registerButtonText: {
    color: colors.white,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
});
