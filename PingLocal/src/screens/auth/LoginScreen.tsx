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
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.3;

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontFamily, responsiveSpacing } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoginScreenProps } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { getAuthErrorMessage } from '../../utils/errorMessages';

// Memoized header to prevent re-renders during typing
const HeaderImage = React.memo(() => (
  <View style={styles.headerImage}>
    <Image
      source={require('../../../assets/images/signin_background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    />
  </View>
));

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setIsLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(getAuthErrorMessage(signInError));
      setIsLoading(false);
      return;
    }

    // Check if email is verified
    setTimeout(async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser && !authUser.email_confirmed_at) {
        navigation.navigate('Verification', {
          email: authUser.email || email,
          isNewSignup: false
        });
      }
    }, 500);

    setIsLoading(false);
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
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backButton, { top: insets.top + spacing.sm }]}
            >
              <Image source={require('../../../assets/images/iconback.png')} style={styles.backButtonIcon} />
            </TouchableOpacity>

            {/* Header image */}
            <HeaderImage />

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.headline}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Discover, Love, Support</Text>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
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

                <View style={[styles.inputContainer, styles.inputMargin]}>
                  <TextInput
                    placeholder="Enter Password"
                    placeholderTextColor={colors.grayMedium}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                    textContentType="password"
                    style={styles.input}
                  />
                </View>

                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot your password?
                  </Text>
                </TouchableOpacity>

                {/* Error message */}
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}

                {/* Login button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={styles.loginButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.loginButtonText}>Log In</Text>
                  )}
                </TouchableOpacity>

                {/* Sign up link */}
                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                    <Text style={styles.signUpLink}>Sign Up</Text>
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
    height: HEADER_IMAGE_HEIGHT,
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
    fontFamily: fontFamily.bodyMedium,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  form: {
    marginTop: spacing.xl,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    height: Platform.OS === 'ios' ? 50 : 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  inputMargin: {
    marginTop: spacing.md,
  },
  input: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    height: Platform.OS === 'ios' ? 40 : 44,
    paddingVertical: Platform.OS === 'android' ? 0 : undefined,
    textAlignVertical: 'center',
  },
  forgotPassword: {
    marginTop: spacing.sm,
  },
  forgotPasswordText: {
    color: colors.white,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: colors.accent,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    marginTop: spacing.sm,
  },
  loginButton: {
    backgroundColor: colors.accent,
    paddingVertical: responsiveSpacing.buttonPaddingVertical,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
  },
  loginButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.md,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  signUpText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
  },
  signUpLink: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyBold,
  },
});
