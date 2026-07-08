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
    label: '紫幕夜间',
    appearance: 'dark',
    preview: ['#151019', '#23182a', '#b67dff', '#ff7ac7'],
  },
  {
    value: 'ocean-dark',
    label: '深海夜间',
    appearance: 'dark',
    preview: ['#07131a', '#0d2028', '#43c6b1', '#4b84ff'],
  },
  {
    value: 'amber-dark',
    label: '铜棕夜间',
    appearance: 'dark',
    preview: ['#17110d', '#221914', '#e0a45a', '#7fa8ff'],
  },
  {
    value: 'berry-dark',
    label: '莓果夜间',
    appearance: 'dark',
    preview: ['#180f14', '#24161d', '#d27aa4', '#8e8cff'],
  },
  {
    value: 'light',
    label: '经典日间',
    appearance: 'light',
    preview: ['#f6f7f2', '#fffffc', '#7ea417', '#346cb8'],
  },
  {
    value: 'stone-light',
    label: '纸墨日间',
    appearance: 'light',
    preview: ['#f5f0e8', '#fffaf2', '#a57a52', '#4e6fae'],
  },
  {
    value: 'sky-light',
    label: '湖光日间',
    appearance: 'light',
    preview: ['#eef7fb', '#fcfeff', '#3d98ba', '#4a74c9'],
  },
  {
    value: 'sage-light',
    label: '抹茶日间',
    appearance: 'light',
    preview: ['#f2f7ef', '#fbfff8', '#7a9e48', '#c97a4b'],
  },
  {
    value: 'sand-light',
    label: '蜜杏日间',
    appearance: 'light',
    preview: ['#faf2e8', '#fffaf3', '#d08c4b', '#6d74c8'],
  },
  {
    value: 'mist-light',
    label: '雾霭日间',
    appearance: 'light',
    preview: ['#f3f2f8', '#fffefe', '#8d7cc6', '#5a81c8'],
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
