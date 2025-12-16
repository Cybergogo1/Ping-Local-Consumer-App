import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, fontSize, spacing, borderRadius, shadows, fontFamily } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import { AccountStackParamList } from '../../types/navigation';

type NotificationPreferencesScreenNavigationProp = StackNavigationProp<AccountStackParamList, 'NotificationPreferences'>;

interface NotificationPreferences {
  new_offers_from_favorites: boolean;
  offer_expiring_soon: boolean;
  redemption_reminders: boolean;
  loyalty_updates: boolean;
  weekly_digest: boolean;
  marketing_notifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  new_offers_from_favorites: true,
  offer_expiring_soon: true,
  redemption_reminders: true,
  loyalty_updates: true,
  weekly_digest: false,
  marketing_notifications: false,
};

type SettingItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

const SettingItem = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}: SettingItemProps) => (
  <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
    <View style={styles.settingIconContainer}>
      <Ionicons name={icon} size={20} color={disabled ? colors.grayMedium : colors.primary} />
    </View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
        {title}
      </Text>
      <Text style={styles.settingSubtitle}>{subtitle}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.grayLight, true: colors.primary }}
      thumbColor={colors.white}
      disabled={disabled}
    />
  </View>
);

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

export default function NotificationPreferencesScreen() {
  const navigation = useNavigation<NotificationPreferencesScreenNavigationProp>();
  const { user, refreshUser } = useAuth();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [masterPushEnabled, setMasterPushEnabled] = useState(user?.activate_notifications ?? true);

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows found" - that's ok, we'll use defaults
        console.error('Error loading notification preferences:', error);
      }

      if (data) {
        setPreferences({
          new_offers_from_favorites: data.new_offers_from_favorites ?? true,
          offer_expiring_soon: data.offer_expiring_soon ?? true,
          redemption_reminders: data.redemption_reminders ?? true,
          loyalty_updates: data.loyalty_updates ?? true,
          weekly_digest: data.weekly_digest ?? false,
          marketing_notifications: data.marketing_notifications ?? false,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Sync master push setting with user data
  useEffect(() => {
    if (user?.activate_notifications !== undefined) {
      setMasterPushEnabled(user.activate_notifications);
    }
  }, [user?.activate_notifications]);

  // Handle master push notification toggle
  const handleMasterPushToggle = async (value: boolean) => {
    if (!user) return;

    setMasterPushEnabled(value);
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ activate_notifications: value })
        .eq('id', user.id);

      if (error) throw error;

      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Error updating master push setting:', error);
      setMasterPushEnabled(!value); // Revert
      Alert.alert('Error', 'Failed to update notification setting. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle individual preference toggle
  const handlePreferenceToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: value }));
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !value }));
      Alert.alert('Error', 'Failed to update preference. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Image source={require('../../../assets/images/iconback.png')} style={styles.accountBackButton}/>
          </TouchableOpacity>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Image source={require('../../../assets/images/iconback.png')} style={styles.accountBackButton}/>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
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
            onPress={() => navigation.navigate('Settings')}
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
          {/* Master Push Toggle */}
          <SectionHeader title="Push Notifications" />
          <View style={styles.sectionCard}>
            <SettingItem
              icon="notifications"
              title="Push Notifications"
              subtitle="Enable or disable all push notifications"
              value={masterPushEnabled}
              onValueChange={handleMasterPushToggle}
            />
          </View>

          {!masterPushEnabled && (
            <View style={styles.disabledNotice}>
              <Ionicons name="information-circle" size={20} color={colors.grayMedium} />
              <Text style={styles.disabledNoticeText}>
                Push notifications are disabled. Enable them above to customize your notification preferences.
              </Text>
            </View>
          )}

          {/* Offer Notifications */}
          <SectionHeader title="Offer Notifications" />
          <View style={styles.sectionCard}>
            <SettingItem
              icon="heart"
              title="New Offers from Favorites"
              subtitle="Get notified when businesses you follow post new offers"
              value={preferences.new_offers_from_favorites}
              onValueChange={(v) => handlePreferenceToggle('new_offers_from_favorites', v)}
              disabled={!masterPushEnabled}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="time"
              title="Expiring Soon"
              subtitle="Reminder when offers you've claimed are about to expire"
              value={preferences.offer_expiring_soon}
              onValueChange={(v) => handlePreferenceToggle('offer_expiring_soon', v)}
              disabled={!masterPushEnabled}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="ticket"
              title="Redemption Reminders"
              subtitle="Don't forget to redeem your claimed offers"
              value={preferences.redemption_reminders}
              onValueChange={(v) => handlePreferenceToggle('redemption_reminders', v)}
              disabled={!masterPushEnabled}
            />
          </View>

          {/* Account Notifications */}
          <SectionHeader title="Account Notifications" />
          <View style={styles.sectionCard}>
            <SettingItem
              icon="trophy"
              title="Loyalty Updates"
              subtitle="Get notified when you reach a new loyalty tier"
              value={preferences.loyalty_updates}
              onValueChange={(v) => handlePreferenceToggle('loyalty_updates', v)}
              disabled={!masterPushEnabled}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="calendar"
              title="Weekly Digest"
              subtitle="Summary of new offers in your area each week"
              value={preferences.weekly_digest}
              onValueChange={(v) => handlePreferenceToggle('weekly_digest', v)}
              disabled={!masterPushEnabled}
            />
          </View>

          {/* Marketing */}
          <SectionHeader title="Marketing" />
          <View style={styles.sectionCard}>
            <SettingItem
              icon="megaphone"
              title="Promotional Updates"
              subtitle="Tips, news, and special promotions from PingLocal"
              value={preferences.marketing_notifications}
              onValueChange={(v) => handlePreferenceToggle('marketing_notifications', v)}
              disabled={!masterPushEnabled}
            />
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              You can also manage notification permissions in your device settings.
            </Text>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

      {/* Saving Indicator */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  settingItemDisabled: {
    opacity: 0.5,
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
  settingContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  settingTitle: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
  },
  settingTitleDisabled: {
    color: colors.grayMedium,
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
  disabledNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9E6',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  disabledNoticeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.grayDark,
    fontFamily: fontFamily.body,
    lineHeight: 20,
  },
  infoContainer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  savingOverlay: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  savingText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyMedium,
  },
});
