/**
 * App color palette — clean, professional look.
 * Blue primary with white/light gray (light) and slate dark (dark mode).
 */
export const APP_COLORS = {
  /** Primary blue for headers, buttons, links. */
  primary: "#40A5E7",
  /** Primary blue for dark mode. */
  primaryDark: "#40A5E7",
  /** Light surface for cards and inputs. */
  inputBg: "#F8FAFC",
  /** Border color light. */
  border: "#E2E8F0",
  /** Dark mode background. */
  darkCard: "#1E293B",
  /** Dark mode card/surface. */
  darkSurface: "#334155",
  /** Dark mode border. */
  borderDark: "#475569",
  /** Accent for auth/onboarding (same as primary for consistency). */
  yellow: "#40A5E7",
} as const;

export const NAV_THEME = {
  light: {
    // Main backgrounds
    background: "#FFFFFF",
    cardBackground: APP_COLORS.inputBg,
    Homebackground: APP_COLORS.primary,

    // Borders and dividers
    border: APP_COLORS.border,

    // Text colors
    text: "#1E293B",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",

    // Form elements
    placeholder: "#94A3B8",
    inputBackground: APP_COLORS.inputBg,
    inputBorder: APP_COLORS.border,

    // Action colors
    primary: APP_COLORS.primary,
    primaryText: "#FFFFFF",
    accent: APP_COLORS.primary,
    accentText: "#FFFFFF",
    success: "#059669",
    successText: "#FFFFFF",
    danger: "#DC2626",
    dangerText: "#FFFFFF",
    error: "#DC2626",

    // Icons
    icon: APP_COLORS.primary,
    iconMuted: "#94A3B8",

    // App-specific
    yellow: APP_COLORS.primary,
    darkCard: APP_COLORS.darkCard,
    inputBg: APP_COLORS.inputBg,
    appBorder: APP_COLORS.border,

    // Status indicators
    stepInactive: "#E2E8F0",
    stepActive: APP_COLORS.primary,

    // React Navigation
    card: APP_COLORS.inputBg,
    notification: APP_COLORS.primary,

    isDark: false,
    isDarkColorScheme: false,
  },
  dark: {
    icon: "#F8FAFC",

    // Main backgrounds
    background: "#0F172A",
    Homebackground: APP_COLORS.primaryDark,
    cardBackground: APP_COLORS.darkSurface,

    // Borders and dividers
    border: APP_COLORS.borderDark,

    // Text colors
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",

    // Form elements
    placeholder: "#94A3B8",
    inputBackground: APP_COLORS.darkSurface,
    inputBorder: APP_COLORS.borderDark,

    // Action colors
    primary: APP_COLORS.primaryDark,
    primaryText: "#FFFFFF",
    accent: APP_COLORS.primaryDark,
    accentText: "#FFFFFF",
    success: "#10B981",
    successText: "#FFFFFF",
    danger: "#EF4444",
    dangerText: "#FFFFFF",
    error: "#F87171",

    // Status indicators
    stepInactive: APP_COLORS.darkSurface,
    stepActive: APP_COLORS.primaryDark,

    // React Navigation
    card: APP_COLORS.darkSurface,
    notification: APP_COLORS.primaryDark,

    // App-specific
    yellow: APP_COLORS.primaryDark,
    darkCard: APP_COLORS.darkCard,
    inputBg: APP_COLORS.darkSurface,
    appBorder: APP_COLORS.borderDark,
    iconMuted: "#94A3B8",

    isDark: true,
    isDarkColorScheme: true,
  },
};
