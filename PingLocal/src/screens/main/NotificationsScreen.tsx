import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { formatDistanceToNow } from 'date-fns';
import { colors, fontSize, spacing, borderRadius, shadows, fontFamily } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import { AccountStackParamList, NotificationItem } from '../../types/navigation';

type NotificationsScreenNavigationProp = StackNavigationProp<AccountStackParamList, 'Notifications'>;

// Use NotificationItem from navigation types for consistency
type Notification = NotificationItem;

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'offer': 'pricetag',
  'redemption': 'checkmark-circle',
  'points': 'trophy',
  'system': 'information-circle',
  'default': 'notifications',
};

export default function NotificationsScreen() {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const { user } = useAuth();
  const { unreadCount, decrementUnreadCount, clearUnreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      decrementUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      clearUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Navigate to notification detail screen
    navigation.navigate('NotificationDetail', { notification });
  };

  const getNotificationIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
    if (!category) return NOTIFICATION_ICONS.default;
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('offer')) return NOTIFICATION_ICONS.offer;
    if (lowerCategory.includes('redeem')) return NOTIFICATION_ICONS.redemption;
    if (lowerCategory.includes('point') || lowerCategory.includes('loyalty')) return NOTIFICATION_ICONS.points;
    if (lowerCategory.includes('system')) return NOTIFICATION_ICONS.system;
    return NOTIFICATION_ICONS.default;
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.notificationUnread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, !item.read && styles.iconContainerUnread]}>
        <Ionicons
          name={getNotificationIcon(item.notifications_categories)}
          size={24}
          color={item.read ? colors.grayMedium : colors.primary}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.read && styles.notificationTitleUnread]}>
          {item.name || 'Notification'}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.content}
        </Text>
        <Text style={styles.notificationTime}>{formatTime(item.created)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.grayMedium} />
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateText}>
        You're all caught up! We'll notify you when there's something new.
      </Text>
    </View>
  );

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
        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  notificationUnread: {
    backgroundColor: '#F0F7FF',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerUnread: {
    backgroundColor: colors.accent,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: fontSize.md,
    color: colors.grayDark,
    fontFamily: fontFamily.body,
    marginBottom: 2,
  },
  notificationTitleUnread: {
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
  },
  notificationMessage: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  notificationTime: {
    fontSize: fontSize.xs,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
    marginTop: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.grayLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontFamily: fontFamily.headingBold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
    textAlign: 'center',
    lineHeight: 22,
  },
});
