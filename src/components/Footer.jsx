import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container site-footer__inner">
        <nav className="site-footer__nav" aria-label="Нижняя навигация">
          <Link to="/legal" className="site-footer__link">
            Политика
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

        <div className="site-footer__copy">RestaurantSecret © 2025. Все меню ресторанов Москвы — с КБЖУ.</div>
        <div className="site-footer__legal">
          Самозанятое лицо (НПД), Савастьян Дарья, ИНН 7 7 1 0 0 7 7 5 0 9 4 6
        </div>
      </div>
    </footer>
  )
}
