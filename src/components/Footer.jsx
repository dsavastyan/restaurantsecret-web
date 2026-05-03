import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CookieSettingsModal } from './CookieSettingsModal'

function TelegramIcon() {
  return (
    <svg
      className="site-footer__social-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21.78 4.02a1.14 1.14 0 0 0-1.18-.2L2.98 10.6a1.05 1.05 0 0 0 .05 1.97l4.47 1.42 1.72 5.26c.12.38.44.66.83.73.39.07.79-.08 1.04-.39l2.45-3.04 4.52 3.34c.31.23.72.28 1.07.13.35-.15.61-.47.68-.85l2.35-14.04c.07-.43-.07-.84-.38-1.11ZM18.3 17.22l-4.07-3a1.04 1.04 0 0 0-1.43.18l-1.77 2.2-.89-2.71 6.75-5.9c.34-.3.39-.8.11-1.15a.82.82 0 0 0-1.14-.14L8.26 12.7l-2.64-.84 14.38-5.53-1.7 10.89Z" />
    </svg>
  )
}

export default function Footer() {
  const year = 2026
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false)

  return (
    <>
      <footer className="site-footer" role="contentinfo">
        <div className="container site-footer__inner">
          <nav className="site-footer__nav" aria-label="Нижняя навигация">
            <Link to="/legal" className="site-footer__link">
              Пользовательское соглашение
            </Link>
            <Link to="/privacy" className="site-footer__link">
              Политика конфиденциальности
            </Link>
            <Link to="/tariffs" className="site-footer__link">
              Тарифы
            </Link>
            <Link to="/licenses" className="site-footer__link">
              Лицензии
            </Link>

            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="site-footer__link"
              style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Настройки cookies
            </button>

            <Link to="/contact" className="site-footer__link">
              Контакты
            </Link>



            <a
              href="https://t.me/RestSecretSupport_bot"
              className="site-footer__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Поддержка
            </a>

            <Link to="/feedback" className="site-footer__link">
              Оставить отзыв
            </Link>

            <a
              href="https://t.me/restaurantsecret"
              className="site-footer__social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram RestaurantSecret"
              title="Telegram"
            >
              <TelegramIcon />
            </a>
          </nav>

          <div className="site-footer__meta">
            <span className="site-footer__copy">© {year} RestaurantSecret</span>
            <span className="site-footer__dot" aria-hidden="true">•</span>
            <span className="site-footer__legal">Самозанятое лицо (НПД), Савастьян Дарья, ИНН 771007750946</span>
          </div>
        </div>
      </footer>

      <CookieSettingsModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
      />
    </>
  )
}
