import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Eye } from 'lucide-react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import Menu from '@/pages/Menu.jsx'
import { restaurantPortalApi } from '@/api/restaurantPortal'
import './menu-preview.css'

export function buildDraftMenuPreview(payload, restaurant) {
  const categories = new Map()

  for (const item of payload?.items || []) {
    if (item.change_type === 'deleted') continue

    const categoryName = String(item.category || '').trim() || 'Меню'
    if (!categories.has(categoryName)) categories.set(categoryName, [])

    const hasPhoto = Boolean(item.photo_url) && !item.photo_removed
    categories.get(categoryName).push({
      id: `draft-${item.id}`,
      name: item.dish_name,
      description: item.composition_text || '',
      ingredients: item.composition_text || '',
      price_rub: item.price_rub,
      per: item.per,
      portion_g: item.portion_g,
      kcal: item.kcal,
      proteins_g: item.proteins_g,
      fats_g: item.fats_g,
      carbs_g: item.carbs_g,
      photoUrl: hasPhoto
        ? restaurantPortalApi.draftItemPhotoUrl(payload.draft.id, item.id)
        : null,
    })
  }

  return {
    name: restaurant?.name || 'Меню ресторана',
    menuCapturedAt: payload?.draft?.updated_at || null,
    instagramUrl: restaurant?.instagram_url || restaurant?.website_url || null,
    categories: Array.from(categories, ([name, dishes]) => ({ name, dishes })),
  }
}

export default function PartnersMenuPreview() {
  const { draftId } = useParams()
  const { restaurant } = useOutletContext()
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setError('')
    restaurantPortalApi.draft(draftId)
      .then((data) => {
        if (!cancelled) setPayload(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Не получилось загрузить превью меню.')
      })
    return () => {
      cancelled = true
    }
  }, [draftId])

  const menu = useMemo(
    () => payload ? buildDraftMenuPreview(payload, restaurant) : null,
    [payload, restaurant],
  )
  const restaurantSlug = restaurant?.slug || `draft-${draftId}`

  return (
    <div className="partner-menu-page-preview">
      <header className="partner-menu-page-preview__bar">
        <div className="partner-menu-page-preview__status">
          <span><Eye size={18} aria-hidden="true" /></span>
          <div>
            <strong>Безопасное превью</strong>
            <small>Эта версия меню ещё не опубликована и не видна гостям</small>
          </div>
        </div>
        <Link to={`/partners/upload?draft=${encodeURIComponent(draftId)}`}>
          <ArrowLeft size={17} aria-hidden="true" />
          Вернуться к редактированию
        </Link>
      </header>

      {error ? (
        <main className="partner-menu-page-preview__state" role="alert">
          <h1>Превью недоступно</h1>
          <p>{error}</p>
          <Link to={`/partners/upload?draft=${encodeURIComponent(draftId)}`}>Вернуться к редактированию</Link>
        </main>
      ) : menu ? (
        <main className="container container--menu partner-menu-page-preview__content">
          <Menu
            previewMenu={menu}
            previewRestaurantSlug={restaurantSlug}
            previewMode
          />
        </main>
      ) : (
        <main className="partner-menu-page-preview__state" aria-busy="true">
          <p>Загружаем новое меню…</p>
        </main>
      )}
    </div>
  )
}
