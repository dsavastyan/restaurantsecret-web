// src/pages/partners/UploadMenu.jsx
import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { restaurantPortalApi } from '@/api/restaurantPortal'

export default function PartnersUploadMenu() {
  const { refresh } = useOutletContext()

  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [rowErrors, setRowErrors] = useState(null)
  const [generalError, setGeneralError] = useState(null)
  const [result, setResult] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    if (!file) return

    setLoading(true)
    setRowErrors(null)
    setGeneralError(null)
    setResult(null)

    try {
      const data = await restaurantPortalApi.uploadMenu(file)
      setResult(data)
      await refresh()
    } catch (err) {
      if (err.rowErrors) {
        setRowErrors(err.rowErrors)
      } else {
        setGeneralError(err.message || 'Не получилось загрузить файл. Попробуйте ещё раз.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="partners-card partners-upload">
        <h1 className="partners-upload__title">Меню опубликовано</h1>
        <p className="partners__notice partners__notice--success">
          {result.dishes} блюд, {result.items} позиций загружено и опубликовано в каталоге.
        </p>
        <div className="partners-dashboard__actions">
          <Link className="partners__btn partners__btn--primary" to="/partners/dashboard">
            Вернуться в кабинет
          </Link>
          <Link className="partners__btn" to="/partners/photos">
            Добавить фото блюд
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="partners-card partners-upload">
      <h1 className="partners-upload__title">Обновить меню</h1>
      <p className="partners-upload__hint">
        Заполните <a href={restaurantPortalApi.templateDownloadUrl()} download>шаблон Excel</a> и загрузите файл.
        КБЖУ указывайте на порцию. Новая загрузка полностью заменяет предыдущее меню.
      </p>

      <form className="partners-upload__form" onSubmit={submit}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
        />
        <button className="partners__btn partners__btn--primary" type="submit" disabled={!file || loading}>
          {loading ? 'Проверяем и загружаем…' : 'Загрузить меню'}
        </button>
      </form>

      {generalError && <div className="partners__notice partners__notice--error">{generalError}</div>}

      {rowErrors && (
        <div className="partners__notice partners__notice--error">
          <p className="partners-upload__errors-title">В файле есть ошибки — исправьте и загрузите заново:</p>
          <ul className="partners-upload__errors-list">
            {rowErrors.map((error, idx) => (
              <li key={idx}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
