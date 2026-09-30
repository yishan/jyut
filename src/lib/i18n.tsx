'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

export type Lang = 'zh-Hant' | 'zh-Hans' | 'en'

export const LANGS: { id: Lang; short: string; full: string; htmlLang: string }[] = [
  { id: 'zh-Hant', short: '繁', full: '繁體中文', htmlLang: 'zh-Hant-HK' },
  { id: 'zh-Hans', short: '简', full: '简体中文', htmlLang: 'zh-Hans' },
  { id: 'en', short: 'EN', full: 'English', htmlLang: 'en' },
]

/**
 * The Traditional copy is written in colloquial written Cantonese, which is what
 * a Hong Kong reader expects. The Simplified copy is Standard Written Chinese —
 * transliterating the Cantonese would read as dialect to a mainland visitor.
 */
const STRINGS = {
  'app.title': {
    'zh-Hant': '粵拼轉換器',
    'zh-Hans': '粤拼转换器',
    en: 'Jyutping Converter',
  },
  'app.tagline': {
    'zh-Hant': '漢字 → 廣東話拼音',
    'zh-Hans': '汉字 → 广东话拼音',
    en: 'Chinese characters → Cantonese romanisation',
  },
  'app.intro': {
    'zh-Hant':
      '輸入繁體或簡體漢字，即時標注粵語讀音。支援 11 種拼音方案、詞語分詞、多音字選字同語音朗讀，注音全部喺本機運算。亦可以將普通話或者其他語言改寫成地道粵文。',
    'zh-Hans':
      '输入繁体或简体汉字，即时标注粤语读音。支持 11 种拼音方案、词语分词、多音字选字和语音朗读，注音全部在本地设备运算。也可以把普通话或其他语言改写成地道粤文。',
    en: 'Type traditional or simplified Chinese and get Cantonese readings instantly. Eleven romanisation schemes, word-level disambiguation, a picker for polyphonic characters and speech playback — annotation runs locally on your device. You can also rewrite Mandarin or another language as idiomatic Cantonese.',
  },

  'input.label': { 'zh-Hant': '漢字輸入', 'zh-Hans': '汉字输入', en: 'Chinese input' },
  'input.placeholder': {
    'zh-Hant': '喺呢度輸入漢字⋯⋯',
    'zh-Hans': '在这里输入汉字⋯⋯',
    en: 'Type or paste Chinese text here…',
  },
  'input.clear': { 'zh-Hant': '清除', 'zh-Hans': '清除', en: 'Clear' },
  'input.sample': { 'zh-Hant': '示例', 'zh-Hans': '示例', en: 'Sample' },
  'input.chars': { 'zh-Hant': '字', 'zh-Hans': '字', en: 'chars' },
  'input.overLimit': {
    'zh-Hant': '已超出上限，只會轉換頭 {limit} 個字。',
    'zh-Hans': '已超出上限，只会转换前 {limit} 个字。',
    en: 'Over the limit — only the first {limit} characters are converted.',
  },

  'translate.action': {
    'zh-Hant': '譯做粵語',
    'zh-Hans': '译成粤语',
    en: 'To Cantonese',
  },
  'translate.running': {
    'zh-Hant': '改寫緊⋯⋯',
    'zh-Hans': '改写中⋯⋯',
    en: 'Rewriting…',
  },
  'translate.undo': { 'zh-Hant': '還原原文', 'zh-Hans': '还原原文', en: 'Undo' },
  'translate.hint': {
    'zh-Hant': '將普通話或者其他語言改寫成地道粵文，然後即時標注粵拼。呢一步會將文字送去伺服器處理。',
    'zh-Hans': '将普通话或其他语言改写成地道粤文，然后即时标注粤拼。这一步会将文字发送到服务器处理。',
    en: 'Rewrites Mandarin or another language as idiomatic written Cantonese, then annotates it. This step sends your text to the server.',
  },
  'translate.err.translate_unconfigured': {
    'zh-Hant': '伺服器未設定翻譯服務。',
    'zh-Hans': '服务器未配置翻译服务。',
    en: 'Translation is not configured on the server.',
  },
  'translate.err.rate_limited': {
    'zh-Hant': '短時間內用得太密，等陣再試。',
    'zh-Hans': '短时间内请求过多，请稍后再试。',
    en: 'Too many requests — try again shortly.',
  },
  'translate.err.too_long': {
    'zh-Hant': '翻譯上限 {limit} 字，請先縮短。',
    'zh-Hans': '翻译上限 {limit} 字，请先缩短。',
    en: 'Translation is capped at {limit} characters.',
  },
  'translate.err.generic': {
    'zh-Hant': '改寫失敗，請再試一次。',
    'zh-Hans': '改写失败，请重试。',
    en: 'Rewrite failed — please try again.',
  },
  'translate.err.empty_result': {
    'zh-Hant': '冇收到譯文，已經還原返原文。',
    'zh-Hans': '没有收到译文，已还原原文。',
    en: 'No rewrite came back, so your text was restored.',
  },
  'translate.warn.truncated': {
    'zh-Hant': '譯文可能唔完整（中途截斷咗）。可以撳「還原原文」再試。',
    'zh-Hans': '译文可能不完整（中途被截断）。可点「还原原文」后重试。',
    en: 'The rewrite may be incomplete — it was cut off. Use Undo to try again.',
  },
  'translate.warn.filtered': {
    'zh-Hant': '部分內容俾服務商過濾咗，譯文可能唔完整。',
    'zh-Hans': '部分内容被服务商过滤，译文可能不完整。',
    en: 'The provider filtered part of the text, so the rewrite may be incomplete.',
  },

  'result.title': { 'zh-Hant': '轉換結果', 'zh-Hans': '转换结果', en: 'Result' },
  'result.copy': { 'zh-Hant': '複製', 'zh-Hans': '复制', en: 'Copy' },
  'result.copied': { 'zh-Hant': '已複製', 'zh-Hans': '已复制', en: 'Copied' },
  'result.empty': {
    'zh-Hant': '轉換結果會喺呢度顯示。',
    'zh-Hans': '转换结果会显示在这里。',
    en: 'Your converted text will appear here.',
  },
  'result.speak': { 'zh-Hant': '朗讀', 'zh-Hans': '朗读', en: 'Speak' },
  'result.stop': { 'zh-Hant': '停止', 'zh-Hans': '停止', en: 'Stop' },
  'result.loading': {
    'zh-Hant': '載入字典中⋯⋯',
    'zh-Hans': '正在加载字典⋯⋯',
    en: 'Loading dictionary…',
  },
  'result.loadFailed': {
    'zh-Hant': '字典載入失敗，可能係網絡問題。',
    'zh-Hans': '字典加载失败，可能是网络问题。',
    en: 'The dictionary failed to load — possibly a network problem.',
  },
  'result.retry': { 'zh-Hant': '再試', 'zh-Hans': '重试', en: 'Retry' },

  'scheme.label': {
    'zh-Hant': '拼音方案',
    'zh-Hans': '拼音方案',
    en: 'Romanisation scheme',
  },

  'layout.label': { 'zh-Hant': '顯示方式', 'zh-Hans': '显示方式', en: 'Layout' },
  'layout.ruby': {
    'zh-Hant': '拼音標喺漢字上方',
    'zh-Hans': '拼音标在汉字上方',
    en: 'Reading above character',
  },
  'layout.inline': {
    'zh-Hant': '拼音跟喺漢字後面',
    'zh-Hans': '拼音跟在汉字后面',
    en: 'Reading beside character',
  },
  'layout.phonetic': {
    'zh-Hant': '只顯示拼音',
    'zh-Hans': '只显示拼音',
    en: 'Reading only',
  },

  'brackets.label': { 'zh-Hant': '括號', 'zh-Hans': '括号', en: 'Brackets' },
  'brackets.none': { 'zh-Hant': '不加', 'zh-Hans': '不加', en: 'None' },
  'brackets.square': { 'zh-Hant': '［］', 'zh-Hans': '［］', en: '[ ]' },
  'brackets.round': { 'zh-Hant': '( )', 'zh-Hans': '( )', en: '( )' },
  'brackets.fullwidth': { 'zh-Hant': '（）', 'zh-Hans': '（）', en: '（ ）' },
  'brackets.lenticular': { 'zh-Hant': '【】', 'zh-Hans': '【】', en: '【 】' },
  'brackets.custom': { 'zh-Hant': '自訂', 'zh-Hans': '自定义', en: 'Custom' },
  'brackets.open': { 'zh-Hant': '開括號', 'zh-Hans': '左括号', en: 'Open' },
  'brackets.close': { 'zh-Hant': '關括號', 'zh-Hans': '右括号', en: 'Close' },
  'brackets.hint': {
    'zh-Hant': '只影響「拼音跟喺漢字後面」同複製出嚟嘅文字。',
    'zh-Hans': '只影响「拼音跟在汉字后面」和复制出来的文字。',
    en: 'Applies to the inline layout and to copied text.',
  },

  'option.title': { 'zh-Hant': '轉換選項', 'zh-Hans': '转换选项', en: 'Options' },
  'option.wordDict': {
    'zh-Hant': '用詞語字典判斷多音字',
    'zh-Hans': '用词语词典判断多音字',
    en: 'Word-level disambiguation',
  },
  'option.wordDict.hint': {
    'zh-Hant': '推薦。開咗會按詞語揀讀音，例如「要求」讀 jiu1 kau4，唔會讀成 jiu3。',
    'zh-Hans': '推荐。开启后按词语选读音，例如「要求」读 jiu1 kau4，不会读成 jiu3。',
    en: 'Recommended. Picks readings by word, so 要求 reads jiu1 kau4 rather than jiu3.',
  },
  'option.spaceAfter': {
    'zh-Hant': '拼音後加半形空格',
    'zh-Hans': '拼音后加半角空格',
    en: 'Half-width space after reading',
  },
  'option.failedMarker': {
    'zh-Hant': '轉唔到嘅漢字顯示「?」',
    'zh-Hans': '转换失败的汉字显示「?」',
    en: 'Show “?” for characters with no reading',
  },
  'option.normalizeFullwidth': {
    'zh-Hant': '全形英數符號轉半形',
    'zh-Hans': '全角字母、数字、符号转半角',
    en: 'Convert full-width letters, digits and punctuation to half-width',
  },
  'option.keepNonHan': {
    'zh-Hant': '保留漢字以外嘅字元',
    'zh-Hans': '保留汉字以外的字符',
    en: 'Keep non-Chinese characters',
  },

  'dict.title': { 'zh-Hant': '自訂字典', 'zh-Hans': '自定义词典', en: 'Custom dictionary' },
  'dict.toggle': {
    'zh-Hant': '啟用自訂字典',
    'zh-Hans': '启用自定义词典',
    en: 'Enable custom dictionary',
  },
  'dict.hint': {
    'zh-Hant':
      '每行一條，格式「漢字,拼音」，拼音一律用粵拼、音節之間用空格分隔。上面嘅條目優先。',
    'zh-Hans':
      '每行一条，格式「汉字,拼音」，拼音一律用粤拼，音节之间用空格分隔。靠上的条目优先。',
    en: 'One entry per line as 漢字,reading. Always write the reading in Jyutping, one syllable per character, separated by spaces. Earlier lines win.',
  },
  'dict.placeholder': {
    'zh-Hant': '聽日,ting1 jat6\n餐廳,caan1 teng1\n嚟,lei4',
    'zh-Hans': '聽日,ting1 jat6\n餐廳,caan1 teng1\n嚟,lei4',
    en: '聽日,ting1 jat6\n餐廳,caan1 teng1\n嚟,lei4',
  },
  'dict.entries': { 'zh-Hant': '{n} 條生效', 'zh-Hans': '{n} 条生效', en: '{n} active' },
  'dict.issue.missing-comma': {
    'zh-Hant': '缺少逗號',
    'zh-Hans': '缺少逗号',
    en: 'missing comma',
  },
  'dict.issue.empty-word': {
    'zh-Hant': '冇漢字',
    'zh-Hans': '没有汉字',
    en: 'no characters',
  },
  'dict.issue.empty-reading': {
    'zh-Hant': '冇拼音',
    'zh-Hans': '没有拼音',
    en: 'no reading',
  },
  'dict.issue.length-mismatch': {
    'zh-Hant': '字數同音節數唔一致',
    'zh-Hans': '字数与音节数不一致',
    en: 'character count ≠ syllable count',
  },
  'dict.issueLine': {
    'zh-Hant': '第 {line} 行：{reason}',
    'zh-Hans': '第 {line} 行：{reason}',
    en: 'Line {line}: {reason}',
  },

  'picker.title': { 'zh-Hant': '揀讀音', 'zh-Hans': '选择读音', en: 'Choose a reading' },
  'picker.reset': {
    'zh-Hant': '還原自動判斷',
    'zh-Hans': '恢复自动判断',
    en: 'Reset to automatic',
  },
  'picker.none': {
    'zh-Hant': '呢個字冇讀音記錄。',
    'zh-Hans': '这个字没有读音记录。',
    en: 'No reading on record for this character.',
  },
  'picker.speak': { 'zh-Hant': '讀出嚟', 'zh-Hans': '读出来', en: 'Play' },
  'source.word': {
    'zh-Hant': '詞語字典',
    'zh-Hans': '词语词典',
    en: 'word dictionary',
  },
  'source.user': {
    'zh-Hant': '自訂字典',
    'zh-Hans': '自定义词典',
    en: 'custom dictionary',
  },
  'source.manual': {
    'zh-Hant': '手動選字',
    'zh-Hans': '手动选择',
    en: 'manually chosen',
  },
  'source.auto': {
    'zh-Hant': '最常見讀音',
    'zh-Hans': '最常见读音',
    en: 'most common reading',
  },

  'notice.unmapped': {
    'zh-Hant': '有 {n} 個字喺呢套方案冇對應寫法，維持粵拼顯示。',
    'zh-Hans': '有 {n} 个字在这套方案中没有对应写法，保持粤拼显示。',
    en: '{n} character(s) have no spelling in this scheme and are left in Jyutping.',
  },
  'notice.noVoice': {
    'zh-Hant': '你部機冇安裝粵語語音，朗讀可能唔準或者用咗其他口音。',
    'zh-Hans': '你的设备没有安装粤语语音，朗读可能不准或使用了其他口音。',
    en: 'No Cantonese voice is installed on this device, so playback may use another accent.',
  },
  'notice.ttsUnsupported': {
    'zh-Hant': '呢個瀏覽器唔支援語音朗讀。',
    'zh-Hans': '这个浏览器不支持语音朗读。',
    en: 'This browser does not support speech synthesis.',
  },
  'notice.overrides': {
    'zh-Hant': '你手動改咗 {n} 個字嘅讀音。',
    'zh-Hans': '你手动修改了 {n} 个字的读音。',
    en: 'You have manually set {n} reading(s).',
  },
  'notice.clearOverrides': {
    'zh-Hant': '全部還原',
    'zh-Hans': '全部恢复',
    en: 'Reset all',
  },

  'about.title': { 'zh-Hant': '關於', 'zh-Hans': '关于', en: 'About' },
  'about.body': {
    'zh-Hant':
      '讀音數據來自 CanCLID 嘅 to-jyutping（以粵典 words.hk 為基礎），拼音方案對照表來自開放詞典 kfcd/pingyam（CC BY 3.0）。',
    'zh-Hans':
      '读音数据来自 CanCLID 的 to-jyutping（以粤典 words.hk 为基础），拼音方案对照表来自开放词典 kfcd/pingyam（CC BY 3.0）。',
    en: 'Readings come from CanCLID’s to-jyutping (built on the words.hk Cantonese dictionary); the cross-scheme syllable table comes from kfcd/pingyam (CC BY 3.0).',
  },
  'about.privacy': {
    'zh-Hant': '粵拼注音喺瀏覽器入面完成；「譯做粵語」會將文字送去伺服器處理。',
    'zh-Hans': '粤拼注音在浏览器内完成；「译成粤语」会将文字发送到服务器处理。',
    en: 'Jyutping annotation runs in your browser; “To Cantonese” sends your text to the server.',
  },
  'about.words': {
    'zh-Hant': '粵典 words.hk',
    'zh-Hans': '粤典 words.hk',
    en: 'words.hk',
  },

  'ui.settings': { 'zh-Hant': '設定', 'zh-Hans': '设置', en: 'Settings' },
  'ui.theme': { 'zh-Hant': '深色/淺色', 'zh-Hans': '深色/浅色', en: 'Toggle theme' },
  'ui.lang': { 'zh-Hant': '語言', 'zh-Hans': '语言', en: 'Language' },
} as const

export type StringKey = keyof typeof STRINGS

type Translate = (key: StringKey, vars?: Record<string, string | number>) => string

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translate
}

const I18nContext = createContext<I18nValue | null>(null)

const STORAGE_KEY = 'jyut.lang'

/** Reads a stored preference, migrating the pre-Simplified `'zh'` value. */
function readStored(): Lang | null {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage disabled: fall through to detection.
  }
  if (stored === 'zh') return 'zh-Hant'
  return LANGS.some((l) => l.id === stored) ? (stored as Lang) : null
}

/** Picks a starting language from the visitor's browser preferences. */
function detect(): Lang {
  for (const tag of navigator.languages ?? []) {
    const lower = tag.toLowerCase()
    if (!lower.startsWith('zh')) continue
    // zh-CN / zh-SG / zh-Hans all read Simplified; everything else Traditional.
    return /hans|-cn|-sg|-my/.test(lower) ? 'zh-Hans' : 'zh-Hant'
  }
  return 'en'
}

/*
 * The active language lives outside React so `useSyncExternalStore` can hand
 * the server snapshot ('zh-Hant', what the static HTML is rendered in) to
 * hydration, then switch to the visitor's stored or detected language.
 */
let currentLang: Lang | null = null
const langListeners = new Set<() => void>()

const getLang = (): Lang => (currentLang ??= readStored() ?? detect())
const getServerLang = (): Lang => 'zh-Hant'
const subscribeLang = (listener: () => void) => {
  langListeners.add(listener)
  return () => {
    langListeners.delete(listener)
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribeLang, getLang, getServerLang)

  useEffect(() => {
    document.documentElement.lang =
      LANGS.find((l) => l.id === lang)?.htmlLang ?? 'zh-Hant-HK'
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    currentLang = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable: the choice holds for this visit only.
    }
    langListeners.forEach((listener) => listener())
  }, [])

  const t = useCallback<Translate>(
    (key, vars) => {
      let text: string = STRINGS[key][lang]
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value))
        }
      }
      return text
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>')
  return context
}
