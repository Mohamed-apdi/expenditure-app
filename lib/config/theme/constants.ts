/**
 * App color palette — clean, professional look.
 * Blue primary with white/light gray (light) and pure black (dark mode).
 */
export const APP_COLORS = {
  /** Primary blue for headers, buttons, links. */
  primary: "#00BFFF",
  /** Primary blue for dark mode. */
  primaryDark: "#00BFFF",
  /** Darker blue for tabs/segments (active state) — solid, no opacity. */
  tabActive: "#00BFFF",
  /** Light surface for cards and inputs. */
  inputBg: "#F8FAFC",
  /** Border color light. */
  border: "#E2E8F0",
  /** Dark mode background - pure black. */
  darkCard: "#0A0A0A",
  /** Dark mode card/surface - near black. */
  darkSurface: "#141414",
  /** Dark mode border. */
  borderDark: "#2A2A2A",
  /** Accent for auth/onboarding (same as primary for consistency). */
  yellow: "#00BFFF",
  /** Dark UI elements on light backgrounds (buttons, tabs, cards). */
  darkUI: "#1E293B",
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
    tabActive: APP_COLORS.tabActive,
    primaryText: "#FFFFFF",
    accent: APP_COLORS.primary,
    accentText: "#FFFFFF",
    success: "#059669",
    successText: "#FFFFFF",
    danger: "#DC2626",
    dangerText: "#FFFFFF",
    error: "#DC2626",
    warning: "#F59E0B",

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

    // Main backgrounds - pure black
    background: "#000000",
    Homebackground: "#000000",
    cardBackground: APP_COLORS.darkSurface,

    // Borders and dividers
    border: APP_COLORS.borderDark,

    // Text colors
    text: "#F8FAFC",
    textSecondary: "#A1A1A1",
    textMuted: "#6B6B6B",

    // Form elements
    placeholder: "#6B6B6B",
    inputBackground: APP_COLORS.darkSurface,
    inputBorder: APP_COLORS.borderDark,

    // Action colors
    primary: APP_COLORS.primaryDark,
    tabActive: APP_COLORS.tabActive,
    primaryText: "#FFFFFF",
    accent: APP_COLORS.primaryDark,
    accentText: "#FFFFFF",
    success: "#10B981",
    successText: "#FFFFFF",
    danger: "#EF4444",
    dangerText: "#FFFFFF",
    error: "#F87171",
    warning: "#F59E0B",

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
    iconMuted: "#6B6B6B",

    isDark: true,
    isDarkColorScheme: true,
  },
};
