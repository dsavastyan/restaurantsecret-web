import { useCallback, useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { adminMenuRevisionsApi } from '@/api/adminMenuRevisions'

const STATUS_LABELS = {
  pending: 'Ожидают решения',
  auto_matched: 'Совпали автоматически',
  approved: 'Подтверждены',
  rejected: 'Отклонены',
}

function formatNumber(value) {
  return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Источник'
  }
}

function ProductCard({ product }) {
  return (
    <article className="admin-product-match__product">
      <header>
        <div>
          <small>{host(product.source_url)}</small>
          <h2>{product.name}</h2>
        </div>
        <a href={product.source_url} target="_blank" rel="noreferrer" aria-label="Открыть карточку магазина">
          <ExternalLink size={18} />
        </a>
      </header>

      <dl>
        <div><dt>Бренд</dt><dd>{product.brand || '—'}</dd></div>
        <div><dt>Производитель</dt><dd>{product.manufacturer || '—'}</dd></div>
        <div><dt>Категория</dt><dd>{product.source_category || '—'}</dd></div>
        <div><dt>Упаковка</dt><dd>{product.package_size}</dd></div>
        <div><dt>GTIN</dt><dd>{product.gtin || '—'}</dd></div>
        <div><dt>Базис</dt><dd>{product.nutrition_basis === '100_ml' ? '100 мл' : '100 г'}</dd></div>
      </dl>

      <div className="admin-product-match__nutrition" aria-label="КБЖУ">
        <span><strong>{formatNumber(product.calories)}</strong><small>ккал</small></span>
        <span><strong>{formatNumber(product.protein_g)}</strong><small>белки</small></span>
        <span><strong>{formatNumber(product.fat_g)}</strong><small>жиры</small></span>
        <span><strong>{formatNumber(product.carbohydrates_g)}</strong><small>углеводы</small></span>
      </div>

      <details>
        <summary>Состав</summary>
        <p>{product.ingredients || 'Состав не указан магазином.'}</p>
      </details>
      <footer>Спарсено {new Date(product.parsed_at).toLocaleString('ru-RU')}</footer>
    </article>
  )
}

export default function ProductMatchReview() {
  const [status, setStatus] = useState('pending')
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminMenuRevisionsApi.productMatches(status)
      setMatches(data.matches || [])
    } catch (requestError) {
      setError(requestError.message || 'Не удалось загрузить пары.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const decide = async (match, decision) => {
    setWorkingId(match.id)
    setError('')
    try {
      await adminMenuRevisionsApi.decideProductMatch(match.id, decision)
      setMatches((current) => current.filter((item) => item.id !== match.id))
    } catch (requestError) {
      setError(requestError.message || 'Не удалось сохранить решение.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <section className="admin-product-match">
      <header className="admin-menu__title">
        <div>
          <span>Сырые продукты</span>
          <h1>Проверка совпадений</h1>
          <p>Подтверждение связывает две магазинные карточки как один продукт, но сохраняет обе исходные строки.</p>
        </div>
        <strong>{matches.length}</strong>
      </header>

      <div className="admin-product-match__filters">
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={status === value ? 'active' : ''}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="admin-crm__notice admin-crm__notice--error">{error}</p> : null}
      {loading ? <p className="admin-crm__loading">Загружаем пары…</p> : null}
      {!loading && matches.length === 0 ? (
        <div className="admin-menu__empty">В этом разделе пока нет пар.</div>
      ) : null}

      <div className="admin-product-match__list">
        {matches.map((match) => (
          <section className="admin-product-match__pair" key={match.id}>
            <header>
              <div>
                <strong>Сходство названий {Math.round(match.name_similarity * 100)}%</strong>
                <small>Общая уверенность {Math.round(match.match_score * 100)}%</small>
              </div>
              <span className={`admin-menu__badge admin-menu__badge--${match.status}`}>
                {STATUS_LABELS[match.status]}
              </span>
            </header>
            <div className="admin-product-match__comparison">
              <ProductCard product={match.left} />
              <div className="admin-product-match__versus">и</div>
              <ProductCard product={match.right} />
            </div>
            {match.status === 'pending' ? (
              <footer className="admin-product-match__actions">
                <button
                  type="button"
                  className="is-reject"
                  disabled={workingId === match.id}
                  onClick={() => decide(match, 'reject')}
                >
                  Это разные продукты
                </button>
                <button
                  type="button"
                  className="is-approve"
                  disabled={workingId === match.id}
                  onClick={() => decide(match, 'approve')}
                >
                  Это один продукт
                </button>
              </footer>
            ) : null}
          </section>
        ))}
      </div>
    </section>
  )
}
