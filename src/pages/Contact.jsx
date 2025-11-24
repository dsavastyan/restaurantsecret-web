import React from 'react'
import { Link } from 'react-router-dom'

const contacts = [
  {
    label: 'E-mail для обращений',
    value: 'support@restaurantsecret.ru',
    href: 'mailto:support@restaurantsecret.ru',
  },
  {
    label: 'Поддержка в Telegram',
    value: '@RestSecretSupport_bot',
    href: 'http://t.me/RestSecretSupport_bot',
  },
]

export default function Contact() {
  return (
    <main className="contact-page">
      <div className="contact-hero">
        <div className="container contact-hero__inner">
          <div className="contact-hero__badge">Контакты и реквизиты</div>
          <h1 className="contact-hero__title">Всегда на связи и открыты по всем вопросам</h1>
          <p className="contact-hero__subtitle">
            Мы отвечаем быстро, поддерживаем вас в удобном канале и честно публикуем данные исполнителя.
          </p>
          <div className="contact-hero__actions">
            {contacts.map((item) => (
              <a key={item.value} className="contact-chip" href={item.href} target="_blank" rel="noreferrer">
                <span className="contact-chip__label">{item.label}</span>
                <span className="contact-chip__value">{item.value}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="container contact-layout">
        <section className="contact-card">
          <header className="contact-card__header">
            <p className="contact-card__eyebrow">Сведения об исполнителе</p>
            <h2 className="contact-card__title">Официальные данные</h2>
            <p className="contact-card__hint">
              Информация актуальна для заключения договоров, возвратов и подтверждения статуса самозанятого.
            </p>
          </header>

          <dl className="contact-details" aria-label="Реквизиты исполнителя">
            <div className="contact-details__row">
              <dt>Исполнитель услуг</dt>
              <dd>Савастьян Дарья</dd>
            </div>
            <div className="contact-details__row">
              <dt>Статус</dt>
              <dd>физическое лицо, применяющее специальный налоговый режим «Налог на профессиональный доход» (самозанятый)</dd>
            </div>
            <div className="contact-details__row">
              <dt>ИНН</dt>
              <dd>771007750946</dd>
            </div>
            <div className="contact-details__row">
              <dt>Место осуществления деятельности</dt>
              <dd>г. Москва, Российская Федерация</dd>
            </div>
            <div className="contact-details__row">
              <dt>E-mail для обращений потребителей</dt>
              <dd>
                <a href="mailto:support@restaurantsecret.ru">support@restaurantsecret.ru</a>
              </dd>
            </div>
            <div className="contact-details__row">
              <dt>Поддержка в телеграм</dt>
              <dd>
                <a href="http://t.me/RestSecretSupport_bot" target="_blank" rel="noreferrer">
                  @RestSecretSupport_bot
                </a>
              </dd>
            </div>
          </dl>

          <div className="contact-note">
            Статус плательщика НПД можно проверить по ИНН через официальный сервис ФНС России
            {' '}
            <a href="https://npd.nalog.ru/check-status/" target="_blank" rel="noreferrer">
              Проверить статус налогоплательщика налога на профессиональный доход
            </a>
            .
          </div>
        </section>

        <section className="contact-card contact-card--accent">
          <header className="contact-card__header">
            <p className="contact-card__eyebrow">Нужна помощь?</p>
            <h2 className="contact-card__title">Свяжитесь удобным способом</h2>
            <p className="contact-card__hint">
              Отвечаем в течение рабочего дня. Поделитесь деталями запроса — это ускорит решение.
            </p>
          </header>

          <ul className="contact-list" aria-label="Каналы связи">
            {contacts.map((item) => (
              <li key={item.value} className="contact-list__item">
                <div className="contact-list__body">
                  <p className="contact-list__label">{item.label}</p>
                  <a className="contact-list__value" href={item.href} target="_blank" rel="noreferrer">
                    {item.value}
                  </a>
                </div>
                <span className="contact-list__cta">Написать</span>
              </li>
            ))}
          </ul>

          <div className="contact-cta">
            <p className="contact-cta__title">Уже выбрали ресторан?</p>
            <p className="contact-cta__text">Перейдите в каталог, чтобы продолжить подбор блюд с КБЖУ.</p>
            <Link to="/catalog" className="contact-cta__button">Открыть каталог</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
