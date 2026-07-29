import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Download, FileCheck2, MessageSquare, Upload } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { adminMenuRevisionsApi } from '@/api/adminMenuRevisions'
import { REVISION_STATUS } from './MenuRevisionList'

function isExcel(file) {
  return /excel|spreadsheet|sheet/i.test(`${file?.content_type || ''} ${file?.original_name || ''}`)
}

function isImage(file) {
  return /^image\//i.test(file?.content_type || '') || /\.(png|jpe?g|webp)$/i.test(file?.original_name || '')
}

function SourceViewer({ file }) {
  const [url, setUrl] = useState('')
  const [sheets, setSheets] = useState([])
  const [sheet, setSheet] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let objectUrl = ''
    setUrl('')
    setSheets([])
    setError('')
    if (!file) return undefined
    const load = async () => {
      try {
        if (isExcel(file)) {
          const data = await adminMenuRevisionsApi.excelPreview(file.id)
          if (active) setSheets(data.sheets || [])
        } else {
          const blob = await adminMenuRevisionsApi.fileBlob(file.id)
          objectUrl = URL.createObjectURL(blob)
          if (active) setUrl(objectUrl)
        }
      } catch (requestError) {
        if (active) setError(requestError.message || 'Не удалось открыть файл.')
      }
    }
    load()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  if (!file) return <div className="admin-menu__viewer-empty">Выберите исходный файл.</div>
  if (error) return <div className="admin-menu__error">{error}</div>
  if (isExcel(file)) {
    const activeSheet = sheets[sheet]
    return (
      <div className="admin-menu__excel">
        <div>{sheets.map((item, index) => <button className={index === sheet ? 'active' : ''} onClick={() => setSheet(index)} key={item.name}>{item.name}</button>)}</div>
        <div className="admin-menu__excel-table">
          <table><tbody>{(activeSheet?.rows || []).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{String(cell)}</td>)}</tr>)}</tbody></table>
        </div>
      </div>
    )
  }
  if (!url) return <div className="admin-menu__viewer-empty">Открываем файл…</div>
  if (isImage(file)) return <img className="admin-menu__source-image" src={url} alt={file.original_name} />
  if (/pdf/i.test(file.content_type || file.original_name)) return <iframe className="admin-menu__pdf" title={file.original_name} src={url} />
  return <div className="admin-menu__viewer-empty">Для этого формата доступно скачивание.</div>
}

function formatSize(value) {
  const size = Number(value || 0)
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} МБ`
  if (size > 1024) return `${Math.round(size / 1024)} КБ`
  return `${size} Б`
}

export default function MenuRevisionDetail() {
  const { revisionId } = useParams()
  const [data, setData] = useState(null)
  const [selectedSource, setSelectedSource] = useState(null)
  const [internalComment, setInternalComment] = useState('')
  const [clarification, setClarification] = useState('')
  const [validationErrors, setValidationErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const next = await adminMenuRevisionsApi.get(revisionId)
      setData(next)
      setInternalComment(next.revision.internal_comment || '')
      const normalizedFiles = next.files.filter((file) => file.role === 'normalized')
      const latestNormalized = normalizedFiles.at(-1)
      setValidationErrors(
        latestNormalized?.validation_status === 'invalid'
          ? (latestNormalized.validation_errors || [])
          : [],
      )
      setSelectedSource((current) => current && next.files.some((file) => file.id === current.id)
        ? next.files.find((file) => file.id === current.id)
        : next.files.find((file) => file.role === 'source') || null)
    } catch (requestError) {
      setError(requestError.message || 'Не удалось открыть заявку.')
    }
  }

  useEffect(() => { load() }, [revisionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sources = useMemo(() => data?.files.filter((file) => file.role === 'source') || [], [data])
  const normalized = useMemo(() => data?.files.filter((file) => file.role === 'normalized') || [], [data])
  const latestValidationFile = useMemo(() => {
    const latest = normalized.at(-1)
    return data?.files.find((file) => file.role === 'validation_result' && file.version === latest?.version)
  }, [data, normalized])

  const download = async (file) => {
    const blob = await adminMenuRevisionsApi.fileBlob(file.id, true)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.original_name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const downloadAll = async () => {
    for (const file of sources) await download(file)
  }

  const saveComment = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await adminMenuRevisionsApi.updateComment(
        revisionId,
        internalComment,
        data.revision.lock_version,
      )
      setData((current) => ({ ...current, revision: result.revision }))
    } catch (requestError) {
      setError(requestError.message || 'Не удалось сохранить комментарий.')
    } finally {
      setBusy(false)
    }
  }

  const sendClarification = async () => {
    if (!clarification.trim()) return
    setBusy(true)
    setError('')
    try {
      const result = await adminMenuRevisionsApi.requestClarification(revisionId, clarification)
      setData(result)
      setClarification('')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось отправить уточнение.')
    } finally {
      setBusy(false)
    }
  }

  const uploadNormalized = async (file) => {
    setBusy(true)
    setError('')
    setValidationErrors([])
    try {
      const result = await adminMenuRevisionsApi.uploadNormalized(revisionId, file)
      setData(result)
    } catch (requestError) {
      setValidationErrors(requestError.details?.errors || [])
      setError(requestError.message || 'Файл не прошёл проверку.')
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <section>{error || 'Загружаем заявку…'}</section>
  const { revision } = data

  return (
    <section className="admin-menu__detail">
      <Link className="admin-menu__back" to="/admin/menu-revisions"><ArrowLeft size={17} /> Все задачи</Link>
      <header>
        <div><small>Заявка #{revision.id} · {revision.kind === 'initial' ? 'Первичная загрузка' : 'Обновление'}</small><h1>{revision.restaurant_name}</h1></div>
        <span className={`admin-menu__badge admin-menu__badge--${revision.status}`}>{REVISION_STATUS[revision.status] || revision.status}</span>
      </header>
      {error && <p className="admin-menu__error" role="alert">{error}</p>}

      <div className="admin-menu__workspace">
        <div>
          <section className="admin-menu__panel">
            <div className="admin-menu__panel-title"><h2>Исходные файлы</h2><button onClick={downloadAll} type="button"><Download size={16} /> Скачать исходные файлы</button></div>
            <div className="admin-menu__source-tabs">
              {sources.map((file) => <button className={selectedSource?.id === file.id ? 'active' : ''} onClick={() => setSelectedSource(file)} key={file.id}><strong>{file.original_name}</strong><small>{formatSize(file.size_bytes)}{file.page_count ? ` · ${file.page_count} стр.` : ''}{file.sheet_count ? ` · ${file.sheet_count} лист.` : ''}</small></button>)}
            </div>
            <SourceViewer file={selectedSource} />
          </section>

          <section className="admin-menu__panel">
            <div className="admin-menu__panel-title"><h2>Подготовленные версии</h2><label className="admin-menu__upload"><Upload size={17} /> {busy ? 'Проверяем…' : 'Загрузить подготовленное меню'}<input disabled={busy} type="file" accept=".xlsx" onChange={(event) => event.target.files?.[0] && uploadNormalized(event.target.files[0])} /></label></div>
            {normalized.length ? <div className="admin-menu__versions">{normalized.map((file) => <button onClick={() => download(file)} type="button" key={file.id}><FileCheck2 /><span><strong>menu-v{file.version}.xlsx</strong><small>{file.validation_status === 'valid' ? 'Проверка пройдена' : 'Есть ошибки'} · {formatSize(file.size_bytes)}</small></span><Download size={16} /></button>)}</div> : <p className="admin-menu__muted">Подготовленных файлов пока нет.</p>}
            {validationErrors.length > 0 && <div className="admin-menu__validation"><h3>Ошибки проверки · {validationErrors.length}</h3>{validationErrors.map((item, index) => <p key={`${item.row}-${index}`}><strong>{item.row ? `Строка ${item.row}: ` : ''}</strong>{item.message}</p>)}{latestValidationFile && <button type="button" onClick={() => download(latestValidationFile)}><Download size={15} /> Скачать файл с отметками</button>}</div>}
          </section>
        </div>

        <aside>
          <section className="admin-menu__panel">
            <h2>Внутренний комментарий</h2>
            <textarea value={internalComment} onChange={(event) => setInternalComment(event.target.value)} placeholder="Виден только администраторам" />
            <button disabled={busy} onClick={saveComment} type="button">Сохранить</button>
          </section>
          <section className="admin-menu__panel">
            <h2><MessageSquare size={19} /> Диалог с рестораном</h2>
            <div className="admin-menu__messages">
              {data.messages.map((message) => <article className={`admin-menu__message admin-menu__message--${message.sender_role}`} key={message.id}><strong>{message.sender_role === 'admin' ? 'Администратор' : message.sender_role === 'restaurant' ? 'Ресторан' : 'Система'}</strong><p>{message.body}</p><small>{new Date(message.created_at).toLocaleString('ru-RU')}</small></article>)}
            </div>
            <textarea value={clarification} onChange={(event) => setClarification(event.target.value)} placeholder="Что нужно уточнить у ресторана?" />
            <button disabled={busy || !clarification.trim()} onClick={sendClarification} type="button">Запросить уточнение</button>
          </section>
        </aside>
      </div>
    </section>
  )
}
