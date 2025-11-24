import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { colors, spacing, fontSize, fontWeight } from '../theme';

import HomeStackNavigator from './HomeStackNavigator';
import DirectoryStackNavigator from './DirectoryStackNavigator';
import ClaimedStackNavigator from './ClaimedStackNavigator';
import FavouritesStackNavigator from './FavouritesStackNavigator';
import AccountStackNavigator from './AccountStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab icon images
const tabIcons = {
  Feed: require('../../assets/images/footer_feed.avif'),
  Favourites: require('../../assets/images/footer_favourites.avif'),
  Claimed: require('../../assets/images/footer_claimed.avif'),
  Businesses: require('../../assets/images/footer_businesses.avif'),
  Account: require('../../assets/images/footer_account.avif'),
};

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = route.name;
        const isFocused = state.index === index;
        const isCenterTab = route.name === 'Claimed';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Center tab (Claimed) - render empty placeholder for spacing + absolute positioned button
        if (isCenterTab) {
          return (
            <React.Fragment key={route.key}>
              {/* Empty placeholder to maintain 5-column spacing */}
              <View style={styles.centerTabPlaceholder} />
              {/* Absolutely positioned center button */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.centerTabContainer}
              >
                <Image
                  source={tabIcons[route.name as keyof typeof tabIcons]}
                  style={styles.centerTabIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </React.Fragment>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <Image
              source={tabIcons[route.name as keyof typeof tabIcons]}
              style={[styles.tabIcon, { opacity: isFocused ? 1 : 0.6 }]}
              resizeMode="contain"
            />
            <Text style={[styles.tabLabel, { opacity: isFocused ? 1 : 0.6 }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Feed" component={HomeStackNavigator} />
      <Tab.Screen name="Favourites" component={FavouritesStackNavigator} />
      <Tab.Screen name="Claimed" component={ClaimedStackNavigator} />
      <Tab.Screen name="Businesses" component={DirectoryStackNavigator} />
      <Tab.Screen name="Account" component={AccountStackNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingBottom: 20, // Safe area padding
    paddingTop: spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 85,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    color: colors.white,
    marginTop: 4,
    fontWeight: fontWeight.medium,
  },
  centerTabPlaceholder: {
    flex: 1, // Takes up same space as other tabs for proper 5-column layout
  },
  centerTabContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -35, // Half of icon width to center
    top: -15, // Elevate above the tab bar
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTabIcon: {
    width: 70,
    height: 70,
  },
});
