import type { Lang } from './i18n'

/**
 * The romanisation schemes we can spell a syllable in.
 *
 * Everything except Jyutping is produced by looking the Jyutping syllable up in
 * the pingyam table (see `pingyam.ts`), so `column` is that table's column index.
 */

export const PINGYAM_COLUMNS = [
  'yale-num',
  'yale-dia',
  'cantonese-pinyin',
  'sl-wong-num',
  'sl-wong-dia',
  'ipa',
  'jyutping',
  'canton',
  'sidney-lau',
  'penkyamp-num',
  'penkyamp-dia',
] as const

export type SchemeId = (typeof PINGYAM_COLUMNS)[number]

export interface Scheme {
  id: SchemeId
  /** Index into a pingyam row. */
  column: number
  label: Record<Lang, string>
  /** Example spelling of 廣東話, shown in the picker. */
  sample: string
}

const column = (id: SchemeId) => PINGYAM_COLUMNS.indexOf(id)

export const SCHEMES: Scheme[] = [
  {
    id: 'jyutping',
    column: column('jyutping'),
    label: {
      'zh-Hant': '粵拼（香港語言學學會）',
      'zh-Hans': '粤拼（香港语言学学会）',
      en: 'Jyutping (LSHK)',
    },
    sample: 'gwong2 dung1 waa2',
  },
  {
    id: 'yale-num',
    column: column('yale-num'),
    label: {
      'zh-Hant': '耶魯拼音（數字聲調）',
      'zh-Hans': '耶鲁拼音（数字声调）',
      en: 'Yale (numeric tones)',
    },
    sample: 'gwong2 dung1 wa2',
  },
  {
    id: 'yale-dia',
    column: column('yale-dia'),
    label: {
      'zh-Hant': '耶魯拼音（附加符號）',
      'zh-Hans': '耶鲁拼音（附加符号）',
      en: 'Yale (tone diacritics)',
    },
    sample: 'gwóng dūng wá',
  },
  {
    id: 'ipa',
    column: column('ipa'),
    label: { 'zh-Hant': '國際音標', 'zh-Hans': '国际音标', en: 'IPA' },
    sample: 'kwɔːŋ˧˥ tʊŋ˥ waː˧˥',
  },
  {
    id: 'cantonese-pinyin',
    column: column('cantonese-pinyin'),
    label: {
      'zh-Hant': '教育學院拼音方案',
      'zh-Hans': '教育学院拼音方案',
      en: 'Cantonese Pinyin (教院式)',
    },
    sample: 'gwong2 dung1 waa2',
  },
  {
    id: 'canton',
    column: column('canton'),
    label: {
      'zh-Hant': '廣州話拼音方案',
      'zh-Hans': '广州话拼音方案',
      en: 'Guangdong Romanization',
    },
    sample: 'gwong2 dung1 wa2',
  },
  {
    id: 'sidney-lau',
    column: column('sidney-lau'),
    label: { 'zh-Hant': '劉錫祥拼音', 'zh-Hans': '刘锡祥拼音', en: 'Sidney Lau' },
    sample: 'gwong² dung¹ wa²',
  },
  {
    id: 'sl-wong-num',
    column: column('sl-wong-num'),
    label: {
      'zh-Hant': '黃錫凌羅馬拼音（數字）',
      'zh-Hans': '黄锡凌罗马拼音（数字）',
      en: 'S. L. Wong (numeric)',
    },
    sample: 'gwɔŋ² dʊŋ¹ wa²',
  },
  {
    id: 'sl-wong-dia',
    column: column('sl-wong-dia'),
    label: {
      'zh-Hant': '黃錫凌羅馬拼音（調符）',
      'zh-Hans': '黄锡凌罗马拼音（调符）',
      en: 'S. L. Wong (diacritics)',
    },
    sample: "´gwɔŋ 'dʊŋ ´wa",
  },
  {
    id: 'penkyamp-num',
    column: column('penkyamp-num'),
    label: {
      'zh-Hant': '粵語拼音字（數字）',
      'zh-Hans': '粤语拼音字（数字）',
      en: 'Penkyamp (numeric)',
    },
    sample: 'guong2 donk1 wa2',
  },
  {
    id: 'penkyamp-dia',
    column: column('penkyamp-dia'),
    label: {
      'zh-Hant': '粵語拼音字（調符）',
      'zh-Hans': '粤语拼音字（调符）',
      en: 'Penkyamp (diacritics)',
    },
    sample: 'guõng dönk wã',
  },
]

export const SCHEME_BY_ID = new Map(SCHEMES.map((s) => [s.id, s]))

export const DEFAULT_SCHEME: SchemeId = 'jyutping'
