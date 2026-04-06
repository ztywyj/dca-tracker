export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f1117',
        panel: '#151925',
        line: '#262c3d',
        positive: '#22c55e',
        negative: '#ef4444',
        accent: '#60a5fa',
        muted: '#96a0b8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(96, 165, 250, 0.15), 0 20px 40px rgba(4, 9, 20, 0.45)',
      },
      backgroundImage: {
        radial: 'radial-gradient(circle at top, rgba(96, 165, 250, 0.16), transparent 45%)',
      },
    },
  },
  plugins: [],
}
