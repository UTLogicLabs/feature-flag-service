import { useEffect, useState } from 'react'
import { commitTheme, cycleTheme, isTheme, THEME_CHANGE_EVENT, type Theme } from '../utils/theme'

const LABELS: Record<Theme, string> = {
  light: 'Light',
  system: 'System',
  dark: 'Dark',
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = typeof document !== 'undefined' ? document.documentElement.dataset.theme : undefined
    return isTheme(initial) ? initial : 'system'
  })

  useEffect(() => {
    function handleThemeChange(event: Event) {
      const next = (event as CustomEvent<{ theme: Theme }>).detail?.theme
      if (isTheme(next)) setTheme(next)
    }
    document.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    return () => document.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
  }, [])

  function handleClick() {
    const next = cycleTheme(theme)
    commitTheme(next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      aria-label={`Switch theme (currently ${LABELS[theme]})`}
      onClick={handleClick}
      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {LABELS[theme]}
    </button>
  )
}
