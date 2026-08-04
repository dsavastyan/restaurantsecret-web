// src/pages/partners/Dashboard.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardCopy,
  Download,
  Ellipsis,
  Image as ImageIcon,
  LoaderCircle,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  Sprout,
  Store,
  Trash2,
  Upload,
} from 'lucide-react'
import { restaurantPortalApi } from '@/api/restaurantPortal'
import FirstPublicationArt from './FirstPublicationArt'

const MAX_LOGO_SIZE = 2 * 1024 * 1024
const ACCEPTED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

function logoError(file) {
  if (!ACCEPTED_LOGO_TYPES.has(file.type)) return 'Поддерживаются JPG, PNG, WEBP и AVIF.'
  if (file.size > MAX_LOGO_SIZE) return 'Размер логотипа не должен превышать 2 МБ.'
  return null
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value)
      .toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
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

// Если на аккаунте несколько ресторанов — заголовок становится переключателем:
// поверх названия лежит прозрачный нативный select (работает и на мобильных).
function RestaurantPicker({ restaurant, restaurants, onRestaurantChange, className, children }) {
  if (!restaurants || restaurants.length <= 1) return children

  return (
    <label className={`partners-dash__picker${className ? ` ${className}` : ''}`}>
      {children}
      <ChevronDown className="partners-dash__picker-caret" size={22} strokeWidth={2} aria-hidden="true" />
      <select
        aria-label="Выберите ресторан"
        value={restaurant.id}
        onChange={(event) => onRestaurantChange?.(event.target.value)}
      >
        {restaurants.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
    </label>
  )
}

function pluralize(value, one, few, many) {
  const count = Number(value) || 0
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const SEASONAL_STATUS_LABELS = {
  draft: 'Черновик',
  scheduled: 'Запланировано',
  active: 'Активно',
  completed: 'Завершено',
  moderation: 'На модерации',
}

function formatSeasonalPeriod(menu) {
  if (!menu.end_date) return `с ${formatDate(menu.start_date)}`
  return `до ${formatDate(menu.end_date)}`
}

function SeasonalMenuCard({ menu, onDelete }) {
  return (
    <article className="partners-seasonal__card">
      <div className="partners-seasonal__card-heading">
        <div>
          <h3>{menu.name}</h3>
          <span>{menu.dishes_count || 0} {dishCountLabel(menu.dishes_count)}</span>
        </div>
        <span className={`partners-seasonal__status partners-seasonal__status--${menu.status}`}>
          {SEASONAL_STATUS_LABELS[menu.status] || menu.status}
        </span>
      </div>
      <div className="partners-seasonal__period"><CalendarDays size={16} /> {formatSeasonalPeriod(menu)}</div>
      <div className="partners-seasonal__actions">
        <Link className="partners__btn" to={`/partners/seasonal/${menu.id}?view=1`}>Посмотреть</Link>
        <Link className="partners__btn" to={`/partners/seasonal/${menu.id}`}>Редактировать</Link>
        <details className="partners-seasonal__more">
          <summary aria-label={`Другие действия для ${menu.name}`}><Ellipsis size={19} /></summary>
          <div>
            {menu.status === 'draft'
              ? <button type="button" onClick={() => onDelete(menu)}>Удалить черновик</button>
              : <span>После завершения меню сохранится в архиве</span>}
          </div>
        </details>
      </div>
    </article>
  )
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
          Меню от {formatDate(version.captured_at)} станет актуальным. Текущая версия сохранится в истории,
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

function ConfirmFreshnessModal({ busy, error, onCancel, onConfirm }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel])

  return (
    <div className="partners-history-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-freshness-title">
      <button
        className="partners-history-modal__backdrop"
        type="button"
        aria-label="Закрыть подтверждение"
        onClick={busy ? undefined : onCancel}
      />
      <section className="partners-history-modal__panel partners-history-modal__panel--confirm partners-freshness-modal">
        <span className="partners-eyebrow">Актуальность меню</span>
        <h2 id="confirm-freshness-title">Подтверждаете актуальность меню?</h2>
        <p>Дата обновления будет установлена на сегодня. Состав меню и фотографии не изменятся.</p>
        {error && <div className="partners__notice partners__notice--error">{error}</div>}
        <div className="partners-history-modal__footer">
          <button className="partners__btn" type="button" disabled={busy} onClick={onCancel}>Отмена</button>
          <button
            className="partners__btn partners__btn--primary"
            type="button"
            disabled={busy}
            autoFocus
            onClick={onConfirm}
          >
            {busy ? 'Подтверждаем…' : 'Да, подтвердить'}
          </button>
        </div>
      </section>
    </div>
  )
}

function RestaurantLogoCard({ restaurant, onRefresh }) {
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const logoUrl = previewUrl || restaurant.logo_url || null

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const replacePreview = (file) => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  const uploadLogo = async (file) => {
    const validationError = logoError(file)
    if (validationError) {
      setError(validationError)
      return
    }
    replacePreview(file)
    setBusy('upload')
    setError(null)
    setSuccess(null)
    try {
      await restaurantPortalApi.uploadRestaurantLogo(file)
      setSuccess('Логотип обновлён.')
      await onRefresh()
    } catch (err) {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return null
      })
      setError(err.message || 'Не получилось загрузить логотип. Попробуйте ещё раз.')
    } finally {
      setBusy(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const deleteLogo = async () => {
    if (!logoUrl || busy) return
    if (!window.confirm('Удалить логотип ресторана?')) return
    setBusy('delete')
    setError(null)
    setSuccess(null)
    try {
      await restaurantPortalApi.deleteRestaurantLogo()
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return null
      })
      setSuccess('Логотип удалён.')
      await onRefresh()
    } catch (err) {
      setError(err.message || 'Не получилось удалить логотип. Попробуйте ещё раз.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="partners-dash__card partners-dash__mini partners-dash__mini--logo">
      <div className="partners-dash__mini-head">
        <span className="partners-dash__icon" aria-hidden="true">
          {logoUrl ? <img src={logoUrl} alt="" /> : <Store size={26} strokeWidth={1.6} />}
        </span>
        <div>
          <h2>Логотип ресторана</h2>
          <p className="partners-dash__mini-status">{logoUrl ? 'Загружен' : 'Не загружен'}</p>
          <p className="partners-dash__mini-hint">Нужен для страницы меню</p>
        </div>
      </div>

      {error && <div className="partners__notice partners__notice--error" role="alert">{error}</div>}
      {success && <div className="partners__notice partners__notice--success" role="status">{success}</div>}

      <label className={`partners-dash__btn partners-dash__btn--block${busy === 'upload' ? ' is-loading' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
          disabled={Boolean(busy)}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) uploadLogo(file)
          }}
        />
        {busy === 'upload' ? <LoaderCircle className="partners-dash__spinner" size={19} /> : <Upload size={19} strokeWidth={1.7} />}
        {logoUrl ? 'Заменить логотип' : 'Загрузить логотип'}
      </label>
      {logoUrl && (
        <button className="partners-dash__text-action" type="button" disabled={Boolean(busy)} onClick={deleteLogo}>
          {busy === 'delete' ? <LoaderCircle className="partners-dash__spinner" size={16} /> : <Trash2 size={16} />}
          Удалить
        </button>
      )}
    </section>
  )
}

function MenuQrCard({ restaurant }) {
  const [url, setUrl] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!restaurant.has_published_menu) return undefined
    let cancelled = false
    setError(null)
    restaurantPortalApi.menuPublicLink()
      .then(async (data) => {
        if (cancelled || !data?.url) return
        setUrl(data.url)
        const dataUrl = await QRCode.toDataURL(data.url, { width: 320, margin: 1 })
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Не получилось получить ссылку.')
      })
    return () => { cancelled = true }
  }, [restaurant.has_published_menu, restaurant.id])

  if (!restaurant.has_published_menu) return null

  const copyLink = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Не получилось скопировать ссылку.')
    }
  }

  return (
    <section className="partners-dash__card partners-dash__mini partners-dash__mini--qr">
      <div className="partners-dash__mini-head">
        <span className="partners-dash__icon" aria-hidden="true"><QrCode size={26} strokeWidth={1.6} /></span>
        <div>
          <h2>QR и ссылка на меню</h2>
          <p className="partners-dash__mini-status">{url ? 'Готово' : 'Загружаем…'}</p>
          <p className="partners-dash__mini-hint">Постоянная ссылка на ваше меню для гостей</p>
        </div>
      </div>

      {error && <div className="partners__notice partners__notice--error">{error}</div>}

      {qrDataUrl && (
        <div className="partners-dash__qr-preview">
          <img src={qrDataUrl} alt="QR-код на меню ресторана" width={140} height={140} />
        </div>
      )}

      <button
        className="partners-dash__btn partners-dash__btn--block"
        type="button"
        disabled={!url}
        onClick={copyLink}
      >
        <ClipboardCopy size={19} strokeWidth={1.7} />
        {copied ? 'Скопировано' : 'Скопировать ссылку'}
      </button>
      <a
        className={`partners-dash__btn partners-dash__btn--block${qrDataUrl ? '' : ' is-disabled'}`}
        href={qrDataUrl || undefined}
        download={qrDataUrl ? `${restaurant.slug || 'menu'}-qr.png` : undefined}
        onClick={(event) => { if (!qrDataUrl) event.preventDefault() }}
      >
        <Download size={19} strokeWidth={1.7} />
        Скачать QR
      </a>
    </section>
  )
}

function MenuHistory({ restaurantId, refresh, onVersionsLoaded }) {
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
      const nextVersions = data.versions || []
      setVersions(nextVersions)
      onVersionsLoaded(nextVersions)
      setStatus('ready')
    } catch (err) {
      setError(err.message || 'Не получилось загрузить историю меню.')
      setStatus('error')
    }
  }, [onVersionsLoaded])

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
      await loadHistory()
      await refresh()
    } catch (err) {
      setRestoreError(err.message || 'Не получилось вернуться к этой версии.')
    } finally {
      setRestoreBusy(false)
    }
  }

  return (
    <>
      <section className="partners-dash__card partners-history partners-dash__history">
        <h2>История версий</h2>

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
    restaurants = [],
    lastUpload,
    refresh,
    handleLogout,
    handleRestaurantChange,
    isFirstPublication,
  } = useOutletContext()
  const navigate = useNavigate()
  const [activeDraft, setActiveDraft] = useState(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [publishedMenuItems, setPublishedMenuItems] = useState(null)
  const [seasonalMenus, setSeasonalMenus] = useState([])
  const [seasonalLoading, setSeasonalLoading] = useState(true)
  const [seasonalError, setSeasonalError] = useState(null)
  const [confirmFreshnessOpen, setConfirmFreshnessOpen] = useState(false)
  const [confirmFreshnessBusy, setConfirmFreshnessBusy] = useState(false)
  const [confirmFreshnessError, setConfirmFreshnessError] = useState(null)
  const [photoStats, setPhotoStats] = useState(null)

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

  const loadSeasonalMenus = useCallback(async () => {
    setSeasonalLoading(true)
    setSeasonalError(null)
    try {
      const data = await restaurantPortalApi.seasonalMenus()
      setSeasonalMenus(data.menus || [])
    } catch (err) {
      setSeasonalError(err.message || 'Не получилось загрузить сезонные меню.')
    } finally {
      setSeasonalLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!restaurant?.id) return
    loadSeasonalMenus()
  }, [loadSeasonalMenus, restaurant?.id])

  useEffect(() => {
    setPublishedMenuItems(null)
  }, [restaurant?.id])

  // Покрытие меню фотографиями — для карточки «Фото блюд».
  useEffect(() => {
    if (!restaurant?.id || isFirstPublication) return undefined
    let cancelled = false
    setPhotoStats(null)
    restaurantPortalApi.menuPhotos()
      .then((data) => {
        if (cancelled) return
        const dishes = data.dishes || []
        setPhotoStats({
          total: dishes.length,
          withPhotos: dishes.filter((dish) => dish.photo_url).length,
        })
      })
      .catch(() => {
        if (!cancelled) setPhotoStats(null)
      })
    return () => { cancelled = true }
  }, [isFirstPublication, restaurant?.id])

  const handleVersionsLoaded = useCallback((versions) => {
    const currentVersion = versions.find((version) => version.is_current) || versions[0]
    setPublishedMenuItems(currentVersion ? (Number(currentVersion.items_count) || 0) : 0)
  }, [])

  if (!restaurant) return null
  if (isFirstPublication) {
    return (
      <div className="partners-onboard">
        <header className="partners-onboard__bar">
          <span className="partners-onboard__brand">
            <img src="/assets/logo-64.png" width="40" height="40" alt="" aria-hidden="true" />
            RestaurantSecret
          </span>
          <div className="partners-onboard__bar-right">
            <RestaurantPicker
              className="partners-dash__picker--compact"
              restaurant={restaurant}
              restaurants={restaurants}
              onRestaurantChange={handleRestaurantChange}
            >
              <span className="partners-onboard__restaurant">{restaurant.name}</span>
            </RestaurantPicker>
            <span aria-hidden="true">•</span>
            <button className="partners-onboard__logout" type="button" onClick={handleLogout}>Выйти</button>
          </div>
        </header>

        <div className="partners-onboard__hero">
          <div className="partners-onboard__copy">
            <span className="partners-eyebrow">Первичная публикация</span>
            <h1>Добро пожаловать,<br />{restaurant.name}</h1>
            <p>Начните с загрузки меню — дальше интерфейс подскажет, что делать на каждом шаге.</p>
            <Link
              className="partners-onboard__cta"
              to={activeDraft ? `/partners/upload?draft=${activeDraft.id}` : '/partners/upload?new=1'}
            >
              {activeDraft ? 'Продолжить загрузку' : 'Начать загрузку меню'}
              <ArrowRight size={22} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
          <FirstPublicationArt />
        </div>
      </div>
    )
  }

  const menuUpdatedAt = restaurant.menu_updated_at || lastUpload?.created_at
  const menuUrl = restaurant.slug
    ? `/restaurants/${encodeURIComponent(restaurant.slug)}/menu/`
    : null

  const confirmFreshness = async () => {
    setConfirmFreshnessBusy(true)
    setConfirmFreshnessError(null)
    try {
      await restaurantPortalApi.confirmMenuFreshness()
      setConfirmFreshnessOpen(false)
      await refresh()
    } catch (err) {
      setConfirmFreshnessError(err.message || 'Не получилось подтвердить актуальность меню.')
    } finally {
      setConfirmFreshnessBusy(false)
    }
  }

  const deleteSeasonalMenu = async (menu) => {
    if (!window.confirm(`Удалить черновик «${menu.name}»?`)) return
    try {
      await restaurantPortalApi.deleteSeasonalMenu(menu.id)
      await loadSeasonalMenus()
    } catch (err) {
      setSeasonalError(err.message || 'Не получилось удалить черновик.')
    }
  }

  const updateHref = activeDraft ? `/partners/upload?draft=${activeDraft.id}` : '/partners/upload?new=1'
  const nextAction = activeDraft?.status === 'submitted'
    ? {
      title: 'Обновление меню на проверке',
      copy: 'Мы проверяем загруженные изменения и скоро опубликуем их.',
      primary: { kind: 'link', label: 'Посмотреть обновление', icon: <RefreshCw size={19} strokeWidth={1.8} /> },
    }
    : activeDraft
      ? {
        title: 'У вас есть незавершённое обновление',
        copy: 'Продолжите с того шага, на котором остановились.',
        primary: { kind: 'link', label: 'Продолжить обновление', icon: <RefreshCw size={19} strokeWidth={1.8} /> },
        secondaryFreshness: true,
      }
      : {
        title: 'Меню всё ещё актуально?',
        copy: 'Подтвердите одним кликом или загрузите изменения.',
        primary: { kind: 'freshness', label: 'Да, меню актуально', icon: <CircleCheck size={20} strokeWidth={1.8} /> },
        secondaryUpdate: true,
      }

  const openFreshness = () => {
    setConfirmFreshnessError(null)
    setConfirmFreshnessOpen(true)
  }

  const photosLine = photoStats
    ? `${photoStats.withPhotos} из ${photoStats.total} ${pluralize(photoStats.total, 'позиции', 'позиций', 'позиций')}`
    : 'Считаем позиции…'
  const photosHint = photoStats
    ? (photoStats.total - photoStats.withPhotos > 0
      ? `${photoStats.total - photoStats.withPhotos} ${pluralize(photoStats.total - photoStats.withPhotos, 'блюдо', 'блюда', 'блюд')} пока без фотографии`
      : 'Все блюда с фотографиями')
    : 'Добавляйте и заменяйте фотографии позиций'

  return (
    <>
      <div className="partners-dash">
        <header className="partners-dash__top">
          <div className="partners-dash__title">
            <span className="partners-eyebrow">Панель ресторана</span>
            <RestaurantPicker
              restaurant={restaurant}
              restaurants={restaurants}
              onRestaurantChange={handleRestaurantChange}
            >
              <h1>{restaurant.name}</h1>
            </RestaurantPicker>
          </div>
          <div className="partners-dash__top-right">
            <span className="partners-dash__status">
              <i aria-hidden="true" />
              {menuUpdatedAt ? 'Меню опубликовано' : 'Меню готовится'}
            </span>
            <button className="partners-dash__logout" type="button" onClick={handleLogout}>
              Выйти
              <LogOut size={21} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="partners-dash__card partners-dash__menu">
          <div className="partners-dash__menu-head">
            <span className="partners-dash__icon partners-dash__icon--lg" aria-hidden="true">
              <BookOpenText size={34} strokeWidth={1.5} />
            </span>
            <div className="partners-dash__menu-title">
              <h2>Основное меню</h2>
              <span className="partners-dash__chip">
                {publishedMenuItems ?? '—'} {publishedMenuItems == null ? 'блюд' : dishCountLabel(publishedMenuItems)}
              </span>
            </div>
            <p className="partners-dash__updated">
              <CalendarDays size={18} strokeWidth={1.6} aria-hidden="true" />
              {menuUpdatedAt ? `Обновлено ${formatDate(menuUpdatedAt)}` : 'Меню ещё не опубликовано'}
            </p>
          </div>

          {lastUpload?.status === 'error' && lastUpload.error_message && (
            <div className="partners__notice partners__notice--error">{lastUpload.error_message}</div>
          )}

          <div className="partners-dash__next">
            <span className="partners-dash__next-label">Следующее действие</span>
            <h3>{nextAction.title}</h3>
            <p>{nextAction.copy}</p>

            <div className="partners-dash__actions">
              {nextAction.primary.kind === 'freshness' ? (
                <button className="partners-dash__btn partners-dash__btn--primary" type="button" onClick={openFreshness}>
                  {nextAction.primary.icon}
                  {nextAction.primary.label}
                </button>
              ) : (
                <Link className="partners-dash__btn partners-dash__btn--primary" to={updateHref}>
                  {nextAction.primary.icon}
                  {nextAction.primary.label}
                </Link>
              )}

              {nextAction.secondaryUpdate && (
                <Link className="partners-dash__btn" to={updateHref}>
                  <RefreshCw size={19} strokeWidth={1.8} />
                  Обновить меню
                </Link>
              )}
              {nextAction.secondaryFreshness && (
                <button className="partners-dash__btn" type="button" onClick={openFreshness}>
                  <CircleCheck size={19} strokeWidth={1.8} />
                  Меню актуально
                </button>
              )}

              {menuUrl && (
                <a className="partners-dash__link" href={menuUrl} target="_blank" rel="noreferrer">
                  Открыть публичное меню
                  <ArrowRight size={19} strokeWidth={1.8} aria-hidden="true" />
                </a>
              )}
            </div>

            {(draftLoading || (activeDraft && activeDraft.status !== 'submitted')) && (
              <div className="partners-dash__aside-actions">
                {activeDraft && activeDraft.status !== 'submitted' && (
                  <button
                    className="partners-dash__text-action"
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
                {draftLoading && <span className="partners-dash__hint">Проверяем черновики…</span>}
              </div>
            )}
          </div>
        </section>

        <div className="partners-dash__cards">
          <RestaurantLogoCard restaurant={restaurant} onRefresh={refresh} />
          <MenuQrCard restaurant={restaurant} />

          <section className="partners-dash__card partners-dash__mini partners-dash__mini--seasonal">
            <div className="partners-dash__mini-head">
              <span className="partners-dash__icon" aria-hidden="true"><Sprout size={26} strokeWidth={1.6} /></span>
              <div>
                <h2>Сезонное меню</h2>
                <p className="partners-dash__mini-status">
                  {seasonalLoading
                    ? 'Загружаем…'
                    : seasonalMenus.length === 0
                      ? 'Нет активного меню'
                      : `${seasonalMenus.length} ${pluralize(seasonalMenus.length, 'меню', 'меню', 'меню')}`}
                </p>
                <p className="partners-dash__mini-hint">Добавляйте отдельные сезонные позиции</p>
              </div>
            </div>
            {seasonalError && <div className="partners__notice partners__notice--error">{seasonalError}</div>}
            <Link className="partners-dash__btn partners-dash__btn--block" to="/partners/seasonal/new">
              <Plus size={19} strokeWidth={1.9} />
              Добавить меню
            </Link>
          </section>

          <section className="partners-dash__card partners-dash__mini partners-dash__mini--photos">
            <div className="partners-dash__mini-head">
              <span className="partners-dash__icon" aria-hidden="true"><Camera size={26} strokeWidth={1.6} /></span>
              <div>
                <h2>Фото блюд</h2>
                <p className="partners-dash__mini-status">{photosLine}</p>
                <p className="partners-dash__mini-hint">{photosHint}</p>
              </div>
            </div>
            <Link className="partners-dash__btn partners-dash__btn--block" to="/partners/photos">
              <ImageIcon size={19} strokeWidth={1.7} />
              Управлять фото
            </Link>
          </section>
        </div>

        {!seasonalLoading && seasonalMenus.length > 0 && (
          <section className="partners-dash__card partners-seasonal">
            <div className="partners-seasonal__heading">
              <div>
                <h2>Сезонные меню</h2>
                <p>Отдельные позиции с ограниченным сроком публикации</p>
              </div>
              <Link className="partners-dash__btn" to="/partners/seasonal/new">
                <Plus size={19} strokeWidth={1.9} />
                Добавить меню
              </Link>
            </div>
            <div className="partners-seasonal__list">
              {seasonalMenus.map((menu) => <SeasonalMenuCard key={menu.id} menu={menu} onDelete={deleteSeasonalMenu} />)}
            </div>
          </section>
        )}

        <MenuHistory
          restaurantId={restaurant.id}
          refresh={refresh}
          onVersionsLoaded={handleVersionsLoaded}
        />
      </div>

      {confirmFreshnessOpen && (
        <ConfirmFreshnessModal
          busy={confirmFreshnessBusy}
          error={confirmFreshnessError}
          onCancel={() => setConfirmFreshnessOpen(false)}
          onConfirm={confirmFreshness}
        />
      )}
    </>
  )
}
