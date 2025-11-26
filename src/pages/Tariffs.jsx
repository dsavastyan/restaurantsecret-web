import React from 'react'
import { Link } from 'react-router-dom'

export default function Tariffs() {
  return (
    <div className="tariffs-page">
      <div className="container">
        <header className="tariffs-hero">
          <p className="tariffs-eyebrow">Подписка RestaurantSecret</p>
          <h1 className="tariffs-title">Доступ ко всему меню — без ограничений</h1>
        </header>

        <section className="tariffs-benefits" aria-label="Что даёт подписка">
          <h2 className="tariffs-section-title">Что даёт подписка</h2>
          <ul className="tariffs-benefits__list">
            <li className="tariffs-benefits__item">Доступ к расширенному поиску по меню ресторанов</li>
            <li className="tariffs-benefits__item">Просмотр подробного КБЖУ и порций</li>
            <li className="tariffs-benefits__item">Расширенные фильтры по калориям, БЖУ</li>
          </ul>
        </section>

        <section className="tariffs-plans" aria-label="Варианты подписки">
          <div className="tariffs-plans__header">
            <h2 className="tariffs-section-title">Тарифы</h2>
            <p className="tariffs-note">* Продлевается автоматически до отмены.</p>
          </div>
          <div className="tariffs-cards">
            <div className="tariff-card">
              <div className="tariff-card__badge">Попробовать</div>
              <div className="tariff-card__body">
                <h3 className="tariff-card__title">Месяц</h3>
                <p className="tariff-card__price">99 ₽</p>
                <p className="tariff-card__footnote">в месяц*</p>
                <p className="tariff-card__desc">
                  Подходит, чтобы оценить удобство сервиса и подобрать ресторан под ваши цели.
                </p>
              </div>
            </div>

            <div className="tariff-card tariff-card--featured">
              <div className="tariff-card__badge">Выгодно</div>
              <div className="tariff-card__body">
                <h3 className="tariff-card__title">Год</h3>
                <p className="tariff-card__price">999 ₽</p>
                <p className="tariff-card__footnote">12 месяцев за цену 10*</p>
                <p className="tariff-card__tagline">2 месяца бесплатно</p>
                <p className="tariff-card__desc">
                  Лучший выбор для тех, кто регулярно заказывает или следит за КБЖУ ресторанных блюд.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="tariffs-cta" aria-label="Оформление подписки">
          <p className="tariffs-cta__lead">Оформление подписки доступно после входа в личный кабинет.</p>
          <Link className="btn btn--primary tariffs-cta__button" to="/login">
            Войти
          </Link>
          <p className="tariffs-cta__legal">
            Подробные условия — в <Link to="/legal">Пользовательском соглашении</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}
