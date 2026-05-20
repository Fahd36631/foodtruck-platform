import { radius, shadows, spacing, typography } from "@/theme/tokens";

export const OWNER = {
  orange: "#FF6B00",
  orangeDark: "#E55A00",
  orangeLight: "#FFF3EA",
  orangeSoft: "#FFF8F2",
  yellow: "#FFB703",
  text: "#0F1B35",
  muted: "#64748B",
  mutedLight: "#94A3B8",
  border: "#E5EEF7",
  bg: "#F7FAFD",
  white: "#FFFFFF",
  shadow: "rgba(15, 27, 53, 0.08)",
  success: "#0F9D5A",
  successSoft: "rgba(15, 157, 90, 0.12)",
  warning: "#8A5A00",
  warningSoft: "rgba(255, 183, 3, 0.18)",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2"
} as const;

export const ownerRadius = {
  card: 18,
  input: 12,
  pill: radius.pill,
  button: 14
} as const;

export const ownerShadow = shadows.soft;

export const ownerSpacing = {
  screenX: spacing.lg,
  screenBottom: 100,
  section: spacing.md,
  card: spacing.md
} as const;

export const ownerTypography = {
  screenTitle: {
    color: OWNER.text,
    fontSize: typography.h1,
    fontWeight: "900" as const,
    textAlign: "right" as const,
    writingDirection: "rtl" as const
  },
  screenSub: {
    marginTop: 6,
    color: OWNER.muted,
    fontSize: typography.bodySm,
    lineHeight: 22,
    textAlign: "right" as const,
    writingDirection: "rtl" as const
  },
  sectionTitle: {
    color: OWNER.text,
    fontSize: typography.h2,
    fontWeight: "800" as const,
    textAlign: "right" as const,
    writingDirection: "rtl" as const
  }
};
