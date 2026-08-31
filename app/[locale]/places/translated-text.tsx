import { useTranslations } from 'next-intl'
import type { ResolvedText } from '../../../lib/places/text'

const HTML_LANG = { zh: 'zh-Hant', en: 'en' } as const

/**
 * Renders text that may have come from the other language. The `lang` attribute
 * is set from the language the text is actually in, not the one the reader asked
 * for — otherwise a screen reader announces Chinese prose as if it were English.
 */
export function TranslatedText({
  text,
  as: Tag = 'p',
  className,
  showMarker = true,
}: {
  text: ResolvedText
  as?: 'p' | 'span' | 'div'
  className?: string
  /** Off where a fuller explanation already sits next to the text. */
  showMarker?: boolean
}) {
  const t = useTranslations('places')

  return (
    <Tag lang={HTML_LANG[text.locale]} className={className}>
      {text.value}
      {!text.translated && showMarker && (
        <span className="ml-2 rounded border border-line px-1.5 py-0.5 align-middle text-xs text-dim">
          {t('notTranslated')}
        </span>
      )}
    </Tag>
  )
}
