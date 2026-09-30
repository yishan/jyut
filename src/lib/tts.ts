'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/** Voices tagged Cantonese, in the various forms browsers actually use. */
const CANTONESE = /^(yue|zh-yue|zh-HK|zh-Hant-HK)/i

export interface Speech {
  supported: boolean
  /** True once we know a Cantonese voice exists on this device. */
  hasCantoneseVoice: boolean
  speaking: boolean
  speak: (text: string) => void
  stop: () => void
}

const subscribeNothing = () => () => {}

// Chrome populates the voice list asynchronously and announces it here.
const subscribeVoices = (listener: () => void) => {
  speechSynthesis.addEventListener('voiceschanged', listener)
  return () => speechSynthesis.removeEventListener('voiceschanged', listener)
}

const isSupported = () => 'speechSynthesis' in window

const cantoneseVoice = () =>
  speechSynthesis.getVoices().find((voice) => CANTONESE.test(voice.lang)) ?? null

export function useSpeech(): Speech {
  const supported = useSyncExternalStore(subscribeNothing, isSupported, () => false)

  // Snapshot the voice's URI, not the voice: some browsers hand back fresh
  // SpeechSynthesisVoice objects on every getVoices() call, and an unstable
  // snapshot would re-render forever.
  const voiceURI = useSyncExternalStore(
    supported ? subscribeVoices : subscribeNothing,
    () => (supported ? (cantoneseVoice()?.voiceURI ?? null) : null),
    () => null,
  )

  const [speaking, setSpeaking] = useState(false)

  // Don't leave speech running after the page component goes away.
  useEffect(
    () => () => {
      if (isSupported()) speechSynthesis.cancel()
    },
    [],
  )

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return
      speechSynthesis.cancel()

      const voice = voiceURI
        ? (speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI) ?? null)
        : null
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = voice?.lang ?? 'zh-HK'
      if (voice) utterance.voice = voice
      utterance.rate = 0.9
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)

      setSpeaking(true)
      speechSynthesis.speak(utterance)
    },
    [supported, voiceURI],
  )

  const stop = useCallback(() => {
    if (!supported) return
    speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  return { supported, hasCantoneseVoice: voiceURI !== null, speaking, speak, stop }
}
