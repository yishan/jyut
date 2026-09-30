import { Converter } from '@/components/Converter'
import { I18nProvider } from '@/lib/i18n'

export default function Page() {
  return (
    <I18nProvider>
      <main>
        <Converter />
      </main>
    </I18nProvider>
  )
}
