import { StyleSheet } from "react-native";

import { colors, radius, shadows, spacing, typography } from "@/theme/tokens";

/**
 * Unified button palette — all values derive from the Design System tokens.
 * - primary   → Orange CTA (main call-to-action)
 * - secondary → Outline with brand-blue text (trust / secondary actions)
 * - danger    → Solid red (destructive / delete / logout)
 * - ghost     → Minimal surface, brand-blue label (tertiary actions)
 * - disabled  → Still legible (no near-invisible ghost states)
 */
export const buttonPalette = {
  primary: {
    background: colors.primary,
    border: colors.primaryDark,
    text: colors.onPrimary
  },
  secondary: {
    background: colors.surface,
    border: colors.border,
    text: colors.brandBlue
  },
  danger: {
    background: colors.danger,
    border: "#C5132A",
    text: colors.onDanger
  },
  ghost: {
    background: colors.surface,
    border: colors.border,
    text: colors.brandBlue
  },
  disabled: {
    background: "#D8DEE9",
    border: "#C4CBD9",
    text: "#6B7893"
  }
} as const;

export const buttonStyles = StyleSheet.create({
  pressableBase: {
    alignSelf: "flex-start"
  },
  pressableFullWidth: {
    width: "100%"
  },
  surfaceBase: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minWidth: 0
  },
  surfaceFullWidth: {
    width: "100%"
  },
  sm: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: 8
  },
  md: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14
  },
  primary: {
    backgroundColor: buttonPalette.primary.background,
    borderColor: buttonPalette.primary.border,
    ...shadows.cta
  },
  secondary: {
    backgroundColor: buttonPalette.secondary.background,
    borderColor: buttonPalette.secondary.border,
    ...shadows.soft
  },
  danger: {
    backgroundColor: buttonPalette.danger.background,
    borderColor: buttonPalette.danger.border,
    ...shadows.danger
  },
  ghost: {
    backgroundColor: buttonPalette.ghost.background,
    borderColor: buttonPalette.ghost.border,
    ...shadows.none
  },
  disabled: {
    backgroundColor: buttonPalette.disabled.background,
    borderColor: buttonPalette.disabled.border,
    shadowOpacity: 0,
    elevation: 0
  },
  pressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.96
  },
  label: {
    fontSize: typography.bodySm,
    fontWeight: "700"
  },
  labelPrimary: { color: buttonPalette.primary.text },
  labelSecondary: { color: buttonPalette.secondary.text },
  labelDanger: { color: buttonPalette.danger.text },
  labelGhost: { color: buttonPalette.ghost.text },
  labelDisabled: { color: buttonPalette.disabled.text }
});
