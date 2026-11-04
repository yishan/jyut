'use client'

// Replaces Next's unstyled "Application error" screen. Rendered outside the
// language switcher, so it carries both languages.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-24 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight">
        頁面出錯 · The page hit an error
      </h1>
      <p className="text-sm text-[var(--text-secondary)]">
        再試一次通常就得。Trying again usually fixes it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="relative mt-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-press before:absolute before:-inset-y-1.5 before:inset-x-0 hover:bg-[var(--surface-sunken)]"
      >
        再試 · Try again
      </button>
    </main>
  )
}
