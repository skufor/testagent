/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-hover': 'var(--bg-hover)',
        border: 'var(--border)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        'accent-soft-strong': 'var(--accent-soft-strong)',
        'accent-on': 'var(--accent-on)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '3px',
        md: '4px',
        lg: '4px',
        xl: '5px',
        bubble: '3px',
      },
      keyframes: {
        fadeRise: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        messageIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        drawerIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        popIn: {
          '0%': { opacity: 0, transform: 'scale(0.98) translateY(4px)' },
          '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        fadeRise: 'fadeRise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        messageIn: 'messageIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        drawerIn: 'drawerIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        popIn: 'popIn 0.16s cubic-bezier(0.16, 1, 0.3, 1) both',
        spin: 'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [],
};
