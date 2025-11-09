import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import type { AccountOutletContext } from "./Layout";

export default function AccountOverview() {
  const { me } = useOutletContext<AccountOutletContext>();

  const createdAt = useMemo(() => {
    if (!me?.user?.created_at) return null;
    try {
      return new Date(me.user.created_at).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (error) {
      console.error("Failed to format created_at", error);
      return null;
    }
  }, [me?.user?.created_at]);

  return (
    <section className="account-panel" aria-labelledby="account-profile-heading">
      <div className="account-panel__header">
        <h2 id="account-profile-heading" className="account-panel__title">
          Профиль
        </h2>
        <p className="account-panel__lead">
          Здесь хранится основная информация о вашем аккаунте.
        </p>
      </div>
      <dl className="account-panel__list">
        <div className="account-panel__item">
          <dt className="account-panel__term">Электронная почта</dt>
          <dd className="account-panel__description">{me?.user?.email || "—"}</dd>
        </div>
        {createdAt && (
          <div className="account-panel__item">
            <dt className="account-panel__term">С нами с</dt>
            <dd className="account-panel__description">{createdAt}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
