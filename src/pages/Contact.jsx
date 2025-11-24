import React from 'react'

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
      <div className="container contact-layout">
        <section className="contact-card">
          <header className="contact-card__header">
            <p className="contact-card__eyebrow">Сведения об исполнителе</p>
            <h2 className="contact-card__title">Официальные данные</h2>
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
                <a className="contact-list__cta" href={item.href} target="_blank" rel="noreferrer">
                  Написать
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
