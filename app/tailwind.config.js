/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:    { DEFAULT: '#0c0d10', 1: '#111318', 2: '#171a20', 3: '#1d2128' },
        line:  { DEFAULT: '#23272f', 2: '#2d323c' },
        ink:   { DEFAULT: '#e6e8ee', 2: '#b6bcc8' },
        muted: { DEFAULT: '#7a818d', 2: '#555b66' },
        accent:   { DEFAULT: '#fbbf24', 2: '#f59e0b' },
        good:  '#6ee7a7',
        warn:  '#fbbf24',
        bad:   '#f87171',
        cat: {
          code:     '#7AA2F7',
          creative: '#E879F9',
          comm:     '#F59E0B',
          meeting:  '#38BDF8',
          browse:   '#94A3B8',
        },
        web: {
          Code:          '#7AA2F7',
          Docs:          '#38BDF8',
          Work:          '#A78BFA',
          Comms:         '#F59E0B',
          News:          '#E5E7EB',
          Social:        '#FB7185',
          Entertainment: '#F472B6',
          Shopping:      '#FBBF24',
          AI:            '#6EE7A7',
          Other:         '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        serif: ['Fraunces', 'Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
      },
    },
  },
  plugins: [],
};
