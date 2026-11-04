'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { LANGS, useI18n } from '@/lib/i18n'
import { THEME_COLOR } from '@/lib/theme'

/*
 * The `dark` class on <html> is the source of truth — the inline script in the
 * layout sets it before first paint. Subscribing to it (rather than copying it
 * into state) keeps the icon right on hydration and whenever the class moves.
 */
const subscribeTheme = (listener: () => void) => {
  const observer = new MutationObserver(listener)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
const isDark = () => document.documentElement.classList.contains('dark')

function ThemeToggle() {
  const { t } = useI18n()
  const dark = useSyncExternalStore(subscribeTheme, isDark, () => false)

  // The theme-color tags only follow the OS setting by themselves; a manual
  // toggle has to repaint the status bar to match the page.
  useEffect(() => {
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light)
    }
  }, [dark])

  const toggle = () => {
    const next = !dark
    const root = document.documentElement
    root.classList.add('no-transitions')
    root.classList.toggle('dark', next)
    // Two frames: one to paint the new theme, one before transitions return.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.classList.remove('no-transitions')),
    )
    try {
      localStorage.setItem('jyut.theme', next ? 'dark' : 'light')
    } catch {
      // Storage unavailable: the choice just won't survive a reload.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={t('ui.theme')}
      aria-label={t('ui.theme')}
      className="relative rounded-lg border p-2 text-[var(--text-secondary)] transition-press before:absolute before:-inset-[5px] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  )
}

export function Header() {
  const { t, lang, setLang } = useI18n()

  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          {t('app.title')}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t('app.tagline')}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div
          role="radiogroup"
          aria-label={t('ui.lang')}
          className="flex gap-0.5 rounded-lg bg-[var(--surface-sunken)] p-0.5"
        >
          {LANGS.map((option) => {
            const active = option.id === lang
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={option.full}
                title={option.full}
                onClick={() => setLang(option.id)}
                className={`relative rounded-md px-2.5 py-1.5 text-sm transition-press before:absolute before:-inset-y-1.5 before:inset-x-0 ${
                  active
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {option.short}
              </button>
            )
          })}
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
