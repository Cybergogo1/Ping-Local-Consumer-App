import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { VerificationScreenProps } from '../../types/navigation';

export default function VerificationScreen({ navigation, route }: VerificationScreenProps) {
  const { email } = route.params;
  const { verifyEmail, resendVerification, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      setError('Please enter a valid verification code');
      return;
    }

    setError('');
    setMessage('');
    setIsLoading(true);

    const { error: verifyError } = await verifyEmail(code);

    if (verifyError) {
      setError('Type in valid code');
    }

    setIsLoading(false);
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setIsResending(true);

    const { error: resendError } = await resendVerification();

    if (resendError) {
      setError('Failed to resend code. Please try again.');
    } else {
      setMessage(`Another code has been sent to ${email}, please check your Spam if you haven't received it.`);
    }

    setIsResending(false);
  };

  const handleGoBack = async () => {
    await signOut();
    navigation.navigate('Welcome');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Go Back button */}
          <TouchableOpacity onPress={handleGoBack} style={styles.goBackButton}>
            <Text style={styles.goBackText}>→ Go Back</Text>
          </TouchableOpacity>

          {/* Logo icon */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/images/logo_icononly.avif')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.headline}>Verify your account</Text>
            <Text style={styles.bodyText}>
              An email will have just been sent to "{email}", copy the verification code below to get started!
            </Text>
            <Text style={styles.smallText}>
              Your account has been created, so to access this screen later, use the 'log in' function.
            </Text>
          </View>

          {/* Verification code input */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter Verification Code"
                placeholderTextColor={colors.grayMedium}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />
            </View>

            {/* Error message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Verify button */}
            <TouchableOpacity
              onPress={handleVerify}
              disabled={isLoading}
              style={styles.verifyButton}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.verifyButtonText}>Type in valid code</Text>
              )}
            </TouchableOpacity>

            {/* Resend link */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={isResending}
              style={styles.resendButton}
            >
              {isResending ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.resendText}>
                  Don't have a code? Send a new one
                </Text>
              )}
            </TouchableOpacity>

            {/* Success message */}
            {message ? <Text style={styles.messageText}>{message}</Text> : null}
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  goBackButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goBackText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  logoContainer: {
    marginTop: spacing.xl,
  },
  logo: {
    width: 48,
    height: 48,
  },
  content: {
    marginTop: spacing.lg,
  },
  headline: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  bodyText: {
    fontSize: fontSize.md,
    color: colors.white,
    marginTop: spacing.md,
  },
  smallText: {
    fontSize: fontSize.sm,
    color: colors.white,
    marginTop: spacing.md,
  },
  formContainer: {
    marginTop: spacing.xl,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  input: {
    fontSize: fontSize.md,
    color: colors.grayDark,
    textAlign: 'center',
    letterSpacing: 4,
  },
  errorText: {
    color: colors.accent,
    textAlign: 'center',
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  verifyButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  verifyButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
  resendButton: {
    marginTop: spacing.md,
  },
  resendText: {
    color: colors.accent,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
    textDecorationLine: 'underline',
  },
  messageText: {
    color: colors.white,
    textAlign: 'center',
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
});
