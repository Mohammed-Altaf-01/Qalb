/**
 * Design system tokens for Qalb Mobile.
 * Mirrors the web app's Islamic dark theme (deep green + gold palette).
 *
 * Web → Mobile conversions:
 *   oklch(0.11 0.025 155) → #0d1a13  (background)
 *   oklch(0.16 0.03 155)  → #162019  (card)
 *   oklch(0.68 0.13 155)  → #3d8b5c  (primary green)
 *   oklch(0.72 0.13 75)   → #c4a23a  (accent gold)
 */

export const COLORS = {
  background: '#0d1a13',
  card: '#162019',
  cardAlt: '#1a2d1a',
  muted: '#1a2a1d',

  primary: '#3d8b5c',
  primaryLight: '#4fa870',
  primaryDim: 'rgba(61,139,92,0.2)',

  accent: '#c4a23a',
  accentLight: '#d4b24a',
  accentDim: 'rgba(196,162,58,0.15)',

  text: '#e8f5e9',
  textMuted: '#9ab9a0',
  textFaint: '#6b8a72',

  border: '#2a3d2a',
  borderLight: '#3d5c3d',

  danger: '#e57373',
  success: '#66bb6a',
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  arabic: 28,
  arabicLg: 36,
};

export const ARABIC_TYPOGRAPHY = {
  fontSizeDisplay: 30,
  lineHeightDisplay: 54,
  fontSizeBody: 26,
  lineHeightBody: 46,
  fontSizeCompact: 20,
  lineHeightCompact: 34,
};

/** Reusable shadow style for cards */
export const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 4,
};
