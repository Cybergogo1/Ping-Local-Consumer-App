import React from 'react';
import { View, Text, Image, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

export default function EmailVerificationSuccessScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Image
              source={require('../../../assets/images/logo_icononly.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.headline}>Email Verified!</Text>
          <Text style={styles.bodyText}>
            Your email has been successfully verified. You can now return to the app to continue.
          </Text>

          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>Next Steps:</Text>
            <Text style={styles.instructionsText}>
              1. Return to the Ping Local app{'\n'}
              2. Complete your onboarding{'\n'}
              3. Start discovering local businesses!
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (typeof window !== 'undefined' && window.close) {
                window.close();
              }
            }}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Close This Window</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary
  },
  safeArea: {
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconContainer: {
    marginBottom: spacing.xl
  },
  logo: {
    width: 80,
    height: 80
  },
  headline: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.md
  },
  bodyText: {
    fontSize: fontSize.md,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24
  },
  instructionsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl
  },
  instructionsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
    marginBottom: spacing.sm
  },
  instructionsText: {
    fontSize: fontSize.md,
    color: colors.white,
    lineHeight: 24
  },
  closeButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full
  },
  closeButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold
  },
});
