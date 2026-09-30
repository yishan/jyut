'use client'

import { SCHEMES, type SchemeId } from '@/lib/schemes'
import type { FormatOptions } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { Card, Checkbox, SectionLabel, Segmented } from './ui'

interface Props {
  scheme: SchemeId
  onScheme: (scheme: SchemeId) => void
  format: FormatOptions
  onFormat: (patch: Partial<FormatOptions>) => void
  useWordDictionary: boolean
  onUseWordDictionary: (value: boolean) => void
}

export function SettingsPanel({
  scheme,
  onScheme,
  format,
  onFormat,
  useWordDictionary,
  onUseWordDictionary,
}: Props) {
  const { t, lang } = useI18n()


  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <SectionLabel>{t('scheme.label')}</SectionLabel>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {SCHEMES.map((option) => {
            const active = option.id === scheme
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onScheme(option.id)}
                aria-pressed={active}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'hover:bg-[var(--surface-sunken)]'
                }`}
              >
                <span
                  className={`block text-sm ${
                    active
                      ? 'font-medium text-[var(--accent-text)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {option.label[lang]}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--text-faint)]">
                  {option.sample}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <SectionLabel>{t('option.title')}</SectionLabel>
        <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
          <Checkbox
            checked={useWordDictionary}
            onChange={onUseWordDictionary}
            label={t('option.wordDict')}
            hint={t('option.wordDict.hint')}
          />
          <div>
            <Checkbox
              checked={format.spaceAfter}
              onChange={(spaceAfter) => onFormat({ spaceAfter })}
              label={t('option.spaceAfter')}
            />
            <Checkbox
              checked={format.failedMarker}
              onChange={(failedMarker) => onFormat({ failedMarker })}
              label={t('option.failedMarker')}
            />
            <Checkbox
              checked={format.keepNonHan}
              onChange={(keepNonHan) => onFormat({ keepNonHan })}
              label={t('option.keepNonHan')}
            />
            <Checkbox
              checked={format.normalizeFullwidth}
              onChange={(normalizeFullwidth) => onFormat({ normalizeFullwidth })}
              label={t('option.normalizeFullwidth')}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

export function LayoutPicker({
  value,
  onChange,
}: {
  value: FormatOptions['layout']
  onChange: (layout: FormatOptions['layout']) => void
}) {
  const { t } = useI18n()
  return (
    <Segmented
      label={t('layout.label')}
      value={value}
      onChange={onChange}
      options={[
        { value: 'ruby', label: t('layout.ruby') },
        { value: 'inline', label: t('layout.inline') },
        { value: 'phonetic', label: t('layout.phonetic') },
      ]}
    />
  )
}
