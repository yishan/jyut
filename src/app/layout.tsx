import type { Metadata, Viewport } from 'next'
import { Inter, Newsreader } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: '粵拼轉換器 Jyutping Converter — 漢字轉廣東話拼音',
  description:
    '將繁簡漢字即時轉換為粵拼、耶魯拼音、教院式、劉錫祥、廣州話拼音方案、國際音標等 11 種廣東話拼音方案。支援詞語分詞、多音字選字、粵語朗讀，全部喺瀏覽器運算。',
  keywords: [
    '粵拼',
    '粤拼',
    '廣東話拼音',
    '广东话拼音',
    '粵語拼音',
    '粤语拼音',
    '漢字轉粵拼',
    '汉字转粤拼',
    'Jyutping',
    'Cantonese romanisation',
    'Yale',
    '耶魯拼音',
    '教院式拼音',
    '劉錫祥',
    'IPA',
  ],
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1f24' },
  ],
}

/**
 * Applies the stored theme before first paint so a dark-mode visitor never sees
 * a white flash. Kept inline and dependency-free on purpose.
 */
const THEME_BOOTSTRAP = `(function(){try{
var stored=localStorage.getItem('jyut.theme');
var dark=stored?stored==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
if(dark)document.documentElement.classList.add('dark');
}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-HK" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className={`${inter.variable} ${newsreader.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
