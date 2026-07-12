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
        // Semantic stock/status colors (separate from the brand accent).
        stock: {
          in: '#1f9d6b',
          intint: '#e7f6ef',
          low: '#d98a1f',
          lowtint: '#fdf2e2',
          out: '#d62e3f',
          outtint: '#fdecee',
        },
      },
      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['Fragment Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'var(--gradient-brand)',
        'gradient-header': 'var(--gradient-header)',
        'gradient-lavender': 'var(--gradient-lavender)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        'glow-coral': 'var(--shadow-glow-coral)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      keyframes: {
        'expand-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'save-pulse': {
          '0%': { backgroundColor: 'rgba(31, 157, 107, 0.18)' },
          '100%': { backgroundColor: 'transparent' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'expand-in': 'expand-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'save-pulse': 'save-pulse 900ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
