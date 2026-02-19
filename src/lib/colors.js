import { CHOROPLETH_COLORS } from '../config'

/**
 * Parse a hex color string to [r, g, b].
 */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Convert [r, g, b] to a hex color string.
 */
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
}

/**
 * Linearly interpolate between two hex colors.
 * t should be 0-1.
 */
export function lerpColor(colorA, colorB, t) {
  const a = hexToRgb(colorA)
  const b = hexToRgb(colorB)
  const result = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return rgbToHex(result)
}

/**
 * Map a value within [min, max] to a color from the ramp.
 */
export function valueToColor(value, min, max, colors = CHOROPLETH_COLORS) {
  if (max === min) return colors[Math.floor(colors.length / 2)]
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const idx = t * (colors.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, colors.length - 1)
  return lerpColor(colors[lo], colors[hi], idx - lo)
}
