import { useState } from 'react'
import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────
// Данные
// ─────────────────────────────────────────────

const PAIN_POINTS = [
  {
    icon: PainIconScale,
    title: 'Хочешь результата — нужен учёт',
    body: 'Без контроля КБЖУ невозможно похудеть, набрать мышцы или просто питаться осознанно. Каждое незамеченное блюдо — это до 600 скрытых калорий, которые тормозят прогресс неделями.',
  },
  {
    icon: PainIconFork,
    title: 'Рестораны — слепая зона',
    body: 'Рестораны не обязаны указывать КБЖУ. Порции везде разные, состав — загадка. Одна «здоровая» паста в разных местах отличается на 300–400 ккал.',
  },
  {
    icon: PainIconQuestion,
    title: 'Общие базы не работают',
    body: 'MyFitnessPal и аналоги дают усреднённые данные из интернета — не из конкретного ресторана. Это погрешность, которая ломает любой план питания.',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Найди ресторан или блюдо',
    body: 'Введи название — сервис найдёт за секунды. Сотни заведений Москвы с реальными меню.',
    videoSrc: null, // ← вставить URL видео из Kling
    videoPoster: null,
    videoLabel: 'Поиск ресторана в приложении',
    screenIcon: SearchScreenIcon,
  },
  {
    num: '02',
    title: 'Открой КБЖУ каждого блюда',
    body: 'Калории, белки, жиры, углеводы — по данным конкретного ресторана. Не средние из базы.',
    videoSrc: null,
    videoPoster: null,
    videoLabel: 'Просмотр КБЖУ блюда',
    screenIcon: KbzhuScreenIcon,
  },
  {
    num: '03',
    title: 'Выбирай под свои цели',
    body: 'Фильтры по калориям и БЖУ, дневник питания, избранное.',
    videoSrc: null,
    videoPoster: null,
    videoLabel: 'Фильтрация блюд по целям',
    screenIcon: FilterScreenIcon,
  },
]

// Anchoring: сначала дорогие, потом мы. Годовые цены — контрастный аргумент.
const COMPARISON = [
  {
    option: 'Консультация нутрициолога',
    costMonth: '2 000–5 000 ₽/сессия',
    costYear: 'от 24 000 ₽/год',
    what: 'КБЖУ под конкретного человека',
    verdict: 'limited',
  },
  {
    option: 'MyFitnessPal, FatSecret, LifeSum и др.',
    costMonth: '~500 ₽/мес',
    costYear: '~6 000 ₽/год',
    what: 'КБЖУ из непроверенной базы, нет многих ресторанов РФ',
    verdict: 'limited',
  },
  {
    option: 'Считать самому в ресторане',
    costMonth: '—',
    costYear: '—',
    what: 'Недоступный/неудобный формат, длительный поиск, сложное принятие решения',
    verdict: 'bad',
  },
  {
    option: 'RestaurantSecret',
    costMonth: '199 ₽/мес',
    costYear: '1 490 ₽/год',
    what: 'КБЖУ по реальным меню с быстрым поиском и фильтрами',
    verdict: 'good',
    highlight: true,
    note: '≈ 6,6 ₽ в день',
  },
]

const FAQ = [
  {
    q: 'Мой ресторан есть в базе?',
    a: 'База включает сотни московских ресторанов и пополняется каждую неделю. Проверить конкретное место можно бесплатно — без подписки.',
  },
  {
    q: 'Насколько точные данные?',
    a: 'Данные берутся из официальных меню и технологических карт ресторанов — не из усреднённых интернет-баз и не из ИИ-угадывания по фото.',
  },
  {
    q: 'Как работает пробный период?',
    a: 'Первые 7 дней — полный доступ ко всем ресторанам и функциям. После пробного периода подписка автоматически продолжается за 199 ₽/мес. Отменить можно в любой момент в личном кабинете.',
  },
  {
    q: 'Зачем нужна карта для пробного периода?',
    a: 'Привязка карты нужна для автоматического продления после 7 дней. Вы ничего не платите сейчас — списание произойдёт только на 8-й день, если вы не отмените подписку.',
  },
  {
    q: 'Как отменить подписку?',
    a: 'Отмена занимает 30 секунд в личном кабинете — без звонков и объяснений. До конца оплаченного периода доступ сохраняется.',
  },
]

// ─────────────────────────────────────────────
// Компонент страницы
// ─────────────────────────────────────────────

export default function HowItWorks() {
  const [openFaq, setOpenFaq] = useState(null)

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
          <Link to="/onboarding/welcome" className="landing-warm__nav-cta">
            Попробовать 7 дней бесплатно →
          </Link>
        </div>
      </header>

      {/* ── 1. Проблема ── */}
      <section className="hiw__problem hiw__problem--intro" aria-labelledby="problem-title">
        <div className="hiw__section-head">
          <h2 id="problem-title">
            Почему учёт КБЖУ — основа любой цели
          </h2>
          <p>Без понимания, что ты ешь, невозможно управлять результатом — будь то похудение, набор массы или просто здоровье.</p>
        </div>

        <div className="hiw__hero-stat-bar" aria-label="Статистика">
          <div className="hiw__hero-stat">
            <strong>+300–600 ккал</strong>
            <span>скрытых калорий в типичном ресторанном обеде</span>
          </div>
          <div className="hiw__hero-stat-divider" />
          <div className="hiw__hero-stat">
            <strong>90% ресторанов</strong>
            <span>не имеют удобных КБЖУ меню</span>
          </div>
          <div className="hiw__hero-stat-divider" />
          <div className="hiw__hero-stat">
            <strong>до 40%*</strong>
            <span>ошибка ИИ распознавания блюд против реальных данных</span>
          </div>
        </div>
        <p className="hiw__hero-stat-footnote">*Shonkoff et al., 2023, systematic review, 52 papers</p>

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

      {/* ── 2. Как работает: 3 шага ── */}
      <section className="hiw__steps" aria-labelledby="steps-title">
        <div className="hiw__section-head hiw__section-head--dark">
          <h2 id="steps-title">Три шага — и ты под контролем</h2>
          <p>Никаких настроек. Открыл — нашёл — выбрал.</p>
        </div>

        <div className="hiw__steps-list">
          {STEPS.map((step, idx) => {
            const ScreenIcon = step.screenIcon
            return (
              <div key={step.num} className={`hiw__step ${idx % 2 === 1 ? 'hiw__step--reverse' : ''}`}>
                <div className="hiw__step-text">
                  <span className="hiw__step-num">{step.num}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>

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
                    // Телефон-макет — выглядит как намеренный дизайн,
                    // а не заглушка. Заменится на video когда будет готово из Kling.
                    <div className="hiw__phone-mock" aria-label={step.videoLabel}>
                      <div className="hiw__phone-mock-inner">
                        <div className="hiw__phone-mock-notch" />
                        <ScreenIcon />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 3. Сравнение ── */}
      <section className="hiw__compare" aria-labelledby="compare-title">
        <div className="hiw__section-head">
          <h2 id="compare-title">
            RestaurantSecret против <em>альтернатив</em>
          </h2>
        </div>

        <div className="hiw__compare-table-wrap">
          <table className="hiw__compare-table" role="table">
            <thead>
              <tr>
                <th scope="col">Вариант</th>
                <th scope="col">В месяц</th>
                <th scope="col">В год</th>
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
                  <td className="hiw__compare-cost">
                    {row.costMonth}
                    {row.note && <span className="hiw__compare-note">{row.note}</span>}
                  </td>
                  <td className="hiw__compare-cost">{row.costYear}</td>
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

      {/* ── 4. FAQ ── */}
      <section className="hiw__faq" aria-labelledby="faq-title">
        <div className="hiw__section-head">
          <h2 id="faq-title">Частые вопросы</h2>
        </div>
        <div className="hiw__faq-list" role="list">
          {FAQ.map((item, idx) => {
            const isOpen = openFaq === idx
            return (
              <div key={idx} className={`hiw__faq-item ${isOpen ? 'is-open' : ''}`} role="listitem">
                <button
                  type="button"
                  className="hiw__faq-q"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  {item.q}
                  <span className="hiw__faq-arrow" aria-hidden="true">{isOpen ? '↑' : '↓'}</span>
                </button>
                {isOpen && <p className="hiw__faq-a">{item.a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 5. CTA ── */}
      <section className="hiw__cta">
        <h2>
          Рестораны больше<br />
          не срывают <em>твои цели</em>
        </h2>
        <p>КБЖУ каждого блюда в сотнях московских ресторанов — прямо в телефоне. Ешь вкусно и знай, что ешь.</p>
        <div className="hiw__cta-actions">
          <Link to="/onboarding/welcome" className="hiw__hero-btn-primary">
            Попробовать 7 дней бесплатно
          </Link>
        </div>
        <p className="hiw__cta-fine">
          <LockIcon /> Потом 199 ₽/мес · Отмена в любой момент
        </p>
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
// Иконки болей
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

// ─────────────────────────────────────────────
// Экраны телефона-макета (вместо видеозаглушек)
// ─────────────────────────────────────────────

function SearchScreenIcon() {
  return (
    <svg viewBox="0 0 200 340" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Строка поиска */}
      <rect x="16" y="20" width="168" height="36" rx="10" fill="rgba(212,122,58,.12)" stroke="var(--warm-warm)" strokeWidth="1.5" />
      <circle cx="38" cy="38" r="8" stroke="var(--warm-warm)" strokeWidth="1.5" />
      <line x1="44" y1="44" x2="48" y2="48" stroke="var(--warm-warm)" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="56" y="32" width="80" height="10" rx="5" fill="rgba(212,122,58,.3)" />
      {/* Популярное */}
      <text x="16" y="76" fill="rgba(251,243,225,.4)" fontSize="10" fontFamily="Inter,sans-serif">Популярные рестораны</text>
      {/* Карточки */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x="16" y={88 + i * 58} width="168" height="46" rx="10" fill="rgba(255,255,255,.06)" />
          <rect x="28" y={98 + i * 58} width="60" height="8" rx="4" fill="rgba(251,243,225,.5)" />
          <rect x="28" y={112 + i * 58} width="40" height="6" rx="3" fill="rgba(212,122,58,.4)" />
          <rect x="140" y={100 + i * 58} width="32" height="20" rx="6" fill="rgba(212,122,58,.2)" />
          <text x="148" y={114 + i * 58} fill="var(--warm-warm)" fontSize="9" fontFamily="Inter,sans-serif" fontWeight="600">{['247', '512', '318', '680'][i]} кк</text>
        </g>
      ))}
    </svg>
  )
}

function KbzhuScreenIcon() {
  return (
    <svg viewBox="0 0 200 340" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Название блюда */}
      <rect x="16" y="20" width="120" height="10" rx="5" fill="rgba(251,243,225,.6)" />
      <rect x="16" y="36" width="80" height="7" rx="3.5" fill="rgba(251,243,225,.3)" />
      {/* Пончик КБЖУ */}
      <circle cx="100" cy="120" r="52" stroke="rgba(255,255,255,.08)" strokeWidth="14" />
      <circle cx="100" cy="120" r="52" stroke="#8a9a6b" strokeWidth="14"
        strokeDasharray="100 228" strokeDashoffset="0"
        transform="rotate(-90 100 120)" strokeLinecap="round" />
      <circle cx="100" cy="120" r="52" stroke="#e8a15e" strokeWidth="14"
        strokeDasharray="70 228" strokeDashoffset="-100"
        transform="rotate(-90 100 120)" strokeLinecap="round" />
      <circle cx="100" cy="120" r="52" stroke="#d87a5e" strokeWidth="14"
        strokeDasharray="58 228" strokeDashoffset="-170"
        transform="rotate(-90 100 120)" strokeLinecap="round" />
      <text x="100" y="115" textAnchor="middle" fill="rgba(251,243,225,.9)" fontSize="22" fontFamily="Inter,sans-serif" fontWeight="700">412</text>
      <text x="100" y="130" textAnchor="middle" fill="rgba(251,243,225,.4)" fontSize="9" fontFamily="Inter,sans-serif">ККАЛ</text>
      {/* Легенда */}
      <g transform="translate(16, 196)">
        {[['Б','#8a9a6b','28г'], ['Ж','#e8a15e','18г'], ['У','#d87a5e','42г']].map(([l, c, v], i) => (
          <g key={l} transform={`translate(${i * 58}, 0)`}>
            <circle cx="8" cy="8" r="5" fill={c} />
            <text x="16" y="12" fill="rgba(251,243,225,.7)" fontSize="11" fontFamily="Inter,sans-serif">{l} {v}</text>
          </g>
        ))}
      </g>
      {/* Кнопка */}
      <rect x="16" y="230" width="168" height="38" rx="10" fill="var(--warm-warm)" />
      <text x="100" y="254" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Inter,sans-serif" fontWeight="600">В дневник питания</text>
    </svg>
  )
}

function FilterScreenIcon() {
  return (
    <svg viewBox="0 0 200 340" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Заголовок */}
      <rect x="16" y="20" width="90" height="10" rx="5" fill="rgba(251,243,225,.6)" />
      {/* Фильтры-чипы */}
      {[['до 400 ккал', true], ['высокий белок', false], ['без глютена', false]].map(([label, active], i) => (
        <g key={label}>
          <rect x={16 + i * 60} y="42" width="56" height="22" rx="11"
            fill={active ? 'var(--warm-warm)' : 'rgba(255,255,255,.08)'}
            stroke={active ? 'none' : 'rgba(255,255,255,.15)'} strokeWidth="1" />
          <text x={44 + i * 60} y="57" textAnchor="middle"
            fill={active ? '#fff' : 'rgba(251,243,225,.5)'}
            fontSize="7.5" fontFamily="Inter,sans-serif" fontWeight={active ? '600' : '400'}>{label}</text>
        </g>
      ))}
      {/* Блюда */}
      {[
        ['Сибас с овощами','Duo Asia','247 ккал', true],
        ['Боул с тунцом','Счастье','318 ккал', false],
        ['Греческий салат','Кофемания','198 ккал', true],
      ].map(([name, rest, kcal, fit], i) => (
        <g key={name}>
          <rect x="16" y={80 + i * 74} width="168" height="62" rx="12"
            fill={fit ? 'rgba(138,154,107,.12)' : 'rgba(255,255,255,.05)'}
            stroke={fit ? 'rgba(138,154,107,.3)' : 'none'} strokeWidth="1" />
          {fit && <text x="152" y={95 + i * 74} fill="#8a9a6b" fontSize="9" fontFamily="Inter,sans-serif">✓ цель</text>}
          <rect x="28" y={92 + i * 74} width="70" height="8" rx="4" fill="rgba(251,243,225,.55)" />
          <rect x="28" y={106 + i * 74} width="48" height="6" rx="3" fill="rgba(251,243,225,.25)" />
          <rect x="28" y={120 + i * 74} width="34" height="14" rx="6" fill="rgba(212,122,58,.2)" />
          <text x="45" y={131 + i * 74} textAnchor="middle" fill="var(--warm-warm)" fontSize="9" fontFamily="Inter,sans-serif" fontWeight="600">{kcal}</text>
        </g>
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────
// Прочие иконки
// ─────────────────────────────────────────────

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

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} aria-hidden="true">
      <rect x="2" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// ─────────────────────────────────────────────
// Стили
// ─────────────────────────────────────────────

const hiwStyles = `
.hiw {
  --warm-bg: #f3ede2;
  --warm-bg-soft: #fbf3e1;
  --warm-card: #ffffff;
  --warm-ink: #2a2620;
  --warm-ink-soft: #7a6f5f;
  --warm-rule: #ded3bf;
  --warm-rule-strong: rgba(42, 38, 32, 0.15);
  --warm-warm: #d47a3a;
  --warm-accent-dk: #a95725;
  --warm-p: #8a9a6b;
  --warm-f: #e8a15e;
  --warm-c: #d87a5e;
  color: var(--warm-ink);
  background: var(--warm-bg);
  font-family: Inter, system-ui, sans-serif;
  width: 100%;
  min-height: 100vh;
}
.hiw a {
  color: inherit;
  text-decoration: none;
}

/* ── Герой ── */
.hiw__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 64px 24px 0;
  position: relative;
  background:
    radial-gradient(ellipse 800px 400px at 50% 0%, rgba(212,122,58,.13), transparent 60%),
    var(--warm-bg);
}

.hiw__hero-inner {
  max-width: 640px;
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
  margin: 0 0 32px;
}

/* CTA в герое */
.hiw__hero-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 48px;
}

.hiw__hero-btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  border-radius: 40px;
  background: var(--warm-warm);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity .18s, transform .18s;
  box-shadow: 0 6px 24px rgba(212,122,58,.35);
}
.hiw__hero-btn-primary:hover {
  opacity: .9;
  transform: translateY(-1px);
}

.hiw__hero-cta-note {
  font-size: .8rem;
  color: var(--warm-ink-soft);
  margin: 0;
}

/* Стат-бар */
.hiw__hero-stat-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: var(--warm-ink);
  width: 100%;
  padding: 20px 24px;
  flex-wrap: wrap;
}
.hiw__hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 240px;
  padding: 8px 32px;
  gap: 4px;
}
.hiw__hero-stat strong {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--warm-warm);
  font-family: 'DM Serif Display', Georgia, serif;
}
.hiw__hero-stat span {
  font-size: .78rem;
  color: rgba(251,243,225,.55);
  max-width: 230px;
  text-align: center;
}
.hiw__hero-stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255,255,255,.1);
}
.hiw__hero-stat-footnote {
  width: 100%;
  margin: 10px auto 0;
  color: var(--warm-ink-soft);
  font-size: .76rem;
  line-height: 1.45;
  text-align: center;
}

.hiw__hero-scroll {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 0;
  opacity: .4;
}
.hiw__hero-scroll-line { width: 1px; height: 32px; background: var(--warm-ink-soft); }
.hiw__hero-scroll svg { width: 14px; height: 14px; stroke: var(--warm-ink-soft); stroke-width: 2; fill: none; stroke-linecap: round; }

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
.hiw__section-head h2 em { font-style: italic; color: var(--warm-warm); }
.hiw__section-head p { color: var(--warm-ink-soft); font-size: 1rem; line-height: 1.6; margin: 0; }
.hiw__section-head--dark h2 { color: var(--warm-bg-soft); }
.hiw__section-head--dark p  { color: rgba(251,243,225,.6); }

/* ── Проблема ── */
.hiw__problem {
  padding: 96px 24px 80px;
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
.hiw__problem--intro {
  background:
    radial-gradient(ellipse 900px 420px at 50% 0%, rgba(212,122,58,.13), transparent 60%),
    var(--warm-bg);
}
.hiw__pain-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1120px;
  margin: 56px auto 0;
}
.hiw__pain-card {
  background: var(--warm-card);
  border: 1px solid var(--warm-rule);
  border-radius: 20px;
  padding: 32px 28px;
  transition: box-shadow .2s;
}
.hiw__pain-card:hover { box-shadow: 0 8px 28px rgba(42,38,32,.1); }
.hiw__pain-icon { margin-bottom: 20px; }
.hiw__pain-card h3 { font-size: 1.05rem; font-weight: 600; margin: 0 0 10px; color: var(--warm-ink); }
.hiw__pain-card p  { font-size: .92rem; color: var(--warm-ink-soft); line-height: 1.65; margin: 0; }

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
.hiw__step--reverse { direction: rtl; }
.hiw__step--reverse > * { direction: ltr; }

.hiw__step-num {
  display: block;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 3.5rem;
  color: var(--warm-warm);
  opacity: .5;
  line-height: 1;
  margin-bottom: 12px;
}
.hiw__step-text h3 { font-size: 1.35rem; font-weight: 600; margin: 0 0 12px; color: var(--warm-bg-soft); }
.hiw__step-text p  { font-size: .95rem; color: rgba(251,243,225,.65); line-height: 1.65; margin: 0; }

/* Телефон-макет */
.hiw__phone-mock {
  display: flex;
  justify-content: center;
}
.hiw__phone-mock-inner {
  width: 220px;
  background: #16110a;
  border-radius: 36px;
  border: 2px solid rgba(255,255,255,.12);
  padding: 20px 10px 28px;
  box-shadow: 0 24px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07);
  position: relative;
}
.hiw__phone-mock-notch {
  width: 60px;
  height: 8px;
  background: rgba(255,255,255,.15);
  border-radius: 4px;
  margin: 0 auto 16px;
}
.hiw__phone-mock-inner svg {
  width: 100%;
  height: auto;
  display: block;
}

/* Видео (когда придёт из Kling) */
.hiw__step-video {
  width: 100%;
  border-radius: 16px;
  display: block;
  aspect-ratio: 16/9;
  object-fit: cover;
  box-shadow: 0 20px 48px rgba(0,0,0,.35);
}

/* ── Отзывы ── */
.hiw__testimonials {
  padding: 80px 24px;
  max-width: 1120px;
  margin: 0 auto;
}
.hiw__testi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.hiw__testi-card {
  background: var(--warm-card);
  border: 1px solid var(--warm-rule);
  border-radius: 20px;
  padding: 28px;
  margin: 0;
}
.hiw__testi-card p {
  font-size: .95rem;
  color: var(--warm-ink);
  line-height: 1.65;
  margin: 0 0 20px;
  font-style: italic;
}
.hiw__testi-card footer {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hiw__testi-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(212,122,58,.2);
  color: var(--warm-warm);
  font-size: .8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hiw__testi-card cite {
  font-size: .82rem;
  color: var(--warm-ink-soft);
  font-style: normal;
}

/* ── Сравнение ── */
.hiw__compare {
  padding: 80px 24px;
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
.hiw__compare-table-wrap {
  overflow-x: auto;
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(42,38,32,.1);
  width: 100%;
}
.hiw__compare-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--warm-card);
  border-radius: 20px;
  overflow: hidden;
  font-size: .95rem;
}
.hiw__compare-table thead tr { background: var(--warm-bg-soft); }
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
.hiw__compare-row--highlight { background: rgba(212,122,58,.06); }
.hiw__compare-row--highlight td { border-top-color: rgba(212,122,58,.25); font-weight: 500; }
.hiw__compare-name {
  font-weight: 500;
  color: var(--warm-ink);
  white-space: nowrap;
}
.hiw__compare-name-inner {
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
.hiw__compare-cost { color: var(--warm-ink-soft); white-space: nowrap; }
.hiw__compare-row--highlight .hiw__compare-cost { color: var(--warm-ink); }
.hiw__compare-note {
  display: block;
  font-size: .75rem;
  color: var(--warm-warm);
  font-weight: 600;
  margin-top: 2px;
}
.hiw__compare-what { color: var(--warm-ink-soft); }
.hiw__compare-row--highlight .hiw__compare-what { color: var(--warm-ink); }
.hiw__compare-verdict { text-align: center; width: 48px; }

/* ── FAQ ── */
.hiw__faq {
  padding: 80px 24px;
  max-width: 720px;
  margin: 0 auto;
}
.hiw__faq-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.hiw__faq-item {
  border: 1px solid var(--warm-rule);
  border-radius: 14px;
  overflow: hidden;
  background: var(--warm-card);
  transition: border-color .15s;
}
.hiw__faq-item.is-open { border-color: rgba(212,122,58,.4); }
.hiw__faq-q {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: .97rem;
  font-weight: 500;
  color: var(--warm-ink);
  text-align: left;
  gap: 12px;
}
.hiw__faq-q:hover { color: var(--warm-warm); }
.hiw__faq-arrow { font-style: normal; color: var(--warm-warm); flex-shrink: 0; }
.hiw__faq-a {
  padding: 0 22px 18px;
  margin: 0;
  font-size: .92rem;
  color: var(--warm-ink-soft);
  line-height: 1.65;
}

/* ── CTA ── */
.hiw__cta {
  background: var(--warm-ink);
  color: var(--warm-bg-soft);
  text-align: center;
  padding: 80px 24px 72px;
}
.hiw__cta h2 {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(2rem, 5vw, 3.4rem);
  font-weight: 400;
  margin: 0 0 14px;
  line-height: 1.12;
}
.hiw__cta h2 em { font-style: italic; color: var(--warm-warm); }
.hiw__cta > p {
  color: rgba(251,243,225,.65);
  font-size: 1rem;
  line-height: 1.6;
  max-width: 640px;
  margin: 0 auto 36px;
}
.hiw__cta-actions {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.hiw__cta-fine {
  font-size: .78rem;
  color: rgba(251,243,225,.35);
  margin: 0;
}

/* ── Адаптив ── */
@media (max-width: 720px) {
  .hiw__step, .hiw__step--reverse {
    grid-template-columns: 1fr;
    direction: ltr;
  }
  .hiw__step-num { font-size: 2.5rem; }
  .hiw__hero-stat-bar { flex-direction: column; gap: 8px; }
  .hiw__hero-stat-divider { width: 40px; height: 1px; }
  .hiw__compare-table th:nth-child(3),
  .hiw__compare-table td:nth-child(3) { display: none; }
}
`
