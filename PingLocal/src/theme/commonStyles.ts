import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from './index';

// Common reusable styles
export const commonStyles = StyleSheet.create({
  // Containers
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  containerPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Padding
  paddingHorizontal: {
    paddingHorizontal: spacing.lg,
  },
  paddingVertical: {
    paddingVertical: spacing.md,
  },
  padding: {
    padding: spacing.md,
  },

  // Text styles
  textCenter: {
    textAlign: 'center',
  },
  textWhite: {
    color: colors.white,
  },
  textPrimary: {
    color: colors.primary,
  },
  textGray: {
    color: colors.grayMedium,
  },

  // Headings
  heading1: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  heading2: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  heading3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },

  // Body text
  bodyText: {
    fontSize: fontSize.md,
    color: colors.white,
  },
  smallText: {
    fontSize: fontSize.sm,
    color: colors.grayMedium,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  buttonTextWhite: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },

  // Inputs
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.grayDark,
  },

  // Images
  imageFill: {
    width: '100%',
    height: '100%',
  },
});

export default commonStyles;
