import Link from 'next/link'

// Rendered outside the client-side language switcher, so it carries both.
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-24 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight">
        搵唔到呢個頁面 · Page not found
      </h1>
      <p className="text-sm text-[var(--text-secondary)]">
        呢個網站淨係得一個頁面。This site has a single page.
      </p>
      <p>
        <Link
          href="/"
          className="text-sm text-[var(--accent-text)] underline underline-offset-2"
        >
          返去粵拼轉換器 · Back to the converter
        </Link>
      </p>
    </main>
  )
}
