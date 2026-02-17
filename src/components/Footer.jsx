import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CookieSettingsModal } from './CookieSettingsModal'

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
