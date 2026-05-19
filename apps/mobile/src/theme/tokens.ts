export const colors = {
  background: "#F8FBFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F7FB",
  border: "#E2E8F0",
  borderSoft: "#EDF2F7",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textTertiary: "#94A3B8",
  accent: "#3B82F6",
  accentPressed: "#2563EB",
  accentSoft: "#EAF3FF",
  accentSurface: "#F4F8FF",
  textOnAccent: "#FFFFFF",
  danger: "#DC2626",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const typography = {
  display: 28,
  title: 22,
  section: 18,
  body: 15,
  caption: 13,
  meta: 12,
} as const;

export const shadows = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sheet: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
} as const;
