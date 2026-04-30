import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────
// Данные
// ─────────────────────────────────────────────

const PAIN_POINTS = [
  {
    icon: PainIconScale,
    title: 'Хочешь похудеть или набрать мышцы',
    body: 'Диетологи единодушны: без контроля калорий и БЖУ добиться стабильного результата крайне сложно. Даже самые строгие тренировки нивелируются одним незамеченным блюдом.',
  },
  {
    icon: PainIconFork,
    title: 'Но ты ешь в ресторанах',
    body: 'Рестораны не обязаны печатать КБЖУ в меню. Порции везде разные, состав — загадка. В итоге ты либо отказываешься от вкусного, либо теряешь контроль над питанием.',
  },
  {
    icon: PainIconQuestion,
    title: 'Считать вслепую — не вариант',
    body: 'Онлайн-калькуляторы дают среднее по больнице. Блюдо «паста болоньезе» в разных ресторанах отличается на 300–400 ккал. Такая погрешность ломает любой план питания.',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Открой меню ресторана',
    body: 'Введи название ресторана или блюда — сервис найдёт его за секунды. Доступны сотни заведений Москвы.',
    videoSrc: null, // ← сюда вставить URL видео из Kling
    videoPoster: null,
    videoLabel: 'Видео: поиск ресторана в приложении',
  },
  {
    num: '02',
    title: 'Смотри КБЖУ каждого блюда',
    body: 'Реальные данные по калориям, белкам, жирам и углеводам — прямо в меню. Никаких усреднённых значений из интернета.',
    videoSrc: null,
    videoPoster: null,
    videoLabel: 'Видео: просмотр КБЖУ блюда',
  },
  {
    num: '03',
    title: 'Выбирай и ешь с удовольствием',
    body: 'Фильтруй по целям, сохраняй любимые блюда, веди дневник. Ресторан больше не враг твоей цели.',
    videoSrc: null,
    videoPoster: null,
    videoLabel: 'Видео: фильтрация блюд по целям',
  },
]

const COMPARISON = [
  {
    option: 'Консультация нутрициолога',
    cost: '2 000–5 000 ₽/сессия',
    what: 'КБЖУ под конкретного человека',
    verdict: 'limited',
  },
  {
    option: 'MyFitnessPal Premium',
    cost: '~500 ₽/мес',
    what: 'КБЖУ из базы, нет ресторанов РФ',
    verdict: 'limited',
  },
  {
    option: 'Считать самому в ресторане',
    cost: 'Невозможно',
    what: 'Меню без граммов и состава',
    verdict: 'bad',
  },
  {
    option: 'RestaurantSecret',
    cost: '99 ₽/мес',
    what: 'Готовое КБЖУ по реальным московским меню',
    verdict: 'good',
    highlight: true,
  },
]

// ─────────────────────────────────────────────
// Компонент страницы
// ─────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <main className="hiw" data-page="how-it-works">

      {/* ── Навбар ── */}
      <header className="landing-warm__nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="landing-warm__nav-left">
          <Link to="/" className="landing-warm__brand-link" aria-label="RestaurantSecret">
            <img src="/assets/logo.png" alt="" aria-hidden="true" className="landing-warm__logo" />
            <span className="landing-warm__brand">RestaurantSecret</span>
          </Link>
        </div>
        <nav className="landing-warm__nav-center" aria-label="Разделы">
          <Link to="/restaurants">Рестораны</Link>
          <Link to="/how-it-works" aria-current="page">Как работает</Link>
          <Link to="/tariffs">Тарифы</Link>
          <a href="https://t.me/RestSecretSupport_bot" target="_blank" rel="noopener noreferrer">Поддержка</a>
        </nav>
        <div className="landing-warm__nav-right">
          <Link to="/onboarding/welcome" className="landing-warm__nav-cta">Попробовать</Link>
        </div>
      </header>

      {/* ── 1. Герой-блок ── */}
      <section className="hiw__hero">
        <div className="hiw__hero-inner">
          <p className="hiw__hero-eyebrow">Как это работает</p>
          <h1 className="hiw__hero-title">
            Ешь в ресторанах —<br />
            <em>не теряй контроль</em>
          </h1>
          <p className="hiw__hero-sub">
            RestaurantSecret — единственный сервис с реальным КБЖУ московских ресторанов.
            Никаких догадок, никаких срывов.
          </p>
        </div>
        <div className="hiw__hero-scroll" aria-hidden="true">
          <div className="hiw__hero-scroll-line" />
          <svg viewBox="0 0 14 14"><path d="M3 5 L7 9 L11 5" /></svg>
        </div>
      </section>

      {/* ── 2. Проблема ── */}
      <section className="hiw__problem" aria-labelledby="problem-title">
        <div className="hiw__section-head">
          <h2 id="problem-title">
            Почему учёт КБЖУ — <em>основа</em> любой цели
          </h2>
          <p>Без понимания, что ты ешь, невозможно управлять результатом — будь то похудение, набор массы или просто здоровье.</p>
        </div>

        <div className="hiw__pain-grid">
          {PAIN_POINTS.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="hiw__pain-card">
                <div className="hiw__pain-icon" aria-hidden="true">
                  <Icon />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* ── 3. Как работает: 3 шага ── */}
      <section className="hiw__steps" aria-labelledby="steps-title">
        <div className="hiw__section-head hiw__section-head--dark">
          <h2 id="steps-title">Три шага — и ты под контролем</h2>
          <p>Никаких сложных настроек. Открыл — нашёл — выбрал.</p>
        </div>

        <div className="hiw__steps-list">
          {STEPS.map((step, idx) => (
            <div key={step.num} className={`hiw__step ${idx % 2 === 1 ? 'hiw__step--reverse' : ''}`}>
              {/* Текстовая часть */}
              <div className="hiw__step-text">
                <span className="hiw__step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>

              {/* Видео-плейсхолдер */}
              <div className="hiw__step-media">
                {step.videoSrc ? (
                  <video
                    className="hiw__step-video"
                    src={step.videoSrc}
                    poster={step.videoPoster || undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-label={step.videoLabel}
                  />
                ) : (
                  <div className="hiw__step-video-placeholder" aria-label={step.videoLabel}>
                    <VideoPlaceholderIcon />
                    <span>Видео скоро появится</span>
                    <small>{step.videoLabel}</small>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Сравнение с альтернативами ── */}
      <section className="hiw__compare" aria-labelledby="compare-title">
        <div className="hiw__section-head">
          <h2 id="compare-title">
            RestaurantSecret против <em>альтернатив</em>
          </h2>
          <p>Раньше выбора не было. Теперь есть.</p>
        </div>

        <div className="hiw__compare-table-wrap">
          <table className="hiw__compare-table" role="table">
            <thead>
              <tr>
                <th scope="col">Вариант</th>
                <th scope="col">Стоимость</th>
                <th scope="col">Что даёт</th>
                <th scope="col" aria-label="Оценка" />
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr
                  key={row.option}
                  className={`hiw__compare-row ${row.highlight ? 'hiw__compare-row--highlight' : ''} hiw__compare-row--${row.verdict}`}
                >
                  <td className="hiw__compare-name">
                    {row.highlight && <span className="hiw__compare-badge">Мы</span>}
                    {row.option}
                  </td>
                  <td className="hiw__compare-cost">{row.cost}</td>
                  <td className="hiw__compare-what">{row.what}</td>
                  <td className="hiw__compare-verdict" aria-label={verdictLabel(row.verdict)}>
                    <VerdictIcon verdict={row.verdict} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. CTA ── */}
      <section className="hiw__cta">
        <h2>
          Попробуйте <em>бесплатно</em> — 7 дней
        </h2>
        <p>Полный доступ ко всем ресторанам. Без привязки карты.</p>
        <div className="hiw__cta-actions">
          <Link to="/onboarding/welcome" className="landing-warm__cta-primary">
            Начать бесплатно
          </Link>
          <Link to="/restaurants" className="landing-warm__cta-secondary">
            Посмотреть меню
          </Link>
        </div>
      </section>

      <style>{hiwStyles}</style>
    </main>
  )
}

// ─────────────────────────────────────────────
// Вспомогательные функции
// ─────────────────────────────────────────────

function verdictLabel(verdict) {
  if (verdict === 'good') return 'Отлично'
  if (verdict === 'limited') return 'Частично'
  return 'Не подходит'
}

// ─────────────────────────────────────────────
// Иконки
// ─────────────────────────────────────────────

function PainIconScale() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="var(--warm-warm)" strokeWidth="2" />
      <line x1="24" y1="12" x2="24" y2="36" stroke="var(--warm-warm)" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="20" x2="24" y2="24" stroke="var(--warm-rule-strong, #ccc)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="24" x2="35" y2="20" stroke="var(--warm-rule-strong, #ccc)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="13" cy="20" r="3" fill="var(--warm-p)" />
      <circle cx="35" cy="20" r="3" fill="var(--warm-c)" />
    </svg>
  )
}

function PainIconFork() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="4" y="14" width="40" height="24" rx="6" stroke="var(--warm-warm)" strokeWidth="2" />
      <line x1="14" y1="22" x2="14" y2="30" stroke="var(--warm-warm)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="20" x2="24" y2="32" stroke="var(--warm-ink-soft, #888)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
      <line x1="34" y1="22" x2="34" y2="30" stroke="var(--warm-ink-soft, #888)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  )
}

function PainIconQuestion() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="var(--warm-warm)" strokeWidth="2" />
      <path d="M18 19c0-3.3 2.7-6 6-6s6 2.7 6 6c0 3-2 4.5-4 6v2" stroke="var(--warm-warm)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="34" r="1.5" fill="var(--warm-warm)" />
    </svg>
  )
}

function VideoPlaceholderIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="36" height="28" rx="5" stroke="currentColor" strokeWidth="2" />
      <path d="M40 20 L52 14 L52 34 L40 28 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="18" cy="40" r="2" fill="currentColor" />
      <circle cx="28" cy="40" r="2" fill="currentColor" />
      <circle cx="38" cy="40" r="2" fill="currentColor" />
    </svg>
  )
}

function VerdictIcon({ verdict }) {
  if (verdict === 'good') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#4ade80" />
        <path d="M7 12 L10.5 15.5 L17 8.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (verdict === 'limited') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#fbbf24" />
        <path d="M7 12 H17" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#f87171" />
      <path d="M8 8 L16 16 M16 8 L8 16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

// ─────────────────────────────────────────────
// Стили (scoped через .hiw)
// ─────────────────────────────────────────────

const hiwStyles = `
/* Страница использует warm-тему Landing как базу */
.hiw {
  --warm-bg: #f3ede2;
  --warm-bg-soft: #fbf3e1;
  --warm-card: #ffffff;
  --warm-ink: #2a2620;
  --warm-ink-soft: #7a6f5f;
  --warm-rule: #ded3bf;
  --warm-rule-strong: rgba(42, 38, 32, 0.15);
  --warm-warm: #d47a3a;
  --warm-p: #8a9a6b;
  --warm-f: #e8a15e;
  --warm-c: #d87a5e;
  color: var(--warm-ink);
  background: var(--warm-bg);
  font-family: Inter, system-ui, sans-serif;
}

/* ── Герой ── */
.hiw__hero {
  min-height: 52vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 72px 24px 48px;
  position: relative;
  background:
    radial-gradient(ellipse 800px 400px at 50% 0%, rgba(212,122,58,.12), transparent 60%),
    var(--warm-bg);
}

.hiw__hero-inner {
  max-width: 640px;
}

.hiw__hero-eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--warm-warm);
  margin: 0 0 16px;
}

.hiw__hero-title {
  font-family: 'DM Serif Display', 'Playfair Display', Georgia, serif;
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1.12;
  font-weight: 400;
  color: var(--warm-ink);
  margin: 0 0 20px;
}

.hiw__hero-title em {
  font-style: italic;
  color: var(--warm-warm);
}

.hiw__hero-sub {
  font-size: 1.05rem;
  color: var(--warm-ink-soft);
  line-height: 1.6;
  margin: 0;
}

.hiw__hero-scroll {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 40px;
  opacity: .4;
}
.hiw__hero-scroll-line {
  width: 1px;
  height: 36px;
  background: var(--warm-ink-soft);
}
.hiw__hero-scroll svg {
  width: 14px;
  height: 14px;
  stroke: var(--warm-ink-soft);
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
}

/* ── Секционные шапки ── */
.hiw__section-head {
  text-align: center;
  max-width: 580px;
  margin: 0 auto 56px;
}
.hiw__section-head h2 {
  font-family: 'DM Serif Display', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 400;
  margin: 0 0 14px;
  line-height: 1.18;
}
.hiw__section-head h2 em {
  font-style: italic;
  color: var(--warm-warm);
}
.hiw__section-head p {
  color: var(--warm-ink-soft);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}
.hiw__section-head--dark h2 { color: var(--warm-bg-soft); }
.hiw__section-head--dark p  { color: rgba(251,243,225,.65); }

/* ── Проблема ── */
.hiw__problem {
  padding: 80px 24px;
  max-width: 1120px;
  margin: 0 auto;
}

.hiw__pain-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.hiw__pain-card {
  background: var(--warm-card);
  border: 1px solid var(--warm-rule);
  border-radius: 20px;
  padding: 32px 28px;
  transition: box-shadow .2s;
}
.hiw__pain-card:hover {
  box-shadow: 0 8px 28px rgba(42,38,32,.1);
}

.hiw__pain-icon {
  margin-bottom: 20px;
}

.hiw__pain-card h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 10px;
  color: var(--warm-ink);
}

.hiw__pain-card p {
  font-size: .92rem;
  color: var(--warm-ink-soft);
  line-height: 1.65;
  margin: 0;
}

/* ── Шаги ── */
.hiw__steps {
  background: var(--warm-ink);
  color: var(--warm-bg-soft);
  padding: 80px 24px;
}

.hiw__steps-list {
  max-width: 1040px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 72px;
}

.hiw__step {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
}

.hiw__step--reverse {
  direction: rtl;
}
.hiw__step--reverse > * {
  direction: ltr;
}

.hiw__step-num {
  display: block;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 3.5rem;
  color: var(--warm-warm);
  opacity: .55;
  line-height: 1;
  margin-bottom: 12px;
}

.hiw__step-text h3 {
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--warm-bg-soft);
}

.hiw__step-text p {
  font-size: .95rem;
  color: rgba(251,243,225,.7);
  line-height: 1.65;
  margin: 0;
}

/* Видео */
.hiw__step-video {
  width: 100%;
  border-radius: 16px;
  display: block;
  aspect-ratio: 16/9;
  object-fit: cover;
  box-shadow: 0 20px 48px rgba(0,0,0,.35);
}

.hiw__step-video-placeholder {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 16px;
  background: rgba(255,255,255,.06);
  border: 2px dashed rgba(212,122,58,.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(251,243,225,.4);
  font-size: .85rem;
  text-align: center;
  padding: 24px;
}
.hiw__step-video-placeholder svg { opacity: .5; }
.hiw__step-video-placeholder span { font-weight: 500; }
.hiw__step-video-placeholder small { font-size: .75rem; opacity: .7; }

/* ── Сравнение ── */
.hiw__compare {
  padding: 80px 24px;
  max-width: 1120px;
  margin: 0 auto;
}

.hiw__compare-table-wrap {
  overflow-x: auto;
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(42,38,32,.1);
}

.hiw__compare-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--warm-card);
  border-radius: 20px;
  overflow: hidden;
  font-size: .95rem;
}

.hiw__compare-table thead tr {
  background: var(--warm-bg-soft);
}

.hiw__compare-table th {
  padding: 14px 20px;
  text-align: left;
  font-size: .78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--warm-ink-soft);
  white-space: nowrap;
}

.hiw__compare-table td {
  padding: 16px 20px;
  border-top: 1px solid var(--warm-rule);
  vertical-align: middle;
}

.hiw__compare-row--highlight {
  background: rgba(212,122,58,.06);
}
.hiw__compare-row--highlight td {
  border-top-color: rgba(212,122,58,.25);
  font-weight: 500;
}

.hiw__compare-name {
  font-weight: 500;
  color: var(--warm-ink);
  display: flex;
  align-items: center;
  gap: 8px;
}

.hiw__compare-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--warm-warm);
  color: #fff;
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .04em;
  white-space: nowrap;
}

.hiw__compare-cost {
  color: var(--warm-ink-soft);
  white-space: nowrap;
}

.hiw__compare-what {
  color: var(--warm-ink-soft);
}
.hiw__compare-row--highlight .hiw__compare-what {
  color: var(--warm-ink);
}

.hiw__compare-verdict {
  text-align: center;
  width: 48px;
}

/* ── CTA ── */
.hiw__cta {
  background: var(--warm-ink);
  color: var(--warm-bg-soft);
  text-align: center;
  padding: 80px 24px;
}

.hiw__cta h2 {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(1.7rem, 4vw, 2.8rem);
  font-weight: 400;
  margin: 0 0 14px;
}

.hiw__cta h2 em {
  font-style: italic;
  color: var(--warm-warm);
}

.hiw__cta p {
  color: rgba(251,243,225,.65);
  font-size: 1rem;
  margin: 0 0 36px;
}

.hiw__cta-actions {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── Адаптив ── */
@media (max-width: 720px) {
  .hiw__step,
  .hiw__step--reverse {
    grid-template-columns: 1fr;
    direction: ltr;
  }
  .hiw__step-num { font-size: 2.5rem; }
  .hiw__compare-table th:nth-child(2),
  .hiw__compare-table td:nth-child(2) { display: none; }
}
`
