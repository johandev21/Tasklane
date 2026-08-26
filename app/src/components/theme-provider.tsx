import { createContext, useContext, useEffect, useState } from 'react'
import { ScriptOnce } from '@tanstack/react-router'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  attribute?: 'class'
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

function getThemeScript(storageKey: string, defaultTheme: Theme) {
  const key = JSON.stringify(storageKey)
  const fallback = JSON.stringify(defaultTheme)

  return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')

  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  attribute = 'class',
}: ThemeProviderProps) {
  void attribute
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    setThemeState(
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : defaultTheme,
    )
    setMounted(true)
  }, [defaultTheme, storageKey])

  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted])

  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme, mounted])

  useEffect(() => {
    if (!mounted) return

    const handleThemeShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        target?.closest('input, textarea, select, [contenteditable="true"]')
      )
        return

      if (event.key.toLowerCase() !== 'd' || event.metaKey || event.ctrlKey)
        return

      event.preventDefault()
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    window.addEventListener('keydown', handleThemeShortcut)
    return () => window.removeEventListener('keydown', handleThemeShortcut)
  }, [mounted, theme])

  const setTheme = (next: Theme) => {
    localStorage.setItem(storageKey, next)
    setThemeState(next)
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      <ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
