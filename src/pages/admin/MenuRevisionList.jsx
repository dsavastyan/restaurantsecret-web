import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSpreadsheet, Image, Search } from 'lucide-react'
import { adminMenuRevisionsApi } from '@/api/adminMenuRevisions'

export const REVISION_STATUS = {
  needs_preparation: 'Требуется подготовка меню',
  waiting_restaurant: 'Ожидаем уточнение ресторана',
  ready_for_restaurant: 'Передано ресторану',
  changes_requested: 'Ресторан запросил изменения',
  submitted: 'Отправлено',
  published: 'Опубликовано',
  discarded: 'Архивировано',
  error: 'Ошибка',
}

function sourceLabel(item) {
  const types = item.source_content_types || ''
  const files = Number(item.source_files_count || 0)
  const pages = Number(item.source_pages_count || 0)
  let type = 'Файлы'
  if (/pdf/i.test(types)) type = 'PDF'
  else if (/image/i.test(types)) type = 'Изображения'
  else if (/excel|sheet/i.test(types)) type = 'Excel'
  if (files > 1 && type !== 'Изображения') type = `${type} + файлы`
  if (pages) return `${type} · ${pages} стр.`
  return `${type} · ${files} файл${files === 1 ? '' : 'а'}`
}

export default function MenuRevisionList() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await adminMenuRevisionsApi.list({ status, query })
        setItems(data.revisions || [])
      } catch (requestError) {
        setError(requestError.message || 'Не удалось загрузить задачи.')
      } finally {
        setLoading(false)
      }
    }, 180)
    return () => clearTimeout(timer)
  }, [query, status])

  return (
    <section className="admin-menu__queue">
      <div className="admin-menu__title">
        <div><span>Операции</span><h1>Задачи по меню</h1></div>
        <strong>{items.length}</strong>
      </div>
      <div className="admin-menu__filters">
        <label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ресторан или номер заявки" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Все статусы</option>
          {Object.entries(REVISION_STATUS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </div>
      {error && <p className="admin-menu__error" role="alert">{error}</p>}
      {loading ? <p>Загружаем задачи…</p> : (
        <div className="admin-menu__cards">
          {items.map((item) => (
            <Link to={`/admin/menu-revisions/${item.id}`} key={item.id}>
              <span className="admin-menu__file-icon">
                {/image/i.test(item.source_content_types || '') ? <Image /> : <FileSpreadsheet />}
              </span>
              <div>
                <small>Заявка #{item.id}</small>
                <h2>{item.restaurant_name}</h2>
                <p>{item.kind === 'initial' ? 'Первичная загрузка' : 'Обновление'} · {sourceLabel(item)}</p>
              </div>
              <span className={`admin-menu__badge admin-menu__badge--${item.status}`}>{REVISION_STATUS[item.status] || item.status}</span>
            </Link>
          ))}
          {!items.length && <div className="admin-menu__empty">По выбранным условиям задач нет.</div>}
        </div>
      )}
    </section>
  )
}
