import { useCallback, useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { adminMenuRevisionsApi } from '@/api/adminMenuRevisions'

const REASON_LABELS = {
  protein_over_100g: 'Белков больше 100 г на 100 г/мл',
  fat_over_100g: 'Жиров больше 100 г на 100 г/мл',
  carbohydrates_over_100g: 'Углеводов больше 100 г на 100 г/мл',
  macros_exceed_100g: 'Сумма БЖУ больше 100 г на 100 г/мл',
  calories_over_900kcal: 'Калорийность выше 900 ккал на 100 г/мл',
  calories_macros_mismatch: 'Калории не сходятся с БЖУ',
}

function reasonLabel(reason) {
  return REASON_LABELS[reason] || reason
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

function FlaggedProductCard({ product }) {
  return (
    <article className="admin-product-match__pair">
      <header>
        <div>
          <strong>{reasonLabel(product.kbju_flag_reason)}</strong>
          <small>Спарсено {new Date(product.parsed_at).toLocaleString('ru-RU')}</small>
        </div>
        <span className="admin-menu__badge admin-menu__badge--changes_requested">
          {product.kbju_flag_reason}
        </span>
      </header>
      <div className="admin-product-match__product">
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
          <div><dt>Упаковка</dt><dd>{product.package_size || '—'}</dd></div>
        </dl>

        <div className="admin-product-match__nutrition" aria-label="КБЖУ">
          <span><strong>{formatNumber(product.calories)}</strong><small>ккал</small></span>
          <span><strong>{formatNumber(product.protein_g)}</strong><small>белки</small></span>
          <span><strong>{formatNumber(product.fat_g)}</strong><small>жиры</small></span>
          <span><strong>{formatNumber(product.carbohydrates_g)}</strong><small>углеводы</small></span>
        </div>

        {product.ingredients ? (
          <details>
            <summary>Состав</summary>
            <p>{product.ingredients}</p>
          </details>
        ) : null}
      </div>
    </article>
  )
}

export default function KbjuFlagReview() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminMenuRevisionsApi.kbjuFlaggedProducts()
      setProducts(data.products || [])
    } catch (requestError) {
      setError(requestError.message || 'Не удалось загрузить карточки.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section className="admin-product-match">
      <header className="admin-menu__title">
        <div>
          <span>Сырые продукты</span>
          <h1>Странные КБЖУ</h1>
          <p>
            Карточки со страницы магазина, где белки, жиры, углеводы или калории на 100&nbsp;г/мл
            выходят за пределы физически возможного. Они не попадают в каталог продуктов, пока их
            не проверят руками.
          </p>
        </div>
        <strong>{products.length}</strong>
      </header>

      {error ? <p className="admin-crm__notice admin-crm__notice--error">{error}</p> : null}
      {loading ? <p className="admin-crm__loading">Загружаем карточки…</p> : null}
      {!loading && products.length === 0 ? (
        <div className="admin-menu__empty">Странных карточек сейчас нет.</div>
      ) : null}

      <div className="admin-product-match__list">
        {products.map((product) => (
          <FlaggedProductCard product={product} key={product.id} />
        ))}
      </div>
    </section>
  )
}
