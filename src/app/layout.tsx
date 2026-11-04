import type { Metadata, Viewport } from 'next'
import { Inter, Newsreader } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SITE_URL } from '@/lib/site'
import { THEME_COLOR } from '@/lib/theme'
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
  // Only the <h1> uses this face, at 400.
  weight: '400',
})

const TITLE = '粵拼轉換器 Jyutping Converter — 漢字轉廣東話拼音'
// The page's own intro copy (app.intro, 繁體), so search results match the page.
const DESCRIPTION =
  '輸入繁體或簡體漢字，即時標注粵語讀音。支援 11 種拼音方案、詞語分詞、多音字選字同語音朗讀，注音全部喺本機運算。亦可以將普通話或者其他語言改寫成地道粵文。'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // The site answers on several hostnames; this names the one to index.
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: '粵拼轉換器 Jyutping Converter',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'zh_HK',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: '粵' }],
  },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
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
    { media: '(prefers-color-scheme: light)', color: THEME_COLOR.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLOR.dark },
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
