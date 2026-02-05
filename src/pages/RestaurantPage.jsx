// Detailed restaurant profile view with advanced filtering controls.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet } from '@/lib/requests';
import { flattenMenuDishes, formatNumeric } from '@/lib/nutrition';
import { formatDescription } from '@/lib/text';
import { formatMenuCapturedAt } from '@/lib/dates';
import { useAuth } from '@/store/auth';
import { useSubscriptionStore } from '@/store/subscription';
import { MenuOutdatedModal } from '@/components/MenuOutdatedModal';
import { analytics } from '@/services/analytics';
import { useFavoriteRestaurantsStore } from '@/store/favoriteRestaurants';

// Assumption: subscription is active when you render this page
// If you still keep useSubscription, you can gate this page by redirecting beforehand.

export default function RestaurantPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const accessToken = useAuth((state) => state.accessToken);
  const { hasActiveSub, fetchStatus } = useSubscriptionStore((state) => ({
    hasActiveSub: state.hasActiveSub,
    fetchStatus: state.fetchStatus,
  }));
  const [isOutdatedOpen, setIsOutdatedOpen] = useState(false);

  const { isFavorite, toggleFavorite, loadFavorites } = useFavoriteRestaurantsStore((state) => ({
    isFavorite: state.isFavorite(slug),
    toggleFavorite: state.toggle,
    loadFavorites: state.load,
  }));

  useEffect(() => {
    if (accessToken) {
      loadFavorites(accessToken);
    }
  }, [accessToken, loadFavorites]);

  const handleToggleFavorite = async () => {
    if (!accessToken) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    await toggleFavorite(accessToken, slug);
  };

  // UI state
  const [q, setQ] = useState('');                 // поиск по названию блюда
  const [presets, setPresets] = useState({        // чипы-пресеты
    highProtein: false,
    lowFat: false,
    lowKcal: false,
  });
  const [range, setRange] = useState({            // точные фильтры
    kcal: { min: '', max: '' },
    protein: { min: '', max: '' },
    fat: { min: '', max: '' },
    carbs: { min: '', max: '' },
  });

  useEffect(() => {
    let aborted = false;
    (async () => {
      await fetchStatus(accessToken);
      try {
        setLoading(true);
        setErr(null);
        const data = await apiGet(`/restaurants/${slug}/menu`);
        if (!aborted) {
          const m = normalizeMenu(data);
          setMenu(m);
          analytics.track("restaurant_open", { slug, name: m.name });
        }
      } catch (e) {
        if (!aborted) setErr('Не удалось загрузить меню');
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [accessToken, fetchStatus, slug]);

  const handleSubscribeClick = () => {
    if (accessToken) {
      navigate('/account/subscription');
      return;
    }
    navigate('/login', { state: { from: '/account/subscription' } });
  };

  // применение фильтров
  const filtered = useMemo(() => {
    const dishes = flattenMenuDishes(menu); // [{id,name,kcal,protein,fat,carbs,category,price,weight}, ...]
    return dishes.filter(d => {
      // 1) поиск по названию
      if (q && !d.name.toLowerCase().includes(q.trim().toLowerCase())) return false;

      // 2) пресеты
      if (presets.highProtein && !(d.protein >= 25)) return false; // много белка
      if (presets.lowFat && !(d.fat <= 10)) return false;          // мало жиров
      if (presets.lowKcal && !(d.kcal <= 400)) return false;       // мало калорий

      // 3) точные диапазоны
      if (!inRange(d.kcal, range.kcal.min, range.kcal.max)) return false;
      if (!inRange(d.protein, range.protein.min, range.protein.max)) return false;
      if (!inRange(d.fat, range.fat.min, range.fat.max)) return false;
      if (!inRange(d.carbs, range.carbs.min, range.carbs.max)) return false;

      return true;
    });
  }, [menu, q, presets, range]);

  const menuCapturedAtLabel = useMemo(
    () => formatMenuCapturedAt(menu?.menuCapturedAt),
    [menu?.menuCapturedAt]
  );

  function togglePreset(key) {
    setPresets(p => ({ ...p, [key]: !p[key] }));
  }
  function setField(group, edge, val) {
    setRange(r => ({ ...r, [group]: { ...r[group], [edge]: val.replace(/[^\d]/g, '') } }));
  }
  function resetFilters() {
    setQ('');
    setPresets({ highProtein: false, lowFat: false, lowKcal: false });
    setRange({ kcal: { min: '', max: '' }, protein: { min: '', max: '' }, fat: { min: '', max: '' }, carbs: { min: '', max: '' } });
  }

  return (
    <main className="restaurant-page">
      <header className="rp__header">
        <div className="rp__title-row">
          <h1 className="rp__title">{menu?.name || slug}</h1>
          <button
            type="button"
            className={`rp__fav-btn ${isFavorite ? 'is-active' : ''}`}
            onClick={handleToggleFavorite}
            aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                fill={isFavorite ? "#E11D48" : "none"}
                stroke={isFavorite ? "#E11D48" : "currentColor"}
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>
        <div className="rp__meta">
          <div className="rp__meta-items">
            {menu?.cuisine && <span className="rp__cuisine">{menu.cuisine}</span>}
            {menu?.address && <span className="rp__address">{menu.address}</span>}
          </div>
          <button
            type="button"
            className="btn btn--ghost rp__outdated"
            onClick={() => setIsOutdatedOpen(true)}
          >
            <span className="rp__outdated-icon" aria-hidden>⟳</span>
            Меню устарело
          </button>
        </div>
      </header>

      <section className="rp__filters" aria-label="Фильтры блюд">
        <div className="rp__row">
          <input
            className="rp__search"
            type="search"
            placeholder="Поиск по названию блюда"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button className="btn btn--ghost" onClick={resetFilters}>Сбросить</button>
        </div>

        <div className="rp__chips">
          <Chip active={presets.highProtein} onClick={() => togglePreset('highProtein')}>💪 Много белка</Chip>
          <Chip active={presets.lowFat} onClick={() => togglePreset('lowFat')}>🥗 Мало жиров</Chip>
          <Chip active={presets.lowKcal} onClick={() => togglePreset('lowKcal')}>🔥 Мало калорий</Chip>
        </div>

        <div className="rp__grid">
          <MacroRange label="Калории" value={range.kcal} onChange={(edge, v) => setField('kcal', edge, v)} />
          <MacroRange label="Белки (г)" value={range.protein} onChange={(edge, v) => setField('protein', edge, v)} />
          <MacroRange label="Жиры (г)" value={range.fat} onChange={(edge, v) => setField('fat', edge, v)} />
          <MacroRange label="Углеводы (г)" value={range.carbs} onChange={(edge, v) => setField('carbs', edge, v)} />
        </div>
      </section>

      <section className="rp__content">
        {loading && <p>Загружаем меню…</p>}
        {err && !loading && <p className="rp__error">{err}</p>}
        {!loading && !err && (
          filtered.length ? (
            <div className="rp__list">
              {filtered.map(d => (
                <DishCard
                  key={d.id || d.name}
                  dish={d}
                  hasActiveSub={hasActiveSub}
                  onSubscribe={handleSubscribeClick}
                  menuCapturedAt={menuCapturedAtLabel}
                />
              ))}
            </div>
          ) : (
            <p className="rp__empty">Нет блюд по заданным параметрам</p>
          )
        )}
      </section>

      {/* minimal styles for MVP */}
      <style>{styles}</style>
      <MenuOutdatedModal
        restaurantName={menu?.name || slug}
        isOpen={isOutdatedOpen}
        onClose={() => setIsOutdatedOpen(false)}
      />
    </main>
  );
}

/* ---------- helpers & mini components ---------- */

function inRange(value, min, max) {
  const v = Number(value);
  const lo = min === '' ? -Infinity : Number(min);
  const hi = max === '' ? +Infinity : Number(max);
  if (Number.isNaN(v)) return false;
  return v >= lo && v <= hi;
}

function normalizeMenu(raw) {
  // Expecting shape like { name, cuisine, categories:[{name, dishes:[{...}]}], ... }
  // Keep as-is; we normalize later when flatten.
  return raw || {};
}


function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`chip ${active ? 'chip--on' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function MacroRange({ label, value, onChange }) {
  return (
    <div className="range">
      <label className="range__label">{label}</label>
      <div className="range__row">
        <input
          className="range__input"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="мин"
          value={value.min}
          onChange={e => onChange('min', e.target.value)}
        />
        <span className="range__dash">—</span>
        <input
          className="range__input"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="макс"
          value={value.max}
          onChange={e => onChange('max', e.target.value)}
        />
      </div>
    </div>
  );
}

function DishCard({ dish, hasActiveSub, onSubscribe, menuCapturedAt }) {
  const description = formatDescription(dish.ingredients ?? dish.description);

  return (
    <div className="dish">
      <div className="dish__top">
        <div className="dish__name">{dish.name}</div>
        {Number.isFinite(dish.price) && <div className="dish__price">{Math.round(dish.price)} ₽</div>}
      </div>
      {hasActiveSub ? (
        <>
          <div className="dish__meta">
            <span className="pill">{formatNumeric(dish.kcal)} ккал</span>
            <span className="pill">Б {formatNumeric(dish.protein)} г</span>
            <span className="pill">Ж {formatNumeric(dish.fat)} г</span>
            <span className="pill">У {formatNumeric(dish.carbs)} г</span>
            {Number.isFinite(dish.weight) && <span className="pill">{formatNumeric(dish.weight)} г</span>}
          </div>
          {dish.category && <div className="dish__category">{dish.category}</div>}
          <div className="dish__ing">{description}</div>
        </>
      ) : (
        <div className="dish__paywall">
          <p className="dish__paywall-text">Эта информация доступна только по подписке.</p>
          <button type="button" className="btn" onClick={onSubscribe}>Оформить подписку</button>
        </div>
      )}
      {menuCapturedAt && <div className="dish__captured">Меню добавлено: {menuCapturedAt}</div>}
    </div>
  );
}

const styles = `
.restaurant-page { padding: 16px 16px 24px; }
.rp__header { margin-bottom: 12px; }
.rp__title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.rp__title { font-size: 22px; margin: 0; }
.rp__fav-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, color 0.2s ease;
  border-radius: 50%;
}
.rp__fav-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: scale(1.1);
}
.rp__fav-btn.is-active {
  color: #E11D48;
}
.rp__meta { color:#64748b; display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
.rp__meta-items { display:flex; gap:10px; flex-wrap:wrap; }
.rp__outdated {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 14px;
  border-color: rgba(47, 143, 91, 0.28);
  background: linear-gradient(120deg, rgba(47, 143, 91, 0.12), rgba(15, 23, 42, 0.04));
  color: #0f172a;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
}
.rp__outdated:hover {
  border-color: rgba(47, 143, 91, 0.4);
  background: linear-gradient(120deg, rgba(47, 143, 91, 0.16), rgba(15, 23, 42, 0.06));
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
}
.rp__outdated-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #27774c;
  font-size: 15px;
}

.rp__filters { background:#f8fafc; border:1px solid #e5e7eb; border-radius:14px; padding:12px; margin: 10px 0 14px; }
.rp__row { display:flex; gap:8px; align-items:center; }
.rp__search { flex:1; padding:10px 12px; border:1px solid #d1d5db; border-radius:12px; }
.btn { padding:10px 12px; border-radius:10px; background:#0ea5e9; color:#fff; border:0; cursor:pointer; }
.btn--ghost { background:#fff; color:#0f172a; border:1px solid #d1d5db; }

.rp__chips { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0 6px; }
.chip { padding:8px 12px; border-radius:999px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; }
.chip--on { background:#e6f7ff; border-color:#bae6fd; }

.rp__grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-top: 6px; }
.range__label { font-size: 12px; color:#334155; margin-bottom: 6px; display:block; }
.range__row { display:flex; align-items:center; gap:6px; }
.range__input { width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:10px; }
.range__dash { color:#94a3b8; }

.rp__content { margin-top: 10px; }
.rp__error { color:#b91c1c; }
.rp__empty { color:#64748b; }

.rp__list { display:grid; grid-template-columns: 1fr; gap:10px; }
@media (min-width:768px){ .rp__list { grid-template-columns: repeat(2,1fr); } }
@media (min-width:1120px){ .rp__list { grid-template-columns: repeat(3,1fr); } }

.dish { border:1px solid #e5e7eb; border-radius:14px; padding:12px; background:#fff; }
.dish__top { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; }
.dish__name { font-weight:700; }
.dish__price { color:#0f172a; font-weight:600; }
.dish__meta { display:flex; flex-wrap:wrap; gap:6px; margin: 6px 0 2px; }
.pill { font-size:12px; padding:4px 8px; border:1px solid #e2e8f0; border-radius:999px; color:#0f172a; background:#f8fafc; }
.dish__category { font-size:12px; color:#64748b; }
.dish__ing { font-size:13px; color:#334155; margin-top:4px; }
.dish__paywall { display:flex; align-items:center; gap:10px; margin-top:8px; flex-wrap:wrap; }
.dish__paywall-text { margin:0; color:#475569; }
.dish__captured { margin-top:8px; font-size:12px; color:#475569; }
`;
