/** "#RRGGBB" + alpha (0..1) -> "rgba(...)". Used to derive Typeform-style tints from a theme colour. */
export function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
