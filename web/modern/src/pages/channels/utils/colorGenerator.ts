/**
 * Generates a consistent color from a rainbow palette based on a numeric identifier.
 * This ensures each channel type gets a visually distinct, automatically-assigned color
 * without needing hard-coded color values.
 */

// HSL-based rainbow palette for better visual distribution
const RAINBOW_PALETTE = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
]

/**
 * Generates a deterministic color from the rainbow palette based on a numeric ID.
 * Uses a prime multiplier to better distribute adjacent IDs across the color spectrum.
 *
 * @param id - The numeric identifier (e.g., channel type value)
 * @returns A hex color string from the rainbow palette
 */
export function getChannelTypeColor(id: number): string {
  // Use a prime multiplier to better distribute colors for sequential IDs
  const primeMultiplier = 7
  const index = Math.abs((id * primeMultiplier) % RAINBOW_PALETTE.length)
  return RAINBOW_PALETTE[index]
}

/**
 * Generates HSL color directly from ID for maximum flexibility.
 * Provides even distribution across the entire hue spectrum.
 *
 * @param id - The numeric identifier
 * @param saturation - Saturation percentage (default: 70)
 * @param lightness - Lightness percentage (default: 50)
 * @returns An HSL color string
 */
export function getChannelTypeHSL(
  id: number,
  saturation = 70,
  lightness = 50
): string {
  // Use golden angle approximation for better color distribution
  const goldenAngle = 137.508
  const hue = (id * goldenAngle) % 360
  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`
}

/**
 * Maps legacy color names to actual CSS color values.
 * Used as a fallback for channels that still have string color definitions.
 */
export const LEGACY_COLOR_MAP: Record<string, string> = {
  green: '#22c55e',
  olive: '#84cc16',
  black: '#374151',
  orange: '#f97316',
  blue: '#3b82f6',
  purple: '#a855f7',
  violet: '#8b5cf6',
  red: '#ef4444',
  teal: '#14b8a6',
  yellow: '#eab308',
  pink: '#ec4899',
  brown: '#92400e',
  gray: '#6b7280',
}

/**
 * Resolves a color for a channel type, falling back to auto-generated if not found.
 *
 * @param legacyColor - Optional legacy color name from constants
 * @param channelTypeId - The channel type ID for fallback generation
 * @returns A CSS color string
 */
export function resolveChannelColor(
  legacyColor: string | undefined,
  channelTypeId: number
): string {
  if (legacyColor && LEGACY_COLOR_MAP[legacyColor]) {
    return LEGACY_COLOR_MAP[legacyColor]
  }
  return getChannelTypeHSL(channelTypeId)
}
