import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  FileSpreadsheet,
  Image as ImageIcon,
  Upload,
} from 'lucide-react'
import { restaurantPortalApi } from '@/api/restaurantPortal'
import './update-flow.css'
import './seasonal-flow.css'

const STEPS = [
  ['Меню', 'Параметры и сезонные блюда'],
  ['Фотографии', 'Фото новых позиций', true],
  ['Превью', 'Проверьте результат'],
  ['Подтверждение', 'Запустите публикацию'],
]

const STATUS_LABELS = {
  draft: 'Черновик',
  scheduled: 'Запланировано',
  active: 'Активно',
  completed: 'Завершено',
  moderation: 'На модерации',
}

function todayIso() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function formatDate(value, options = {}) {
  if (!value) return 'без даты окончания'
  return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(options.year === false ? {} : { year: 'numeric' }),
  })
}

function periodLabel(startDate, endDate) {
  if (!endDate) return `с ${formatDate(startDate)}`
  const sameYear = startDate?.slice(0, 4) === endDate?.slice(0, 4)
  return `${formatDate(startDate, { year: !sameYear })}–${formatDate(endDate)}`
}

function dishCountLabel(value) {
  const count = Number(value) || 0
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'блюдо'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'блюда'
  return 'блюд'
}

function SeasonalSidebar({ restaurant, step, furthestStep, onStep }) {
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
          <strong>Сезонное меню</strong>
          <span>Шаг {step} из 4</span>
        </div>
        <div className="partners-update__progress"><span style={{ width: `${furthestStep * 25}%` }} /></div>
        <ol className="partners-update__steps">
          {STEPS.map(([title, description, optional], index) => {
            const number = index + 1
            const state = number === step ? 'active' : number < furthestStep ? 'complete' : 'pending'
            return (
              <li className={`partners-update__step partners-update__step--${state}`} key={title}>
                <button type="button" disabled={number > furthestStep} onClick={() => onStep(number)}>
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

function SeasonalItemImage({ menuId, item }) {
  if (!item.has_photo) {
    return <div className="partners-update__photo-placeholder"><ImageIcon size={34} /></div>
  }
  return (
    <img
      src={restaurantPortalApi.seasonalItemPhotoUrl(menuId, item.id)}
      alt=""
    />
  )
}

function StepOne({
  form,
  restaurants,
  payload,
  busy,
  error,
  fileRef,
  onField,
  onOutlet,
  onFile,
  onResolve,
  onNext,
}) {
  const items = payload?.items || []
  const duplicates = items.filter((item) => item.duplicate_resolution)
  return (
    <section className="seasonal-flow__step">
      <div className="partners-update__section-heading seasonal-flow__heading">
        <span>Шаг 1</span>
        <h2>Добавьте сезонное меню</h2>
        <p>Загрузите только сезонные позиции. Основное меню останется без изменений.</p>
      </div>

      <div className="seasonal-flow__parameters">
        <label className="seasonal-flow__field seasonal-flow__field--wide">
          <span>Название меню</span>
          <input value={form.name} placeholder="Летнее меню" onChange={(event) => onField('name', event.target.value)} />
        </label>
        <div className="seasonal-flow__date-group">
          <strong>Когда показывать гостям</strong>
          <label className="seasonal-flow__field">
            <span>Начало</span>
            <input type="date" required value={form.start_date} onChange={(event) => onField('start_date', event.target.value)} />
          </label>
          <label className="seasonal-flow__field">
            <span>Завершение</span>
            <input
              type="date"
              value={form.end_date}
              min={form.start_date}
              disabled={form.no_end_date}
              onChange={(event) => onField('end_date', event.target.value)}
            />
          </label>
          <label className="seasonal-flow__no-end">
            <input
              type="checkbox"
              checked={form.no_end_date}
              onChange={(event) => onField('no_end_date', event.target.checked)}
            />
            Без даты окончания
          </label>
        </div>

        {restaurants.length > 1 && (
          <fieldset className="seasonal-flow__outlets">
            <legend>Где действует меню</legend>
            {restaurants.map((restaurant) => (
              <label key={restaurant.id}>
                <input
                  type="checkbox"
                  checked={form.restaurant_ids.includes(Number(restaurant.id))}
                  onChange={() => onOutlet(Number(restaurant.id))}
                />
                {restaurant.name}
              </label>
            ))}
          </fieldset>
        )}
      </div>

      <div className="seasonal-flow__upload-block">
        <div>
          <h3>Загрузите сезонные позиции</h3>
          <p>Используйте тот же Excel-шаблон, что и для основного меню. В файле должны быть только временные блюда.</p>
        </div>
        <label className="partners-update__dropzone seasonal-flow__dropzone">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            disabled={busy}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          <FileSpreadsheet size={38} />
          <strong>{payload?.menu?.source_filename || 'Перетащите Excel-файл сюда'}</strong>
          <span>.xlsx или .xls · только сезонные блюда</span>
          <i>{busy ? 'Проверяем…' : payload?.menu?.source_filename ? 'Заменить файл' : 'Выбрать файл'}</i>
        </label>
        {items.length > 0 && (
          <div className="seasonal-flow__file-result">
            <Check size={20} />
            <div><strong>Найдено {items.length} {dishCountLabel(items.length)}</strong><span>Основное меню не будет изменено</span></div>
          </div>
        )}
      </div>

      {duplicates.length > 0 && (
        <section className="seasonal-flow__duplicates" aria-labelledby="seasonal-duplicates-title">
          <div>
            <span>Сравнение с основным меню</span>
            <h3 id="seasonal-duplicates-title">Уточните совпадающие блюда</h3>
          </div>
          {duplicates.map((item) => (
            <article className={item.duplicate_resolution === 'pending' ? '' : 'is-resolved'} key={item.id}>
              <div>
                <strong>«{item.dish_name}» уже есть в основном меню.</strong>
                <p>Это то же блюдо или отдельная сезонная версия?</p>
              </div>
              <div role="group" aria-label={`Совпадение для ${item.dish_name}`}>
                <button
                  type="button"
                  className={item.duplicate_resolution === 'same' ? 'active' : ''}
                  disabled={busy}
                  onClick={() => onResolve(item, 'same')}
                >
                  То же блюдо
                </button>
                <button
                  type="button"
                  className={item.duplicate_resolution === 'separate' ? 'active' : ''}
                  disabled={busy}
                  onClick={() => onResolve(item, 'separate')}
                >
                  Отдельная позиция
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {error && <div className="partners__notice partners__notice--error">{error}</div>}
      <footer className="partners-update__flow-actions">
        <Link to="/partners/dashboard"><ArrowLeft size={18} /> В кабинет</Link>
        <button className="partners-update__primary" type="button" disabled={busy} onClick={onNext}>
          Перейти к фотографиям <ArrowRight size={18} />
        </button>
      </footer>
    </section>
  )
}

function StepPhotos({ payload, busyItemId, error, onUpload, onBack, onNext }) {
  return (
    <section className="seasonal-flow__step">
      <div className="partners-update__section-heading seasonal-flow__heading">
        <span>Шаг 2</span>
        <h2>Добавьте фотографии сезонных блюд</h2>
        <p>На этом шаге показаны только новые сезонные позиции — фотографий основного меню здесь нет.</p>
      </div>
      <div className="partners-update__photo-grid seasonal-flow__photo-grid">
        {payload.items.map((item) => (
          <article className="partners-update__photo-card" key={item.id}>
            <SeasonalItemImage menuId={payload.menu.id} item={item} />
            <div>
              <span className="seasonal-flow__category">{item.category || 'Без раздела'}</span>
              <h3>{item.dish_name}</h3>
              <p>{item.composition_text}</p>
            </div>
            <footer>
              <label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={busyItemId === item.id}
                  onChange={(event) => onUpload(item, event.target.files?.[0])}
                />
                {busyItemId === item.id ? 'Загружаем…' : item.has_photo ? 'Заменить фото' : 'Добавить фото'}
              </label>
            </footer>
          </article>
        ))}
      </div>
      {error && <div className="partners__notice partners__notice--error">{error}</div>}
      <footer className="partners-update__flow-actions">
        <button type="button" onClick={onBack}><ArrowLeft size={18} /> Назад</button>
        <button className="partners-update__primary" type="button" onClick={onNext}>Проверить превью <ArrowRight size={18} /></button>
      </footer>
    </section>
  )
}

function StepPreview({ payload, onBack, onNext }) {
  return (
    <section className="seasonal-flow__step">
      <div className="partners-update__section-heading seasonal-flow__heading">
        <span>Шаг 3</span>
        <h2>Проверьте превью</h2>
        <p>Так сезонные позиции будут выглядеть рядом с основным меню в период публикации.</p>
      </div>
      <div className="seasonal-flow__preview-header">
        <div>
          <span>Сезонное меню</span>
          <h3>{payload.menu.name}</h3>
        </div>
        <span><CalendarDays size={17} /> {periodLabel(payload.menu.start_date, payload.menu.end_date)}</span>
      </div>
      <div className="partners-update__preview-grid">
        {payload.items.map((item) => (
          <article className="partners-update__preview-card" key={item.id}>
            <SeasonalItemImage menuId={payload.menu.id} item={item} />
            <div>
              <span className="seasonal-flow__category">{item.category || 'Сезонное меню'}</span>
              <h3>{item.dish_name}</h3>
              <p>{item.composition_text}</p>
              <dl>
                <div><dt>Ккал</dt><dd>{item.kcal ?? '—'}</dd></div>
                <div><dt>Белки</dt><dd>{item.proteins_g ?? '—'}</dd></div>
                <div><dt>Жиры</dt><dd>{item.fats_g ?? '—'}</dd></div>
                <div><dt>Углеводы</dt><dd>{item.carbs_g ?? '—'}</dd></div>
              </dl>
            </div>
          </article>
        ))}
      </div>
      <footer className="partners-update__flow-actions">
        <button type="button" onClick={onBack}><ArrowLeft size={18} /> Назад</button>
        <button className="partners-update__primary" type="button" onClick={onNext}>К подтверждению <ArrowRight size={18} /></button>
      </footer>
    </section>
  )
}

function StepConfirm({ payload, restaurant, busy, error, onBack, onSubmit }) {
  const future = payload.menu.start_date > todayIso()
  return (
    <section className="partners-update__confirm-step seasonal-flow__confirm">
      <span className="partners-update__confirm-icon"><CalendarDays size={31} /></span>
      <span className="seasonal-flow__confirm-eyebrow">Сезонное меню</span>
      <h2>{payload.menu.name}</h2>
      <div className="seasonal-flow__confirm-details">
        <div><span>Блюда</span><strong>{payload.menu.dishes_count}</strong></div>
        <div><span>Фотографии</span><strong>{payload.menu.photos_count}</strong></div>
        <div><span>Период</span><strong>{periodLabel(payload.menu.start_date, payload.menu.end_date)}</strong></div>
        <div><span>Ресторан</span><strong>{payload.menu.outlets.map((item) => item.name).join(', ') || restaurant.name}</strong></div>
      </div>
      <p>Основное меню останется без изменений. Сезонные блюда исчезнут у гостей после завершения периода и сохранятся в архиве.</p>
      {error && <div className="partners__notice partners__notice--error">{error}</div>}
      <button className="partners-update__submit" type="button" disabled={busy} onClick={onSubmit}>
        {busy ? 'Сохраняем…' : future ? 'Запланировать публикацию' : 'Отправить на публикацию'}
      </button>
      <button className="partners-update__confirm-back" type="button" disabled={busy} onClick={onBack}>
        <ArrowLeft size={17} /> Вернуться к превью
      </button>
    </section>
  )
}

function PublishedState({ payload, onExit }) {
  return (
    <section className="partners-update__confirm-step seasonal-flow__confirm">
      <span className="partners-update__confirm-icon"><Check size={34} /></span>
      <span className="seasonal-flow__confirm-eyebrow">{STATUS_LABELS[payload.menu.status]}</span>
      <h2>{payload.menu.name}</h2>
      <p>
        {payload.menu.status === 'scheduled'
          ? `Меню автоматически появится у гостей ${formatDate(payload.menu.start_date)}.`
          : 'Сезонное меню доступно гостям. Основное меню не изменено.'}
      </p>
      <button className="partners-update__submit" type="button" onClick={onExit}>Вернуться в кабинет</button>
    </section>
  )
}

export default function SeasonalMenuFlow() {
  const { restaurant, restaurants } = useOutletContext()
  const { menuId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const isNew = !menuId || menuId === 'new'
  const [payload, setPayload] = useState(null)
  const [status, setStatus] = useState(isNew ? 'ready' : 'loading')
  const [step, setStep] = useState(1)
  const [furthestStep, setFurthestStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [busyItemId, setBusyItemId] = useState(null)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    start_date: todayIso(),
    end_date: '',
    no_end_date: false,
    restaurant_ids: restaurant?.id ? [Number(restaurant.id)] : [],
  })

  useEffect(() => {
    if (isNew) return undefined
    let cancelled = false
    setStatus('loading')
    restaurantPortalApi.seasonalMenu(menuId)
      .then((data) => {
        if (cancelled) return
        setPayload(data)
        setForm({
          name: data.menu.name,
          start_date: data.menu.start_date,
          end_date: data.menu.end_date || '',
          no_end_date: !data.menu.end_date,
          restaurant_ids: data.menu.outlets.map((item) => Number(item.id)),
        })
        setFurthestStep(Math.max(1, Number(data.menu.current_step) || 1))
        if (searchParams.get('view') === '1' && data.items.length) setStep(3)
        setStatus('ready')
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError.message || 'Не получилось открыть сезонное меню.')
          setStatus('error')
        }
      })
    return () => { cancelled = true }
  }, [isNew, menuId, searchParams])

  const details = useMemo(() => ({
    name: form.name.trim(),
    start_date: form.start_date,
    end_date: form.no_end_date ? null : form.end_date || null,
    restaurant_ids: form.restaurant_ids,
  }), [form])

  const validateDetails = () => {
    if (!details.name) return 'Укажите название сезонного меню.'
    if (!details.start_date) return 'Укажите дату начала.'
    if (details.end_date && details.end_date < details.start_date) return 'Дата завершения не может быть раньше даты начала.'
    if (!details.restaurant_ids.length) return 'Выберите хотя бы один ресторан.'
    return null
  }

  const ensureMenu = async () => {
    const validationError = validateDetails()
    if (validationError) throw new Error(validationError)
    if (payload?.menu?.id) {
      const data = await restaurantPortalApi.updateSeasonalMenu(payload.menu.id, details)
      setPayload(data)
      return data
    }
    const data = await restaurantPortalApi.createSeasonalMenu(details)
    setPayload(data)
    navigate(`/partners/seasonal/${data.menu.id}`, { replace: true })
    return data
  }

  const saveStep = async (nextStep) => {
    if (!payload?.menu?.id) return null
    const data = await restaurantPortalApi.updateSeasonalMenu(payload.menu.id, { ...details, current_step: nextStep })
    setPayload(data)
    return data
  }

  const uploadSource = async (file) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const data = await ensureMenu()
      const uploaded = await restaurantPortalApi.uploadSeasonalMenuSource(data.menu.id, file)
      setPayload(uploaded)
    } catch (nextError) {
      const rowMessage = nextError.rowErrors?.[0]?.message
      setError(rowMessage || nextError.message || 'Не получилось проверить сезонное меню.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const resolveDuplicate = async (item, resolution) => {
    setBusy(true)
    setError(null)
    try {
      const data = await restaurantPortalApi.resolveSeasonalDuplicate(payload.menu.id, item.id, resolution)
      setPayload(data)
    } catch (nextError) {
      setError(nextError.message || 'Не получилось сохранить ответ.')
    } finally {
      setBusy(false)
    }
  }

  const goToStep = async (nextStep) => {
    setError(null)
    if (nextStep === 2) {
      const validationError = validateDetails()
      if (validationError) return setError(validationError)
      if (!payload?.items?.length) return setError('Загрузите файл с сезонными блюдами.')
      if (payload.menu.unresolved_duplicates) return setError('Ответьте на вопросы о совпадающих блюдах.')
    }
    setBusy(true)
    try {
      if (nextStep === 2) await ensureMenu()
      if (payload?.menu?.publication_state === 'draft') await saveStep(nextStep)
      setStep(nextStep)
      setFurthestStep((current) => Math.max(current, nextStep))
    } catch (nextError) {
      setError(nextError.message || 'Не получилось сохранить шаг.')
    } finally {
      setBusy(false)
    }
  }

  const uploadPhoto = async (item, file) => {
    if (!file) return
    setBusyItemId(item.id)
    setError(null)
    try {
      const data = await restaurantPortalApi.uploadSeasonalItemPhoto(payload.menu.id, item.id, file)
      setPayload(data)
    } catch (nextError) {
      setError(nextError.message || 'Не получилось загрузить фотографию.')
    } finally {
      setBusyItemId(null)
    }
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await restaurantPortalApi.submitSeasonalMenu(payload.menu.id)
      setPayload(data)
      setSubmitted(true)
    } catch (nextError) {
      setError(nextError.message || 'Не получилось отправить сезонное меню.')
    } finally {
      setBusy(false)
    }
  }

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'no_end_date' && value ? { end_date: '' } : {}),
    }))
  }

  const toggleOutlet = (restaurantId) => {
    setForm((current) => ({
      ...current,
      restaurant_ids: current.restaurant_ids.includes(restaurantId)
        ? current.restaurant_ids.filter((id) => id !== restaurantId)
        : [...current.restaurant_ids, restaurantId],
    }))
  }

  if (status === 'loading') return <div className="partners partners--centered"><p className="partners__loading">Загружаем сезонное меню…</p></div>
  if (status === 'error') {
    return (
      <div className="partners partners--centered">
        <div className="partners__notice partners__notice--error">{error}</div>
        <Link className="partners__btn" to="/partners/dashboard">Вернуться в кабинет</Link>
      </div>
    )
  }

  return (
    <div className="partners-update seasonal-flow">
      <SeasonalSidebar restaurant={restaurant} step={step} furthestStep={furthestStep} onStep={setStep} />
      <main className="partners-update__main">
        <header className="partners-update__topbar">
          <span>{payload?.menu?.name || 'Новое сезонное меню'}</span>
          <Link className="partners-update__save-exit" to="/partners/dashboard">Сохранить и выйти</Link>
        </header>
        <div className="partners-update__content">
          {submitted && <PublishedState payload={payload} onExit={() => navigate('/partners/dashboard')} />}
          {!submitted && step === 1 && (
            <StepOne
              form={form}
              restaurants={restaurants}
              payload={payload}
              busy={busy}
              error={error}
              fileRef={fileRef}
              onField={setField}
              onOutlet={toggleOutlet}
              onFile={uploadSource}
              onResolve={resolveDuplicate}
              onNext={() => goToStep(2)}
            />
          )}
          {!submitted && step === 2 && payload && (
            <StepPhotos
              payload={payload}
              busyItemId={busyItemId}
              error={error}
              onUpload={uploadPhoto}
              onBack={() => setStep(1)}
              onNext={() => goToStep(3)}
            />
          )}
          {!submitted && step === 3 && payload && (
            <StepPreview payload={payload} onBack={() => setStep(2)} onNext={() => goToStep(4)} />
          )}
          {!submitted && step === 4 && payload && (
            <StepConfirm payload={payload} restaurant={restaurant} busy={busy} error={error} onBack={() => setStep(3)} onSubmit={submit} />
          )}
        </div>
      </main>
    </div>
  )
}
