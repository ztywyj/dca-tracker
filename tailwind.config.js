export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0d1017',
        panel: '#131a25',
        elevated: '#192232',
        line: '#263246',
        positive: '#22c55e',
        negative: '#ef4444',
        warning: '#f59e0b',
        accent: '#60a5fa',
        accentSoft: '#1d4f91',
        info: '#38bdf8',
        muted: '#9aa8bd',
        textSoft: '#c8d2e1',
      },
      fontFamily: {
        sans: ['Public Sans', 'system-ui', 'sans-serif'],
        display: ['Literata', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(96, 165, 250, 0.07), 0 12px 24px rgba(2, 6, 18, 0.28)',
      },
      backgroundImage: {
        radial: 'radial-gradient(circle at top, rgba(96, 165, 250, 0.08), transparent 44%)',
      },
    },
  },
  plugins: [],
}
