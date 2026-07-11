/** Formats a number as USD currency. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/** Formats an integer with thousands separators. */
export function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Maps a variant name to a CSS color for the swatch, when the name is a
 * recognisable color word. Falls back to a neutral brand tint.
 */
const COLOR_WORDS: Record<string, string> = {
  red: '#ef3346',
  blue: '#357fef',
  green: '#22a06b',
  black: '#1e1a37',
  white: '#f4f3f0',
  grey: '#9a97a8',
  gray: '#9a97a8',
  pink: '#d37ce9',
  purple: '#847cb3',
  yellow: '#f5c451',
  orange: '#f08c3c',
};

export function swatchColor(name: string): string {
  return COLOR_WORDS[name.trim().toLowerCase()] ?? '#847cb3';
}
