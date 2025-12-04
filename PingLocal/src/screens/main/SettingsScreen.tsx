import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, spacing, borderRadius, shadows, fontFamily } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import { AccountStackParamList, RootStackParamList } from '../../types/navigation';

type SettingsScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<AccountStackParamList, 'Settings'>,
  StackNavigationProp<RootStackParamList>
>;

type SettingItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
  danger?: boolean;
};

const SettingItem = ({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  rightElement,
  danger = false,
}: SettingItemProps) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    disabled={!onPress && !rightElement}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.settingIconContainer, danger && styles.settingIconDanger]}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? colors.error : colors.primary}
      />
    </View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
        {title}
      </Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement}
    {showArrow && !rightElement && (
      <Ionicons name="chevron-forward" size={20} color={colors.grayMedium} />
    )}
  </TouchableOpacity>
);

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const STORAGE_KEYS = {
  EMAIL_NOTIFICATIONS: '@ping_local_email_notifications',
  LOCATION_SERVICES: '@ping_local_location_services',
};

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { signOut, user, refreshUser } = useAuth();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  // Settings state - push notifications from database, others from AsyncStorage
  const [pushNotifications, setPushNotifications] = useState(user?.activate_notifications ?? true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);

  // Load preferences from storage on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Sync push notifications state when user changes
  useEffect(() => {
    if (user?.activate_notifications !== undefined) {
      setPushNotifications(user.activate_notifications);
    }
  }, [user?.activate_notifications]);

  const loadPreferences = async () => {
    try {
      const [emailPref, locationPref] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.LOCATION_SERVICES),
      ]);

      if (emailPref !== null) setEmailNotifications(emailPref === 'true');
      if (locationPref !== null) setLocationServices(locationPref === 'true');
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handlePushNotificationsChange = async (value: boolean) => {
    setPushNotifications(value);

    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ activate_notifications: value })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Error updating push notification preference:', error);
      // Revert on error
      setPushNotifications(!value);
      Alert.alert('Error', 'Failed to update notification preference. Please try again.');
    }
  };

  const handleEmailNotificationsChange = async (value: boolean) => {
    setEmailNotifications(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS, String(value));
    } catch (error) {
      console.error('Error saving email notification preference:', error);
    }
  };

  const handleLocationServicesChange = async (value: boolean) => {
    setLocationServices(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_SERVICES, String(value));
    } catch (error) {
      console.error('Error saving location services preference:', error);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleFAQs = () => {
    navigation.navigate('FAQs');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://pinglocal.co.uk/privacy-policy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://pinglocal.co.uk/terms-of-service');
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@pinglocal.co.uk');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert(
              'Account Deletion',
              'Please contact support@pinglocal.co.uk to delete your account.'
            );
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const handleReplayOnboarding = () => {
    Alert.alert(
      'Replay Onboarding',
      'Would you like to see the onboarding tutorial again?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replay',
          onPress: () => {
            (navigation as any).navigate('Onboarding');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header - extends edge to edge */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Image source={require('../../../assets/images/iconback.png')} style={styles.accountBackButton}/>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications' as any)}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconnotifications.png')} style={styles.notificationButtonIcon}/>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as any)}
            style={styles.headerButton}
          >
            <Image source={require('../../../assets/images/iconsettings.png')} style={styles.settingsButtonIcon}/>
          </TouchableOpacity>
        </View>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Account Section */}
          <SectionHeader title="Account" />
          <View style={styles.sectionCard}>
            <SettingItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={handleEditProfile}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="notifications-outline"
              title="Notification Preferences"
              subtitle="Manage how we contact you"
              onPress={handleNotifications}
            />
          </View>

          {/* Notifications Section */}
          <SectionHeader title="Notifications" />
          <View style={styles.sectionCard}>
            <SettingItem
              icon="phone-portrait-outline"
              title="Push Notifications"
              subtitle="Receive alerts on your device"
              showArrow={false}
              rightElement={
                <Switch
                  value={pushNotifications}
                  onValueChange={handlePushNotificationsChange}
                  trackColor={{ false: colors.grayLight, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="mail-outline"
              title="Email Notifications"
              subtitle="Receive updates via email"
              showArrow={false}
              rightElement={
                <Switch
                  value={emailNotifications}
                  onValueChange={handleEmailNotificationsChange}
                  trackColor={{ false: colors.grayLight, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
          </View>

          {/* Privacy Section */}
          <SectionHeader title="Privacy" />
          <View style={styles.sectionCard}>
            <SettingItem
              icon="location-outline"
              title="Location Services"
              subtitle="Allow access to your location"
              showArrow={false}
              rightElement={
                <Switch
                  value={locationServices}
                  onValueChange={handleLocationServicesChange}
                  trackColor={{ false: colors.grayLight, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              onPress={handlePrivacyPolicy}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="document-text-outline"
              title="Terms of Service"
              onPress={handleTermsOfService}
            />
          </View>

          {/* Support Section */}
          <SectionHeader title="Support" />
          <View style={styles.sectionCard}>
            <SettingItem
              icon="help-circle-outline"
              title="FAQs"
              subtitle="Frequently asked questions"
              onPress={handleFAQs}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="chatbubble-ellipses-outline"
              title="Contact Support"
              subtitle="Get help from our team"
              onPress={handleContactSupport}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="play-circle-outline"
              title="Replay Onboarding"
              subtitle="See the welcome tutorial again"
              onPress={handleReplayOnboarding}
            />
          </View>

          {/* Danger Zone */}
          <SectionHeader title="Account Actions" />
          <View style={styles.sectionCard}>
            <SettingItem
              icon="log-out-outline"
              title="Sign Out"
              onPress={handleSignOut}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="trash-outline"
              title="Delete Account"
              subtitle="Permanently remove your account"
              onPress={handleDeleteAccount}
              danger
            />
          </View>

          {/* App Version */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Ping Local v1.0.0</Text>
            <Text style={styles.versionSubtext}>Made with love in the UK</Text>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#203C50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  accountBackButton: {
    width: 16,
    height: 16,
  },
  notificationButtonIcon: {
    width: 16,
    height: 16,
  },
  settingsButtonIcon: {
    width: 16,
    height: 16,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bodyBold,
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.headingSemiBold,
  },
  sectionCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
  },
  settingTitleDanger: {
    color: colors.error,
  },
  settingSubtitle: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginTop: 2,
    fontFamily: fontFamily.body,
  },
  divider: {
    height: 1,
    backgroundColor: colors.grayLight,
    marginLeft: spacing.md + 36 + spacing.md,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  versionText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    marginBottom: spacing.xs,
    fontFamily: fontFamily.body,
  },
  versionSubtext: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});