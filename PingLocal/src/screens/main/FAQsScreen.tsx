import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { colors, fontSize, spacing, borderRadius, shadows, fontFamily } from '../../theme';
import { useNotifications } from '../../contexts/NotificationContext';
import { AccountStackParamList, RootStackParamList } from '../../types/navigation';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FAQsScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<AccountStackParamList, 'FAQs'>,
  StackNavigationProp<RootStackParamList>
>;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: '1',
    category: 'Getting Started',
    question: 'What is Ping Local?',
    answer: 'Ping Local is a platform that connects you with exclusive offers and promotions from local businesses in your area. Browse deals, claim offers, and enjoy discounts at your favorite local spots.',
  },
  {
    id: '1b',
    category: 'Getting Started',
    question: 'Can I see the onboarding tutorial again?',
    answer: 'Yes! You can replay the welcome tutorial at any time from Settings > Replay Onboarding, or tap the button below in the support section.',
  },
  {
    id: '2',
    category: 'Getting Started',
    question: 'How do I claim an offer?',
    answer: 'Simply browse the available offers on the home screen, tap on one you like, and follow the prompts to claim it. Depending on the offer type, you may need to pay upfront or at the business. Once claimed, you\'ll receive a QR code to show at the business.',
  },
  {
    id: '3',
    category: 'Getting Started',
    question: 'How do I redeem my claimed offer?',
    answer: 'Go to your "Claimed" tab, find your offer, and tap "Redeem Now" to display your QR code. Show this QR code to the business staff, and they\'ll scan it to complete your redemption.',
  },

  // Loyalty Points
  {
    id: '4',
    category: 'Loyalty Points',
    question: 'How do I earn loyalty points?',
    answer: 'You earn 10 points for every £1 spent on offers. For "Pay up front" offers, points are awarded immediately after purchase. For "Pay on the day" offers, points are awarded after redemption based on your bill amount.',
  },
  {
    id: '5',
    category: 'Loyalty Points',
    question: 'What are the loyalty tiers?',
    answer: 'There are 4 tiers: Ping Local Member (0-9 points), Ping Local Hero (10-1,199 points), Ping Local Champion (1,200-9,999 points), and Ping Local Legend (10,000+ points). Higher tiers unlock exclusive benefits!',
  },
  {
    id: '6',
    category: 'Loyalty Points',
    question: 'Do my points expire?',
    answer: 'Currently, loyalty points do not expire. Keep earning and climbing the tiers!',
  },

  // Payments
  {
    id: '7',
    category: 'Payments',
    question: 'What payment methods are accepted?',
    answer: 'We accept all major credit and debit cards through our secure payment partner, Stripe. Apple Pay and Google Pay are also supported on compatible devices.',
  },
  {
    id: '8',
    category: 'Payments',
    question: 'What\'s the difference between "Pay up front" and "Pay on the day"?',
    answer: '"Pay up front" offers require payment through the app when claiming. "Pay on the day" offers are free to claim, and you pay the business directly when you visit and redeem.',
  },
  {
    id: '9',
    category: 'Payments',
    question: 'Can I get a refund?',
    answer: 'Refund policies vary by business. For "Pay up front" offers, please contact the business directly or reach out to our support team within 24 hours of purchase.',
  },

  // Account
  {
    id: '10',
    category: 'Account',
    question: 'How do I change my email address?',
    answer: 'For security reasons, email changes must be done through our support team. Please contact support@pinglocal.co.uk with your current and desired email addresses.',
  },
  {
    id: '11',
    category: 'Account',
    question: 'How do I delete my account?',
    answer: 'You can request account deletion from Settings > Delete Account. Please note this action is permanent and cannot be undone. All your data, including loyalty points, will be permanently removed.',
  },
  {
    id: '12',
    category: 'Account',
    question: 'I forgot my password. What should I do?',
    answer: 'Tap "Forgot Password" on the login screen and enter your email address. We\'ll send you a link to reset your password.',
  },

  // Troubleshooting
  {
    id: '13',
    category: 'Troubleshooting',
    question: 'My QR code isn\'t working. What should I do?',
    answer: 'Make sure your screen brightness is turned up and try cleaning your camera lens. If the issue persists, ask the business staff to manually enter your offer code, or contact support.',
  },
  {
    id: '14',
    category: 'Troubleshooting',
    question: 'I didn\'t receive my loyalty points. What should I do?',
    answer: 'Points for "Pay on the day" offers are awarded after the business completes your redemption. If points are still missing after 24 hours, please contact support with your transaction details.',
  },
];

const FAQItemComponent = ({
  item,
  isExpanded,
  onToggle,
}: {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: () => void;
}) => (
  <TouchableOpacity
    style={styles.faqItem}
    onPress={onToggle}
    activeOpacity={0.7}
  >
    <View style={styles.faqHeader}>
      <Text style={styles.faqQuestion}>{item.question}</Text>
      <Ionicons
        name={isExpanded ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={colors.primary}
      />
    </View>
    {isExpanded && (
      <Text style={styles.faqAnswer}>{item.answer}</Text>
    )}
  </TouchableOpacity>
);

export default function FAQsScreen() {
  const navigation = useNavigation<FAQsScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Group FAQs by category
  const categories = [...new Set(FAQ_DATA.map(faq => faq.category))];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header - extends edge to edge */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Image source={require('../../../assets/images/iconback.png')} style={styles.backButtonIcon}/>
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
          {/* Intro */}
          <View style={styles.introCard}>
            <Ionicons name="help-circle" size={40} color={colors.primary} />
            <Text style={styles.introTitle}>How can we help?</Text>
            <Text style={styles.introText}>
              Find answers to the most commonly asked questions below.
            </Text>
          </View>

          {/* FAQ Categories */}
          {categories.map(category => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.faqCard}>
                {FAQ_DATA.filter(faq => faq.category === category).map((faq, index, arr) => (
                  <React.Fragment key={faq.id}>
                    <FAQItemComponent
                      item={faq}
                      isExpanded={expandedIds.has(faq.id)}
                      onToggle={() => toggleItem(faq.id)}
                    />
                    {index < arr.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}

          {/* Contact Support */}
          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>Still need help?</Text>
            <Text style={styles.supportText}>
              Can't find what you're looking for? Our support team is here to help.
            </Text>
            <TouchableOpacity style={styles.supportButton}>
              <Ionicons name="mail" size={20} color={colors.primary} />
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.supportButton, styles.onboardingButton]}
              onPress={() => navigation.navigate('OnboardingReplay')}
            >
              <Ionicons name="play-circle" size={20} color={colors.accent} />
              <Text style={[styles.supportButtonText, styles.onboardingButtonText]}>
                Replay Onboarding
              </Text>
            </TouchableOpacity>
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
  backButtonIcon: {
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
  introCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  introTitle: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontFamily: fontFamily.headingBold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  introText: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
    fontFamily: fontFamily.body,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: spacing.md,
  },
  categoryTitle: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
    fontFamily: fontFamily.headingSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  faqCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  faqItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
    marginRight: spacing.sm,
  },
  faqAnswer: {
    fontSize: fontSize.sm,
    color: colors.grayDark,
    fontFamily: fontFamily.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.grayLight,
    marginHorizontal: spacing.md,
  },
  supportCard: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: fontSize.lg,
    color: colors.white,
    fontFamily: fontFamily.headingBold,
    marginBottom: spacing.xs,
  },
  supportText: {
    fontSize: fontSize.md,
    color: colors.grayLight,
    fontFamily: fontFamily.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  supportButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontFamily: fontFamily.headingBold,
  },
  onboardingButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.accent,
    marginTop: spacing.sm,
  },
  onboardingButtonText: {
    color: colors.accent,
  },
  bottomSpacing: {
    height: spacing.xxl,
  },
});
