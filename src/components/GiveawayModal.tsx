import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

const DRAW_DATE = new Date('2026-06-26T12:00:00+03:00')
const SEEN_STORAGE_KEY = 'giveaway_seen'
const TELEGRAM_URL = 'https://t.me/restaurantsecret'
const INSTAGRAM_URL = 'https://www.instagram.com/restsecret?igsh=MTM2NG4zcW1kaG1uZg%3D%3D&utm_source=qr'
const MAX_URL = 'https://max.ru/join/meMlKNXaG_1GdJymtTH9RACrGn0E8xJdidU5O_XfJ04'

type CountdownState = {
  d: number
  h: number
  m: number
  s: number
}

function calcDiff(): CountdownState {
  const diff = DRAW_DATE.getTime() - Date.now()
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 }

  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState<CountdownState>(() => calcDiff())

  useEffect(() => {
    const id = window.setInterval(() => setTimeLeft(calcDiff()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return timeLeft
}

function safeSessionStorageGet(key: string) {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSessionStorageSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Ignore storage errors so the popup can still be closed in restricted modes.
  }
}

function Countdown() {
  const timeLeft = useCountdown()
  const cells = [
    { value: timeLeft.d, label: 'дней' },
    { value: timeLeft.h, label: 'часов' },
    { value: timeLeft.m, label: 'минут' },
    { value: timeLeft.s, label: 'секунд' },
  ]

  return (
    <div className="rs-giveaway__countdown" aria-label="До розыгрыша">
      {cells.map((cell, index) => (
        <div className="rs-giveaway__countdown-part" key={cell.label}>
          {index > 0 && <span className="rs-giveaway__countdown-separator" aria-hidden="true">:</span>}
          <div className="rs-giveaway__countdown-cell">
            <span className="rs-giveaway__countdown-value">{pad(cell.value)}</span>
            <span className="rs-giveaway__countdown-label">{cell.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.8 13.028l-2.948-.924c-.64-.203-.652-.64.136-.953l11.498-4.43c.534-.194 1.001.13.808.5z" />
    </svg>
  )
}

function MaxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="rsGiveawayMaxBg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F6FFF" />
          <stop offset="1" stopColor="#A259FF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill="url(#rsGiveawayMaxBg)" />
      <path d="M12 5C8.134 5 5 7.91 5 11.5c0 1.8.78 3.42 2.04 4.6L6.5 19l3.2-1.36A7.6 7.6 0 0 0 12 18c3.866 0 7-2.91 7-6.5S15.866 5 12 5z" fill="white" />
      <path d="M11.2 9.5h1.4c1.1 0 1.9.72 1.9 1.7 0 .98-.8 1.7-1.9 1.7h-.7v1.6h-.7V9.5zm.7 2.72h.66c.72 0 1.16-.38 1.16-.98 0-.6-.44-.98-1.16-.98h-.66v1.96z" fill="url(#rsGiveawayMaxBg)" />
    </svg>
  )
}

function BotanicalDecor() {
  const dots = [
    ['8%', '72%', 'rgba(212,122,58,0.16)', 4],
    ['88%', '62%', 'rgba(138,154,107,0.14)', 3.5],
    ['18%', '28%', 'rgba(212,122,58,0.12)', 3],
    ['82%', '28%', 'rgba(232,161,94,0.14)', 3],
    ['50%', '8%', 'rgba(138,154,107,0.14)', 2.5],
    ['35%', '88%', 'rgba(212,122,58,0.12)', 3],
    ['65%', '90%', 'rgba(232,161,94,0.12)', 2.5],
  ] as const

  return (
    <div className="rs-giveaway__decor" aria-hidden="true">
      <svg viewBox="0 0 520 620" preserveAspectRatio="none">
        <ellipse cx="260" cy="-36" rx="280" ry="320" fill="none" stroke="rgba(212,122,58,0.06)" strokeWidth="1" />
        <g className="rs-giveaway__wheat">
          <line x1="470" y1="612" x2="472" y2="458" />
          {[0, 1, 2, 3, 4].map((item) => {
            const isRight = item % 2 === 0
            return (
              <ellipse
                key={item}
                cx={isRight ? 484 : 458}
                cy={584 - item * 25}
                rx="12"
                ry="5"
                transform={`rotate(${isRight ? -33 : 33} ${isRight ? 484 : 458} ${584 - item * 25})`}
              />
            )
          })}
        </g>
        {dots.map(([cx, cy, fill, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} />
        ))}
      </svg>
    </div>
  )
}

export default function GiveawayModal() {
  const [open, setOpen] = useState(false)
  const portalTarget = useMemo(() => {
    if (typeof document === 'undefined') return null
    return document.body
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (safeSessionStorageGet(SEEN_STORAGE_KEY)) return undefined

    const id = window.setTimeout(() => setOpen(true), 3000)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleClose() {
    setOpen(false)
    safeSessionStorageSet(SEEN_STORAGE_KEY, '1')
  }

  if (!portalTarget || !open) return null

  return createPortal(
    <div className="rs-giveaway" role="presentation">
      <div className="rs-giveaway__backdrop" onClick={handleClose} />
      <section
        className="rs-giveaway__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rs-giveaway-title"
        onClick={(event) => event.stopPropagation()}
      >
        <BotanicalDecor />
        <div className="rs-giveaway__card">
          <button className="rs-giveaway__close" type="button" onClick={handleClose} aria-label="Закрыть попап">
            ×
          </button>

          <div className="rs-giveaway__intro">
            <div className="rs-giveaway__meta">
              <span className="rs-giveaway__badge">
                <StarIcon />
                Розыгрыш
              </span>
              <span className="rs-giveaway__date">26 июня 2026 · 12:00 МСК</span>
            </div>

            <h2 className="rs-giveaway__title" id="rs-giveaway-title">
              Выиграйте
              <br />
              <em>годовую подписку</em>
            </h2>

            <p className="rs-giveaway__description">
              Полный доступ к КБЖУ всех блюд, фильтрам и дневнику питания – бесплатно на год
            </p>
          </div>

          <div className="rs-giveaway__rule" />

          <div className="rs-giveaway__section">
            <p className="rs-giveaway__section-label">До розыгрыша</p>
            <Countdown />
          </div>

          <div className="rs-giveaway__rule" />

          <div className="rs-giveaway__section">
            <p className="rs-giveaway__section-label">Как участвовать</p>
            <div className="rs-giveaway__steps">
              <div className="rs-giveaway__step">
                <span className="rs-giveaway__step-icon rs-giveaway__step-icon--green">→</span>
                <span>Подпишитесь на одну или несколько наших соц сетей – больше подписок – больше шансов на победу</span>
              </div>
              <div className="rs-giveaway__step">
                <span className="rs-giveaway__step-icon rs-giveaway__step-icon--orange">◎</span>
                <span>Победитель выбирается 26 июня 2026 в 12:00 МСК случайным образом</span>
              </div>
            </div>
          </div>

          <div className="rs-giveaway__actions">
            <a className="rs-giveaway__social rs-giveaway__social--telegram" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
              <TelegramIcon />
              Telegram
            </a>
            <a className="rs-giveaway__social rs-giveaway__social--instagram" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a className="rs-giveaway__social rs-giveaway__social--max" href={MAX_URL} target="_blank" rel="noopener noreferrer">
              <MaxIcon />
              Макс
            </a>
          </div>

          <p className="rs-giveaway__fine">
            Победитель определяется случайным образом 26.06.2026 в 12:00 МСК.
            <br />
            Результаты публикуются в социальных сетях.
          </p>
        </div>
      </section>
    </div>,
    portalTarget,
  )
}
