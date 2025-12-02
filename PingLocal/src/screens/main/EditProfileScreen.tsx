import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, fontSize, spacing, borderRadius, shadows, fontFamily } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AccountStackParamList } from '../../types/navigation';

type EditProfileScreenNavigationProp = StackNavigationProp<AccountStackParamList, 'EditProfile'>;

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [surname, setSurname] = useState(user?.surname || '');
  const [phoneNo, setPhoneNo] = useState(user?.phone_no || '');
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    firstName !== (user?.first_name || '') ||
    surname !== (user?.surname || '') ||
    phoneNo !== (user?.phone_no || '');

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!firstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return;
    }

    if (!surname.trim()) {
      Alert.alert('Error', 'Surname is required');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          surname: surname.trim(),
          phone_no: phoneNo.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert('Success', 'Your profile has been updated', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              {/* First Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  placeholderTextColor={colors.grayMedium}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Surname */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Surname *</Text>
                <TextInput
                  style={styles.input}
                  value={surname}
                  onChangeText={setSurname}
                  placeholder="Enter your surname"
                  placeholderTextColor={colors.grayMedium}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Phone Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phoneNo}
                  onChangeText={setPhoneNo}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.grayMedium}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email (read-only) */}
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Account</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyText}>{user?.email}</Text>
                  <Ionicons name="lock-closed" size={16} color={colors.grayMedium} />
                </View>
                <Text style={styles.helperText}>
                  Contact support to change your email address
                </Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, (!hasChanges || isSaving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    color: colors.white,
    fontFamily: fontFamily.headingBold,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  formCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontFamily: fontFamily.headingBold,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    fontFamily: fontFamily.bodyMedium,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.primary,
    fontFamily: fontFamily.body,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  readOnlyText: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.accent,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontFamily: fontFamily.headingBold,
  },
  bottomSpacing: {
    height: spacing.xxl,
  },
});
