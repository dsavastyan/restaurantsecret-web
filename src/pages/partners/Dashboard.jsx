// src/pages/partners/Dashboard.jsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
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

function versionActionLabel(action) {
  if (action === 'restored') return 'Восстановлена'
  if (action === 'uploaded') return 'Загружена рестораном'
  return 'Импортирована'
}

function nutritionBasisLabel(per) {
  return per === '100g' ? 'на 100 г' : 'на порцию'
}

function MenuVersionModal({ data, loading, onClose, onRestore }) {
  const version = data?.version

  return (
    <div className="partners-history-modal" role="dialog" aria-modal="true" aria-labelledby="menu-version-title">
      <button className="partners-history-modal__backdrop" type="button" aria-label="Закрыть просмотр версии" onClick={onClose} />
      <section className="partners-history-modal__panel">
        <header className="partners-history-modal__header">
          <div>
            <span className="partners-eyebrow">Сохранённая версия</span>
            <h2 id="menu-version-title">
              {version ? `Версия ${version.version_number} · ${formatDate(version.captured_at)}` : 'Загрузка версии…'}
            </h2>
          </div>
          <button className="partners-history-modal__close" type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        </header>

        {loading && <p className="partners-history__state">Загружаем состав меню…</p>}

        {!loading && version && (
          <>
            <div className="partners-history-modal__summary">
              <span>{version.dishes_count} блюд</span>
              <span>{version.items_count} позиций</span>
              <span>{versionActionLabel(version.action)}</span>
              {version.is_current && <span className="partners-history__current">Текущая версия</span>}
            </div>
            <div className="partners-history-modal__items">
              {(data.items || []).map((item) => (
                <article className="partners-history-modal__item" key={item.id}>
                  <div>
                    <strong>{item.dish_name}</strong>
                    <span>{item.category || 'Без категории'} · {nutritionBasisLabel(item.per)}</span>
                  </div>
                  <div className="partners-history-modal__nutrition">
                    <strong>{item.kcal ?? '—'} ккал</strong>
                    <span>Б {item.proteins_g ?? '—'} · Ж {item.fats_g ?? '—'} · У {item.carbs_g ?? '—'}</span>
                    {item.portion_g != null && <span>{item.portion_g} г</span>}
                    {item.price_rub != null && <span>{item.price_rub} ₽</span>}
                  </div>
                </article>
              ))}
            </div>
            <footer className="partners-history-modal__footer">
              <button className="partners__btn" type="button" onClick={onClose}>Закрыть</button>
              {!version.is_current && (
                <button className="partners__btn partners__btn--primary" type="button" onClick={() => onRestore(version)}>
                  Вернуться к этой версии
                </button>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  )
}

function RestoreVersionModal({ version, busy, error, onCancel, onConfirm }) {
  return (
    <div className="partners-history-modal" role="dialog" aria-modal="true" aria-labelledby="restore-version-title">
      <button className="partners-history-modal__backdrop" type="button" aria-label="Закрыть подтверждение" onClick={busy ? undefined : onCancel} />
      <section className="partners-history-modal__panel partners-history-modal__panel--confirm">
        <span className="partners-eyebrow">Возврат к версии</span>
        <h2 id="restore-version-title">Опубликовать версию {version.version_number}?</h2>
        <p>
          Меню от {formatDate(version.captured_at)} станет текущим. Нынешняя версия сохранится в истории,
          и к ней можно будет вернуться позднее.
        </p>
        {error && <div className="partners__notice partners__notice--error">{error}</div>}
        <div className="partners-history-modal__footer">
          <button className="partners__btn" type="button" disabled={busy} onClick={onCancel}>Отмена</button>
          <button className="partners__btn partners__btn--primary" type="button" disabled={busy} onClick={onConfirm}>
            {busy ? 'Публикуем…' : 'Да, опубликовать'}
          </button>
        </div>
      </section>
    </div>
  )
}

function MenuHistory({ restaurantId, refresh }) {
  const [versions, setVersions] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [restoreError, setRestoreError] = useState(null)

  const loadHistory = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const data = await restaurantPortalApi.menuHistory()
      setVersions(data.versions || [])
      setStatus('ready')
    } catch (err) {
      setError(err.message || 'Не получилось загрузить историю меню.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory, restaurantId])

  useEffect(() => {
    if (!preview && !restoreTarget) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !restoreBusy) {
        setPreview(null)
        setRestoreTarget(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [preview, restoreBusy, restoreTarget])

  const openPreview = async (version) => {
    setPreview({ version, items: [] })
    setPreviewLoading(true)
    setError(null)
    try {
      const data = await restaurantPortalApi.menuVersion(version.id)
      setPreview(data)
    } catch (err) {
      setPreview(null)
      setError(err.message || 'Не получилось открыть эту версию.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const askToRestore = (version) => {
    setPreview(null)
    setRestoreError(null)
    setRestoreTarget(version)
  }

  const restoreVersion = async () => {
    if (!restoreTarget) return
    setRestoreBusy(true)
    setRestoreError(null)
    try {
      await restaurantPortalApi.restoreMenuVersion(restoreTarget.id)
      setRestoreTarget(null)
      await refresh()
    } catch (err) {
      setRestoreError(err.message || 'Не получилось вернуться к этой версии.')
    } finally {
      setRestoreBusy(false)
    }
  }

  return (
    <>
      <section className="partners-card partners-history">
        <div className="partners-history__heading">
          <div>
            <span className="partners-eyebrow">Архив изменений</span>
            <h2>История меню</h2>
            <p>Просматривайте опубликованные версии и при необходимости возвращайте предыдущую.</p>
          </div>
          {status === 'error' && (
            <button className="partners__btn" type="button" onClick={loadHistory}>Повторить</button>
          )}
        </div>

        {status === 'loading' && <p className="partners-history__state">Загружаем версии…</p>}
        {status === 'error' && <div className="partners__notice partners__notice--error">{error}</div>}
        {status === 'ready' && error && <div className="partners__notice partners__notice--error">{error}</div>}
        {status === 'ready' && versions.length === 0 && (
          <p className="partners-history__state">Опубликованные версии появятся здесь после первой загрузки.</p>
        )}
        {status === 'ready' && versions.length > 0 && (
          <div className="partners-history__list">
            {versions.map((version) => (
              <article className={`partners-history__row${version.is_current ? ' partners-history__row--current' : ''}`} key={version.id}>
                <div className="partners-history__version">
                  <span className="partners-history__marker" aria-hidden="true" />
                  <div>
                    <div className="partners-history__version-title">
                      <strong>Версия {version.version_number}</strong>
                      {version.is_current && <span className="partners-history__current">Текущая</span>}
                      {version.action === 'restored' && <span className="partners-history__restored">Восстановлена</span>}
                    </div>
                    <span>{formatDate(version.captured_at)} · {versionActionLabel(version.action)}</span>
                  </div>
                </div>
                <div className="partners-history__counts">
                  <strong>{version.dishes_count} блюд</strong>
                  <span>{version.items_count} позиций</span>
                </div>
                <div className="partners-history__actions">
                  <button className="partners__btn" type="button" onClick={() => openPreview(version)}>Просмотреть</button>
                  {!version.is_current && (
                    <button className="partners-history__restore" type="button" onClick={() => askToRestore(version)}>
                      Вернуться к версии
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {preview && (
        <MenuVersionModal
          data={preview}
          loading={previewLoading}
          onClose={() => setPreview(null)}
          onRestore={askToRestore}
        />
      )}
      {restoreTarget && (
        <RestoreVersionModal
          version={restoreTarget}
          busy={restoreBusy}
          error={restoreError}
          onCancel={() => setRestoreTarget(null)}
          onConfirm={restoreVersion}
        />
      )}
    </>
  )
}

export default function PartnersDashboard() {
  const {
    restaurant,
    restaurants,
    lastUpload,
    refresh,
    handleLogout,
    handleRestaurantChange,
    isFirstPublication,
  } = useOutletContext()
  const navigate = useNavigate()
  const [activeDraft, setActiveDraft] = useState(null)
  const [draftLoading, setDraftLoading] = useState(false)

  useEffect(() => {
    if (!restaurant?.id || isFirstPublication) return undefined
    let cancelled = false
    setDraftLoading(true)
    restaurantPortalApi.activeDraft()
      .then((data) => {
        if (!cancelled) setActiveDraft(data.active_draft || null)
      })
      .catch(() => {
        if (!cancelled) setActiveDraft(null)
      })
      .finally(() => {
        if (!cancelled) setDraftLoading(false)
      })
    return () => { cancelled = true }
  }, [isFirstPublication, restaurant?.id])

  if (!restaurant) return null
  if (isFirstPublication) {
    return (
      <PartnersSetupFlow
        handleLogout={handleLogout}
        onRestaurantChange={handleRestaurantChange}
        refresh={refresh}
        restaurant={restaurant}
        restaurants={restaurants}
      />
    )
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
        {activeDraft ? (
          <>
            <Link className="partners__btn partners__btn--primary" to={`/partners/upload?draft=${activeDraft.id}`}>
              <span aria-hidden="true">↥</span>
              {activeDraft.status === 'submitted' ? 'Посмотреть обновление' : 'Продолжить обновление'}
            </Link>
            {activeDraft.status !== 'submitted' && (
              <button
                className="partners__btn"
                type="button"
                onClick={() => {
                  if (window.confirm('Начать обновление заново? Текущий черновик будет удалён.')) {
                    navigate('/partners/upload?new=1')
                  }
                }}
              >
                Начать заново
              </button>
            )}
          </>
        ) : (
          <Link className="partners__btn partners__btn--primary" to="/partners/upload?new=1">
            <span aria-hidden="true">↥</span> Обновить меню
          </Link>
        )}
        {draftLoading && <span className="partners-dashboard__draft-loading">Проверяем черновики…</span>}
        <a className="partners__btn" href={restaurantPortalApi.templateDownloadUrl()} download>
          <span aria-hidden="true">↓</span> Скачать шаблон Excel
        </a>
        <Link className="partners__btn" to="/partners/photos">
          <span aria-hidden="true">▧</span> Фото блюд
        </Link>
      </section>

      <MenuHistory restaurantId={restaurant.id} refresh={refresh} />
    </div>
  )
}
