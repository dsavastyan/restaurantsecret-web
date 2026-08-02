import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban,
  Check,
  ChevronDown,
  Clipboard,
  ExternalLink,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { adminMenuRevisionsApi } from '@/api/adminMenuRevisions'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date)
}

function Dialog({ title, children, onClose }) {
  return (
    <div className="admin-crm__dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="admin-crm__dialog" role="dialog" aria-modal="true" aria-labelledby="admin-crm-dialog-title">
        <header>
          <h2 id="admin-crm-dialog-title">{title}</h2>
          <button type="button" aria-label="Закрыть" onClick={onClose}><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

function RestaurantForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', city: '', email: '' })
  const [candidates, setCandidates] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event, existingSlug = '') => {
    event?.preventDefault?.()
    setBusy(true)
    setError('')
    try {
      await adminMenuRevisionsApi.createRestaurant({ ...form, ...(existingSlug ? { existing_slug: existingSlug } : {}) })
      onSaved('Ресторан добавлен в CRM, приглашение отправлено.')
      onClose()
    } catch (requestError) {
      const found = requestError.details?.candidates || []
      if (requestError.code === 'existing_network_confirmation_required' && found.length) {
        setCandidates(found)
      } else if (requestError.code === 'invite_delivery_failed') {
        onSaved('Ресторан сохранён, но письмо не отправлено. Повторите приглашение из таблицы.', 'warning')
        onClose()
      } else {
        setError(requestError.message || 'Не удалось добавить ресторан.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-crm__form" onSubmit={submit}>
      <label>Название сети<input required autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Например, Loulou" /></label>
      <label>Первый город<input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Москва" /></label>
      <label>Контактный email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="manager@restaurant.ru" /></label>
      {candidates.length > 0 && (
        <div className="admin-crm__candidates">
          <strong>Похожая сеть уже есть</strong>
          <p>Выберите её, чтобы не создавать дубль. Сеть станет партнёром, контакт получит приглашение.</p>
          {candidates.map((candidate) => (
            <button type="button" key={candidate.slug} disabled={busy} onClick={() => submit(null, candidate.slug)}>
              <span><b>{candidate.name}</b><small>{candidate.cities.join(', ') || 'Город не указан'} · {candidate.partnership_label}</small></span>
              <Check size={18} />
            </button>
          ))}
        </div>
      )}
      {error && <p className="admin-menu__error" role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Отмена</button><button className="admin-crm__primary" disabled={busy}>{busy ? 'Сохраняем…' : 'Создать и отправить приглашение'}</button></footer>
    </form>
  )
}

function ContactForm({ restaurant, onClose, onSaved }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await adminMenuRevisionsApi.addRestaurantContact(restaurant.slug, email)
      onSaved('Контакт добавлен, приглашение отправлено.')
      onClose()
    } catch (requestError) {
      if (requestError.code === 'invite_delivery_failed') {
        onSaved('Контакт добавлен, но письмо не отправлено.', 'warning')
        onClose()
      } else {
        setError(requestError.message || 'Не удалось добавить контакт.')
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="admin-crm__form" onSubmit={submit}>
      <p>Новый контакт получит отдельную ссылку для сети <strong>{restaurant.name}</strong>.</p>
      <label>Email<input required autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {error && <p className="admin-menu__error" role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Отмена</button><button className="admin-crm__primary" disabled={busy}>{busy ? 'Отправляем…' : 'Добавить и пригласить'}</button></footer>
    </form>
  )
}

function RestaurantActions({ restaurant, onAddContact, onChanged, notify }) {
  const [contactId, setContactId] = useState(restaurant.contacts[0]?.id || '')
  const [busy, setBusy] = useState('')
  const selected = restaurant.contacts.find((contact) => String(contact.id) === String(contactId))

  const invite = async (sendEmail) => {
    if (!selected) return onAddContact()
    setBusy(sendEmail ? 'send' : 'copy')
    try {
      const result = await adminMenuRevisionsApi.inviteRestaurantContact(restaurant.slug, selected.id, sendEmail)
      if (sendEmail) notify(`Приглашение отправлено на ${selected.email}.`)
      else {
        await navigator.clipboard.writeText(result.invite_url)
        notify('Новая ссылка скопирована. Предыдущая ссылка больше не действует.')
      }
      onChanged()
    } catch (error) {
      if (!sendEmail && error.details?.invite_url) {
        notify(`Не удалось скопировать автоматически: ${error.details.invite_url}`, 'warning')
      } else {
        notify(error.message || 'Действие не выполнено.', 'error')
      }
      onChanged()
    } finally {
      setBusy('')
    }
  }

  const toggleAccess = async () => {
    const verb = restaurant.access_blocked ? 'разблокировать' : 'заблокировать'
    if (!window.confirm(`Точно ${verb} доступ для всей сети «${restaurant.name}»?`)) return
    setBusy('access')
    try {
      await adminMenuRevisionsApi.setRestaurantAccess(restaurant.slug, !restaurant.access_blocked)
      notify(restaurant.access_blocked ? 'Доступ разблокирован. Потребуется новый вход.' : 'Доступ ко всей сети заблокирован.')
      onChanged()
    } catch (error) {
      notify(error.message || 'Не удалось изменить доступ.', 'error')
    } finally {
      setBusy('')
    }
  }

  return (
    <details className="admin-crm__actions">
      <summary>Действия <ChevronDown size={15} /></summary>
      <div>
        {restaurant.contacts.length > 1 && <select aria-label={`Контакт ${restaurant.name}`} value={contactId} onChange={(event) => setContactId(event.target.value)}>{restaurant.contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.email}</option>)}</select>}
        {selected && <button type="button" disabled={!!busy} onClick={() => invite(true)}><Mail size={16} />{busy === 'send' ? 'Отправляем…' : 'Отправить повторно'}</button>}
        {selected && <button type="button" disabled={!!busy} onClick={() => invite(false)}><Clipboard size={16} />{busy === 'copy' ? 'Создаём…' : 'Скопировать ссылку'}</button>}
        <button type="button" onClick={onAddContact}><UserPlus size={16} />{restaurant.contacts.length ? 'Добавить email' : 'Пригласить ресторан'}</button>
        {restaurant.public_menu_url && <a href={restaurant.public_menu_url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Открыть меню</a>}
        {!restaurant.public_menu_url && <button type="button" disabled title="Меню ещё не опубликовано"><ExternalLink size={16} />Открыть меню</button>}
        {restaurant.active_revision_id && <Link to={`/admin/menu-revisions/${restaurant.active_revision_id}`}><ShieldCheck size={16} />Открыть заявку</Link>}
        <button className={restaurant.access_blocked ? 'is-positive' : 'is-danger'} type="button" disabled={busy === 'access'} onClick={toggleAccess}>{restaurant.access_blocked ? <RotateCcw size={16} /> : <Ban size={16} />}{restaurant.access_blocked ? 'Разблокировать доступ' : 'Заблокировать доступ'}</button>
      </div>
    </details>
  )
}

export default function AdminRestaurantList() {
  const [items, setItems] = useState([])
  const [filterOptions, setFilterOptions] = useState({ cities: [], menu_statuses: [], partnerships: [] })
  const [filters, setFilters] = useState({ query: '', city: '', menuStatus: '', partnership: '', requiresAction: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState(null)

  const notify = (message, kind = 'success') => {
    setNotice({ message, kind })
    window.setTimeout(() => setNotice(null), 5000)
  }

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await adminMenuRevisionsApi.restaurants(filters)
        setItems(data.restaurants || [])
        setFilterOptions(data.filters || { cities: [], menu_statuses: [], partnerships: [] })
      } catch (requestError) {
        setError(requestError.message || 'Не удалось загрузить рестораны.')
      } finally {
        setLoading(false)
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [filters, refresh])

  const hasFilters = useMemo(() => Object.values(filters).some(Boolean), [filters])
  const reload = () => setRefresh((value) => value + 1)
  const saved = (message, kind) => { notify(message, kind); reload() }

  return (
    <section className="admin-crm">
      <div className="admin-menu__title admin-crm__title">
        <div><span>Партнёрская CRM</span><h1>Рестораны</h1><p>Одна строка — одна сеть, независимо от количества точек.</p></div>
        <div><strong>{items.length}</strong><button className="admin-crm__primary" type="button" onClick={() => setDialog({ type: 'restaurant' })}><Plus size={18} />Добавить ресторан</button></div>
      </div>

      <div className="admin-crm__filters">
        <label className="admin-crm__search"><Search size={18} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Сеть или email" /></label>
        <select aria-label="Город" value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })}><option value="">Все города</option>{filterOptions.cities.map((city) => <option key={city}>{city}</option>)}</select>
        <select aria-label="Статус меню" value={filters.menuStatus} onChange={(event) => setFilters({ ...filters, menuStatus: event.target.value })}><option value="">Все статусы меню</option>{filterOptions.menu_statuses.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select>
        <select aria-label="Партнёрство" value={filters.partnership} onChange={(event) => setFilters({ ...filters, partnership: event.target.value })}><option value="">Все по партнёрству</option>{filterOptions.partnerships.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
        <label className="admin-crm__checkbox"><input type="checkbox" checked={filters.requiresAction} onChange={(event) => setFilters({ ...filters, requiresAction: event.target.checked })} />Требует моего действия</label>
        {hasFilters && <button className="admin-crm__clear" type="button" onClick={() => setFilters({ query: '', city: '', menuStatus: '', partnership: '', requiresAction: false })}>Сбросить</button>}
      </div>

      {notice && <div className={`admin-crm__notice admin-crm__notice--${notice.kind}`} role="status">{notice.message}<button aria-label="Закрыть" onClick={() => setNotice(null)}><X size={16} /></button></div>}
      {error && <p className="admin-menu__error" role="alert">{error}</p>}
      {loading ? <p className="admin-crm__loading">Загружаем сети…</p> : (
        <div className="admin-crm__table-wrap">
          <table className="admin-crm__table">
            <thead><tr><th>Сеть</th><th>Города</th><th>Контакт</th><th>Статус меню</th><th>Партнёрство</th><th>Последняя активность</th><th>Следующее действие</th><th /></tr></thead>
            <tbody>
              {items.map((restaurant) => (
                <tr key={restaurant.slug} className={restaurant.requires_action ? 'requires-action' : ''}>
                  <td><strong>{restaurant.name}</strong><small>{restaurant.slug}</small>{restaurant.access_blocked && <span className="admin-crm__warning"><Ban size={13} />Доступ заблокирован</span>}</td>
                  <td>{restaurant.city_label}</td>
                  <td>{restaurant.contacts.length ? <><span>{restaurant.contacts[0].email}</span>{restaurant.contacts.length > 1 && <small>+{restaurant.contacts.length - 1}</small>}{restaurant.invite_error && <span className="admin-crm__warning">Ошибка письма</span>}</> : <span className="admin-crm__muted">—</span>}</td>
                  <td><span className={`admin-crm__status admin-crm__status--${restaurant.menu_status}`}>{restaurant.menu_status_label}</span></td>
                  <td><span className={`admin-crm__partnership admin-crm__partnership--${restaurant.partnership}`}>{restaurant.partnership_label}</span></td>
                  <td>{formatDate(restaurant.last_activity_at)}</td>
                  <td>{restaurant.active_revision_id && restaurant.requires_action ? <Link to={`/admin/menu-revisions/${restaurant.active_revision_id}`}>{restaurant.next_action}</Link> : restaurant.next_action}</td>
                  <td><RestaurantActions restaurant={restaurant} onAddContact={() => setDialog({ type: 'contact', restaurant })} onChanged={reload} notify={notify} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <div className="admin-menu__empty">По выбранным условиям ресторанов нет.</div>}
        </div>
      )}

      {dialog?.type === 'restaurant' && <Dialog title="Добавить ресторан" onClose={() => setDialog(null)}><RestaurantForm onClose={() => setDialog(null)} onSaved={saved} /></Dialog>}
      {dialog?.type === 'contact' && <Dialog title="Добавить ещё один email" onClose={() => setDialog(null)}><ContactForm restaurant={dialog.restaurant} onClose={() => setDialog(null)} onSaved={saved} /></Dialog>}
    </section>
  )
}
