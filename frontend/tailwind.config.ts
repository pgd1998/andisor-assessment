import type { Config } from 'tailwindcss';

/**
 * Andisor brand theme.
 *
 * Palette extracted from the live andisor.com stylesheet:
 *   - indigo   #1e1a37 / #0b0c22   (primary dark, text, headers)
 *   - purple   #847cb3 / #d37ce9   (brand accents)
 *   - coral    #ef3346 / #d62e3f   (primary action / CTA)
 *   - blue     #357fef             (secondary accent, links)
 *   - surface  #f7f6f4 / #f4f3f0   (off-white backgrounds)
 *
 * Exposed both as Tailwind colors and (in tokens.css) as CSS custom properties
 * so non-Tailwind styles can reference the same source of truth.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          DEFAULT: '#1e1a37',
          deep: '#0b0c22',
          soft: '#363347',
        },
        brand: {
          purple: '#847cb3',
          lavender: '#d37ce9',
          light: '#de9cee',
        },
        coral: {
          DEFAULT: '#ef3346',
          hover: '#d62e3f',
          tint: '#fff5f6',
        },
        accent: {
          blue: '#357fef',
          bluetint: '#ecf3fe',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f7f6f4',
          sunken: '#f4f3f0',
          border: '#e6e6e6',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(30, 26, 55, 0.08), 0 1px 2px rgba(30, 26, 55, 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
