import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types/navigation';
import { getAuthErrorMessage } from '../../utils/errorMessages';

type ForgotPasswordScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { requestPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleResetRequest = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsLoading(true);

    const { error: resetError } = await requestPasswordReset(email);

    if (resetError) {
      setError(getAuthErrorMessage(resetError));
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsLoading(false);
  };

  const handleContinue = () => {
    navigation.navigate('ResetPassword', { email });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back button */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backButton, { top: insets.top + spacing.sm }]}
            >
              <Image source={require('../../../assets/images/iconback.png')} style={styles.backButtonIcon} />
            </TouchableOpacity>

            {/* Header image */}
            <View style={styles.headerImage}>
              <Image
                source={require('../../../assets/images/signin_background.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
              />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.headline}>
                {isSuccess ? 'Check Your Email' : 'Forgot Password?'}
              </Text>
              <Text style={styles.subtitle}>
                {isSuccess
                  ? `We've sent a 6-digit code to ${email}. Enter it on the next screen to reset your password.`
                  : "No worries! Enter your email and we'll send you a code to reset your password."}
              </Text>

              {/* Form */}
              <View style={styles.form}>
                {!isSuccess ? (
                  <>
                    <View style={styles.inputContainer}>
                      <TextInput
                        placeholder="Enter Email"
                        placeholderTextColor={colors.grayMedium}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        style={styles.input}
                      />
                    </View>

                    {/* Error message */}
                    {error ? (
                      <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    {/* Send Code button */}
                    <TouchableOpacity
                      onPress={handleResetRequest}
                      disabled={isLoading}
                      style={styles.primaryButton}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <Text style={styles.primaryButtonText}>Send Reset Code</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Success state - show continue button */}
                    <TouchableOpacity
                      onPress={handleContinue}
                      style={styles.primaryButton}
                    >
                      <Text style={styles.primaryButtonText}>Enter Code</Text>
                    </TouchableOpacity>

                    {/* Resend option */}
                    <TouchableOpacity
                      onPress={() => {
                        setIsSuccess(false);
                        setError('');
                      }}
                      style={styles.resendButton}
                    >
                      <Text style={styles.resendText}>
                        Didn't receive the code? <Text style={styles.resendLink}>Send again</Text>
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Back to login link */}
                <View style={styles.backToLoginContainer}>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.backToLoginText}>
                      Remember your password? <Text style={styles.backToLoginLink}>Log In</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    zIndex: 10,
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
  headerImage: {
    height: '30%',
    overflow: 'hidden',
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  headline: {
    fontSize: 30,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  form: {
    marginTop: spacing.xl,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  input: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    height: 24,
    maxHeight: 45,
  },
  errorText: {
    color: colors.accent,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    marginTop: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.md,
  },
  resendButton: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  resendText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
  },
  resendLink: {
    color: colors.accent,
    fontFamily: fontFamily.bodyBold,
  },
  backToLoginContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  backToLoginText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
  },
  backToLoginLink: {
    color: colors.accent,
    fontFamily: fontFamily.bodyBold,
  },
});
