// src/pages/partners/Dashboard.jsx
import { Link, useOutletContext } from 'react-router-dom'
import { restaurantPortalApi } from '@/api/restaurantPortal'
import PartnersSetupFlow from './SetupFlow'

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
  const { restaurant, lastUpload, refresh, handleLogout, isFirstPublication } = useOutletContext()

  if (!restaurant) return null
  if (isFirstPublication) {
    return <PartnersSetupFlow handleLogout={handleLogout} refresh={refresh} restaurant={restaurant} />
  }

  return (
    <div className="partners-dashboard">
      <div className="partners-dashboard__intro">
        <div>
          <span className="partners-eyebrow">Рабочий стол</span>
          <h1 className="partners-dashboard__welcome">Добрый день, {restaurant.name.split(' ')[0]}</h1>
          <p>Следите за актуальностью меню и карточки ресторана.</p>
        </div>
        <span className="partners-dashboard__date">{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date())}</span>
      </div>
      <section className="partners-card">
        <div className="partners-dashboard__status-row">
          <div>
            <span className="partners-eyebrow">Ваш ресторан</span>
            <h2 className="partners-dashboard__title">{restaurant.name}</h2>
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
        <div className="partners-dashboard__actions-heading">
          <h2>Быстрые действия</h2>
          <p>Обновите данные, чтобы гости видели всё самое актуальное.</p>
        </div>
        <Link className="partners__btn partners__btn--primary" to="/partners/upload">
          <span aria-hidden="true">↥</span> Обновить меню
        </Link>
        <a className="partners__btn" href={restaurantPortalApi.templateDownloadUrl()} download>
          <span aria-hidden="true">↓</span> Скачать шаблон Excel
        </a>
        <Link className="partners__btn" to="/partners/photos">
          <span aria-hidden="true">▧</span> Фото блюд
        </Link>
      </section>
    </div>
  )
}
