import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, spacing, borderRadius } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';

export default function AccountScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>
        <View style={styles.content}>
          {user && (
            <Text style={styles.userName}>{user.name}</Text>
          )}
          <TouchableOpacity
            onPress={signOut}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  userName: {
    fontSize: fontSize.md,
    color: colors.grayMedium,
    marginBottom: spacing.lg,
  },
  signOutButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  signOutButtonText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
});
