import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container site-footer__inner">
        <nav className="site-footer__nav" aria-label="Нижняя навигация">
          <Link to="/legal" className="site-footer__link">
            Пользовательское соглашение
          </Link>
          <Link to="/tariffs" className="site-footer__link">
            Тарифы
          </Link>
          <Link to="/privacy" className="site-footer__link">
            Политика конфиденциальности
          </Link>
          <Link to="/licenses" className="site-footer__link">
            Лицензии / Open source
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

        <div className="site-footer__copy">© {year} RestaurantSecret</div>
        <div className="site-footer__legal">
          Самозанятое лицо (НПД), Савастьян Дарья, ИНН 771007750946
        </div>
      </div>
    </footer>
  )
}
