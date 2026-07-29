// src/pages/partners/Dashboard.jsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import {
  BookOpenText,
  Check,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react'
import { restaurantPortalApi } from '@/api/restaurantPortal'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value)
      .toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
      .replace(/\s*г\.$/, '')
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

function dishCountLabel(value) {
  const count = Number(value) || 0
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'блюдо'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'блюда'
  return 'блюд'
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
  const [expanded, setExpanded] = useState(false)
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
      <section className="partners-card partners-history partners-dashboard__recent">
        <h2>Последние изменения</h2>

        {status === 'loading' && <p className="partners-history__state">Загружаем изменения…</p>}
        {status === 'error' && (
          <div className="partners-history__error">
            <div className="partners__notice partners__notice--error">{error}</div>
            <button className="partners__btn" type="button" onClick={loadHistory}>Повторить</button>
          </div>
        )}
        {status === 'ready' && error && <div className="partners__notice partners__notice--error">{error}</div>}
        {status === 'ready' && versions.length === 0 && (
          <p className="partners-history__state">Изменения появятся здесь после первой публикации меню.</p>
        )}
        {status === 'ready' && versions.length > 0 && (
          <>
            <div className="partners-history__latest">
              <span className="partners-history__latest-check" aria-hidden="true"><Check size={18} strokeWidth={2.2} /></span>
              <strong>{versions[0].action === 'restored' ? 'Версия меню восстановлена' : 'Меню опубликовано'}</strong>
              <span>{formatDate(versions[0].captured_at)}</span>
              <button
                className="partners-history__toggle"
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? 'Скрыть историю' : 'История изменений'}
                <ChevronRight className={expanded ? 'partners-history__toggle-icon partners-history__toggle-icon--open' : 'partners-history__toggle-icon'} size={19} />
              </button>
            </div>

            {expanded && (
              <div className="partners-history__archive">
                <p>Просматривайте опубликованные версии и при необходимости возвращайте предыдущую.</p>
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
                        <strong>{version.dishes_count} {dishCountLabel(version.dishes_count)}</strong>
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
              </div>
            )}
          </>
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
    lastUpload,
    refresh,
    isFirstPublication,
  } = useOutletContext()
  const navigate = useNavigate()
  const [activeDraft, setActiveDraft] = useState(null)
  const [draftLoading, setDraftLoading] = useState(false)

  useEffect(() => {
    if (!restaurant?.id) return undefined
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
  }, [restaurant?.id])

  if (!restaurant) return null
  if (isFirstPublication) {
    return (
      <section className="partners-setup__section partners-setup__section--standalone">
        <span className="partners-eyebrow">Первичная публикация</span>
        <h1>Добавьте меню ресторана</h1>
        <p>Загрузка, фотографии, превью и подтверждение собраны в одном четырёхшаговом процессе.</p>
        <Link
          className="partners__btn partners__btn--primary"
          to={activeDraft ? `/partners/upload?draft=${activeDraft.id}` : '/partners/upload?new=1'}
        >
          {activeDraft ? 'Продолжить загрузку' : 'Начать загрузку меню'}
        </Link>
      </section>
    )
  }

  const publishedDishes = lastUpload?.status === 'published' ? (lastUpload.dishes_count ?? 0) : 0
  const menuUpdatedAt = restaurant.menu_updated_at || lastUpload?.created_at
  const menuIsCurrent = Boolean(menuUpdatedAt) && !restaurant.menu_stale
  const menuUrl = restaurant.slug
    ? `/restaurants/${encodeURIComponent(restaurant.slug)}/menu/`
    : null

  return (
    <div className="partners-dashboard">
      <div className="partners-dashboard__intro">
        <span className="partners-eyebrow">Панель ресторана</span>
        <h1 className="partners-dashboard__welcome">{restaurant.name}</h1>
      </div>

      <div className="partners-dashboard__grid">
        <section className="partners-card partners-dashboard__menu-card">
          <div className="partners-dashboard__menu-summary">
            <span className="partners-dashboard__feature-icon" aria-hidden="true">
              <BookOpenText size={42} strokeWidth={1.65} />
            </span>
            <div className="partners-dashboard__dish-count">
              <strong>{publishedDishes}</strong>
              <span>{dishCountLabel(publishedDishes)}</span>
            </div>
            <p className="partners-dashboard__updated">
              {menuUpdatedAt ? `Обновлено ${formatDate(menuUpdatedAt)}` : 'Меню ещё не опубликовано'}
            </p>
          </div>

          <div className={`partners-dashboard__freshness${menuIsCurrent ? '' : ' partners-dashboard__freshness--stale'}`}>
            <strong>Меню актуально?</strong>
            <span className="partners-dashboard__freshness-status">
              <span className="partners-dashboard__freshness-check" aria-hidden="true">
                {menuIsCurrent ? <Check size={20} strokeWidth={2.2} /> : '!'}
              </span>
              {menuIsCurrent ? 'Актуально' : 'Требует обновления'}
            </span>
          </div>

          {lastUpload?.status === 'error' && lastUpload.error_message && (
            <div className="partners__notice partners__notice--error">{lastUpload.error_message}</div>
          )}

          <div className="partners-dashboard__menu-actions">
            <Link
              className="partners__btn partners__btn--primary"
              to={activeDraft ? `/partners/upload?draft=${activeDraft.id}` : '/partners/upload?new=1'}
            >
              {activeDraft
                ? (activeDraft.status === 'submitted' ? 'Посмотреть обновление' : 'Продолжить обновление')
                : 'Обновить меню'}
            </Link>
            {menuUrl && (
              <a className="partners__btn" href={menuUrl} target="_blank" rel="noreferrer">
                Посмотреть меню
              </a>
            )}
            {activeDraft?.status !== 'submitted' && activeDraft && (
              <button
                className="partners-dashboard__restart"
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
            {draftLoading && <span className="partners-dashboard__draft-loading">Проверяем черновики…</span>}
          </div>
        </section>

        <section className="partners-card partners-dashboard__photos-card">
          <div className="partners-dashboard__photos-summary">
            <span className="partners-dashboard__feature-icon" aria-hidden="true">
              <ImageIcon size={42} strokeWidth={1.65} />
            </span>
            <div>
              <h2>Фото блюд</h2>
              <p>Добавляйте и заменяйте фотографии позиций</p>
            </div>
          </div>
          <Link className="partners__btn" to="/partners/photos">Управлять фото</Link>
        </section>
      </div>

      <MenuHistory restaurantId={restaurant.id} refresh={refresh} />
    </div>
  )
}
