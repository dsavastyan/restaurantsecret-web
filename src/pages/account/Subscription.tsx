import { useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import type { AccountOutletContext } from "./Layout";

export default function AccountSubscription() {
  const { sub, daysLeft, reload } = useOutletContext<AccountOutletContext>();

  const handleRefresh = useCallback(async () => {
    await reload();
  }, [reload]);

  return (
    <section className="account-panel" aria-labelledby="account-subscription-heading">
      <div className="account-panel__header">
        <h2 id="account-subscription-heading" className="account-panel__title">
          Управление подпиской
        </h2>
        <p className="account-panel__lead">
          Проверяйте статус подписки и обновляйте информацию после оплаты.
        </p>
      </div>

      {sub ? (
        <div className="account-panel__box">
          <div className="account-panel__row">
            <span className="account-panel__term">Тариф</span>
            <span className="account-panel__description">{sub.plan}</span>
          </div>
          <div className="account-panel__row">
            <span className="account-panel__term">Статус</span>
            <span className="account-panel__description">{sub.status}</span>
          </div>
          {daysLeft !== null && !sub.expired && (
            <div className="account-panel__row">
              <span className="account-panel__term">Дней доступа</span>
              <span className="account-panel__description">{daysLeft}</span>
            </div>
          )}
          {sub.expired && (
            <div className="account-panel__row account-panel__row--alert">
              <span className="account-panel__term">Статус доступа</span>
              <span className="account-panel__description">Подписка истекла</span>
            </div>
          )}
        </div>
      ) : (
        <div className="account-panel__box account-panel__box--muted">
          <p className="account-panel__empty">
            У вас пока нет активной подписки. Оформите подписку, чтобы открыть доступ ко всем материалам.
          </p>
        </div>
      )}

      <div className="account-panel__actions">
        <button type="button" onClick={handleRefresh} className="account-button">
          Обновить данные
        </button>
      </div>
    </section>
  );
}
