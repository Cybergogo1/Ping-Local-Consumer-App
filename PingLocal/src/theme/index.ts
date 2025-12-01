// PingLocal Theme Constants
// Based on design system from FINAL_CLAUDE_CODE_PROMPT.md

export const colors = {
  // Primary colors
  primary: '#36566F',
  primaryLight: '#63829D',

  // Accent
  accent: '#F4E364',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Grays
  grayLight: '#F5F5F5',
  grayMedium: '#9CA3AF',
  grayDark: '#374151',

  // Semantic
  error: '#EF4444',
  success: '#10B981',

  // Transparent
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
} as const;

// Note: With static fonts, fontWeight should NOT be used with fontFamily
// The weight is embedded in the font name itself
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Font families with weight variants (static fonts)
// Use these directly - don't combine with fontWeight
export const fontFamily = {
  // Geologica variants (for headings/titles)
  heading: 'Geologica-Bold',
  headingRegular: 'Geologica-Regular',
  headingMedium: 'Geologica-Medium',
  headingSemiBold: 'Geologica-SemiBold',
  headingBold: 'Geologica-Bold',

  // Montserrat variants (for body/buttons/labels)
  body: 'Montserrat-Regular',
  bodyRegular: 'Montserrat-Regular',
  bodyMedium: 'Montserrat-Medium',
  bodySemiBold: 'Montserrat-SemiBold',
  bodyBold: 'Montserrat-Bold',

  // Convenience aliases
  label: 'Montserrat-Medium',
  regular: 'Montserrat-Regular',
};

// Shadow presets
export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  fontFamily,
  shadows,
};
