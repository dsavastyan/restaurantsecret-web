// src/pages/partners/Dashboard.jsx
import { Link, useOutletContext } from 'react-router-dom'
import { restaurantPortalApi } from '@/api/restaurantPortal'

const UPLOAD_STATUS_LABELS = {
  processing: 'Обрабатывается',
  published: 'Опубликовано',
  error: 'Ошибка',
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return value
  }
}

export default function PartnersDashboard() {
  const { restaurant, lastUpload } = useOutletContext()

  if (!restaurant) return null

  return (
    <div className="partners-dashboard">
      <section className="partners-card">
        <div className="partners-dashboard__status-row">
          <div>
            <h1 className="partners-dashboard__title">{restaurant.name}</h1>
            {restaurant.is_partner && <span className="partners-badge">Партнёр</span>}
          </div>
        </div>

        {restaurant.menu_updated_at ? (
          <p className={`partners-dashboard__freshness${restaurant.menu_stale ? ' partners-dashboard__freshness--stale' : ''}`}>
            Меню обновлено: {formatDate(restaurant.menu_updated_at)}
            {restaurant.menu_stale_days != null && ` (${restaurant.menu_stale_days} дн. назад)`}
            {restaurant.menu_stale && ' — пора обновить'}
          </p>
        ) : (
          <p className="partners-dashboard__freshness partners-dashboard__freshness--stale">Меню ещё не загружено</p>
        )}

        {lastUpload && (
          <div className="partners-dashboard__last-upload">
            <span>Последняя загрузка: {formatDate(lastUpload.created_at)}</span>
            <span className={`partners-status partners-status--${lastUpload.status}`}>
              {UPLOAD_STATUS_LABELS[lastUpload.status] || lastUpload.status}
            </span>
            {lastUpload.status === 'published' && (
              <span className="partners-dashboard__counts">
                {lastUpload.dishes_count ?? 0} блюд, {lastUpload.items_count ?? 0} позиций
              </span>
            )}
            {lastUpload.status === 'error' && lastUpload.error_message && (
              <span className="partners-dashboard__error-text">{lastUpload.error_message}</span>
            )}
          </div>
        )}
      </section>

      <section className="partners-card partners-dashboard__actions">
        <Link className="partners__btn partners__btn--primary" to="/partners/upload">
          Обновить меню
        </Link>
        <a className="partners__btn" href={restaurantPortalApi.templateDownloadUrl()} download>
          Скачать шаблон Excel
        </a>
        <Link className="partners__btn" to="/partners/photos">
          Фото блюд
        </Link>
      </section>
    </div>
  )
}
