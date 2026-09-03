import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '../../../../../auth'
import { Link } from '../../../../../i18n/navigation'
import { getPlaceBySlug } from '../../../../../lib/places/repository'
import { canEdit } from '../../../../../lib/places/editing'
import { resolveText } from '../../../../../lib/places/text'
import type { Locale } from '../../../../../i18n/routing'
import { EditForm } from './edit-form'

export const dynamic = 'force-dynamic'

const SHELL = 'mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14'
const HEADING = 'text-[26px] font-semibold tracking-tight sm:text-[32px]'

export default async function EditPlacePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const t = await getTranslations('edit')
  const session = await auth()
  const place = await getPlaceBySlug(slug)

  if (!place) {
    return (
      <main className={SHELL}>
        <h1 className={HEADING}>{t('editTitle')}</h1>
        <p className="mt-3 text-dim">{t('notFound')}</p>
      </main>
    )
  }

  // Checked again in the action, which reads the stored document rather than
  // trusting this page ran at all.
  const editor = session?.user ? { id: session.user.id, role: session.user.role } : null
  if (!canEdit(place, editor)) {
    return (
      <main className={SHELL}>
        <h1 className={HEADING}>{t('editTitle')}</h1>
        <p className="mt-3 text-dim">{t('cannotEdit')}</p>
      </main>
    )
  }

  const name = resolveText(place.name, locale as Locale)

  return (
    <main className={SHELL}>
      <Link
        href={`/places/${place.slug}`}
        className="text-[13px] text-dim no-underline hover:text-ink"
      >
        ← {t('backToPlace')}
      </Link>
      <h1 className={`${HEADING} mt-2`}>{name?.value ?? place.slug}</h1>

      <div className="mt-7 sm:mt-9">
        <EditForm
          place={{
            id: place.id,
            city: place.city,
            activities: place.activities,
            nameZh: place.name.zh ?? '',
            nameEn: place.name.en ?? '',
            summaryZh: place.summary.zh ?? '',
            summaryEn: place.summary.en ?? '',
            descriptionZh: place.description.zh ?? '',
            descriptionEn: place.description.en ?? '',
          }}
        />
      </div>
    </main>
  )
}
