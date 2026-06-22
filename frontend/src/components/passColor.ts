// Color interpolation for the heatmap.
// 5-stop gradient: deep red → red → orange → yellow → green → deep green.

interface Stop { t: number; r: number; g: number; b: number; }

const STOPS: Stop[] = [
  { t: 0.00, r: 0x66, g: 0x18, b: 0x18 }, // deep red
  { t: 0.20, r: 0xFF, g: 0x52, b: 0x52 }, // red
  { t: 0.40, r: 0xFB, g: 0x92, b: 0x3C }, // orange
  { t: 0.55, r: 0xFA, g: 0xCC, b: 0x15 }, // yellow
  { t: 0.75, r: 0x22, g: 0xC5, b: 0x5E }, // green
  { t: 1.00, r: 0x00, g: 0xFF, b: 0x88 }, // deep green
];

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

export const passColor = (passPct: number): { fill: string; text: string } => {
  const t = Math.max(0, Math.min(1, passPct / 100));
  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i].t && t <= STOPS[i + 1].t) {
      lo = STOPS[i]; hi = STOPS[i + 1]; break;
    }
  }
  const range = hi.t - lo.t;
  const local = range > 0 ? (t - lo.t) / range : 0;
  const r = lerp(lo.r, hi.r, local);
  const g = lerp(lo.g, hi.g, local);
  const b = lerp(lo.b, hi.b, local);
  // Cell fill uses an alpha for darkness based on pass% (saturate at extremes)
  const intensity = 0.55 + 0.35 * (t < 0.5 ? (0.5 - t) * 2 : (t - 0.5) * 2);
  return {
    fill: `rgba(${r},${g},${b},${intensity.toFixed(2)})`,
    text: t < 0.4 ? "#FFFFFF" : "#0A0A0F",
  };
};
