import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
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

const DECIMAL_INPUT_PATTERN = /^\d*(?:[.,]\d*)?$/
const DECIMAL_VALUE_PATTERN = /^\d+(?:[.,]\d+)?$/
const ITEM_FIELD_ORDER = [
  'dish_name',
  'category',
  'price_rub',
  'composition_text',
  'portion_g',
  'kcal',
  'proteins_g',
  'fats_g',
  'carbs_g',
]
const REQUIRED_TEXT_MESSAGES = {
  dish_name: 'Укажите название блюда.',
  category: 'Укажите раздел меню.',
  composition_text: 'Укажите состав блюда.',
}
const NUMERIC_FIELD_RULES = {
  price_rub: {
    empty: 'Укажите цену.',
    range: 'Введите цену больше 0 и не более 1 000 000 ₽.',
    min: 0,
    max: 1_000_000,
    positive: true,
  },
  portion_g: {
    empty: 'Укажите вес порции.',
    range: 'Введите вес больше 0 и не более 5 000 г.',
    min: 0,
    max: 5_000,
    positive: true,
  },
  kcal: {
    empty: 'Укажите калорийность.',
    range: 'Введите калорийность от 0 до 5 000.',
    min: 0,
    max: 5_000,
    rejectSuspiciousYear: true,
  },
  proteins_g: {
    empty: 'Укажите количество белков.',
    range: 'Введите значение от 0 до 500 г.',
    min: 0,
    max: 500,
  },
  fats_g: {
    empty: 'Укажите количество жиров.',
    range: 'Введите значение от 0 до 500 г.',
    min: 0,
    max: 500,
  },
  carbs_g: {
    empty: 'Укажите количество углеводов.',
    range: 'Введите значение от 0 до 500 г.',
    min: 0,
    max: 500,
  },
}
const SUSPICIOUS_NUTRITION_YEARS = new Set([2024, 2025, 2026, 2027, 2028, 2029, 2030])
const NUMBER_FORMAT_ERROR = 'Используйте только цифры и один десятичный разделитель.'

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

function validateItemField(field, value) {
  if (REQUIRED_TEXT_MESSAGES[field]) {
    return String(value ?? '').trim() ? '' : REQUIRED_TEXT_MESSAGES[field]
  }

  const rule = NUMERIC_FIELD_RULES[field]
  if (!rule) return ''
  const source = String(value ?? '').trim()
  if (!source) return rule.empty
  if (!DECIMAL_VALUE_PATTERN.test(source)) return NUMBER_FORMAT_ERROR

  const parsed = numberOrNull(source)
  if (
    parsed == null
    || parsed < rule.min
    || (rule.positive && parsed === rule.min)
    || parsed > rule.max
  ) {
    return rule.range
  }
  if (rule.rejectSuspiciousYear && SUSPICIOUS_NUTRITION_YEARS.has(Math.round(parsed))) {
    return 'Проверьте калорийность: значение похоже на год.'
  }
  return ''
}

function validateItemForm(form) {
  return ITEM_FIELD_ORDER.reduce((errors, field) => {
    const message = validateItemField(field, form[field])
    if (message) errors[field] = message
    return errors
  }, {})
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

function inferredFurthestStep(payload) {
  if (!payload?.draft) return 1
  const currentStep = Number(payload.draft.current_step) || 1
  const preparedUpload = payload.draft.method === 'upload'
    && payload.draft.status === 'editing'
    && Boolean(payload.draft.source_kind)
  return Math.max(currentStep, preparedUpload ? 3 : 1)
}

function FlowSidebar({ restaurant, step, furthestStep, onStep, initial = false, locked = false }) {
  return (
    <aside className="partners-update__sidebar">
      <div>
        <Link className="partners-update__brand" to="/partners/dashboard">
          <img src="/assets/logo-64.png" alt="" width="42" height="42" />
          <span>RestaurantSecret</span>
        </Link>
        <Link className="partners-update__cabinet" to="/partners/dashboard">Партнёрский кабинет</Link>
        <div className="partners-update__restaurant">{restaurant.name}</div>
        <div className="partners-update__progress-copy">
          <strong>{initial ? 'Публикация меню' : 'Обновление меню'}</strong>
          <span>Шаг {step} из 4</span>
        </div>
        <div className="partners-update__progress"><span style={{ width: `${furthestStep * 25}%` }} /></div>
        <ol className="partners-update__steps">
          {STEPS.map(([title, description, optional], index) => {
            const number = index + 1
            const state = number === step ? 'active' : number < furthestStep ? 'complete' : 'pending'
            return (
              <li className={`partners-update__step partners-update__step--${state}`} key={title}>
                <button type="button" disabled={locked || number > furthestStep} onClick={() => onStep(number)}>
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

function MethodSwitcher({ activeMethod, busy, onSelect }) {
  return (
    <section className="partners-update__method-switcher" aria-labelledby="partners-update-method-switcher-title">
      <div>
        <strong id="partners-update-method-switcher-title">Выберите способ обновления меню</strong>
        <p>Обновить меню можно двумя способами: загрузить файл целиком или вручную отредактировать блюда.</p>
      </div>
      <div className="partners-update__method-switcher-actions" role="group" aria-label="Способ обновления меню">
        <button
          className={activeMethod === 'upload' ? 'active' : ''}
          type="button"
          aria-pressed={activeMethod === 'upload'}
          disabled={busy}
          onClick={() => activeMethod !== 'upload' && onSelect('upload')}
        >
          <FileSpreadsheet size={18} />
          Обновить с помощью файла
        </button>
        <button
          className={activeMethod === 'manual' ? 'active' : ''}
          type="button"
          aria-pressed={activeMethod === 'manual'}
          disabled={busy}
          onClick={() => activeMethod !== 'manual' && onSelect('manual')}
        >
          <Pencil size={18} />
          Редактировать блюда
        </button>
      </div>
    </section>
  )
}

function ItemDrawer({ item, categories, busy, onClose, onSave }) {
  const [form, setForm] = useState(item ? { ...EMPTY_ITEM, ...item } : { ...EMPTY_ITEM })
  const [addAnother, setAddAnother] = useState(false)
  const [errors, setErrors] = useState({})
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

  const updateVisibleError = (field, value) => {
    setErrors((current) => {
      if (!Object.hasOwn(current, field)) return current
      const message = validateItemField(field, value)
      const next = { ...current }
      if (message) next[field] = message
      else delete next[field]
      return next
    })
  }
  const set = (field) => (event) => {
    const value = event.target.value
    setForm((current) => ({ ...current, [field]: value }))
    updateVisibleError(field, value)
  }
  const setNumeric = (field) => (event) => {
    const value = event.target.value
    if (!DECIMAL_INPUT_PATTERN.test(value)) {
      setErrors((current) => ({
        ...current,
        [field]: value.includes('-') ? 'Значение не может быть отрицательным.' : NUMBER_FORMAT_ERROR,
      }))
      return
    }
    setForm((current) => ({ ...current, [field]: value }))
    updateVisibleError(field, value)
  }
  const validateOnBlur = (field) => () => {
    const message = validateItemField(field, form[field])
    setErrors((current) => {
      const next = { ...current }
      if (message) next[field] = message
      else delete next[field]
      return next
    })
  }
  const fieldA11y = (field) => ({
    name: field,
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })
  const fieldError = (field) => errors[field]
    ? <small className="partners-update__field-error" id={`${field}-error`} role="alert">{errors[field]}</small>
    : null
  const submit = async (event) => {
    event.preventDefault()
    const validationErrors = validateItemForm(form)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      const firstInvalidField = ITEM_FIELD_ORDER.find((field) => validationErrors[field])
      drawerRef.current?.querySelector(`[name="${firstInvalidField}"]`)?.focus()
      return
    }
    const saved = await onSave(itemFormPayload(form))
    if (saved && addAnother && !item) {
      setForm({ ...EMPTY_ITEM, category: form.category })
      setErrors({})
      firstInputRef.current?.focus()
    }
  }

  return (
    <div className="partners-update__drawer-layer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="partners-update__drawer-backdrop" type="button" aria-label="Закрыть" onClick={onClose} />
      <form className="partners-update__drawer" onSubmit={submit} ref={drawerRef} noValidate>
        <header>
          <div><small>{item ? 'Редактирование' : 'Новое блюдо'}</small><h2 id={titleId}>{item ? item.dish_name : 'Добавить блюдо'}</h2></div>
          <button type="button" aria-label="Закрыть" onClick={onClose}><X size={22} /></button>
        </header>
        <div className="partners-update__drawer-body">
          <label className="partners-update__field partners-update__field--wide">
            <span>Название блюда</span>
            <input {...fieldA11y('dish_name')} ref={firstInputRef} value={form.dish_name} onChange={set('dish_name')} onBlur={validateOnBlur('dish_name')} required />
            {fieldError('dish_name')}
          </label>
          <label className="partners-update__field">
            <span>Раздел меню</span>
            <input {...fieldA11y('category')} list="partners-menu-categories" value={form.category} onChange={set('category')} onBlur={validateOnBlur('category')} required />
            <datalist id="partners-menu-categories">{categories.map((category) => <option value={category} key={category} />)}</datalist>
            {fieldError('category')}
          </label>
          <label className="partners-update__field">
            <span>Цена, ₽</span>
            <input {...fieldA11y('price_rub')} type="text" inputMode="decimal" autoComplete="off" value={form.price_rub ?? ''} onChange={setNumeric('price_rub')} onBlur={validateOnBlur('price_rub')} required />
            {fieldError('price_rub')}
          </label>
          <label className="partners-update__field partners-update__field--wide">
            <span>Состав</span>
            <textarea {...fieldA11y('composition_text')} rows="4" value={form.composition_text ?? ''} onChange={set('composition_text')} onBlur={validateOnBlur('composition_text')} required />
            {fieldError('composition_text')}
          </label>
          <label className="partners-update__field">
            <span>Вес порции, г</span>
            <input {...fieldA11y('portion_g')} type="text" inputMode="decimal" autoComplete="off" value={form.portion_g ?? ''} onChange={setNumeric('portion_g')} onBlur={validateOnBlur('portion_g')} required />
            {fieldError('portion_g')}
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
              <input {...fieldA11y(field)} type="text" inputMode="decimal" autoComplete="off" value={form[field] ?? ''} onChange={setNumeric(field)} onBlur={validateOnBlur(field)} required />
              {fieldError(field)}
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

function ManualStep({ payload, busy, error, onAdd, onConfirmMatch, onDelete, onEdit, onExit, onNext, onRestore, onSelectMethod }) {
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
      <MethodSwitcher activeMethod="manual" busy={busy} onSelect={onSelectMethod} />
      <section className="partners-update__catalog">
        <div className="partners-update__catalog-heading">
          <div><h2>Блюда меню</h2><p>Изменения сохраняются в черновике и не видны гостям до отправки.</p></div>
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

function SourceFiles({ payload, busy, onAddFiles, onDeleteFile, onReplaceFile, showRestartHint = false }) {
  const sourceFiles = payload.revision?.source_files || []
  return (
    <div className="partners-update__source-files">
      <div className="partners-update__source-files-heading">
        <strong>{sourceFiles.length === 1 ? 'Загруженный файл' : 'Загруженные файлы'}</strong>
        <label className={`partners-update__source-file-add${busy ? ' is-disabled' : ''}`}>
          <input
            type="file"
            multiple
            disabled={busy}
            accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp"
            onChange={(event) => {
              const selected = Array.from(event.target.files || [])
              if (selected.length) onAddFiles(selected)
              event.target.value = ''
            }}
          />
          <Plus size={15} /> Добавить файлы
        </label>
      </div>
      {showRestartHint && sourceFiles.length > 0 && (
        <p className="partners-update__source-files-hint">
          Если добавить, заменить или удалить файл, фотографии и превью будут подготовлены заново.
        </p>
      )}
      {sourceFiles.length > 0 ? (
        <div className="partners-update__source-file-list">
          {sourceFiles.map((file) => {
            const details = [
              formatFileSize(file.size_bytes),
              file.page_count ? `${file.page_count} стр.` : '',
              file.sheet_count ? `${file.sheet_count} лист.` : '',
            ].filter(Boolean).join(' · ')
            return (
              <article className="partners-update__source-file" key={file.id}>
                <span className="partners-update__source-file-icon"><FileSpreadsheet size={20} /></span>
                <span className="partners-update__source-file-info">
                  <strong title={file.original_name}>{file.original_name}</strong>
                  {details && <small>{details}</small>}
                </span>
                <span className="partners-update__source-file-actions">
                  <a
                    className="partners-update__source-file-download"
                    href={restaurantPortalApi.revisionSourceDownloadUrl(payload.draft.id, file.id)}
                    download={file.original_name}
                  >
                    Скачать <Download size={16} />
                  </a>
                  <label className={busy ? 'is-disabled' : ''}>
                    <input
                      type="file"
                      disabled={busy}
                      accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(event) => {
                        const replacement = event.target.files?.[0]
                        if (replacement) onReplaceFile(file, replacement)
                        event.target.value = ''
                      }}
                    />
                    Заменить
                  </label>
                  <button type="button" disabled={busy} onClick={() => onDeleteFile(file)}>
                    <Trash2 size={15} /> Удалить
                  </button>
                </span>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="partners-update__source-files-empty">
          Файлов пока нет. Добавьте новый файл, чтобы специалист мог продолжить подготовку меню.
        </p>
      )}
    </div>
  )
}

function RevisionWaiting({ payload, busy, error, onAddFiles, onDeleteFile, onReplaceFile, onReply }) {
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
      <span>{sourceFiles.length ? 'Файл принят' : 'Ожидаем файл'}</span>
      <h2>{sourceFiles.length ? 'Меню загружено — ожидает подготовки' : 'Добавьте файл меню'}</h2>
      <p>
        {sourceFiles.length
          ? 'Мы сохранили исходные файлы без изменений. Специалист подготовит меню по шаблону, после чего автоматически откроется шаг с фотографиями и превью.'
          : 'Все исходные файлы удалены. Загрузите актуальную версию меню, чтобы специалист мог продолжить подготовку.'}
      </p>
      <SourceFiles payload={payload} busy={busy} onAddFiles={onAddFiles} onDeleteFile={onDeleteFile} onReplaceFile={onReplaceFile} />
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

function UploadStep({ payload, busy, error, onDeleteFile, onFile, onNext, onReplaceFile, onReply, onSelectMethod }) {
  const inputRef = useRef(null)
  const extracting = payload.draft.status === 'extracting'
  const sourceFiles = payload.revision?.source_files || []
  const hasPreparedSources = payload.draft.source_kind === 'unstructured' && sourceFiles.length > 0
  if (extracting && payload.revision) {
    return <RevisionWaiting payload={payload} busy={busy} error={error} onAddFiles={onFile} onDeleteFile={onDeleteFile} onReplaceFile={onReplaceFile} onReply={onReply} />
  }
  return (
    <section className="partners-update__upload-step">
      <MethodSwitcher activeMethod="upload" busy={busy} onSelect={onSelectMethod} />
      <div className="partners-update__section-heading">
        <span>Новое меню</span>
        <h2>{hasPreparedSources ? 'Файлы меню' : 'Загрузите файл'}</h2>
        <p>{hasPreparedSources ? 'Вы остаетесь в текущем черновике. Его фотографии и превью сохранены, пока вы не измените файлы.' : 'Мы сравним новую версию с опубликованной и сохраним подходящие фотографии.'}</p>
      </div>
      <a className="partners-update__template" href={restaurantPortalApi.templateDownloadUrl()} download><FileSpreadsheet size={25} /><span><strong>Шаблон Excel</strong><small>Используйте шаблон для быстрой автоматической проверки</small></span><span>Скачать</span></a>
      {hasPreparedSources ? (
        <SourceFiles payload={payload} busy={busy} onAddFiles={onFile} onDeleteFile={onDeleteFile} onReplaceFile={onReplaceFile} showRestartHint />
      ) : (
        <label className="partners-update__dropzone">
          <input ref={inputRef} multiple type="file" accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => event.target.files?.length && onFile(Array.from(event.target.files))} />
          <Upload size={42} /><strong>{busy ? 'Проверяем файл…' : 'Перетащите файл сюда или выберите на компьютере'}</strong>
          <span>Excel, PDF, JPG, PNG или WEBP</span><i>Выбрать файл</i>
        </label>
      )}
      {hasPreparedSources && (
        <div className="partners-update__comparison">
          <Check size={23} /><div><strong>Текущий черновик сохранён</strong><p>{changeSummary(payload.summary)}</p></div>
          <button className="partners-update__primary" type="button" onClick={onNext}>Вернуться к фотографиям <ArrowRight size={17} /></button>
        </div>
      )}
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

function PhotosStep({ payload, busy, onBack, onDeletePhoto, onNext, onPhoto, onAssign }) {
  const activeItems = payload.items.filter((item) => item.change_type !== 'deleted')
  const hasTransferredPhotos = activeItems.some((item) => Boolean(item.photo_transferred))
  const [tab, setTab] = useState(hasTransferredPhotos ? 'attention' : 'all')
  const needsAttention = (item) => Boolean(item.photo_attention)
  const visible = tab === 'attention' ? activeItems.filter(needsAttention) : activeItems
  const unmatched = payload.photos.filter((photo) => photo.status === 'unmatched')
  return (
    <section className="partners-update__photos-step">
      <div className="partners-update__section-heading">
        <span>Шаг 2</span>
        <h2>{hasTransferredPhotos ? 'Проверьте фотографии' : 'Добавьте фотографии (опционально)'}</h2>
        {hasTransferredPhotos && <p>Существующие фотографии уже перенесены. Загрузите новые только там, где это необходимо.</p>}
      </div>
      <div className="partners-update__tabs-row">
        <div className="partners-update__tabs">
          <button className={tab === 'attention' ? 'active' : ''} type="button" onClick={() => setTab('attention')}>Требуют внимания · {activeItems.filter(needsAttention).length}</button>
          <button className={tab === 'all' ? 'active' : ''} type="button" onClick={() => setTab('all')}>Все блюда · {activeItems.length}</button>
        </div>
      </div>
      <div className="partners-update__photo-grid">
        {visible.map((item) => (
          <article className="partners-update__photo-card" key={item.id}>
            {item.photo_url && !item.photo_removed ? <img src={restaurantPortalApi.draftItemPhotoUrl(payload.draft.id, item.id)} alt="" /> : <span className="partners-update__photo-placeholder"><ImageIcon size={30} /></span>}
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
  const openMenuPreview = () => {
    window.open(
      `/partners/menu-preview/${encodeURIComponent(payload.draft.id)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }
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
      <button className="partners-update__open-menu-preview" type="button" onClick={openMenuPreview}>
        Просмотреть превью
        <ExternalLink size={18} aria-hidden="true" />
      </button>
      <div className="partners-update__preview-grid">
        {visible.map((item) => (
          <article className={`partners-update__preview-card partners-update__preview-card--${item.change_type}`} key={item.id}>
            {item.change_type === 'deleted'
              ? <span className="partners-update__photo-placeholder"><Trash2 size={30} /></span>
              : item.photo_url && !item.photo_removed ? <img src={restaurantPortalApi.draftItemPhotoUrl(payload.draft.id, item.id)} alt="" /> : <span className="partners-update__photo-placeholder"><ImageIcon size={30} /></span>}
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
  const [furthestStep, setFurthestStep] = useState(1)
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
    setFurthestStep((current) => Math.max(current, inferredFurthestStep(data)))
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
          setFurthestStep(inferredFurthestStep(data))
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
    if (result) {
      setPayload(result)
      setFurthestStep((current) => Math.max(current, inferredFurthestStep(result)))
    }
  }

  const chooseMethod = async (method) => {
    if (payload.draft.method && payload.draft.method !== method) {
      const changed = (payload.summary.added || 0) + (payload.summary.updated || 0) + (payload.summary.deleted || 0)
      if (changed && !window.confirm('Сменить способ обновления? Уже внесённые изменения будут сброшены.')) return
    }
    const result = await run(() => restaurantPortalApi.resetDraft(payload.draft.id, method), 'Не получилось выбрать способ.')
    if (result) {
      setPayload(result)
      setFurthestStep(inferredFurthestStep(result))
    }
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
    if (result) {
      setPayload(result)
      setFurthestStep(inferredFurthestStep(result))
    }
  }

  const replyToRevision = async (message, files) => {
    const result = await run(
      () => restaurantPortalApi.replyToRevision(payload.draft.id, message, files),
      'Не получилось отправить ответ.',
    )
    if (!result) return false
    setPayload(result)
    if (files.length) setFurthestStep(inferredFurthestStep(result))
    return true
  }

  const replaceRevisionSource = async (sourceFile, replacement) => {
    const result = await run(
      () => restaurantPortalApi.replaceRevisionSource(payload.draft.id, sourceFile.id, replacement),
      'Не получилось заменить файл.',
    )
    if (!result) return false
    setPayload(result)
    setFurthestStep(inferredFurthestStep(result))
    return true
  }

  const deleteRevisionSource = async (sourceFile) => {
    if (!window.confirm(`Удалить файл «${sourceFile.original_name}»? Фотографии и превью будут подготовлены заново.`)) return false
    const result = await run(
      () => restaurantPortalApi.deleteRevisionSource(payload.draft.id, sourceFile.id),
      'Не получилось удалить файл.',
    )
    if (!result) return false
    setPayload(result)
    setFurthestStep(inferredFurthestStep(result))
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
        furthestStep={furthestStep}
        onStep={payload.draft.status === 'submitted' ? () => {} : setStep}
      />
      <main className="partners-update__main">
        <header className="partners-update__topbar"><button type="button" onClick={() => navigate('/partners/dashboard')}>Сохранить и выйти</button></header>
        <div className="partners-update__content">
          {payload.draft.status === 'submitted' && <SubmittedState onExit={() => navigate('/partners/dashboard')} />}
          {waitingForPreparation && <RevisionWaiting payload={payload} busy={busy} error={error} onAddFiles={uploadSource} onDeleteFile={deleteRevisionSource} onReplaceFile={replaceRevisionSource} onReply={replyToRevision} />}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 1 && !payload.draft.method && <MethodCards initial={isFirstPublication} onSelect={chooseMethod} />}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 1 && payload.draft.method === 'manual' && (
            <ManualStep
              payload={payload}
              busy={busy}
              error={error}
              onAdd={() => setDrawerItem(null)}
              onConfirmMatch={confirmMatch}
              onDelete={deleteItem}
              onEdit={setDrawerItem}
              onExit={() => navigate('/partners/dashboard')}
              onNext={() => setStep(2)}
              onRestore={restoreItem}
              onSelectMethod={chooseMethod}
            />
          )}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 1 && payload.draft.method === 'upload' && (
            <UploadStep payload={payload} busy={busy} error={error} onDeleteFile={deleteRevisionSource} onFile={uploadSource} onNext={() => setStep(2)} onReplaceFile={replaceRevisionSource} onReply={replyToRevision} onSelectMethod={chooseMethod} />
          )}
          {!waitingForPreparation && payload.draft.status !== 'submitted' && step === 2 && <PhotosStep payload={payload} busy={busy} onBack={() => setStep(1)} onDeletePhoto={deletePhoto} onNext={() => setStep(3)} onPhoto={uploadPhoto} onAssign={assignPhoto} />}
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
