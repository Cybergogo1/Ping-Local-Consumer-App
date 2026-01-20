import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { colors, fontSize, spacing, borderRadius, shadows, fontFamily } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../contexts/NotificationContext';
import { AccountStackParamList, HomeStackParamList } from '../../types/navigation';

type NotificationDetailScreenNavigationProp = StackNavigationProp<AccountStackParamList, 'NotificationDetail'>;
type NotificationDetailScreenRouteProp = RouteProp<AccountStackParamList, 'NotificationDetail'>;

interface Notification {
  id: number;
  name: string;
  content: string;
  read: boolean;
  trigger_user_id?: number;
  user_id: number;
  offer_id?: number;
  business_id?: number;
  notifications_categories?: string;
  created: string;
  updated: string;
}

export default function NotificationDetailScreen() {
  const navigation = useNavigation<NotificationDetailScreenNavigationProp>();
  const route = useRoute<NotificationDetailScreenRouteProp>();
  const { notification } = route.params;
  const insets = useSafeAreaInsets();
  const { decrementUnreadCount } = useNotifications();

  // Mark notification as read when screen opens
  useEffect(() => {
    if (!notification.read) {
      markAsRead();
    }
  }, []);

  const markAsRead = async () => {
    try {
      // Check if already read in database to prevent double-decrement
      const { data } = await supabase
        .from('notifications')
        .select('read')
        .eq('id', notification.id)
        .single();

      if (data && !data.read) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification.id);
        decrementUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy \'at\' h:mm a');
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
    if (!category) return 'notifications';
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('purchase')) return 'cart';
    if (lowerCategory.includes('offer')) return 'pricetag';
    if (lowerCategory.includes('redeem')) return 'checkmark-circle';
    if (lowerCategory.includes('point') || lowerCategory.includes('loyalty')) return 'trophy';
    if (lowerCategory.includes('system')) return 'information-circle';
    return 'notifications';
  };

  const handleViewOffer = () => {
    if (notification.offer_id) {
      // Navigate to offer detail - need to go through the home stack
      // @ts-ignore - Cross-stack navigation
      navigation.navigate('Feed', {
        screen: 'OfferDetail',
        params: { offerId: notification.offer_id },
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Image source={require('../../../assets/images/iconback.png')} style={styles.headerButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Notification Card */}
          <View style={styles.card}>
            {/* Icon and Title */}
            <View style={styles.titleRow}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={getNotificationIcon(notification.notifications_categories)}
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.notificationTitle}>
                {notification.name || 'Notification'}
              </Text>
            </View>

            {/* Content */}
            <Text style={styles.notificationContent}>
              {notification.content}
            </Text>

            {/* Timestamp */}
            <View style={styles.timestampRow}>
              <Ionicons name="time-outline" size={16} color={colors.grayMedium} />
              <Text style={styles.timestamp}>
                {formatDate(notification.created)}
              </Text>
            </View>

            {/* Category Badge */}
            {notification.notifications_categories && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {notification.notifications_categories}
                </Text>
              </View>
            )}
          </View>

          {/* View Offer Button */}
          {notification.offer_id && (
            <TouchableOpacity style={styles.viewOfferButton} onPress={handleViewOffer}>
              <Ionicons name="pricetag" size={20} color={colors.primary} />
              <Text style={styles.viewOfferText}>View Offer</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
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
  headerButtonIcon: {
    width: 16,
    height: 16,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.white,
  },
  headerButtonPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.headingBold,
    color: colors.primary,
  },
  notificationContent: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.body,
    color: colors.grayDark,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timestamp: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.grayMedium,
    marginLeft: spacing.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  viewOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  viewOfferText: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    marginLeft: spacing.md,
  },
});
