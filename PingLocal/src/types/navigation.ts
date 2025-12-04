import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Verification: { email: string; isNewSignup?: boolean };
  EmailVerificationSuccess: undefined;
  ForgotPassword: undefined;
};

// Onboarding Stack
export type OnboardingStackParamList = {
  OnboardingSlides: undefined;
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
  Map: undefined;
  OfferDetail: { offerId: number };
  BusinessDetail: { businessId: number };
  Notifications: undefined;
  LoyaltyInfo: undefined;
  Settings: undefined;
  // Claim flow screens
  SlotBooking: { offerId: number; offer: import('./database').Offer };
  ExternalBooking: { offerId: number; offer: import('./database').Offer };
  Claim: {
    offerId: number;
    offer: import('./database').Offer;
    selectedSlot?: import('./database').OfferSlot;
    partySize?: number;
  };
  ClaimSuccess: {
    purchaseTokenId: number;
    offerName: string;
    businessName: string;
    pointsEarned?: number;
    previousTier?: string;
    newTier?: string;
    totalPoints?: number;
  };
  LevelUp: {
    previousTier: string;
    newTier: string;
    pointsEarned: number;
    totalPoints: number;
  };
};

// Directory Stack (nested in Directory tab)
export type DirectoryStackParamList = {
  DirectoryMain: undefined;
  BusinessDetail: { businessId: number };
  OfferDetail: { offerId: number };
  Notifications: undefined;
  // Claim flow screens (duplicated for directory navigation)
  SlotBooking: { offerId: number; offer: import('./database').Offer };
  ExternalBooking: { offerId: number; offer: import('./database').Offer };
  Claim: {
    offerId: number;
    offer: import('./database').Offer;
    selectedSlot?: import('./database').OfferSlot;
    partySize?: number;
  };
  ClaimSuccess: {
    purchaseTokenId: number;
    offerName: string;
    businessName: string;
    pointsEarned?: number;
    previousTier?: string;
    newTier?: string;
    totalPoints?: number;
  };
  LevelUp: {
    previousTier: string;
    newTier: string;
    pointsEarned: number;
    totalPoints: number;
  };
};

// Claimed Stack (nested in Claimed tab)
export type ClaimedStackParamList = {
  ClaimedMain: undefined;
  Notifications: undefined;
  QRCode: {
    purchaseToken: import('./database').PurchaseToken;
  };
  RedemptionSuccess: {
    offerName: string;
    businessName: string;
  };
  BillConfirmation: {
    purchaseTokenId: number;
    redemptionTokenId: string; // RedemptionToken uses string ID
    billAmount: number;
    offerName: string;
    businessName: string;
  };
};

// Account Stack (nested in Account tab)
export type AccountStackParamList = {
  AccountMain: undefined;
  LoyaltyTiers: undefined;
  Settings: undefined;
  FAQs: undefined;
  EditProfile: undefined;
  Notifications: undefined;
};

// Favourites Stack (nested in Favourites tab)
export type FavouritesStackParamList = {
  FavouritesMain: undefined;
  OfferDetail: { offerId: number };
  BusinessDetail: { businessId: number };
  Notifications: undefined;
  // Claim flow screens for favourited offers
  SlotBooking: { offerId: number; offer: import('./database').Offer };
  ExternalBooking: { offerId: number; offer: import('./database').Offer };
  Claim: {
    offerId: number;
    offer: import('./database').Offer;
    selectedSlot?: import('./database').OfferSlot;
    partySize?: number;
  };
  ClaimSuccess: {
    purchaseTokenId: number;
    offerName: string;
    businessName: string;
    pointsEarned?: number;
    previousTier?: string;
    newTier?: string;
    totalPoints?: number;
  };
  LevelUp: {
    previousTier: string;
    newTier: string;
    pointsEarned: number;
    totalPoints: number;
  };
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
