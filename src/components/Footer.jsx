import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container site-footer__inner">
        <nav className="site-footer__nav" aria-label="Нижняя навигация">
          <Link to="/legal" className="site-footer__link">
            Пользовательское соглашение
          </Link>
          <Link to="/contact" className="site-footer__link">
            Контакты
          </Link>
          <a
            href="https://t.me/restaurantsecret"
            className="site-footer__link"
            target="_blank"
            rel="noreferrer"
          >
            Telegram-бот
          </a>
        </nav>

        <div className="site-footer__copy">© 2025 RestaurantSecret</div>
        <div className="site-footer__legal">
          Самозанятое лицо (НПД), Савастьян Дарья, ИНН 771007750946
        </div>
      </div>
    </footer>
  )
}
