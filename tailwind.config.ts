import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // --- Warm & Joyful Palette ---
        "royal-purple": "#5A2D82",
        "deep-gold": "#D4AF37",
        "midnight-blue": "#0B1F3A",
        "burgundy": "#6D1A36",
        "praise-orange": "#F57C00",
        "teal-accent": "#2CA6A4",
        "soft-cream": "#F8F4EC",
        "bg-dark": "#0A0A0A",
        "card-dark": "#1A1A1A",
        "text-light": "#F5F5F5",

        // Mapping legacy names to new palette for stability
        "backgroud-primary": "#F8F4EC", // Soft Cream
        "backgroud-secondary": "#0A0A0A", // Background Dark
        "foregroud-primary": "#D4AF37", // Deep Gold
        "para-color": "#F5F5F5", // Text Light (for dark sections)
        "heading-color": "#D4AF37", // Deep Gold
        
        background: {
          1: "#1A1A1A", // Card Dark
          2: "#0B1F3A", // Midnight Blue
          3: "#0A0A0A", // Background Dark
          4: "#0A0A0A"
        },

        dark: {
          1: '#F5F5F5',
          2: '#F5F5F5',
          3: '#F5F5F5',
          4: '#F5F5F5',
        },
        // --- End of New Palette ---

        blue: {
          1: '#0E78F9',
        },
        sky: {
          1: '#C9DDFF',
          2: '#ECF0FF',
          3: '#F5FCFF',
        },
        orange: {
          1: '#FF742E',
        },
        purple: {
          1: '#830EF9',
        },
        yellow: {
          1: '#F9A90E',
        },
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // Worship visual layer keyframes (also wired in globals.css for legacy class consumers)
        'light-ray-rotate': {
          '0%':   { transform: 'rotate(0deg)',   opacity: '0.1' },
          '50%':  { transform: 'rotate(180deg)', opacity: '0.3' },
          '100%': { transform: 'rotate(360deg)', opacity: '0.1' },
        },
        'soft-glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(90, 45, 130, 0.2), 0 0 40px rgba(212, 175, 55, 0.1)' },
          '50%':      { boxShadow: '0 0 35px rgba(90, 45, 130, 0.4), 0 0 60px rgba(212, 175, 55, 0.2)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'light-ray':       'light-ray-rotate 20s linear infinite',
        'soft-glow':       'soft-glow-pulse 4s ease-in-out infinite',
        'fade-in':         'fade-in 0.3s ease-out',
        'fade-in-up':      'fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backgroundImage: {
        hero: "url('/images/hero-background.png')",
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
