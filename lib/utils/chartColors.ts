// lib/chartColors.ts
// Shared color utility for consistent chart colors across the application

import { LANGUAGES } from "../config/language/languages";
import {
  categoryColorFromStored,
  resolveCategoryIdFromStored,
} from "./categories";
import { REPORTS_UNCATEGORIZED_EXPENSE_KEY } from "../reports/constants";

/**
 * Gets a consistent color for a stored category (expense/income id, legacy English label, or legacy chart key).
 * Prefers palette from {@link getExpenseCategories} / income when the value resolves to a known id.
 */
export const getCategoryColor = (category: string): string => {
  /** Bright gold — far from Health (violet), Investments (blue), and typical reds/oranges */
  if (category === REPORTS_UNCATEGORIZED_EXPENSE_KEY) {
    return "#eab308";
  }
  const id = resolveCategoryIdFromStored(category);
  if (id) {
    return categoryColorFromStored(LANGUAGES.en, id);
  }

  const colors: Record<string, string> = {
    // Essential Categories - Warm Colors (darker)
    Food: "#DC2626",
    Dining: "#EA580C",
    Groceries: "#BE185D",

    // Transportation — match expense `transport` (golden), not another blue block
    Transport: "#CA8A04",
    Gas: "#D97706",
    PublicTransport: "#A16207",

    // Entertainment - Purple/Magenta Spectrum
    Entertainment: "#16A34A",
    Movies: "#7C3AED",
    Games: "#6D28D9",

    // Utilities - Earth Tones
    Utilities: "#CA8A04",
    Electric: "#15803D",
    Water: "#0891B2",
    Internet: "#D97706",

    // Income - Green Spectrum
    Income: "#16A34A",
    Salary: "#15803D",
    Bonus: "#059669",

    // Shopping - Orange/Yellow Spectrum
    Shopping: "#EA580C",
    Clothing: "#C2410C",
    Electronics: "#2563EB",

    // Health & Personal — align with expense `healthcare` id (#6d28d9), not red
    Healthcare: "#6D28D9",
    PersonalCare: "#A21CAF",
    Pharmacy: "#7C3AED",

    // Education — match expense `education` (lime/olive), not more blues
    Education: "#65A30D",
    Books: "#84CC16",
    Courses: "#4D7C0F",

    // Travel — warm tones (expense `travel` peach / vacation)
    Travel: "#FB923C",
    Hotel: "#EA580C",
    Flight: "#F59E0B",

    // Housing - Brown/Neutral Tones
    Housing: "#78716C",
    Rent: "#57534E",
    Mortgage: "#44403C",

    // Financial — align with income `investments` id (#1d4ed8)
    Investment: "#1D4ED8",
    Savings: "#0D9488",
    Insurance: "#0F766E",

    // Miscellaneous - Bright Accent Colors
    Gifts: "#C026D3",
    Charity: "#22C55E",
    Pets: "#EA580C",
    Family: "#4F46E5",
    Others: "#64748B",

    // Account Types
    Checking: "#0891B2",
    Credit: "#DC2626",

    // Status Colors
    active: "#15803D",
    completed: "#2563EB",
    paused: "#D97706",

    // Catch-all
    Other: "#64748B",
  };

  // If no specific color found, generate a color based on category name hash
  if (!colors[category]) {
    const fallbackColors = [
      "#DC2626",
      "#059669",
      "#2563EB",
      "#7C3AED",
      "#EA580C",
      "#0891B2",
      "#BE185D",
      "#CA8A04",
      "#1D4ED8",
      "#16A34A",
      "#C026D3",
      "#0D9488",
      "#B45309",
      "#4F46E5",
      "#15803D",
      "#A21CAF",
      "#0369A1",
      "#C2410C",
      "#1E40AF",
      "#047857",
      "#7E22CE",
      "#0F766E",
      "#B91C1C",
      "#A16207",
      "#BE123C",
      "#0E7490",
      "#6D28D9",
      "#166534",
      "#9A3412",
    ];

    // Simple hash function to consistently assign colors
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      const char = category.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return fallbackColors[Math.abs(hash) % fallbackColors.length];
  }

  return colors[category];
};

/**
 * Gets colors for multiple categories
 * @param categories - Array of category names
 * @returns Array of hex color strings corresponding to each category
 */
export const getCategoryColors = (categories: string[]): string[] => {
  return categories.map((category) => getCategoryColor(category));
};

/**
 * Gets a color by index from a predefined palette of distinct, darker colors
 * Useful for sequential color assignment when category names are not available
 * @param index - The index position (will wrap around if index exceeds palette size)
 * @returns Hex color string from the distinct colors palette
 */
export const getColorByIndex = (index: number): string => {
  const distinctColors = [
    "#DC2626", // red
    "#059669", // emerald
    "#2563EB", // blue
    "#7C3AED", // violet
    "#EA580C", // orange
    "#0891B2", // cyan
    "#BE185D", // pink
    "#CA8A04", // yellow
    "#1D4ED8", // dark blue
    "#16A34A", // green
    "#C026D3", // fuchsia
    "#0D9488", // teal
    "#B45309", // amber
    "#4F46E5", // indigo
    "#15803D", // green
    "#A21CAF", // purple
    "#0369A1", // sky
    "#C2410C", // orange
    "#1E40AF", // blue
    "#047857", // emerald
    "#7E22CE", // purple
    "#0F766E", // teal
    "#B91C1C", // red
    "#1D4ED8", // blue
    "#A16207", // yellow
    "#BE123C", // rose
    "#0E7490", // cyan
    "#6D28D9", // violet
    "#166534", // green
    "#9A3412", // orange
  ];

  return distinctColors[index % distinctColors.length];
};

// Export default function for convenience
export default getCategoryColor;
