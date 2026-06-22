// Premium prop-firm quantitative dashboard theme
export const colors = {
  bg: "#121212",
  card: "#1E1E24",
  panel: "#252530",
  surface3: "#2A2A35",
  border: "#2A2A35",
  borderStrong: "#3F3F50",
  text: "#FFFFFF",
  textMuted: "#B8BCC8",
  textDim: "#7A7E8C",
  success: "#00FF88",
  warning: "#FFD54F",
  danger: "#FF5252",
  info: "#38BDF8",
  accent: "#FFFFFF",
  grade: {
    "A+": "#00FF88",
    A: "#34D399",
    B: "#FFD54F",
    C: "#FB923C",
    D: "#FF7A7A",
    F: "#FF5252",
  } as Record<string, string>,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const heatColor = (pct: number): string => {
  // pct expected 0..100
  if (pct < 36) return "#FF5252";
  if (pct < 65) return "#FFD54F";
  return "#00FF88";
};

// Background tint for heatmap cell with alpha based on intensity
export const heatBg = (pct: number): string => {
  const base = heatColor(pct);
  // Convert hex to rgba with alpha based on intensity
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const alpha = Math.max(0.15, Math.min(0.85, pct / 100));
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
};

export const fonts = {
  mono: "JetBrainsMono",
};
