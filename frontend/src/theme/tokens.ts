/**
 * Brand Design System — single source of truth.
 *
 * Brand palette (exclusive base):
 *   Primary Orange     #FF6B00   → CTA, primary actions, attention points
 *   Danger Red         #E63946   → destructive actions, errors, critical states
 *   Highlight Yellow   #FFB703   → highlights, soft warnings, offers
 *   Trust Blue         #153A8A   → titles, formal/navigation emphasis, trust
 *   Surface Light      #F5F7FB   → app canvas, modern light feel
 *
 * Token names kept stable ("primary", "primaryDark", "warning", "danger" ...) so
 * that the whole UI inherits the new palette automatically. Additional semantic
 * tokens are added (brandBlue, brandBlueSoft, primarySoft, dangerSoft, warningSoft,
 * highlight, onBrand, onDanger) for richer composition.
 */
export const colors = {
  // --- surfaces / canvas -------------------------------------------------
  /** App canvas — light, modern, airy */
  bg: "#F5F7FB",
  /** Soft neutral band for sections / subtle fills */
  section: "#EEF2F8",
  /** Primary card surface */
  surface: "#FFFFFF",
  /** Alternate low-contrast surface (inputs, chips, subtle rows) */
  surface2: "#FAFBFD",
  /** Elevated/selected card surface — soft orange tint */
  surfaceElevated: "#FFF4EB",
  /** Inset track / thumbnail placeholder background */
  bgDeep: "#E6EBF3",

  // --- primary (Orange CTA) ---------------------------------------------
  primary: "#FF6B00",
  primaryDark: "#E55A00",
  /** Soft primary tint for chips / selected rows / icon rings */
  primaryMuted: "rgba(255, 107, 0, 0.12)",
  primarySoft: "#FFF1E3",

  // --- brand blue (trust / formal navigation / titles) ------------------
  brandBlue: "#153A8A",
  brandBlueDark: "#0F2A66",
  brandBlueSoft: "rgba(21, 58, 138, 0.10)",

  // --- highlight (yellow) -----------------------------------------------
  highlight: "#FFB703",
  highlightSoft: "rgba(255, 183, 3, 0.18)",

  // --- accents (derived, used sparingly) --------------------------------
  accent: "#FFB703",
  accentSoft: "rgba(255, 183, 3, 0.18)",

  // --- text -------------------------------------------------------------
  /** Primary ink — strong neutral with brand-blue undertone */
  text: "#0E1B3D",
  textSecondary: "#3B4A6B",
  textMuted: "#6B7893",

  // --- borders ----------------------------------------------------------
  border: "#E1E6EE",
  /** Focus / selected ring — primary */
  borderStrong: "rgba(255, 107, 0, 0.35)",

  // --- status -----------------------------------------------------------
  /** Derived from palette for clarity of "ready/open" states */
  success: "#0F9D5A",
  successMuted: "rgba(15, 157, 90, 0.14)",

  warning: "#FFB703",
  warningMuted: "rgba(255, 183, 3, 0.18)",
  warningSoft: "#FFF6DE",

  danger: "#E63946",
  dangerMuted: "rgba(230, 57, 70, 0.12)",
  dangerSoft: "#FCE7E9",

  neutral: "#94A0B8",

  // --- on-color text ----------------------------------------------------
  onPrimary: "#FFFFFF",
  onDanger: "#FFFFFF",
  onBrand: "#FFFFFF",

  // --- overlay ----------------------------------------------------------
  overlay: "rgba(14, 27, 61, 0.5)"
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999
} as const;

export const shadows = {
  /** Card elevation — soft neutral ink shadow */
  card: {
    shadowColor: "#0E1B3D",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  /** Light ambient shadow for lists/inputs */
  soft: {
    shadowColor: "#0E1B3D",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  /** Premium primary CTA shadow */
  cta: {
    shadowColor: "#FF6B00",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  /** Destructive CTA shadow */
  danger: {
    shadowColor: "#E63946",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5
  },
  tabBar: {
    shadowColor: "#0E1B3D",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8
  },
  none: {
    shadowOpacity: 0,
    elevation: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 }
  }
} as const;

export const typography = {
  display: 32,
  h1: 26,
  h2: 20,
  h3: 17,
  body: 15,
  bodySm: 13,
  caption: 12,
  micro: 11
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28
} as const;

export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 } as const;
