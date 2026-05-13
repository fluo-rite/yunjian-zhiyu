export const colors = {
  pageBackground: "#f6f1e8",
  panelBackground: "#fffaf2",
  panelBorder: "#d9c9ae",
  panelBorderStrong: "#e3d9c8",
  textPrimary: "#1f2d24",
  textSecondary: "#53645d",
  textMuted: "#6f5432",
  textAccent: "#8a5a2b",
  brand: "#1f5c49",
  brandMuted: "#edf4ef",
  brandSurface: "#e7f1ec",
  brandBorder: "#b9d3c8",
  warmSurface: "#efe3cd",
  warmSurfaceAlt: "#e9dcc5",
  citationSurface: "#f4ecdd",
  danger: "#a34539",
  inputBackground: "#ffffff",
  placeholder: "#7f8c8d",
} as const;

export const radii = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  hero: 24,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: "#5d4730",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
} as const;
