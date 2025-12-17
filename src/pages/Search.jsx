// Unified search page for dishes and restaurants.
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'

import { searchFull } from '@/lib/api'
import { useDishCardStore } from '@/store/dishCard'

const DEFAULT_TYPE = 'dish'
const emptyResults = { restaurants: [], dishes: [] }

const normalizeType = (value) => (value === 'restaurant' ? 'restaurant' : 'dish')

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { access, requireAccess, requestPaywall } = useOutletContext() || {}
  const canAccess = access?.isActive
  const openDishCard = useDishCardStore((state) => state.open)

  const queryParam = searchParams.get('q')?.trim() ?? ''
  const searchType = normalizeType(searchParams.get('type'))
  const [inputValue, setInputValue] = useState(queryParam)

  useEffect(() => setInputValue(queryParam), [queryParam])

  const ensureAccess = useCallback(() => {
    if (requireAccess) {
      return requireAccess()
    }
    if (canAccess) return true
    if (requestPaywall) requestPaywall()
    return false
  }, [canAccess, requireAccess, requestPaywall])

  useEffect(() => {
    if (canAccess === false) {
      ensureAccess()
    }
  }, [canAccess, ensureAccess])

  const [results, setResults] = useState(emptyResults)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const query = queryParam.trim()
    if (!query || canAccess === false) {
      setResults(emptyResults)
      setLoading(false)
      setError('')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    searchFull(query)
      .then((data) => {
        if (cancelled) return
        setResults({
          restaurants: data?.restaurants ?? [],
          dishes: data?.dishes ?? [],
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Не удалось выполнить поиск')
        setResults(emptyResults)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canAccess, queryParam])

  const updateParams = useCallback((nextQuery, nextType = searchType) => {
    const params = new URLSearchParams()
    const normalizedQuery = nextQuery.trim()
    if (normalizedQuery) {
      params.set('q', normalizedQuery)
    }
    params.set('type', nextType || DEFAULT_TYPE)
    setSearchParams(params, { replace: true })
  }, [searchType, setSearchParams])

  const handleSubmit = useCallback((event) => {
    event.preventDefault()
    updateParams(inputValue, searchType)
  }, [inputValue, searchType, updateParams])

  const handleTypeChange = useCallback((type) => {
    if (type === searchType) return
    updateParams(inputValue, normalizeType(type))
  }, [inputValue, searchType, updateParams])

  const handleRestaurantOpen = useCallback((slug) => {
    if (!slug) return
    if (ensureAccess()) {
      navigate(`/r/${slug}/menu`)
    }
  }, [ensureAccess, navigate])

  const handleDishOpen = useCallback((dish) => {
    openDishCard({
      id: dish.id,
      dishName: dish.dishName,
      restaurantSlug: dish.restaurantSlug,
      restaurantName: dish.restaurantName,
    })
  }, [openDishCard])

  const hasQuery = queryParam.length > 0
  const showingDishes = searchType === 'dish'
  const dishes = results?.dishes ?? []
  const restaurants = results?.restaurants ?? []
  const hasResults = showingDishes ? dishes.length > 0 : restaurants.length > 0

  if (canAccess === false) {
    return (
      <div className="search-page">
        <h1 className="search-page__title">Поиск</h1>
        <p>Оформите подписку, чтобы пользоваться поиском блюд.</p>
      </div>
    )
  }

  return (
    <div className="search-page">
      <div className="search-page__header">
        <h1 className="search-page__title">Поиск</h1>
        <p className="search-page__hint">Введите запрос и выберите, что искать.</p>
      </div>

      <form className="search-page__form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="search-query">Поисковый запрос</label>
        <input
          id="search-query"
          className="search-page__input"
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Например, бургер или название ресторана"
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary search-page__submit">Искать</button>
      </form>

      <div className="segmented-control" role="group" aria-label="Режим поиска">
        <button
          type="button"
          className={`segmented-control__option${showingDishes ? ' is-active' : ''}`}
          onClick={() => handleTypeChange('dish')}
        >
          Блюда
        </button>
        <button
          type="button"
          className={`segmented-control__option${searchType === 'restaurant' ? ' is-active' : ''}`}
          onClick={() => handleTypeChange('restaurant')}
        >
          Рестораны
        </button>
      </div>

      {!hasQuery && (
        <div className="search-state">Введите название блюда или ресторана и нажмите «Искать».</div>
      )}

      {loading && <div className="search-state">Ищем…</div>}
      {error && <div className="search-state search-state--error">Ошибка: {error}</div>}
      {!loading && hasQuery && !hasResults && !error && (
        <div className="search-state search-state--empty">Ничего не нашли по «{queryParam}»</div>
      )}

      {showingDishes && dishes.length > 0 && (
        <ul className="search-results">
          {dishes.map((dish) => (
            <li key={`dish-${dish.id}`} className="search-card search-card--dish">
              <button type="button" className="search-card__button" onClick={() => handleDishOpen(dish)}>
                <div className="search-card__title">{dish.dishName}</div>
                <div className="search-card__subtitle">{dish.restaurantName}</div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showingDishes && restaurants.length > 0 && (
        <ul className="search-results">
          {restaurants.map((restaurant) => (
            <li key={`restaurant-${restaurant.id}`} className="search-card search-card--restaurant">
              <button type="button" className="search-card__button" onClick={() => handleRestaurantOpen(restaurant.slug)}>
                <div className="search-card__title">{restaurant.name}</div>
                {restaurant.city && (
                  <div className="search-card__subtitle">{restaurant.city}</div>
                )}
                <div className="search-card__meta">Открыть меню</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
