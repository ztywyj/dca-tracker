import { useCallback, useEffect, useState } from 'react'

const THEME_STORAGE_KEY = 'dca-tracker:theme'
const PREFERRED_DARK_THEME_STORAGE_KEY = 'dca-tracker:preferred-dark-theme'
const PREFERRED_LIGHT_THEME_STORAGE_KEY = 'dca-tracker:preferred-light-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'
const DEFAULT_DARK_THEME = 'classic-dark'
const DEFAULT_LIGHT_THEME = 'light'

export const THEME_OPTIONS = [
  {
    value: 'classic-dark',
    label: '经典夜间',
    appearance: 'dark',
    preview: ['#0f1117', '#151923', '#7aa2ff', '#67a6ff'],
  },
  {
    value: 'dark',
    label: '森系夜间',
    appearance: 'dark',
    preview: ['#0d1310', '#151c17', '#a9c46a', '#6bb7a3'],
  },
  {
    value: 'slate-dark',
    label: '石板夜间',
    appearance: 'dark',
    preview: ['#17181d', '#23252c', '#7a7fe3', '#c2d0ff'],
  },
  {
    value: 'ocean-dark',
    label: '深海夜间',
    appearance: 'dark',
    preview: ['#081218', '#0d1c23', '#4ec2ba', '#57a8ee'],
  },
  {
    value: 'amber-dark',
    label: '琥珀夜间',
    appearance: 'dark',
    preview: ['#18120e', '#1f1813', '#d7a152', '#74b1de'],
  },
  {
    value: 'light',
    label: '原版日间',
    appearance: 'light',
    preview: ['#f6f7f2', '#fffffc', '#7ea417', '#346cb8'],
  },
  {
    value: 'stone-light',
    label: '岩灰日间',
    appearance: 'light',
    preview: ['#f5f3f0', '#fffaf5', '#8d755c', '#496fab'],
  },
  {
    value: 'sky-light',
    label: '晴空日间',
    appearance: 'light',
    preview: ['#f0f6fb', '#fdfeff', '#3a84c8', '#3a76c2'],
  },
  {
    value: 'sage-light',
    label: '鼠尾草日间',
    appearance: 'light',
    preview: ['#f4f7f3', '#fcfffb', '#669358', '#4479be'],
  },
  {
    value: 'sand-light',
    label: '砂岩日间',
    appearance: 'light',
    preview: ['#f8f4ec', '#fffbf4', '#be8544', '#5579b9'],
  },
]

const THEME_LOOKUP = Object.fromEntries(THEME_OPTIONS.map((option) => [option.value, option]))
const VALID_THEMES = new Set(THEME_OPTIONS.map((option) => option.value))

function getThemeAppearance(theme) {
  return THEME_LOOKUP[theme]?.appearance || 'dark'
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getSystemTheme(preferredDarkTheme = DEFAULT_DARK_THEME, preferredLightTheme = DEFAULT_LIGHT_THEME) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return preferredDarkTheme
  }

  return window.matchMedia(DARK_QUERY).matches ? preferredDarkTheme : preferredLightTheme
}

function getStoredTheme(key, appearance) {
  if (!canUseBrowserStorage()) {
    return null
  }

  try {
    const value = window.localStorage.getItem(key)
    if (!VALID_THEMES.has(value)) {
      return null
    }

    if (appearance && getThemeAppearance(value) !== appearance) {
      return null
    }

    return value
  } catch {
    return null
  }
}

function saveStoredTheme(key, theme) {
  if (!canUseBrowserStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, theme)
  } catch {
    // Theme persistence is a convenience; rendering should continue if storage is unavailable.
  }
}

function persistThemeState(state) {
  saveStoredTheme(THEME_STORAGE_KEY, state.theme)
  saveStoredTheme(PREFERRED_DARK_THEME_STORAGE_KEY, state.preferredDarkTheme)
  saveStoredTheme(PREFERRED_LIGHT_THEME_STORAGE_KEY, state.preferredLightTheme)
}

function resolveThemeState() {
  const userPreference = getStoredTheme(THEME_STORAGE_KEY)
  const preferredDarkTheme = getStoredTheme(PREFERRED_DARK_THEME_STORAGE_KEY, 'dark')
    || (getThemeAppearance(userPreference) === 'dark' ? userPreference : null)
    || DEFAULT_DARK_THEME
  const preferredLightTheme = getStoredTheme(PREFERRED_LIGHT_THEME_STORAGE_KEY, 'light')
    || (getThemeAppearance(userPreference) === 'light' ? userPreference : null)
    || DEFAULT_LIGHT_THEME
  const theme = userPreference || getSystemTheme(preferredDarkTheme, preferredLightTheme)

  return {
    theme,
    userPreference,
    preferredDarkTheme,
    preferredLightTheme,
  }
}

function createNextThemeState(nextTheme, current) {
  return {
    theme: nextTheme,
    userPreference: nextTheme,
    preferredDarkTheme: getThemeAppearance(nextTheme) === 'dark'
      ? nextTheme
      : current.preferredDarkTheme || DEFAULT_DARK_THEME,
    preferredLightTheme: getThemeAppearance(nextTheme) === 'light'
      ? nextTheme
      : current.preferredLightTheme || DEFAULT_LIGHT_THEME,
  }
}

export default function useTheme() {
  const [themeState, setThemeState] = useState(resolveThemeState)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.dataset.theme = themeState.theme
    document.documentElement.style.colorScheme = getThemeAppearance(themeState.theme)
  }, [themeState.theme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(DARK_QUERY)
    const handleSystemChange = (event) => {
      setThemeState((current) => {
        if (current.userPreference) {
          return current
        }

        return {
          theme: event.matches
            ? current.preferredDarkTheme || DEFAULT_DARK_THEME
            : current.preferredLightTheme || DEFAULT_LIGHT_THEME,
          userPreference: null,
          preferredDarkTheme: current.preferredDarkTheme || DEFAULT_DARK_THEME,
          preferredLightTheme: current.preferredLightTheme || DEFAULT_LIGHT_THEME,
        }
      })
    }

    mediaQuery.addEventListener?.('change', handleSystemChange)
    mediaQuery.addListener?.(handleSystemChange)

    return () => {
      mediaQuery.removeEventListener?.('change', handleSystemChange)
      mediaQuery.removeListener?.(handleSystemChange)
    }
  }, [])

  const setTheme = useCallback((nextTheme) => {
    if (!VALID_THEMES.has(nextTheme)) {
      return
    }

    setThemeState((current) => {
      const nextState = createNextThemeState(nextTheme, current)
      persistThemeState(nextState)
      return nextState
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const nextTheme = getThemeAppearance(current.theme) === 'dark'
        ? current.preferredLightTheme || DEFAULT_LIGHT_THEME
        : current.preferredDarkTheme || DEFAULT_DARK_THEME
      const nextState = createNextThemeState(nextTheme, current)
      persistThemeState(nextState)
      return nextState
    })
  }, [])

  return {
    theme: themeState.theme,
    themeOptions: THEME_OPTIONS,
    themeMeta: THEME_LOOKUP[themeState.theme] || THEME_LOOKUP[DEFAULT_DARK_THEME],
    preferredDarkTheme: themeState.preferredDarkTheme,
    preferredLightTheme: themeState.preferredLightTheme,
    isDarkTheme: getThemeAppearance(themeState.theme) === 'dark',
    isUserPreference: Boolean(themeState.userPreference),
    setTheme,
    toggleTheme,
  }
}
