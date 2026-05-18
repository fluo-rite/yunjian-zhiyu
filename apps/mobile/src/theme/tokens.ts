export const colors = {
  background: "#f7f5ef",
  surface: "#ffffff",
  surfaceMuted: "#f1efe8",
  border: "#ddd7ca",
  textPrimary: "#1d241f",
  textSecondary: "#5b665f",
  accent: "#245b4f",
  textOnAccent: "#ffffff",
} as const;

export const radii = {
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
} as const;
