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
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { AccountStackParamList } from '../../types/navigation';
import { getAuthErrorMessage } from '../../utils/errorMessages';

type ChangePasswordScreenProps = {
  navigation: StackNavigationProp<AccountStackParamList, 'ChangePassword'>;
};

export default function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
  const { updatePassword } = useAuth();
  const insets = useSafeAreaInsets();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
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

    const { error: updateError } = await updatePassword(newPassword);

    if (updateError) {
      setError(getAuthErrorMessage(updateError));
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    Alert.alert(
      'Password Changed',
      'Your password has been successfully updated.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
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
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Image source={require('../../../assets/images/iconback.png')} style={styles.backButtonIcon} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Change Password</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.subtitle}>
                Enter your new password below. Make sure it's at least 8 characters long.
              </Text>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="New Password"
                    placeholderTextColor={colors.grayMedium}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    style={styles.input}
                  />
                </View>

                <View style={[styles.inputContainer, styles.inputMargin]}>
                  <TextInput
                    placeholder="Confirm New Password"
                    placeholderTextColor={colors.grayMedium}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
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

                {/* Change Password button */}
                <TouchableOpacity
                  onPress={handleChangePassword}
                  disabled={isLoading}
                  style={styles.primaryButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Update Password</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#203C50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    width: 16,
    height: 16,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    opacity: 0.9,
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
});
