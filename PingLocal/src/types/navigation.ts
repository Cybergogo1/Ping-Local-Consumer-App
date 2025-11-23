import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Verification: { email: string; isNewSignup?: boolean };
  ForgotPassword: undefined;
};

// Onboarding Stack
export type OnboardingStackParamList = {
  Onboarding: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Feed: undefined;
  Favourites: undefined;
  Claimed: undefined;
  Businesses: undefined;
  Account: undefined;
};

// Home Stack (nested in Home tab)
export type HomeStackParamList = {
  HomeFeed: undefined;
  OfferDetail: { offerId: number };
  BusinessDetail: { businessId: number };
  Notifications: undefined;
  LoyaltyInfo: undefined;
};

// Directory Stack (nested in Directory tab)
export type DirectoryStackParamList = {
  DirectoryMain: undefined;
  BusinessDetail: { businessId: number };
  OfferDetail: { offerId: number };
};

// Account Stack (nested in Account tab)
export type AccountStackParamList = {
  AccountMain: undefined;
  ClaimedOffers: undefined;
  Settings: undefined;
  FAQs: undefined;
  EditProfile: undefined;
};

// Root Navigator
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

// Navigation Props
export type AuthNavigationProp = StackNavigationProp<AuthStackParamList>;
export type OnboardingNavigationProp = StackNavigationProp<OnboardingStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

// Screen Props
export type WelcomeScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export type LoginScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

export type SignUpScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'SignUp'>;
};

export type VerificationScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'Verification'>;
  route: RouteProp<AuthStackParamList, 'Verification'>;
};

// Home Stack Screen Props
export type HomeFeedScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'HomeFeed'>;
};

export type OfferDetailScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'OfferDetail'>;
  route: RouteProp<HomeStackParamList, 'OfferDetail'>;
};

export type BusinessDetailScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'BusinessDetail'>;
  route: RouteProp<HomeStackParamList, 'BusinessDetail'>;
};

// Directory Stack Screen Props
export type DirectoryScreenProps = {
  navigation: StackNavigationProp<DirectoryStackParamList, 'DirectoryMain'>;
};
