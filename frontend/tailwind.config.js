/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base Canvas & Surface
        bgMain: 'var(--bg-main)',
        bgCanvas: 'var(--bg-canvas)',
        bgCard: 'var(--bg-card)',
        bgSidebar: 'var(--bg-sidebar)',
        bgHover: 'var(--bg-hover)',
        bgSecondary: 'var(--bg-secondary)',
        bgSurfaceElevated: 'var(--bg-surface-elevated)',

        // Typography
        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        textTertiary: 'var(--text-tertiary)',
        textDisabled: 'var(--text-disabled)',
        textInverse: 'var(--text-inverse)',
        textForest: 'var(--text-forest)',

        // Brand Deep Forest
        brandPrimary: 'var(--color-brand-primary)',
        brandHover: 'var(--color-brand-hover)',
        brandActive: 'var(--color-brand-active)',
        brandDeep: 'var(--color-brand-deep)',
        brandSoft: 'var(--color-brand-soft)',
        accentPrimary: 'var(--accent-primary)',

        // Signature AI (Muted Lime)
        aiAccent: 'var(--color-ai-accent)',
        aiSoft: 'var(--color-ai-soft)',
        aiBorder: 'var(--color-ai-border)',
        aiText: 'var(--color-ai-text)',

        // Champagne Gold Premium
        goldAccent: 'var(--color-premium-gold)',
        goldSoft: 'var(--color-premium-soft)',

        // Semantics: Risk (Deep Red)
        riskPrimary: 'var(--color-risk-primary)',
        riskSoft: 'var(--color-risk-soft)',
        riskBorder: 'var(--color-risk-border)',
        riskDark: 'var(--color-risk-dark)',

        // Semantics: Warning (Ochre)
        warningPrimary: 'var(--color-warning-primary)',
        warningSoft: 'var(--color-warning-soft)',
        warningBorder: 'var(--color-warning-border)',
        warningDark: 'var(--color-warning-dark)',

        // Semantics: Success (Forest Green)
        successPrimary: 'var(--color-success-primary)',
        successSoft: 'var(--color-success-soft)',
        successBorder: 'var(--color-success-border)',
        successDark: 'var(--color-success-dark)',

        // Borders
        borderSubtle: 'var(--border-subtle)',
        borderDefault: 'var(--border-default)',
        borderStrong: 'var(--border-strong)',
        borderBrand: 'var(--border-brand)',

        // Accents mapped to semantic tokens
        accentCyan: 'var(--color-brand-primary)',
        accentSuccess: 'var(--color-success-primary)',
        accentError: 'var(--color-risk-primary)',
        accentWarning: 'var(--color-warning-primary)',
      },
      fontFamily: {
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-up': 'scaleUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
