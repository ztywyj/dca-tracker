const withAlpha = (variableName) => `rgb(var(${variableName}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        white: withAlpha('--color-text-rgb'),
        surface: withAlpha('--color-surface-rgb'),
        panel: withAlpha('--color-panel-rgb'),
        elevated: withAlpha('--color-elevated-rgb'),
        line: withAlpha('--color-line-rgb'),
        positive: withAlpha('--color-positive-rgb'),
        negative: withAlpha('--color-negative-rgb'),
        warning: withAlpha('--color-warning-rgb'),
        accent: withAlpha('--color-accent-rgb'),
        accentHover: withAlpha('--color-accent-hover-rgb'),
        accentSoft: withAlpha('--color-accent-soft-rgb'),
        info: withAlpha('--color-info-rgb'),
        muted: withAlpha('--color-muted-rgb'),
        'muted-foreground': withAlpha('--color-muted-foreground-rgb'),
        textSoft: withAlpha('--color-text-soft-rgb'),
        successSoft: withAlpha('--color-success-soft-rgb'),
        dangerSoft: withAlpha('--color-danger-soft-rgb'),
        warningSoft: withAlpha('--color-warning-soft-rgb'),
        infoSoft: withAlpha('--color-info-soft-rgb'),
      },
      fontFamily: {
        sans: ['Public Sans', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Noto Sans CJK SC"', 'system-ui', 'sans-serif'],
        display: ['Literata', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', '"Cascadia Mono"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'monospace'],
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
      },
      backgroundImage: {
        radial: 'radial-gradient(circle at top, rgb(var(--color-accent-rgb) / 0.1), transparent 44%)',
      },
    },
  },
  plugins: [],
}
