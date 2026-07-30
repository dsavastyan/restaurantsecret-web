import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { restaurantPortalApi } from '@/api/restaurantPortal'
import './update-flow.css'

const STEPS = [
  ['Меню', 'Выберите способ обновления'],
  ['Фотографии', 'Проверьте фото блюд', true],
  ['Превью', 'Посмотрите результат'],
  ['Подтверждение', 'Отправьте обновления'],
]

const EMPTY_ITEM = {
  dish_name: '',
  category: '',
  price_rub: '',
  per: 'portion',
  portion_g: '',
  kcal: '',
  proteins_g: '',
  fats_g: '',
  carbs_g: '',
  composition_text: '',
}

const STATUS_LABELS = {
  unchanged: 'Без изменений',
  updated: 'Изменено',
  added: 'Новое',
  deleted: 'Будет удалено',
}

function numberOrNull(value) {
  if (value === '' || value == null) return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function itemFormPayload(form) {
  return {
    dish_name: form.dish_name.trim(),
    category: form.category.trim(),
    price_rub: numberOrNull(form.price_rub),
    per: form.per,
    portion_g: numberOrNull(form.portion_g),
    kcal: numberOrNull(form.kcal),
    proteins_g: numberOrNull(form.proteins_g),
    fats_g: numberOrNull(form.fats_g),
    carbs_g: numberOrNull(form.carbs_g),
    composition_text: form.composition_text.trim(),
  }
}

function formatValue(value, suffix = '') {
  return value == null || value === '' ? '—' : `${value}${suffix}`
}

function formatFileSize(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return ''
  if (value < 1024) return `${value} Б`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} КБ`
  return `${(value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} МБ`
}

function changeSummary(summary) {
  return `${summary.added || 0} новых · ${summary.updated || 0} изменено · ${summary.deleted || 0} будет удалено`
}

function FlowSidebar({ restaurant, step, onStep, initial = false, locked = false }) {
  return (
    <aside className="partners-update__sidebar">
      <div>
        <a className="partners-update__brand" href="/">
          <img src="/assets/logo-64.png" alt="" width="42" height="42" />
          <span>RestaurantSecret</span>
        </a>
        <small className="partners-update__cabinet">Партнёрский кабинет</small>
        <div className="partners-update__restaurant">{restaurant.name}</div>
        <div className="partners-update__progress-copy">
          <strong>{initial ? 'Публикация меню' : 'Обновление меню'}</strong>
          <span>Шаг {step} из 4</span>
        </div>
        <div className="partners-update__progress"><span style={{ width: `${step * 25}%` }} /></div>
        <ol className="partners-update__steps">
          {STEPS.map(([title, description, optional], index) => {
            const number = index + 1
            const state = number < step ? 'complete' : number === step ? 'active' : 'pending'
            return (
              <li className={`partners-update__step partners-update__step--${state}`} key={title}>
                <button type="button" disabled={locked || number > step} onClick={() => onStep(number)}>
                  <span>{state === 'complete' ? <Check size={16} /> : number}</span>
                  <span>
                    <span className="partners-update__step-title">
                      <strong>{title}</strong>
                      {optional && <i>Необязательно</i>}
                    </span>
                    <small>{description}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
      <a className="partners-update__support" href="mailto:partners@restaurantsecret.ru">
        Нужна помощь?<strong>partners@restaurantsecret.ru</strong>
      </a>
    </aside>
  )
}

function MethodCards({ onSelect, initial = false }) {
  return (
    <section className="partners-update__method-step">
      <div className="partners-update__section-heading">
        <span>Шаг 1</span>
        <h2>{initial ? 'Как вы хотите добавить меню?' : 'Как вы хотите обновить меню?'}</h2>
        <p>{initial ? 'Выберите удобный способ загрузки меню ресторана.' : 'Выберите удобный способ. Опубликованное меню продолжит работать, пока вы готовите изменения.'}</p>
      </div>
      <div className="partners-update__methods">
        <button className="partners-update__method partners-update__method--recommended" type="button" onClick={() => onSelect('manual')}>
          <span className="partners-update__recommended">Рекомендуем</span>
          <span className="partners-update__method-icon"><Pencil size={29} /></span>
          <strong>Изменить отдельные блюда</strong>
          <p>Добавьте новые блюда, отредактируйте существующие или уберите позиции, которых больше нет в меню.</p>
          <span className="partners-update__method-action">Редактировать блюда <ChevronRight size={18} /></span>
          <small>Подойдёт, если изменилась только часть меню</small>
        </button>
        <button className="partners-update__method" type="button" onClick={() => onSelect('upload')}>
          <span className="partners-update__method-icon"><FileSpreadsheet size={29} /></span>
          <strong>Загрузить новое меню</strong>
          <p>Замените меню файлом Excel, PDF или фотографиями. Мы сравним его с опубликованной версией.</p>
          <span className="partners-update__method-action">Загрузить файл <ChevronRight size={18} /></span>
          <small>Подойдёт для сезонной или полной замены меню</small>
        </button>
      </div>
    </section>
  )
}

function ItemDrawer({ item, categories, busy, onClose, onSave }) {
  const [form, setForm] = useState(item ? { ...EMPTY_ITEM, ...item } : { ...EMPTY_ITEM })
  const [addAnother, setAddAnother] = useState(false)
  const titleId = 'partners-item-drawer-title'
  const firstInputRef = useRef(null)
  const drawerRef = useRef(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
      if (event.key === 'Tab') {
        const focusable = Array.from(drawerRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') || [])
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    const saved = await onSave(itemFormPayload(form))
    if (saved && addAnother && !item) {
      setForm({ ...EMPTY_ITEM, category: form.category })
      firstInputRef.current?.focus()
    }
  }

  return (
    <div className="partners-update__drawer-layer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="partners-update__drawer-backdrop" type="button" aria-label="Закрыть" onClick={onClose} />
      <form className="partners-update__drawer" onSubmit={submit} ref={drawerRef}>
        <header>
          <div><small>{item ? 'Редактирование' : 'Новое блюдо'}</small><h2 id={titleId}>{item ? item.dish_name : 'Добавить блюдо'}</h2></div>
          <button type="button" aria-label="Закрыть" onClick={onClose}><X size={22} /></button>
        </header>
        <div className="partners-update__drawer-body">
          <label className="partners-update__field partners-update__field--wide">
            <span>Название блюда</span>
            <input ref={firstInputRef} value={form.dish_name} onChange={set('dish_name')} required />
          </label>
          <label className="partners-update__field">
            <span>Раздел меню</span>
            <input list="partners-menu-categories" value={form.category} onChange={set('category')} required />
            <datalist id="partners-menu-categories">{categories.map((category) => <option value={category} key={category} />)}</datalist>
          </label>
          <label className="partners-update__field">
            <span>Цена, ₽</span>
            <input inputMode="decimal" value={form.price_rub ?? ''} onChange={set('price_rub')} required />
          </label>
          <label className="partners-update__field partners-update__field--wide">
            <span>Состав</span>
            <textarea rows="4" value={form.composition_text ?? ''} onChange={set('composition_text')} required />
          </label>
          <label className="partners-update__field">
            <span>Вес порции, г</span>
            <input inputMode="decimal" value={form.portion_g ?? ''} onChange={set('portion_g')} required />
          </label>
          <fieldset className="partners-update__basis">
            <legend>КБЖУ указаны</legend>
            <label><input type="radio" name="basis" value="portion" checked={form.per !== '100g'} onChange={() => setForm((value) => ({ ...value, per: 'portion' }))} /> На порцию</label>
            <label><input type="radio" name="basis" value="100g" checked={form.per === '100g'} onChange={() => setForm((value) => ({ ...value, per: '100g' }))} /> На 100 г</label>
          </fieldset>
          {[
            ['kcal', 'Калории'],
            ['proteins_g', 'Белки, г'],
            ['fats_g', 'Жиры, г'],
            ['carbs_g', 'Углеводы, г'],
          ].map(([field, label]) => (
            <label className="partners-update__field" key={field}>
              <span>{label}</span>
              <input inputMode="decimal" value={form[field] ?? ''} onChange={set(field)} required />
            </label>
          ))}
          {!item && (
            <label className="partners-update__add-another">
              <input type="checkbox" checked={addAnother} onChange={(event) => setAddAnother(event.target.checked)} />
              Добавить ещё одно блюдо
            </label>
          )}
        </div>
        <footer>
          <button type="button" onClick={onClose} disabled={busy}>Отменить</button>
          <button className="partners-update__primary" disabled={busy}>{busy ? 'Сохраняем…' : item ? 'Сохранить' : 'Добавить блюдо'}</button>
        </footer>
      </form>
    </div>
  )
}

function ManualStep({ payload, busy, error, onAdd, onBackToMethods, onConfirmMatch, onDelete, onEdit, onExit, onNext, onRestore }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const items = payload.items || []
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))]
  const visible = items.filter((item) => {
    const matchesQuery = !query.trim() || item.dish_name.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU'))
    return matchesQuery && (category === 'all' || item.category === category) && (status === 'all' || item.change_type === status)
  })
  return (
    <>
      <section className="partners-update__catalog">
        <div className="partners-update__catalog-heading">
          <div><button type="button" onClick={onBackToMethods}><ArrowLeft size={16} /> Выбрать другой способ</button><h2>Блюда меню</h2><p>Изменения сохраняются в черновике и не видны гостям до отправки.</p></div>
          <button className="partners-update__primary" type="button" onClick={onAdd}><Plus size={18} /> Добавить блюдо</button>
        </div>
        <div className="partners-update__filters">
          <label><Search size={18} /><input type="search" placeholder="Поиск по блюдам" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Все категории</option>
            {categories.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
          <div className="partners-update__status-filter">
            {[
              ['all', 'Все'],
              ['updated', 'Изменённые'],
              ['added', 'Новые'],
              ['deleted', 'Удалённые'],
            ].map(([value, label]) => <button className={status === value ? 'active' : ''} type="button" onClick={() => setStatus(value)} key={value}>{label}</button>)}
          </div>
        </div>
        {error && <div className="partners__notice partners__notice--error">{error}</div>}
        {items.some((item) => item.match_suggestion) && (
          <div className="partners-update__match-suggestions">
            <h3>Проверьте похожие названия</h3>
            {items.filter((item) => item.match_suggestion).map((item) => (
              <div key={item.id}>
                <span>«{item.dish_name}» похоже на «{item.match_suggestion.dish_name}»</span>
                <button type="button" disabled={busy} onClick={() => onConfirmMatch(item)}>Это то же блюдо</button>
              </div>
            ))}
          </div>
        )}
        <div className="partners-update__table-wrap">
          <table className="partners-update__table">
            <thead><tr><th>Блюдо</th><th>Категория</th><th>Вес</th><th>Ккал</th><th>Б</th><th>Ж</th><th>У</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {visible.map((item) => (
                <tr className={`partners-update__row--${item.change_type}`} key={item.id}>
                  <td><strong>{item.dish_name}</strong>{item.price_rub != null && <small>{item.price_rub} ₽</small>}</td>
                  <td>{item.category || '—'}</td><td>{formatValue(item.portion_g, ' г')}</td><td>{formatValue(item.kcal)}</td>
                  <td>{formatValue(item.proteins_g)}</td><td>{formatValue(item.fats_g)}</td><td>{formatValue(item.carbs_g)}</td>
                  <td><span className={`partners-update__status partners-update__status--${item.change_type}`}>{STATUS_LABELS[item.change_type]}</span></td>
                  <td>
                    {item.change_type === 'deleted'
                      ? <button type="button" onClick={() => onRestore(item)} disabled={busy}>Восстановить</button>
                      : <><button type="button" onClick={() => onEdit(item)}>Редактировать</button><button type="button" onClick={() => onDelete(item)} disabled={busy}>Удалить</button></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && <div className="partners-update__empty">По выбранным условиям блюда не найдены.</div>}
        </div>
      </section>
      <footer className="partners-update__sticky-footer">
        <div><strong>{(payload.summary.added || 0) + (payload.summary.updated || 0) + (payload.summary.deleted || 0)} изменения</strong><span>{changeSummary(payload.summary)}</span></div>
        <div><button type="button" onClick={onExit}>Сохранить и выйти</button><button className="partners-update__primary" type="button" onClick={onNext}>Перейти к фотографиям <ArrowRight size={18} /></button></div>
      </footer>
    </>
  )
}

function RevisionWaiting({ payload, busy, error, onReply }) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState([])
  const revision = payload.revision
  const sourceFiles = revision?.source_files || []
  const lastClarification = [...(revision?.messages || [])]
    .reverse()
    .find((item) => item.message_type === 'clarification')
  const submit = async (event) => {
    event.preventDefault()
    const saved = await onReply(message, files)
    if (saved) {
      setMessage('')
      setFiles([])
      event.currentTarget.reset()
    }
  }
  return (
    <section className="partners-update__waiting">
      <span className="partners-update__waiting-icon"><Upload size={34} /></span>
      <span>Файл принят</span>
      <h2>Меню загружено — ожидает подготовки</h2>
      <p>Мы сохранили исходные файлы без изменений. Специалист подготовит меню по шаблону, после чего автоматически откроется шаг с фотографиями и превью.</p>
      {sourceFiles.length > 0 && (
        <div className="partners-update__source-files">
          <strong>{sourceFiles.length === 1 ? 'Загруженный файл' : 'Загруженные файлы'}</strong>
          <div>
            {sourceFiles.map((file) => {
              const details = [
                formatFileSize(file.size_bytes),
                file.page_count ? `${file.page_count} стр.` : '',
                file.sheet_count ? `${file.sheet_count} лист.` : '',
              ].filter(Boolean).join(' · ')
              return (
                <a
                  href={restaurantPortalApi.revisionSourceDownloadUrl(payload.draft.id, file.id)}
                  download={file.original_name}
                  key={file.id}
                >
                  <span className="partners-update__source-file-icon"><FileSpreadsheet size={20} /></span>
                  <span>
                    <strong title={file.original_name}>{file.original_name}</strong>
                    {details && <small>{details}</small>}
                  </span>
                  <span className="partners-update__source-file-download">Скачать <Download size={16} /></span>
                </a>
              )
            })}
          </div>
        </div>
      )}
      <div className="partners-update__chat">
        <header className="partners-update__chat-header">
          <span className="partners-update__chat-icon" aria-hidden="true">
            <MessageCircle size={20} />
          </span>
          <div>
            <strong>Переписка со специалистом</strong>
            <span>Здесь можно уточнить детали подготовки меню</span>
          </div>
          {lastClarification && (
            <span className="partners-update__clarification-badge">Нужно уточнение</span>
          )}
        </header>
        <div className="partners-update__conversation">
          {(revision?.messages || []).filter((item) => item.sender_role !== 'system').map((item) => (
            <article className={`partners-update__message partners-update__message--${item.sender_role}`} key={item.id}>
              <strong>{item.sender_role === 'admin' ? 'RestaurantSecret' : 'Вы'}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <form className="partners-update__chat-form" onSubmit={submit}>
          <label>
            Ответ или дополнительная информация
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Напишите комментарий для специалиста" />
          </label>
          <div className="partners-update__chat-actions">
            <label className="partners-update__attach">
              <input type="file" multiple accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
              <Plus size={17} /> {files.length ? `Выбрано файлов: ${files.length}` : 'Приложить дополнительные файлы'}
            </label>
            <button className="partners-update__primary" disabled={busy || (!message.trim() && !files.length)} type="submit">{busy ? 'Отправляем…' : 'Отправить ответ'}</button>
          </div>
        </form>
      </div>
      {error && <div className="partners__notice partners__notice--error">{error}</div>}
    </section>
  )
}

function UploadStep({ payload, busy, error, onBackToMethods, onFile, onNext, onReply }) {
  const inputRef = useRef(null)
  const extracting = payload.draft.status === 'extracting'
  if (extracting && payload.revision) {
    return <RevisionWaiting payload={payload} busy={busy} error={error} onReply={onReply} />
  }
  return (
    <section className="partners-update__upload-step">
      <button className="partners-update__text-back" type="button" onClick={onBackToMethods}><ArrowLeft size={16} /> Выбрать другой способ</button>
      <div className="partners-update__section-heading"><span>Новое меню</span><h2>Загрузите файл</h2><p>Мы сравним новую версию с опубликованной и сохраним подходящие фотографии.</p></div>
      <a className="partners-update__template" href={restaurantPortalApi.templateDownloadUrl()} download><FileSpreadsheet size={25} /><span><strong>Шаблон Excel</strong><small>Используйте шаблон для быстрой автоматической проверки</small></span><span>Скачать</span></a>
      <label className="partners-update__dropzone">
        <input ref={inputRef} multiple type="file" accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => event.target.files?.length && onFile(Array.from(event.target.files))} />
        <Upload size={42} /><strong>{busy ? 'Проверяем файл…' : 'Перетащите файл сюда или выберите на компьютере'}</strong>
        <span>Excel, PDF, JPG, PNG или WEBP</span><i>Выбрать файл</i>
      </label>
      {!extracting && payload.draft.source_kind === 'structured' && (
        <div className="partners-update__comparison">
          <Check size={23} /><div><strong>Файл проверен и сопоставлен</strong><p>{changeSummary(payload.summary)}</p></div>
          <button className="partners-update__primary" type="button" onClick={onNext}>Перейти к фотографиям <ArrowRight size={17} /></button>
        </div>
      )}
      {error && <div className="partners__notice partners__notice--error">{error}</div>}
    </section>
  )
}

function PhotosStep({ payload, busy, onBack, onBulkPhoto, onDeletePhoto, onNext, onPhoto, onAssign }) {
  const [tab, setTab] = useState('attention')
  const activeItems = payload.items.filter((item) => item.change_type !== 'deleted')
  const needsAttention = (item) => Boolean(item.photo_attention)
  const visible = tab === 'attention' ? activeItems.filter(needsAttention) : activeItems
  const unmatched = payload.photos.filter((photo) => photo.status === 'unmatched')
  return (
    <section className="partners-update__photos-step">
      <div className="partners-update__section-heading"><span>Шаг 2</span><h2>Проверьте фотографии</h2><p>Существующие фотографии уже перенесены. Загрузите новые только там, где это необходимо.</p></div>
      <div className="partners-update__tabs-row">
        <div className="partners-update__tabs">
          <button className={tab === 'attention' ? 'active' : ''} type="button" onClick={() => setTab('attention')}>Требуют внимания · {activeItems.filter(needsAttention).length}</button>
          <button className={tab === 'all' ? 'active' : ''} type="button" onClick={() => setTab('all')}>Все блюда · {activeItems.length}</button>
        </div>
        <label className="partners-update__bulk-photo">
          <input type="file" accept="image/*" multiple onChange={(event) => event.target.files?.length && onBulkPhoto(Array.from(event.target.files))} />
          <Upload size={16} /> Загрузить несколько фото
        </label>
      </div>
      <div className="partners-update__photo-grid">
        {visible.map((item) => (
          <article className="partners-update__photo-card" key={item.id}>
            {item.photo_url && !item.photo_removed ? <img src={item.photo_url} alt="" /> : <span className="partners-update__photo-placeholder"><ImageIcon size={30} /></span>}
            <div><span className={`partners-update__status partners-update__status--${item.change_type}`}>{item.photo_changed ? 'Фото заменено' : item.change_type === 'added' ? 'Новое блюдо' : item.photo_attention ? 'Блюдо изменено' : 'Фото сохранено'}</span><h3>{item.dish_name}</h3><p>{item.category}</p></div>
            <footer>
              <label><input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onPhoto(item, event.target.files[0])} />{item.photo_url ? 'Заменить' : 'Добавить фото'}</label>
              {item.photo_url && <button type="button" disabled={busy} onClick={() => onDeletePhoto(item)}>Удалить</button>}
            </footer>
          </article>
        ))}
      </div>
      {!visible.length && <div className="partners-update__empty">Все фотографии в порядке — можно продолжать.</div>}
      {unmatched.length > 0 && (
        <div className="partners-update__unmatched">
          <h3>Не удалось сопоставить · {unmatched.length}</h3>
          {unmatched.map((photo) => (
            <div key={photo.id}><span>{photo.original_filename}</span><select defaultValue="" onChange={(event) => event.target.value && onAssign(photo, event.target.value)}><option value="" disabled>Выберите блюдо</option>{activeItems.map((item) => <option value={item.id} key={item.id}>{item.dish_name}</option>)}</select></div>
          ))}
        </div>
      )}
      <FlowActions onBack={onBack} onNext={onNext} nextLabel="Перейти к превью" />
    </section>
  )
}

function PreviewStep({ payload, busy, error, onBack, onNext, onMessage }) {
  const [mode, setMode] = useState('all')
  const [comment, setComment] = useState('')
  const send = async (type) => {
    if (!comment.trim()) return
    const saved = await onMessage(comment, type)
    if (saved && type === 'comment') setComment('')
  }
  const visible = payload.items.filter((item) => mode === 'changes' ? item.change_type !== 'unchanged' : item.change_type !== 'deleted')
  return (
    <section className="partners-update__preview-step">
      <div className="partners-update__section-heading"><span>Шаг 3</span><h2>Проверьте превью</h2><p>Так будет выглядеть обновлённое меню после публикации.</p></div>
      <div className="partners-update__preview-toolbar">
        <div><button className={mode === 'all' ? 'active' : ''} type="button" onClick={() => setMode('all')}>Всё меню</button><button className={mode === 'changes' ? 'active' : ''} type="button" onClick={() => setMode('changes')}>Только изменения</button></div>
        <span>Добавлено {payload.summary.added || 0} · Изменено {payload.summary.updated || 0} · Удалено {payload.summary.deleted || 0}</span>
      </div>
      <div className="partners-update__preview-grid">
        {visible.map((item) => (
          <article className={`partners-update__preview-card partners-update__preview-card--${item.change_type}`} key={item.id}>
            {item.change_type === 'deleted'
              ? <span className="partners-update__photo-placeholder"><Trash2 size={30} /></span>
              : item.photo_url && !item.photo_removed ? <img src={item.photo_url} alt="" /> : <span className="partners-update__photo-placeholder"><ImageIcon size={30} /></span>}
            <div><span className={`partners-update__status partners-update__status--${item.change_type}`}>{STATUS_LABELS[item.change_type]}</span><h3>{item.dish_name}</h3><p>{item.composition_text}</p><dl><div><dt>Ккал</dt><dd>{formatValue(item.kcal)}</dd></div><div><dt>Б</dt><dd>{formatValue(item.proteins_g)}</dd></div><div><dt>Ж</dt><dd>{formatValue(item.fats_g)}</dd></div><div><dt>У</dt><dd>{formatValue(item.carbs_g)}</dd></div></dl><strong>{formatValue(item.price_rub, ' ₽')}</strong></div>
          </article>
        ))}
      </div>
      {payload.revision && (
        <section className="partners-update__preview-feedback">
          <h3>Нужно что-то уточнить?</h3>
          <p>Комментарий не останавливает проверку. Если меню нужно переделать, отправьте запрос изменений.</p>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Опишите вопрос или необходимые изменения" />
          <div>
            <button disabled={busy || !comment.trim()} type="button" onClick={() => send('comment')}>Отправить комментарий</button>
            <button className="partners-update__request-changes" disabled={busy || !comment.trim()} type="button" onClick={() => send('change_request')}>Запросить изменения</button>
          </div>
          {error && <div className="partners__notice partners__notice--error">{error}</div>}
        </section>
      )}
      <FlowActions onBack={onBack} onNext={onNext} nextLabel="Продолжить" />
    </section>
  )
}

function ConfirmStep({ payload, busy, error, onBack, onSubmit, initial = false }) {
  const summary = payload.summary
  return (
    <section className="partners-update__confirm-step">
      <span className="partners-update__confirm-icon"><Check size={34} /></span>
      <h2>{initial ? 'Подтвердите меню' : 'Отправьте обновления'}</h2>
      <p>{initial ? 'Проверьте меню перед публикацией. После подтверждения оно станет доступно гостям.' : 'Проверьте изменения перед отправкой. Текущее меню продолжит работать, пока новая версия проходит обработку.'}</p>
      <div className="partners-update__confirm-summary">
        <div><strong>{summary.added || 0}</strong><span>блюд добавлено</span></div>
        <div><strong>{summary.updated || 0}</strong><span>блюд изменено</span></div>
        <div><strong>{summary.deleted || 0}</strong><span>блюд будет удалено</span></div>
        <div><strong>{summary.photos || 0}</strong><span>фотографий добавлено или заменено</span></div>
      </div>
      {error && <div className="partners__notice partners__notice--error">{error}</div>}
      <button className="partners-update__submit" type="button" disabled={busy} onClick={onSubmit}>{busy ? 'Отправляем…' : initial ? 'Опубликовать меню' : 'Отправить обновления'}</button>
      <button className="partners-update__confirm-back" type="button" disabled={busy} onClick={onBack}><ArrowLeft size={17} /> Вернуться к превью</button>
    </section>
  )
}

function SubmittedState({ onExit }) {
  return (
    <section className="partners-update__confirm-step">
      <span className="partners-update__confirm-icon"><Upload size={31} /></span>
      <h2>Обновления отправлены</h2>
      <p>Новая версия проходит финальную обработку. Текущее меню, QR-код и ссылка продолжают работать без изменений.</p>
      <button className="partners-update__submit" type="button" onClick={onExit}>Вернуться в кабинет</button>
    </section>
  )
}

function FlowActions({ onBack, onNext, nextLabel }) {
  return (
    <footer className="partners-update__flow-actions">
      <button type="button" onClick={onBack}><ArrowLeft size={18} /> Назад</button>
      <button className="partners-update__primary" type="button" onClick={onNext}>{nextLabel} <ArrowRight size={18} /></button>
    </footer>
  )
}

export default function PartnersUploadMenu() {
  const { restaurant, refresh, isFirstPublication } = useOutletContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [payload, setPayload] = useState(null)
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [drawerItem, setDrawerItem] = useState(undefined)
  const newDraftRequested = searchParams.get('new') === '1'
  const requestedDraftId = searchParams.get('draft')

  const categories = useMemo(
    () => [...new Set((payload?.items || []).map((item) => item.category).filter(Boolean))],
    [payload?.items],
  )

  const reload = async (draftId = payload?.draft?.id) => {
    if (!draftId) return null
    const data = await restaurantPortalApi.draft(draftId)
    setPayload(data)
    return data
  }

  useEffect(() => {
    let cancelled = false
    const open = async () => {
      setStatus('loading')
      setError(null)
      try {
        let data
        if (newDraftRequested) {
          data = await restaurantPortalApi.createDraft({ replaceActive: true })
          navigate(`/partners/upload?draft=${data.draft.id}`, { replace: true })
        } else if (requestedDraftId) {
          data = await restaurantPortalApi.draft(requestedDraftId)
        } else {
          const active = await restaurantPortalApi.activeDraft()
          data = active.active_draft
            ? await restaurantPortalApi.draft(active.active_draft.id)
            : await restaurantPortalApi.createDraft()
          navigate(`/partners/upload?draft=${data.draft.id}`, { replace: true })
        }
        if (!cancelled) {
          setPayload(data)
          setStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Не получилось открыть черновик.')
          setStatus('error')
        }
      }
    }
    open()
    return () => { cancelled = true }
  // Open a draft only when the route target changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newDraftRequested, requestedDraftId])

  useEffect(() => {
    if (payload?.draft?.status !== 'extracting' || !payload?.draft?.id) return undefined
    const timer = window.setInterval(() => {
      reload(payload.draft.id).catch(() => null)
    }, 15000)
    return () => window.clearInterval(timer)
  // Poll only while a menu is waiting for the administrator.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.draft?.id, payload?.draft?.status])

  const run = async (operation, fallback) => {
    setBusy(true)
    setError(null)
    try {
      return await operation()
    } catch (err) {
      setError(err.message || fallback)
      return null
    } finally {
      setBusy(false)
    }
  }

  const setStep = async (step) => {
    const result = await run(
      () => restaurantPortalApi.updateDraft(payload.draft.id, { current_step: step }),
      'Не получилось сохранить шаг.',
    )
    if (result) setPayload(result)
  }

  const chooseMethod = async (method) => {
    if (payload.draft.method && payload.draft.method !== method) {
      const changed = (payload.summary.added || 0) + (payload.summary.updated || 0) + (payload.summary.deleted || 0)
      if (changed && !window.confirm('Сменить способ обновления? Уже внесённые изменения будут сброшены.')) return
    }
    const result = await run(() => restaurantPortalApi.resetDraft(payload.draft.id, method), 'Не получилось выбрать способ.')
    if (result) setPayload(result)
  }

  const saveItem = async (form) => {
    const result = await run(
      () => drawerItem
        ? restaurantPortalApi.updateDraftItem(payload.draft.id, drawerItem.id, form)
        : restaurantPortalApi.addDraftItem(payload.draft.id, form),
      'Не получилось сохранить блюдо.',
    )
    if (!result) return false
    await reload()
    if (drawerItem) setDrawerItem(undefined)
    return true
  }

  const deleteItem = async (item) => {
    if (!window.confirm(`Убрать «${item.dish_name}» из обновлённого меню?`)) return
    const result = await run(() => restaurantPortalApi.deleteDraftItem(payload.draft.id, item.id), 'Не получилось удалить блюдо.')
    if (result) await reload()
  }

  const restoreItem = async (item) => {
    const result = await run(() => restaurantPortalApi.restoreDraftItem(payload.draft.id, item.id), 'Не получилось восстановить блюдо.')
    if (result) await reload()
  }

  const confirmMatch = async (item) => {
    const result = await run(
      () => restaurantPortalApi.updateDraftItem(payload.draft.id, item.id, {
        confirm_match_base_item_id: item.match_suggestion.base_item_id,
      }),
      'Не получилось сопоставить блюда.',
    )
    if (result) await reload()
  }

  const uploadSource = async (files) => {
    const result = await run(
      () => restaurantPortalApi.uploadDraftSources(payload.draft.id, files),
      'Не получилось обработать файлы.',
    )
    if (result) setPayload(result)
  }

  const replyToRevision = async (message, files) => {
    const result = await run(
      () => restaurantPortalApi.replyToRevision(payload.draft.id, message, files),
      'Не получилось отправить ответ.',
    )
    if (!result) return false
    setPayload(result)
    return true
  }

  const sendRevisionMessage = async (message, type) => {
    const result = await run(
      () => restaurantPortalApi.sendRevisionMessage(payload.draft.id, message, type),
      'Не получилось отправить комментарий.',
    )
    if (!result) return false
    setPayload(result)
    return true
  }

  const uploadPhoto = async (item, file) => {
    const result = await run(() => restaurantPortalApi.uploadDraftPhotos(payload.draft.id, [file], item.id), 'Не получилось загрузить фото.')
    if (result) await reload()
  }

  const uploadBulkPhotos = async (files) => {
    const result = await run(() => restaurantPortalApi.uploadDraftPhotos(payload.draft.id, files), 'Не получилось загрузить фотографии.')
    if (result) await reload()
  }

  const deletePhoto = async (item) => {
    const result = await run(() => restaurantPortalApi.deleteDraftItemPhoto(payload.draft.id, item.id), 'Не получилось удалить фото.')
    if (result) await reload()
  }

  const assignPhoto = async (photo, itemId) => {
    const result = await run(() => restaurantPortalApi.assignDraftPhoto(payload.draft.id, photo.id, Number(itemId)), 'Не получилось сопоставить фото.')
    if (result) await reload()
  }

  const submit = async () => {
    const result = await run(() => restaurantPortalApi.submitDraft(payload.draft.id), 'Не получилось отправить обновления.')
    if (!result) return
    await refresh()
    navigate('/partners/dashboard', { replace: true, state: { menuUpdateStatus: result.status } })
  }

  if (status === 'loading') return <div className="partners partners--centered"><p>Создаём черновик меню…</p></div>
  if (status === 'error' || !payload) return <div className="partners partners--centered"><div className="partners__notice partners__notice--error">{error}</div><button className="partners__btn" onClick={() => navigate('/partners/dashboard')}>Вернуться в кабинет</button></div>

  const step = payload.draft.current_step
  const waitingForPreparation = payload.draft.status === 'extracting' && payload.revision
  return (
    <div className="partners-update">
      <FlowSidebar
        initial={isFirstPublication}
        locked={Boolean(waitingForPreparation)}
        restaurant={restaurant}
        step={step}
        onStep={payload.draft.status === 'submitted' ? () => {} : setStep}
      />
      <main className="partners-update__main">
        <header className="partners-update__topbar"><button type="button" onClick={() => navigate('/partners/dashboard')}>Сохранить и выйти</button></header>
        <div className="partners-update__content">
          {payload.draft.status === 'submitted' && <SubmittedState onExit={() => navigate('/partners/dashboard')} />}
          {waitingForPreparation && <RevisionWaiting payload={payload} busy={busy} error={error} onReply={replyToRevision} />}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 1 && !payload.draft.method && <MethodCards initial={isFirstPublication} onSelect={chooseMethod} />}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 1 && payload.draft.method === 'manual' && (
            <ManualStep
              payload={payload}
              busy={busy}
              error={error}
              onAdd={() => setDrawerItem(null)}
              onBackToMethods={() => chooseMethod(payload.draft.method === 'manual' ? 'upload' : 'manual')}
              onConfirmMatch={confirmMatch}
              onDelete={deleteItem}
              onEdit={setDrawerItem}
              onExit={() => navigate('/partners/dashboard')}
              onNext={() => setStep(2)}
              onRestore={restoreItem}
            />
          )}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 1 && payload.draft.method === 'upload' && (
            <UploadStep payload={payload} busy={busy} error={error} onBackToMethods={() => chooseMethod('manual')} onFile={uploadSource} onNext={() => setStep(2)} onReply={replyToRevision} />
          )}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 2 && <PhotosStep payload={payload} busy={busy} onBack={() => setStep(1)} onBulkPhoto={uploadBulkPhotos} onDeletePhoto={deletePhoto} onNext={() => setStep(3)} onPhoto={uploadPhoto} onAssign={assignPhoto} />}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 3 && <PreviewStep payload={payload} busy={busy} error={error} onBack={() => setStep(2)} onNext={() => setStep(4)} onMessage={sendRevisionMessage} />}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 4 && <ConfirmStep initial={isFirstPublication} payload={payload} busy={busy} error={error} onBack={() => setStep(3)} onSubmit={submit} />}
        </div>
      </main>
      {drawerItem !== undefined && (
        <ItemDrawer item={drawerItem} categories={categories} busy={busy} onClose={() => setDrawerItem(undefined)} onSave={saveItem} />
      )}
    </div>
  )
}
