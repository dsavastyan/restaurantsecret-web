import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { restaurantPortalApi } from '@/api/restaurantPortal'

const SUPPORT_EMAIL = 'partners@restaurantsecret.ru'

const STEPS = [
  { number: 1, title: 'Загрузите меню' },
  { number: 2, title: 'Добавьте фотографии', optional: true },
  { number: 3, title: 'Проверьте превью' },
  { number: 4, title: 'Подтвердите меню' },
]

function Icon({ name, size = 24 }) {
  const paths = {
    store: (
      <>
        <path d="M4 9.5h16l-1.5-4h-13zM5.5 9.5v9h13v-9M9 18.5v-5h6v5" />
        <path d="M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      </>
    ),
    calculator: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8 7h8v3H8zM8 14h1M12 14h1M16 14h1M8 18h1M12 18h1M16 18h1" />
      </>
    ),
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />,
    upload: (
      <>
        <path d="M7 18.5H5.5A3.5 3.5 0 0 1 5 11.6 7 7 0 0 1 18.7 10a4.5 4.5 0 0 1-.7 8.5h-1" />
        <path d="M12 21V10m0 0-4 4m4-4 4 4" />
      </>
    ),
    headset: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5.5A1.5 1.5 0 0 1 4 18.5zM20 14h-3v6h1.5a1.5 1.5 0 0 0 1.5-1.5z" />
        <path d="M17 20c0 1-1 1-2 1h-2" />
      </>
    ),
    edit: (
      <>
        <path d="m14.5 5.5 4 4M5 19l3.8-.8L19 8a1.8 1.8 0 0 0-4-4L4.8 14.2z" />
        <circle cx="12" cy="12" r="10" />
      </>
    ),
    bulb: (
      <>
        <path d="M8.5 15.5a6 6 0 1 1 7 0c-.9.7-1.3 1.4-1.4 2.2H9.9c-.1-.8-.5-1.5-1.4-2.2Z" />
        <path d="M10 21h4M10 17.7h4" />
      </>
    ),
    arrowLeft: <path d="m14.5 5-7 7 7 7M8 12h11" />,
    arrowRight: <path d="m9.5 5 7 7-7 7M16 12H5" />,
    camera: (
      <>
        <path d="M4 7.5h4l1.5-2h5l1.5 2h4v11H4z" />
        <circle cx="12" cy="13" r="3.2" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    scanEye: (
      <>
        <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
        <path d="M5.5 12s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4-6.5-4-6.5-4Z" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10.5V17M12 7.2h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
  }

  return (
    <svg
      aria-hidden="true"
      className="partners-setup__icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[name]}
      </g>
    </svg>
  )
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

function getFileBadge(filename) {
  const parts = String(filename || '').split('.')
  if (parts.length < 2) return 'FILE'
  const extension = parts.pop()?.toLocaleUpperCase('ru-RU')
  if (!extension) return 'FILE'
  if (extension === 'JPEG') return 'JPG'
  return extension.slice(0, 4)
}

function RestaurantSwitcher({ onRestaurantChange, restaurant, restaurants }) {
  if (restaurants.length <= 1) return null

  return (
    <label className="partners-setup__restaurant-card">
      <span className="partners-setup__restaurant-icon"><Icon name="store" size={19} /></span>
      <span>
        <select
          aria-label="Выберите ресторан"
          onChange={(event) => onRestaurantChange?.(event.target.value)}
          value={restaurant.id}
        >
          {restaurants.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <small>Выберите ресторан</small>
      </span>
    </label>
  )
}

function SetupSidebar({ onRestaurantChange, restaurant, restaurants, step }) {
  const hasMultipleRestaurants = restaurants.length > 1

  return (
    <aside className={`partners-setup__sidebar${hasMultipleRestaurants ? ' partners-setup__sidebar--multiple' : ''}`}>
      <div>
        <Link className="partners-setup__brand" to="/" aria-label="RestaurantSecret — на главную">
          <img src="/assets/logo-64.png" width="42" height="42" alt="" aria-hidden="true" />
          <span>RestaurantSecret</span>
        </Link>
        <p className="partners-setup__cabinet-label">Партнёрский кабинет</p>
        <RestaurantSwitcher
          onRestaurantChange={onRestaurantChange}
          restaurant={restaurant}
          restaurants={restaurants}
        />

        <div className="partners-setup__progress-copy">
          <strong>Публикация меню</strong>
          <span>Шаг {step} из {STEPS.length}</span>
        </div>
        <div
          className="partners-setup__progress"
          role="progressbar"
          aria-label="Прогресс публикации меню"
          aria-valuemin="1"
          aria-valuemax={STEPS.length}
          aria-valuenow={step}
        >
          <span style={{ width: `${(step / STEPS.length) * 100}%` }} />
        </div>

        <ol className="partners-setup__steps">
          {STEPS.map((item) => {
            const state = item.number < step ? 'complete' : item.number === step ? 'active' : 'pending'
            return (
              <li className={`partners-setup__step partners-setup__step--${state}`} key={item.number}>
                <span className="partners-setup__step-number">
                  {state === 'complete' ? <Icon name="check" size={18} /> : item.number}
                </span>
                <span className="partners-setup__step-copy">
                  <strong>{item.title}</strong>
                  <small>{getStepStatusLabel(item, state, step)}</small>
                </span>
                {state === 'complete' && (
                  <span className="partners-setup__step-check"><Icon name="check" size={18} /></span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="partners-setup__help">
        <Icon name="headset" size={24} />
        <span>
          <strong>Нужна помощь?</strong>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </span>
      </div>
    </aside>
  )
}

function getStepStatusLabel(item, state, currentStep) {
  if (state === 'active') return 'Текущий шаг'
  if (state !== 'complete') return item.optional ? 'Необязательно' : 'Недоступно'
  if (currentStep === 2 && item.number === 1) return 'Файл загружен'
  if (item.number === 2 && currentStep < 4) return 'Выполнено (необязательно)'
  return 'Выполнено'
}

function FileDropzone({
  accept,
  buttonLabel,
  className = '',
  file,
  icon,
  inputRef,
  label,
  multiple = false,
  onFiles,
  supportText,
}) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  const readFiles = (fileList) => {
    const next = Array.from(fileList || [])
    if (next.length) onFiles(multiple ? next : next[0])
  }

  return (
    <div
      className={`partners-setup__dropzone${className ? ` ${className}` : ''}${dragging ? ' partners-setup__dropzone--dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        readFiles(event.dataTransfer.files)
      }}
    >
      <input
        accept={accept}
        className="partners-setup__file-input"
        id={inputId}
        multiple={multiple}
        onChange={(event) => readFiles(event.target.files)}
        ref={inputRef}
        type="file"
      />
      <span className="partners-setup__drop-icon"><Icon name={icon} size={54} /></span>
      {label && <strong>{label}</strong>}
      <span>{supportText}</span>
      <label className="partners-setup__choose-button" htmlFor={inputId}>
        {file ? 'Заменить файл' : buttonLabel || (multiple ? 'Выбрать фотографии' : 'Выбрать файл')}
      </label>
    </div>
  )
}

function MenuFileSummary({ file, onRemove }) {
  return (
    <div className="partners-setup__file-summary">
      <span className="partners-setup__file-type">{getFileBadge(file.name)}</span>
      <span>
        <strong>{file.name}</strong>
        <small>{formatBytes(file.size)}</small>
      </span>
      <button aria-label="Убрать файл" onClick={onRemove} type="button"><Icon name="close" size={18} /></button>
    </div>
  )
}

function formatErrorRows(rows) {
  const uniqueRows = [...new Set(rows.filter(Boolean))].sort((a, b) => a - b)
  if (!uniqueRows.length) return ''
  if (uniqueRows.length === 1) return `В строке ${uniqueRows[0]}`
  if (uniqueRows.length === 2) return `В строках ${uniqueRows[0]} и ${uniqueRows[1]}`
  if (uniqueRows.length === 3) return `В строках ${uniqueRows[0]}, ${uniqueRows[1]} и ${uniqueRows[2]}`
  return `В ${uniqueRows.length} строках`
}

function pluralizeDishes(count) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'блюдо'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'блюда'
  return 'блюд'
}

function summarizeValidationErrors(errors) {
  const groups = new Map()
  for (const error of errors) {
    const key = `${error.type || 'other'}:${error.field || ''}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(error)
  }

  return Array.from(groups.values()).map((group) => {
    const first = group[0]
    const rows = group.map((error) => Number(error.row)).filter(Number.isFinite)
    const rowPrefix = formatErrorRows(rows)
    const fieldLabels = {
      kcal: 'калорийность',
      proteins_g: 'белки',
      fats_g: 'жиры',
      carbs_g: 'углеводы',
      portion_g: 'выход блюда',
    }
    const fieldLabel = fieldLabels[first.field] || first.field

    if (first.type === 'duplicate_dish') {
      return `Найдено ${group.length} дублирующихся ${pluralizeDishes(group.length)}.`
    }
    if (first.type === 'blank_row') return `${rowPrefix} отсутствуют данные.`
    if (first.type === 'missing_value' && first.field === 'dish_name') {
      return `${rowPrefix} не указано название блюда.`
    }
    if (first.type === 'missing_value') return `${rowPrefix} не заполнено поле «${fieldLabel}».`
    if (first.type === 'invalid_number') return `${rowPrefix} значение «${fieldLabel}» указано в неверном формате.`
    if (first.type === 'negative_value') return `${rowPrefix} значение «${fieldLabel}» отрицательное.`
    if (first.type === 'suspicious_nutrition') return `${rowPrefix} значение «${fieldLabel}» выглядит ошибочным.`
    return first.message
  })
}

function UploadValidationResult({
  errors,
  loading,
  onReplace,
  status,
  validationKey,
}) {
  const [expanded, setExpanded] = useState(false)
  const summaries = summarizeValidationErrors(errors)
  const visibleSummaries = expanded ? summaries : summaries.slice(0, 4)

  if (loading || status === 'validating') {
    return (
      <div className="partners-setup__validation-result partners-setup__validation-result--checking" role="status">
        <span className="partners-setup__validation-spinner" aria-hidden="true" />
        <div>
          <h3>Проверяем данные</h3>
          <p>Запускаем автоматическую проверку:</p>
          <ul className="partners-setup__validation-checks">
            <li>обязательные поля и пустые значения</li>
            <li>корректность чисел и отрицательные значения</li>
            <li>дубли блюд</li>
            <li>потенциально ошибочные КБЖУ</li>
          </ul>
        </div>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="partners-setup__validation-result partners-setup__validation-result--processing" role="status">
        <span className="partners-setup__validation-success"><Icon name="check" size={24} /></span>
        <div>
          <h3>Файл успешно загружен</h3>
          <p>
            Спасибо за загрузку. Файл заполнен не по шаблону, поэтому нам понадобится немного больше
            времени, чтобы обработать меню. Мы сообщим, когда превью будет готово.
          </p>
          <span className="partners-setup__processing-status-badge">Статус: На обработке</span>
        </div>
      </div>
    )
  }

  if (status === 'ready') {
    return (
      <div className="partners-setup__validation-result partners-setup__validation-result--success" role="status">
        <span className="partners-setup__validation-success"><Icon name="check" size={24} /></span>
        <div>
          <h3>Файл успешно загружен</h3>
          <p>Автоматическая проверка завершена. Ошибок не найдено.</p>
        </div>
      </div>
    )
  }

  if (!errors.length) return null

  return (
    <div className="partners-setup__validation-result partners-setup__validation-result--issues">
      <div className="partners-setup__validation-issues-heading">
        <span className="partners-setup__validation-success"><Icon name="check" size={24} /></span>
        <div>
          <h3>Файл успешно загружен</h3>
          <p>Автоматическая проверка нашла данные, которые нужно исправить.</p>
        </div>
      </div>
      <ul className="partners-setup__validation-errors">
        {visibleSummaries.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
      </ul>
      {summaries.length > 4 && (
        <button
          className="partners-setup__validation-expand"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? 'Скрыть ошибки' : `Показать все ошибки (${summaries.length})`}
        </button>
      )}
      <div className="partners-setup__validation-actions">
        {validationKey && (
          <a href={restaurantPortalApi.validationDownloadUrl(validationKey)} download>
            <Icon name="download" size={19} />
            Скачать Excel с результатами проверки
          </a>
        )}
        <button onClick={onReplace} type="button">Заменить файл</button>
      </div>
    </div>
  )
}

function UploadStep({
  error,
  file,
  loading,
  onContinue,
  onFile,
  previewStatus,
  validationErrors,
  validationKey,
}) {
  const inputRef = useRef(null)

  return (
    <>
      <div className="partners-setup__template">
        <span className="partners-setup__template-icon"><Icon name="calculator" size={29} /></span>
        <span>
          <strong>Рекомендуем использовать шаблон Excel</strong>
          <small>Так мы быстрее обработаем меню и реже будем обращаться к вам за уточнениями.</small>
        </span>
        <a href={restaurantPortalApi.templateDownloadUrl()} download>
          <Icon name="download" size={23} />
          Скачать шаблон
        </a>
      </div>

      <section className="partners-setup__section">
        <h2>Загрузите меню</h2>
        <FileDropzone
          accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,image/jpeg,image/png,image/webp"
          file={file}
          icon="upload"
          inputRef={inputRef}
          label="Перетащите файл сюда или выберите на компьютере"
          onFiles={onFile}
          supportText="Поддерживаются Excel, PDF, JPG, PNG и WEBP"
        />
        {file && <MenuFileSummary file={file} onRemove={() => onFile(null)} />}
        {file && (
          <UploadValidationResult
            errors={validationErrors}
            loading={loading}
            onReplace={() => inputRef.current?.click()}
            status={previewStatus}
            validationKey={validationKey}
          />
        )}
        {error && <div className="partners__notice partners__notice--error" role="alert">{error}</div>}
      </section>

      <FlowFooter
        continueDisabled={!file || loading || validationErrors.length > 0}
        continueLabel={
          loading
            ? 'Проверяем данные…'
            : previewStatus === 'ready' || previewStatus === 'processing'
              ? 'Продолжить'
              : 'Проверить файл'
        }
        onContinue={onContinue}
      />
    </>
  )
}

function PhotosStep({ files, onBack, onContinue, onFiles }) {
  const inputRef = useRef(null)

  return (
    <>
      <section className="partners-setup__section partners-setup__section--standalone partners-setup__photos">
        <h2>Загрузите фотографии</h2>
        <p>
          Перетащите файлы сюда или выберите на компьютере.<br />
          Мы попробуем сопоставить их с названиями блюд автоматически.
        </p>
        <FileDropzone
          accept="image/*"
          buttonLabel="Выбрать файлы"
          className="partners-setup__photo-dropzone"
          file={files.length ? files[0] : null}
          icon="upload"
          inputRef={inputRef}
          label=""
          multiple
          onFiles={onFiles}
          supportText="JPG, PNG или WEBP, не более 10 МБ на файл"
        />
        {files.length > 0 && (
          <div className="partners-setup__photo-summary">
            <strong>Выбрано фотографий: {files.length}</strong>
            <button onClick={() => onFiles([])} type="button">Очистить</button>
          </div>
        )}
        <div className="partners-setup__photo-tips">
          <span className="partners-setup__tips-icon"><Icon name="bulb" size={21} /></span>
          <div>
            <strong>Советы для быстрой загрузки</strong>
            <ul>
              <li>Называйте файлы как блюда в меню (например, «Цезарь с курицей.jpg»)</li>
              <li>Используйте качественные, хорошо освещённые фото</li>
              <li>Формат: JPG, PNG или WEBP</li>
            </ul>
          </div>
          <DishPhotoExample />
        </div>
      </section>
      <FlowFooter
        continueIcon="arrowRight"
        continueLabel="Продолжить"
        onBack={onBack}
        onContinue={onContinue}
        onSecondary={() => {
          onFiles([])
          onContinue()
        }}
        secondaryLabel="Пропустить этот шаг"
      />
    </>
  )
}

function DishPhotoExample() {
  return (
    <div className="partners-setup__dish-example" aria-hidden="true">
      <svg viewBox="0 0 136 104">
        <defs>
          <linearGradient id="table" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#e9e4d7" />
            <stop offset="1" stopColor="#d8d0be" />
          </linearGradient>
          <radialGradient id="plate" cx=".45" cy=".4" r=".62">
            <stop offset=".68" stopColor="#fffdf7" />
            <stop offset=".72" stopColor="#d8d4cb" />
            <stop offset=".79" stopColor="#f8f5ec" />
            <stop offset="1" stopColor="#c9c1b3" />
          </radialGradient>
        </defs>
        <rect width="136" height="104" rx="12" fill="url(#table)" />
        <circle cx="68" cy="52" r="44" fill="url(#plate)" />
        <g fill="#79a64f">
          <ellipse cx="47" cy="43" rx="15" ry="9" transform="rotate(-24 47 43)" />
          <ellipse cx="77" cy="34" rx="17" ry="9" transform="rotate(18 77 34)" />
          <ellipse cx="84" cy="61" rx="17" ry="10" transform="rotate(-21 84 61)" />
          <ellipse cx="52" cy="65" rx="16" ry="9" transform="rotate(16 52 65)" />
        </g>
        <g fill="#e9c583" stroke="#c89f59" strokeWidth="1.2">
          <rect x="42" y="34" width="24" height="11" rx="5.5" transform="rotate(20 42 34)" />
          <rect x="67" y="43" width="27" height="11" rx="5.5" transform="rotate(-16 67 43)" />
          <rect x="45" y="59" width="27" height="11" rx="5.5" transform="rotate(-15 45 59)" />
          <rect x="73" y="64" width="24" height="10" rx="5" transform="rotate(18 73 64)" />
        </g>
        <g fill="#efb94d">
          <circle cx="65" cy="31" r="5" />
          <circle cx="96" cy="51" r="5" />
          <circle cx="61" cy="76" r="4.5" />
        </g>
      </svg>
      <span className="partners-setup__dish-filename">
        Цезарь с курицей.jpg
        <i><Icon name="check" size={14} /></i>
      </span>
    </div>
  )
}

function normalizePhotoName(value) {
  return String(value || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .toLocaleLowerCase('ru-RU')
    .replace(/[^a-zа-яё0-9]+/gi, ' ')
    .trim()
}

function MenuPreviewDialog({ data, onClose, photos, restaurant }) {
  const [photoUrls, setPhotoUrls] = useState([])

  useEffect(() => {
    const next = photos.map((file) => ({
      name: normalizePhotoName(file.name),
      url: URL.createObjectURL(file),
    }))
    setPhotoUrls(next)
    return () => next.forEach((item) => URL.revokeObjectURL(item.url))
  }, [photos])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const groups = (data.preview || []).reduce((result, item) => {
    const category = item.category || 'Меню'
    if (!result.has(category)) result.set(category, [])
    result.get(category).push(item)
    return result
  }, new Map())

  return (
    <div className="partners-menu-preview" role="dialog" aria-modal="true" aria-labelledby="menu-preview-title">
      <button className="partners-menu-preview__backdrop" aria-label="Закрыть превью" onClick={onClose} type="button" />
      <div className="partners-menu-preview__panel">
        <header>
          <span>
            <small>Предварительный просмотр</small>
            <h2 id="menu-preview-title">{restaurant.name}</h2>
          </span>
          <button aria-label="Закрыть превью" onClick={onClose} type="button"><Icon name="close" size={22} /></button>
        </header>
        <div className="partners-menu-preview__body">
          <div className="partners-menu-preview__intro">
            <span>{data.dishes_count} блюд</span>
            <span>{data.categories_count} категорий</span>
            <span>{photos.length ? `${photos.length} фото` : 'Без фотографий'}</span>
          </div>
          {Array.from(groups.entries()).map(([category, items]) => (
            <section key={category}>
              <h3>{category}</h3>
              <div className="partners-menu-preview__grid">
                {items.map((item, index) => {
                  const photo = photoUrls.find((candidate) => candidate.name === normalizePhotoName(item.dish_name))
                  return (
                    <article key={`${item.dish_name}-${index}`}>
                      {photo
                        ? <img alt="" src={photo.url} />
                        : <span className="partners-menu-preview__placeholder" aria-hidden="true">{item.dish_name.charAt(0)}</span>}
                      <div>
                        <h4>{item.dish_name}</h4>
                        {item.composition_text && <p>{item.composition_text}</p>}
                        <dl>
                          <div><dt>Ккал</dt><dd>{item.kcal}</dd></div>
                          <div><dt>Белки</dt><dd>{item.proteins_g}</dd></div>
                          <div><dt>Жиры</dt><dd>{item.fats_g}</dd></div>
                          <div><dt>Углеводы</dt><dd>{item.carbs_g}</dd></div>
                        </dl>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
        <footer>
          <button onClick={onClose} type="button">Вернуться к проверке</button>
        </footer>
      </div>
    </div>
  )
}

function PreviewStep({ data, onBack, onContinue, photos, restaurant }) {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <>
      <section className="partners-setup__section partners-setup__section--standalone partners-setup__preview-step">
        <div className="partners-setup__preview-inner">
          <div className="partners-setup__preview-heading">
            <span><Icon name="scanEye" size={53} /></span>
            <div>
              <h2>Проверьте превью</h2>
              <p>Это то, как меню увидит пользователь ресторана.</p>
            </div>
          </div>
          <button className="partners-setup__open-preview" onClick={() => setPreviewOpen(true)} type="button">
            Открыть предварительный просмотр меню
          </button>
          <div className="partners-setup__preview-checklist">
            <h3>Что стоит проверить</h3>
            <ul>
              <li>названия блюд и категорий</li>
              <li>цены</li>
              <li>описания</li>
              <li>фотографии, если вы их добавили</li>
              <li>порядок карточек</li>
            </ul>
          </div>
          <div className="partners-setup__preview-info">
            <Icon name="info" size={25} />
            <span>Если всё выглядит корректно, можно переходить к подтверждению публикации.</span>
          </div>
        </div>
      </section>
      <FlowFooter onBack={onBack} onContinue={onContinue} continueLabel="Продолжить" />
      {previewOpen && (
        <MenuPreviewDialog
          data={data}
          onClose={() => setPreviewOpen(false)}
          photos={photos}
          restaurant={restaurant}
        />
      )}
    </>
  )
}

function ProcessingAction({ description, icon, label, onClick }) {
  return (
    <button className="partners-setup__processing-action" onClick={onClick} type="button">
      <span className="partners-setup__processing-action-icon"><Icon name={icon} size={31} /></span>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <span className="partners-setup__processing-chevron" aria-hidden="true">›</span>
    </button>
  )
}

function ProcessingPreviewStep({ error, file, onAddPhotos, onBack, onDownload, onReplace }) {
  const failed = Boolean(error)

  return (
    <>
      <section
        className={`partners-setup__section partners-setup__section--standalone partners-setup__processing${failed ? ' partners-setup__processing--error' : ''}`}
        aria-live="polite"
      >
        <div className="partners-setup__processing-status">
          <span className="partners-setup__processing-mark" aria-hidden="true">
            {failed ? <Icon name="close" size={33} /> : <span className="partners-setup__spinner" />}
          </span>
          <div>
            <h2>{failed ? 'Не удалось подготовить превью' : 'Мы обрабатываем меню'}</h2>
            <p>
              Файл «{file?.name || 'Меню.xlsx'}» успешно загружен.<br />
              {failed
                ? 'Попробуйте заменить файл или повторить загрузку.'
                : 'Мы сообщим, когда превью будет готово.'}
            </p>
            {failed && <div className="partners__notice partners__notice--error" role="alert">{error}</div>}
          </div>
        </div>

        <div className="partners-setup__processing-options">
          <h3>Что можно сделать сейчас:</h3>
          <div>
            <ProcessingAction
              description="Вы сможете прикрепить фотографии блюд до публикации."
              icon="camera"
              label="Добавить фотографии"
              onClick={onAddPhotos}
            />
            <ProcessingAction
              description="Загрузите новый файл, если нужно внести изменения."
              icon="file"
              label="Заменить файл"
              onClick={onReplace}
            />
            <ProcessingAction
              description="Сохраните загруженный файл на компьютере."
              icon="download"
              label="Скачать загруженный файл"
              onClick={onDownload}
            />
          </div>
        </div>
      </section>
      <FlowFooter onBack={onBack} />
    </>
  )
}

function ConfirmStep({ error, loading, onBack, onPublish }) {
  return (
    <>
      <section className="partners-setup__section partners-setup__section--standalone partners-setup__confirm">
        <span className="partners-setup__confirm-mark"><Icon name="check" size={32} /></span>
        <h2>Подтвердите меню</h2>
        <p>Убедитесь, что всё загружено верно, и подтвердите публикацию.</p>
        <button
          className="partners-setup__confirm-action"
          disabled={loading}
          onClick={onPublish}
          type="button"
        >
          {loading ? 'Публикуем меню…' : 'Подтвердить меню'}
        </button>
        <div className="partners-setup__confirm-info">
          <Icon name="info" size={25} />
          <span>После подтверждения QR-код появится в кабинете<br />и будет отправлен на вашу почту.</span>
        </div>
        {error && <div className="partners__notice partners__notice--error" role="alert">{error}</div>}
      </section>
      <FlowFooter onBack={onBack} />
    </>
  )
}

function FlowFooter({
  continueDisabled = false,
  continueIcon,
  continueLabel,
  onBack,
  onContinue,
  onSecondary,
  secondaryLabel,
}) {
  return (
    <footer className="partners-setup__footer">
      <button className="partners-setup__back" disabled={!onBack} onClick={onBack} type="button">
        <Icon name="arrowLeft" size={20} /> Назад
      </button>
      {(onSecondary || continueLabel) && (
        <div className="partners-setup__footer-actions">
          {onSecondary && (
            <button className="partners-setup__skip" onClick={onSecondary} type="button">
              {secondaryLabel}
            </button>
          )}
          {continueLabel && (
            <button
              className="partners-setup__continue"
              disabled={continueDisabled}
              onClick={onContinue}
              type="button"
            >
              {continueLabel}
              {continueIcon && <Icon name={continueIcon} size={20} />}
            </button>
          )}
        </div>
      )}
    </footer>
  )
}

export default function PartnersSetupFlow({
  handleLogout,
  onRestaurantChange,
  restaurant,
  restaurants = [],
  refresh,
}) {
  const previewRequestRef = useRef(0)
  const [step, setStep] = useState(1)
  const [menuFile, setMenuFile] = useState(null)
  const [photos, setPhotos] = useState([])
  const [preview, setPreview] = useState(null)
  const [previewStatus, setPreviewStatus] = useState('idle')
  const [validationErrors, setValidationErrors] = useState([])
  const [validationKey, setValidationKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const previewMenu = async () => {
    if (!menuFile) return
    if ((previewStatus === 'ready' || previewStatus === 'processing') && !validationErrors.length) {
      setStep(2)
      return
    }
    const requestId = ++previewRequestRef.current
    setLoading(true)
    setError(null)
    setValidationErrors([])
    setValidationKey(null)
    setPreviewStatus('validating')
    try {
      const data = await restaurantPortalApi.previewMenu(menuFile)
      if (requestId !== previewRequestRef.current) return
      setPreview(data)
      setPreviewStatus(data?.status === 'processing' ? 'processing' : 'ready')
    } catch (err) {
      if (requestId !== previewRequestRef.current) return
      if (err.rowErrors?.length) {
        setValidationErrors(err.rowErrors)
        setValidationKey(err.validationKey || null)
        setPreviewStatus('validation_errors')
      } else {
        setError(err.message || 'Не получилось проверить файл.')
        setPreviewStatus('idle')
      }
    } finally {
      if (requestId === previewRequestRef.current) setLoading(false)
    }
  }

  const publish = async () => {
    setLoading(true)
    setError(null)
    try {
      await restaurantPortalApi.uploadMenu(menuFile)
      if (photos.length) {
        try {
          await restaurantPortalApi.uploadPhotos(photos)
        } catch {
          // The menu is already safely published. Photos remain an optional follow-up action.
        }
      }
      await refresh()
    } catch (err) {
      setError(err.rowErrors?.map((item) => item.message).join(' ') || err.message || 'Не получилось опубликовать меню.')
      setLoading(false)
    }
  }

  const setFile = (file) => {
    previewRequestRef.current += 1
    setMenuFile(file)
    setPreview(null)
    setPreviewStatus('idle')
    setValidationErrors([])
    setValidationKey(null)
    setLoading(false)
    setError(null)
  }

  const replaceFile = () => {
    setFile(null)
    setStep(1)
  }

  const downloadMenuFile = () => {
    if (!menuFile) return
    const url = URL.createObjectURL(menuFile)
    const link = document.createElement('a')
    link.href = url
    link.download = menuFile.name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <div className="partners-setup">
      <SetupSidebar
        onRestaurantChange={onRestaurantChange}
        restaurant={restaurant}
        restaurants={restaurants}
        step={step}
      />
      <main className="partners-setup__main">
        <header className="partners-setup__topbar">
          <button className="partners-setup__logout" onClick={handleLogout} type="button">Выйти</button>
        </header>
        <div className="partners-setup__content">
          <div className={`partners-setup__heading${step === 1 ? ' partners-setup__heading--title-only' : ''}${step === 2 ? ' partners-setup__heading--with-note' : ''}`}>
            <div>
              <h1>{restaurant.name.toLocaleUpperCase('ru-RU')}</h1>
              {step !== 1 && (
                <p>
                  {step === 2 && 'Добавьте фотографии блюд, чтобы меню выглядело ещё привлекательнее для гостей.'}
                  {step === 3 && 'Проверьте названия блюд, цены, описания и фотографии перед публикацией.'}
                  {step === 4 && 'Проверьте названия блюд, цены, описания и фотографии перед публикацией.'}
                </p>
              )}
            </div>
            {step === 2 && (
              <aside className="partners-setup__optional-note">
                <Icon name="edit" size={29} />
                <span>
                  <strong>Этот шаг можно пропустить</strong>
                  <small>Вы сможете добавить фотографии позже<br />в любое время в кабинете.</small>
                </span>
              </aside>
            )}
          </div>

          <div className="partners-setup__card">
            {step === 1 && (
              <UploadStep
                error={error}
                file={menuFile}
                loading={loading}
                onContinue={previewMenu}
                onFile={setFile}
                previewStatus={previewStatus}
                validationErrors={validationErrors}
                validationKey={validationKey}
              />
            )}
            {step === 2 && (
              <PhotosStep
                files={photos}
                onBack={() => setStep(1)}
                onContinue={() => setStep(3)}
                onFiles={setPhotos}
              />
            )}
            {step === 3 && (
              previewStatus === 'ready' && preview ? (
                <PreviewStep
                  data={preview}
                  onBack={() => setStep(2)}
                  onContinue={() => setStep(4)}
                  photos={photos}
                  restaurant={restaurant}
                />
              ) : (
                <ProcessingPreviewStep
                  error={previewStatus === 'error' ? error : null}
                  file={menuFile}
                  onAddPhotos={() => setStep(2)}
                  onBack={() => setStep(2)}
                  onDownload={downloadMenuFile}
                  onReplace={replaceFile}
                />
              )
            )}
            {step === 4 && (
              <ConfirmStep
                error={error}
                loading={loading}
                onBack={() => setStep(3)}
                onPublish={publish}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
