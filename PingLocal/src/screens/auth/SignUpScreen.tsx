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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontWeight, fontFamily, responsiveSpacing } from '../../theme';
import { constrainedImageSize } from '../../utils/responsive';
import { useAuth } from '../../contexts/AuthContext';
import { SignUpScreenProps } from '../../types/navigation';
import { getAuthErrorMessage } from '../../utils/errorMessages';

// Calculate responsive image size (aspect ratio ~1.6:1 based on original 400x250)
const illustrationSize = constrainedImageSize(400, 250, 0.95, 0.28);

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (pass: string) => {
    return pass.length >= 8;
  };

  const handleSignUp = async () => {
    if (!firstName || !surname || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsLoading(true);

    const { error: signUpError } = await signUp(email, password, firstName, surname);

    if (signUpError) {
      setError(getAuthErrorMessage(signUpError));
      setIsLoading(false);
      return;
    }

    navigation.navigate('Verification', { email, isNewSignup: true });
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
              style={styles.backButton}
            >
              <Image source={require('../../../assets/images/iconback.png')} style={styles.backButtonIcon} />
            </TouchableOpacity>

            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <Image
                source={require('../../../assets/images/registerscreen_graphic.png')}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.headline}>Discover, Love, Support</Text>
              <Text style={styles.subtitle}>
                Ping Local is the ultimate companion to getting the most out of using your local independent businesses.
              </Text>

              {/* Form */}
              <View style={styles.form}>
                {/* Name row */}
                <View style={styles.nameRow}>
                  <View style={[styles.inputContainer, styles.nameInput]}>
                    <TextInput
                      placeholder="Enter First Name"
                      placeholderTextColor={colors.grayMedium}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      autoComplete="given-name"
                      textContentType="givenName"
                      style={styles.input}
                    />
                  </View>
                  <View style={[styles.inputContainer, styles.nameInput, styles.nameInputMargin]}>
                    <TextInput
                      placeholder="Enter Surname"
                      placeholderTextColor={colors.grayMedium}
                      value={surname}
                      onChangeText={setSurname}
                      autoCapitalize="words"
                      autoComplete="family-name"
                      textContentType="familyName"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={[styles.inputContainer, styles.inputMargin]}>
                  <TextInput
                    placeholder="Enter Email"
                    placeholderTextColor={colors.grayMedium}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    style={styles.input}
                  />
                </View>

                <View style={[styles.inputContainer, styles.inputMargin, styles.passwordContainer]}>
                  <TextInput
                    placeholder="Enter Password"
                    placeholderTextColor={colors.grayMedium}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    style={[styles.input, styles.passwordInput]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.grayMedium}
                    />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputContainer, styles.inputMargin, styles.passwordContainer]}>
                  <TextInput
                    placeholder="Confirm Password"
                    placeholderTextColor={colors.grayMedium}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    style={[styles.input, styles.passwordInput]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.grayMedium}
                    />
                  </TouchableOpacity>
                </View>

                {/* Password hint */}
                <Text style={styles.passwordHint}>
                  Password must be at least 8 characters
                </Text>

                {/* Error message */}
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}

                {/* Sign up button */}
                <TouchableOpacity
                  onPress={handleSignUp}
                  disabled={isLoading}
                  style={styles.signUpButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.signUpButtonText}>Join Ping Local</Text>
                  )}
                </TouchableOpacity>

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
  illustrationContainer: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: spacing.md,
  },
  illustration: {
    width: illustrationSize.width,
    height: illustrationSize.height,
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  headline: {
    fontSize: fontSize.xxxl,
    color: colors.white,
    textAlign: 'center',
    fontFamily: fontFamily.headingBold,
  },
  subtitle: {
    fontFamily: fontFamily.bodySemiBold,
    lineHeight: fontSize.xxl,
    fontSize: fontSize.sm,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  form: {
    marginTop: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
  },
  nameInput: {
    flex: 1,
  },
  nameInputMargin: {
    marginLeft: spacing.sm,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    height: Platform.OS === 'ios' ? 44 : 48,
    justifyContent: 'center',
  },
  inputMargin: {
    marginTop: spacing.sm,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    paddingLeft: spacing.sm,
  },
  input: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyMedium,
    color: colors.grayDark,
    height: Platform.OS === 'ios' ? 36 : 40,
    paddingVertical: Platform.OS === 'android' ? 0 : undefined,
    textAlignVertical: 'center',
  },
  passwordHint: {
    color: colors.grayMedium,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodyRegular,
  },
  errorText: {
    color: colors.accent,
    textAlign: 'center',
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodyRegular,
  },
  signUpButton: {
    backgroundColor: colors.accent,
    paddingVertical: responsiveSpacing.buttonPaddingVertical,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  signUpButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodyBold,
  },
  businessLink: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  businessLinkText: {
    color: colors.accent,
    textAlign: 'center',
    fontSize: fontSize.sm,
  },
});
