import * as Sentry from '@sentry/nextjs'

const sampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1')

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production',
  tracesSampleRate: Number.isFinite(sampleRate) && sampleRate >= 0 && sampleRate <= 1
    ? sampleRate
    : 0.1,
})
