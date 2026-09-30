'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

/*
 * A tiny localStorage-backed store. Going through `useSyncExternalStore` makes
 * hydration correct by construction: the server snapshot is always `null`, so
 * the static HTML and the first client render agree, and React re-renders with
 * the stored value straight after.
 *
 * Snapshots are the raw JSON strings, which keeps them stable primitives —
 * parsing happens once per change, not once per read.
 */
const listeners = new Map<string, Set<() => void>>()
const cache = new Map<string, string | null>()

function readRaw(key: string): string | null {
  if (!cache.has(key)) {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(key)
    } catch {
      // Private browsing or storage disabled: behave as if nothing is stored.
    }
    cache.set(key, raw)
  }
  return cache.get(key) ?? null
}

function writeRaw(key: string, raw: string) {
  cache.set(key, raw)
  try {
    localStorage.setItem(key, raw)
  } catch {
    // A full quota or private mode: keep working in memory for this session.
  }
  listeners.get(key)?.forEach((listener) => listener())
}

function parse<T>(raw: string | null, initial: T): T {
  if (raw === null) return initial
  try {
    const parsed = JSON.parse(raw) as T
    // Objects gain fields between releases; merge so old data stays usable.
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? ({ ...(initial as object), ...(parsed as object) } as T)
      : parsed
  } catch {
    return initial
  }
}

const serverSnapshot = () => null

export function usePersisted<T>(key: string, initial: T) {
  const subscribe = useCallback(
    (listener: () => void) => {
      let set = listeners.get(key)
      if (!set) listeners.set(key, (set = new Set()))
      set.add(listener)
      return () => {
        set.delete(listener)
      }
    },
    [key],
  )

  const raw = useSyncExternalStore(subscribe, () => readRaw(key), serverSnapshot)
  const value = useMemo(() => parse(raw, initial), [raw, initial])

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const current = parse(readRaw(key), initial)
      const resolved =
        typeof next === 'function' ? (next as (current: T) => T)(current) : next
      writeRaw(key, JSON.stringify(resolved))
    },
    [key, initial],
  )

  return [value, setValue] as const
}
