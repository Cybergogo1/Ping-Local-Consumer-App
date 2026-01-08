import React, { useState, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../types/navigation';
import { getAuthErrorMessage } from '../../utils/errorMessages';

type ResetPasswordScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

export default function ResetPasswordScreen({ navigation, route }: ResetPasswordScreenProps) {
  const { email } = route.params;
  const { verifyPasswordResetOtp, updatePassword, finishPasswordRecovery, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'otp' | 'password'>('otp');

  const otpRefs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    // Handle backspace - move to previous input
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setIsLoading(true);

    const { error: verifyError } = await verifyPasswordResetOtp(email, otpCode);

    if (verifyError) {
      setError(getAuthErrorMessage(verifyError));
      setIsLoading(false);
      return;
    }

    setStep('password');
    setIsLoading(false);
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsLoading(true);

    console.log('[ResetPassword] Calling updatePassword...');

    const { error: updateError } = await updatePassword(newPassword);

    console.log('[ResetPassword] updatePassword returned:', { hasError: !!updateError, error: updateError?.message });

    if (updateError) {
      console.log('[ResetPassword] Error occurred, setting error state');
      setError(getAuthErrorMessage(updateError));
      setIsLoading(false);
      return;
    }

    console.log('[ResetPassword] Success! Setting isLoading to false');
    setIsLoading(false);

    console.log('[ResetPassword] Showing success alert');
    Alert.alert(
      'Password Reset Successful',
      'Your password has been reset. Please log in with your new password.',
      [
        {
          text: 'Log In',
          onPress: async () => {
            console.log('[ResetPassword] User pressed Log In');
            // Sign out and clear recovery mode so user can log in fresh
            finishPasswordRecovery();
            await signOut();
            navigation.navigate('Login');
          },
        },
      ]
    );
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
                {step === 'otp' ? 'Enter Code' : 'New Password'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'otp'
                  ? `Enter the 6-digit code we sent to ${email}`
                  : 'Create a new password for your account'}
              </Text>

              {/* Form */}
              <View style={styles.form}>
                {step === 'otp' ? (
                  <>
                    {/* OTP Input */}
                    <View style={styles.otpContainer}>
                      {otp.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={(ref) => { otpRefs.current[index] = ref; }}
                          style={styles.otpInput}
                          value={digit}
                          onChangeText={(value) => handleOtpChange(value, index)}
                          onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                          keyboardType="number-pad"
                          maxLength={1}
                          selectTextOnFocus
                        />
                      ))}
                    </View>

                    {/* Error message */}
                    {error ? (
                      <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    {/* Verify button */}
                    <TouchableOpacity
                      onPress={handleVerifyOtp}
                      disabled={isLoading}
                      style={styles.primaryButton}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify Code</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* New Password Input */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        placeholder="New Password"
                        placeholderTextColor={colors.grayMedium}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        style={styles.input}
                      />
                    </View>

                    <View style={[styles.inputContainer, styles.inputMargin]}>
                      <TextInput
                        placeholder="Confirm Password"
                        placeholderTextColor={colors.grayMedium}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        style={styles.input}
                      />
                    </View>

                    <Text style={styles.passwordHint}>
                      Password must be at least 8 characters
                    </Text>

                    {/* Error message */}
                    {error ? (
                      <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    {/* Reset button */}
                    <TouchableOpacity
                      onPress={handleResetPassword}
                      disabled={isLoading}
                      style={styles.primaryButton}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <Text style={styles.primaryButtonText}>Reset Password</Text>
                      )}
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
    height: '25%',
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
    padding: 0,
    includeFontPadding: false,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  inputMargin: {
    marginTop: spacing.md,
  },
  input: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    height: 40,
    padding: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  passwordHint: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.8,
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
