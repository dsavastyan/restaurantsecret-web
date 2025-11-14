import { useCallback, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AccountOutletContext } from "./Layout";
import { apiPostAuth } from "@/lib/api";
import { useAuth } from "@/store/auth";

export default function AccountOverview() {
  const { me } = useOutletContext<AccountOutletContext>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth((state) => ({
    accessToken: state.accessToken,
    logout: state.logout,
  }));
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleOpenLogoutModal = useCallback(() => {
    setIsLogoutModalOpen(true);
  }, []);

  const handleCloseLogoutModal = useCallback(() => {
    if (isLoggingOut) return;
    setIsLogoutModalOpen(false);
  }, [isLoggingOut]);

  const handleConfirmLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const response = await apiPostAuth("/auth/logout", undefined, accessToken ?? undefined);
      if (!response.ok) {
        console.error("Logout request failed", response.status);
      }
    } catch (error) {
      console.error("Failed to log out", error);
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
      logout();
      navigate("/login", { replace: true });
    }
  }, [accessToken, logout, navigate]);

  return (
    <section
      className="account-panel"
      aria-labelledby="account-profile-heading"
      aria-describedby="account-profile-lead"
    >
      <div className="account-panel__header">
        <div className="account-panel__intro">
          <h2 id="account-profile-heading" className="account-panel__title">
            Профиль
          </h2>
          <p id="account-profile-lead" className="account-panel__lead">
            Здесь хранится основная информация о вашем аккаунте.
          </p>
        </div>
        <div className="account-panel__actions">
          <button
            type="button"
            className="account-button account-button--outline"
            onClick={handleOpenLogoutModal}
          >
            Выйти
          </button>
        </div>
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
      {isLogoutModalOpen && (
        <div
          className="logout-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
          aria-describedby="logout-modal-description"
        >
          <div className="logout-modal__dialog">
            <h3 id="logout-modal-title" className="logout-modal__title">
              Вы уверены, что хотите выйти?
            </h3>
            <p id="logout-modal-description" className="logout-modal__description">
              После выхода вы всегда сможете снова войти, используя свою почту и пароль.
            </p>
            <div className="logout-modal__actions">
              <button
                type="button"
                className="account-button account-button--outline"
                onClick={handleCloseLogoutModal}
                disabled={isLoggingOut}
              >
                Отмена
              </button>
              <button
                type="button"
                className="account-button account-button--danger"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
