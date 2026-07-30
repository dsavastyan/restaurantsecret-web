import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { restaurantPortalApi } from '@/api/restaurantPortal'

const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

function photoError(file) {
  if (!ACCEPTED_PHOTO_TYPES.has(file.type)) return 'Поддерживаются JPG, PNG, WEBP и AVIF.'
  if (file.size > MAX_PHOTO_SIZE) return 'Размер фотографии не должен превышать 10 МБ.'
  return null
}

export default function PartnersUploadPhotos() {
  const bulkInputRef = useRef(null)
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [unmatched, setUnmatched] = useState([])
  const [assigning, setAssigning] = useState({})
  const [busyDish, setBusyDish] = useState({})
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [photoFilter, setPhotoFilter] = useState('all')

  const loadDishes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await restaurantPortalApi.menuPhotos()
      setDishes(data.dishes || [])
    } catch (err) {
      setError(err.message || 'Не получилось загрузить блюда. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDishes()
  }, [])

  const categories = useMemo(
    () => [...new Set(dishes.map((dish) => dish.category).filter(Boolean))],
    [dishes],
  )
  const visibleDishes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
    return dishes.filter((dish) => {
      const matchesQuery = !normalizedQuery || dish.name.toLocaleLowerCase('ru-RU').includes(normalizedQuery)
      const matchesCategory = category === 'all' || dish.category === category
      const matchesPhoto = photoFilter === 'all'
        || (photoFilter === 'with' && dish.photo_url)
        || (photoFilter === 'without' && !dish.photo_url)
      return matchesQuery && matchesCategory && matchesPhoto
    })
  }, [category, dishes, photoFilter, query])
  const withPhotos = dishes.filter((dish) => dish.photo_url).length

  const updateDishPhoto = (dishId, photoUrl) => {
    setDishes((current) => current.map((dish) => (
      Number(dish.id) === Number(dishId) ? { ...dish, photo_url: photoUrl || null } : dish
    )))
  }

  const replacePhoto = async (dish, file) => {
    const validationError = photoError(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setBusyDish((current) => ({ ...current, [dish.id]: 'replace' }))
    setError(null)
    setSuccess(null)
    try {
      const data = await restaurantPortalApi.replaceMenuPhoto(dish.id, file)
      updateDishPhoto(dish.id, data.photo_url)
      setSuccess(`Фото блюда «${dish.name}» обновлено.`)
    } catch (err) {
      setError(err.message || 'Не получилось заменить фото. Попробуйте ещё раз.')
    } finally {
      setBusyDish((current) => {
        const next = { ...current }
        delete next[dish.id]
        return next
      })
    }
  }

  const deletePhoto = async (dish) => {
    if (!window.confirm(`Удалить фото блюда «${dish.name}»?`)) return
    setBusyDish((current) => ({ ...current, [dish.id]: 'delete' }))
    setError(null)
    setSuccess(null)
    try {
      await restaurantPortalApi.deleteMenuPhoto(dish.id)
      updateDishPhoto(dish.id, null)
      setSuccess(`Фото блюда «${dish.name}» удалено.`)
    } catch (err) {
      setError(err.message || 'Не получилось удалить фото. Попробуйте ещё раз.')
    } finally {
      setBusyDish((current) => {
        const next = { ...current }
        delete next[dish.id]
        return next
      })
    }
  }

  const uploadMany = async (files) => {
    if (!files.length) return
    const invalidFile = files.find((file) => photoError(file))
    if (invalidFile) {
      setError(`${invalidFile.name}: ${photoError(invalidFile)}`)
      return
    }
    setBulkLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await restaurantPortalApi.uploadPhotos(files)
      setDishes((current) => current.map((dish) => {
        const match = (data.matched || []).find((item) => Number(item.dish_id) === Number(dish.id))
        return match ? { ...dish, photo_url: match.photo_url } : dish
      }))
      setUnmatched(data.unmatched || [])
      const matchedCount = data.matched?.length || 0
      setSuccess(matchedCount ? `Автоматически привязано фотографий: ${matchedCount}.` : null)
    } catch (err) {
      setError(err.message || 'Не получилось загрузить фото. Попробуйте ещё раз.')
    } finally {
      setBulkLoading(false)
      if (bulkInputRef.current) bulkInputRef.current.value = ''
    }
  }

  const assign = async (r2Key, dishId) => {
    if (!dishId) return
    setAssigning((current) => ({ ...current, [r2Key]: true }))
    setError(null)
    try {
      const data = await restaurantPortalApi.assignPhoto(r2Key, dishId)
      updateDishPhoto(dishId, data.photo_url)
      setUnmatched((current) => current.filter((item) => item.r2_key !== r2Key))
      setSuccess('Фотография привязана к блюду.')
    } catch (err) {
      setError(err.message || 'Не получилось привязать фото. Попробуйте ещё раз.')
    } finally {
      setAssigning((current) => {
        const next = { ...current }
        delete next[r2Key]
        return next
      })
    }
  }

  return (
    <section className="partners-photo-manager">
      <div className="partners-photo-manager__heading">
        <div>
          <Link className="partners-photo-manager__back" to="/partners/dashboard">
            <ArrowLeft size={17} /> Вернуться в кабинет
          </Link>
          <span className="partners-eyebrow">Фотографии меню</span>
          <h1>Фото блюд</h1>
          <p>Добавляйте, заменяйте и удаляйте фотографии отдельно для каждого блюда.</p>
        </div>
        <label className={`partners-photo-manager__bulk ${bulkLoading ? 'is-loading' : ''}`}>
          <input
            ref={bulkInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={bulkLoading}
            onChange={(event) => uploadMany(Array.from(event.target.files || []))}
          />
          {bulkLoading ? <LoaderCircle className="partners-photo-manager__spinner" size={19} /> : <Upload size={19} />}
          {bulkLoading ? 'Загружаем…' : 'Загрузить несколько фото'}
        </label>
      </div>

      <div className="partners-photo-manager__summary">
        <div><strong>{withPhotos}</strong><span>с фотографиями</span></div>
        <div><strong>{dishes.length - withPhotos}</strong><span>без фотографий</span></div>
        <p>Для пакетной загрузки назовите файлы так же, как блюда в меню — мы сопоставим их автоматически.</p>
      </div>

      {error && (
        <div className="partners__notice partners__notice--error" role="alert">
          {error}
          {loading && <button type="button" onClick={loadDishes}>Повторить</button>}
        </div>
      )}
      {success && <div className="partners__notice partners__notice--success" role="status"><CheckCircle2 size={18} />{success}</div>}

      {unmatched.length > 0 && (
        <section className="partners-photo-manager__unmatched">
          <div>
            <strong>Не удалось определить блюдо · {unmatched.length}</strong>
            <span>Выберите блюдо для каждого файла вручную.</span>
          </div>
          {unmatched.map((item) => (
            <label key={item.r2_key}>
              <span>{item.filename}</span>
              <select
                defaultValue=""
                disabled={assigning[item.r2_key]}
                onChange={(event) => assign(item.r2_key, event.target.value)}
              >
                <option value="" disabled>Выберите блюдо…</option>
                {dishes.map((dish) => <option key={dish.id} value={dish.id}>{dish.name}</option>)}
              </select>
            </label>
          ))}
        </section>
      )}

      <div className="partners-photo-manager__toolbar">
        <label className="partners-photo-manager__search">
          <Search size={18} />
          <span className="partners-photo-manager__visually-hidden">Поиск по блюдам</span>
          <input
            type="search"
            placeholder="Поиск по блюдам"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select aria-label="Категория блюд" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Все категории</option>
          {categories.map((value) => <option value={value} key={value}>{value}</option>)}
        </select>
        <div className="partners-photo-manager__filters" role="group" aria-label="Наличие фотографий">
          {[
            ['all', 'Все'],
            ['with', 'С фото'],
            ['without', 'Без фото'],
          ].map(([value, label]) => (
            <button
              className={photoFilter === value ? 'active' : ''}
              type="button"
              onClick={() => setPhotoFilter(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="partners-photo-manager__state"><LoaderCircle className="partners-photo-manager__spinner" size={28} />Загружаем блюда…</div>
      ) : (
        <>
          <div className="partners-photo-manager__grid" aria-live="polite">
            {visibleDishes.map((dish) => {
              const busy = busyDish[dish.id]
              return (
                <article className="partners-photo-manager__card" key={dish.id}>
                  <div className="partners-photo-manager__image">
                    {dish.photo_url
                      ? <img src={dish.photo_url} alt={`Фото блюда «${dish.name}»`} />
                      : <span><ImageIcon size={35} /><small>Фото не добавлено</small></span>}
                    <span className={`partners-photo-manager__badge ${dish.photo_url ? 'has-photo' : ''}`}>
                      {dish.photo_url ? 'Фото добавлено' : 'Без фото'}
                    </span>
                  </div>
                  <div className="partners-photo-manager__card-copy">
                    <h2>{dish.name}</h2>
                    <p>{dish.category || 'Без категории'}</p>
                  </div>
                  <footer>
                    <label className={busy ? 'is-disabled' : ''}>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
                        disabled={Boolean(busy)}
                        aria-label={`${dish.photo_url ? 'Заменить' : 'Добавить'} фото блюда «${dish.name}»`}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) replacePhoto(dish, file)
                          event.target.value = ''
                        }}
                      />
                      {busy === 'replace'
                        ? <LoaderCircle className="partners-photo-manager__spinner" size={16} />
                        : <ImagePlus size={16} />}
                      {busy === 'replace' ? 'Загружаем…' : dish.photo_url ? 'Заменить' : 'Добавить фото'}
                    </label>
                    {dish.photo_url && (
                      <button type="button" disabled={Boolean(busy)} onClick={() => deletePhoto(dish)}>
                        {busy === 'delete'
                          ? <LoaderCircle className="partners-photo-manager__spinner" size={16} />
                          : <Trash2 size={16} />}
                        {busy === 'delete' ? 'Удаляем…' : 'Удалить'}
                      </button>
                    )}
                  </footer>
                </article>
              )
            })}
          </div>
          {!visibleDishes.length && (
            <div className="partners-photo-manager__state">
              <ImageIcon size={30} />
              {dishes.length ? 'По выбранным условиям блюда не найдены.' : 'В опубликованном меню пока нет блюд.'}
            </div>
          )}
        </>
      )}
    </section>
  )
}
