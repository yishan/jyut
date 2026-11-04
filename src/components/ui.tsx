'use client'

import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border bg-[var(--surface-raised)] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-16px_rgb(0_0_0/0.18)] ${className}`}
    >
      {children}
    </section>
  )
}

/** Each card's title, so screen-reader users can jump between sections. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap text-[var(--text-faint)] uppercase">
      {children}
    </h2>
  )
}

/**
 * Stacks both labels in one grid cell, so a button that swaps "Copy" for
 * "Copied" keeps the wider width instead of shoving its neighbours. The hidden
 * one is `visibility: hidden`, which also drops it from the accessible name.
 */
export function SwapLabel({
  showAlt,
  label,
  alt,
}: {
  showAlt: boolean
  label: ReactNode
  alt: ReactNode
}) {
  return (
    <span className="inline-grid justify-items-center">
      <span className={`col-start-1 row-start-1 ${showAlt ? 'invisible' : ''}`}>{label}</span>
      <span className={`col-start-1 row-start-1 ${showAlt ? '' : 'invisible'}`}>{alt}</span>
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-xl bg-[var(--surface-sunken)] p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs leading-snug transition-press sm:px-3 sm:text-sm ${
              active
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
      />
      <span className="min-w-0">
        <span className="block text-sm text-[var(--text-primary)]">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-faint)]">
            {hint}
          </span>
        )}
      </span>
    </label>
  )
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  disabled,
  title,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'ghost' | 'solid'
  disabled?: boolean
  title?: string
}) {
  const base =
    // The ::before grows the 34px button to a 46px hit area without moving it.
    'relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-press before:absolute before:-inset-y-1.5 before:inset-x-0 disabled:opacity-40 disabled:cursor-not-allowed'
  const styles =
    variant === 'solid'
      ? 'bg-[var(--accent)] text-[var(--surface-raised)] hover:opacity-90'
      : 'border text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${styles}`}
    >
      {children}
    </button>
  )
}
