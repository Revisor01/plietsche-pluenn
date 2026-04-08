import { Platform } from 'react-native';

export const colors = {
  // Gradient
  gradientStart: '#27b092',
  gradientMid: '#79c4b0',
  gradientEnd: '#80b4e2',
  gradientColors: ['#27b092', '#79c4b0', '#80b4e2'] as const,
  gradientLocations: [0, 0.51, 1] as const,

  // Primary
  primary: '#27b092',
  primaryLight: '#79c4b0',

  // Neutral
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',

  // Semantic
  error: '#EF4444',
  success: '#10B981',
  white: '#FFFFFF',
};

export const fonts = {
  regular: Platform.select({
    ios: 'WorkSans-Regular',
    android: 'WorkSans-Regular',
  }) as string,
  medium: Platform.select({
    ios: 'WorkSans-Medium',
    android: 'WorkSans-Medium',
  }) as string,
  semiBold: Platform.select({
    ios: 'WorkSans-SemiBold',
    android: 'WorkSans-SemiBold',
  }) as string,
  bold: Platform.select({
    ios: 'WorkSans-Bold',
    android: 'WorkSans-Bold',
  }) as string,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};
