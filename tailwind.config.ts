// tailwind.config.ts
// MerchantE Developer Portal — Tailwind Theme (Canonical)

import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          glow: 'hsl(var(--primary-glow))',
        },

        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },

        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },

        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },

        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },

        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        navy: {
          DEFAULT: 'hsl(var(--navy))',
          foreground: 'hsl(var(--navy-foreground))',
        },

        sidebar: {
          background: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          primaryForeground: 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          accentForeground: 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },

        // Legacy omise colors for backward compatibility during migration
        omise: {
          dark: 'hsl(var(--background))',
          'dark-secondary': 'hsl(var(--secondary))',
          'dark-tertiary': 'hsl(var(--muted))',
          border: 'hsl(var(--border))',
          blue: '#6B9EFF',
          'blue-light': '#8FB4FF',
          cyan: 'hsl(var(--primary))',
          'cyan-dark': 'hsl(var(--accent))',
          teal: 'hsl(var(--accent))',
          'teal-dark': 'hsl(var(--accent))',
          gray: {
            100: 'hsl(var(--foreground))',
            200: '#E5E7EB',
            300: 'hsl(var(--secondary-foreground))',
            400: 'hsl(var(--muted-foreground))',
            500: 'hsl(var(--muted-foreground))',
            600: '#4B5563',
          },
        },
      },

      backgroundImage: {
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-bg': 'var(--gradient-bg)',
      },

      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        hero: 'var(--shadow-hero)',
        // Legacy shadows
        'soft-dark': 'var(--shadow-card)',
        glow: 'var(--shadow-card-hover)',
        'glow-cyan': 'var(--shadow-card-hover)',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      borderRadius: {
        lg: 'var(--radius)',
      },
    },
  },
  plugins: [],
}

export default config
