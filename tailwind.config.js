export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f1117',
        panel: '#151923',
        elevated: '#1a1f2b',
        line: '#252b38',
        positive: '#10b981',
        negative: '#f43f5e',
        warning: '#f59e0b',
        accent: '#7aa2ff',
        accentSoft: '#304b86',
        info: '#67a6ff',
        muted: '#7f8898',
        'muted-foreground': '#98a3b6',
        textSoft: '#c7d0de',
        successSoft: '#052e24',
        dangerSoft: '#3b1020',
        warningSoft: '#3a2608',
        infoSoft: '#0e2940',
      },
      fontFamily: {
        sans: ['Public Sans', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Noto Sans CJK SC"', 'system-ui', 'sans-serif'],
        display: ['Literata', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', '"Cascadia Mono"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'monospace'],
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
