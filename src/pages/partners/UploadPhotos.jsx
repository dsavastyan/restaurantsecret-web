// src/pages/partners/UploadPhotos.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { restaurantPortalApi } from '@/api/restaurantPortal'

export default function PartnersUploadPhotos() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [matched, setMatched] = useState([])
  const [unmatched, setUnmatched] = useState([])
  const [dishes, setDishes] = useState([])
  const [assigning, setAssigning] = useState({})

  const submit = async (event) => {
    event.preventDefault()
    if (!files.length) return

    setLoading(true)
    setError(null)

    try {
      const data = await restaurantPortalApi.uploadPhotos(files)
      setMatched(data.matched || [])
      setUnmatched(data.unmatched || [])
      setDishes(data.dishes || [])
      setFiles([])
    } catch (err) {
      setError(err.message || 'Не получилось загрузить фото. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  const assign = async (r2Key, dishId) => {
    if (!dishId) return
    setAssigning((prev) => ({ ...prev, [r2Key]: true }))
    try {
      await restaurantPortalApi.assignPhoto(r2Key, dishId)
      setUnmatched((prev) => prev.filter((item) => item.r2_key !== r2Key))
    } catch {
      setError('Не получилось привязать фото. Попробуйте ещё раз.')
    } finally {
      setAssigning((prev) => {
        const next = { ...prev }
        delete next[r2Key]
        return next
      })
    }
  }

  return (
    <div className="partners-card partners-upload">
      <h1 className="partners-upload__title">Фото блюд</h1>
      <p className="partners-upload__hint">
        Назовите файлы так же, как блюда в меню (например «Цезарь с курицей.jpg») — мы сматчим их автоматически.
        Всё, что не распозналось, можно привязать вручную ниже. Фото не обязательны для публикации меню.
      </p>

      <form className="partners-upload__form" onSubmit={submit}>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          disabled={loading}
        />
        <button className="partners__btn partners__btn--primary" type="submit" disabled={!files.length || loading}>
          {loading ? 'Загружаем…' : `Загрузить ${files.length ? `(${files.length})` : ''}`}
        </button>
      </form>

      {error && <div className="partners__notice partners__notice--error">{error}</div>}

      {matched.length > 0 && (
        <div className="partners__notice partners__notice--success">
          Автоматически привязано: {matched.length}
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="partners-upload__unmatched">
          <p className="partners-upload__errors-title">Не распознано автоматически — выберите блюдо вручную:</p>
          {unmatched.map((item) => (
            <div className="partners-upload__unmatched-row" key={item.r2_key}>
              <span className="partners-upload__unmatched-filename">{item.filename}</span>
              <select
                defaultValue=""
                disabled={assigning[item.r2_key]}
                onChange={(e) => assign(item.r2_key, e.target.value)}
              >
                <option value="" disabled>Выберите блюдо…</option>
                {dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>{dish.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <div className="partners-dashboard__actions">
        <Link className="partners__btn" to="/partners/dashboard">
          Вернуться в кабинет
        </Link>
      </div>
    </div>
  )
}
