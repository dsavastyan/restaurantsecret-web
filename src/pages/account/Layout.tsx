import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiPostAuth, isUnauthorizedError } from "@/lib/api";
import { useAuth } from "@/store/auth";

export type Sub = {
  plan: string;
  status: string;
  expires_at: string;
  expired: boolean;
  payment_provider?: string | null;
  payment_method?: string | null;
  provider?: string | null;
  gateway?: string | null;
};
export type Me = { ok: boolean; user?: { id: string; email: string; created_at: string; subscription: Sub | null } };

export type AccountOutletContext = {
  me: Me | null;
  sub: Sub | null;
  daysLeft: number | null;
  reload: () => Promise<void>;
  token: string | null;
  isLoading: boolean;
  error: string | null;
};

export default function AccountLayout() {
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth((state) => ({
    accessToken: state.accessToken,
    logout: state.logout,
  }));
  const location = useLocation();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(accessToken));
  const [error, setError] = useState<string | null>(null);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      if (accessToken) {
        const response = await apiPostAuth("/auth/logout", undefined, accessToken);
        if (!response.ok) {
          console.error("Logout request failed", response.status);
        }
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

  const load = useCallback(async () => {
    if (!accessToken) {
      setMe(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<Me>("/users/me", accessToken);
      if (!response?.ok) {
        throw new Error("ME_NOT_OK");
      }
      setMe(response);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        logout();
        setMe(null);
        setError(null);
        return;
      }
      console.error("Failed to load account data", err);
      setMe((prev) => prev);
      setError("Не удалось загрузить данные. Попробуйте обновить страницу.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, logout]);

  useEffect(() => {
    if (accessToken) {
      load();
    }
  }, [accessToken, load]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const sub = me?.user?.subscription || null;
  const isNeverSubscribed = !sub || (sub.status === 'none' && !sub.expired);

  const navItems = [
    { to: "/account", label: "Профиль", end: true },
    { to: "/account/subscription", label: (!sub || sub.status === "none") ? "Оформить подписку" : "Управлять подпиской" },
    { to: "/account/payment-methods", label: "Способы оплаты" },
    { to: "/account/goals", label: "Мои цели" },
    { to: "/account/statistics", label: "Дневник питания" },
    { to: "/account/favorites", label: "Избранное" },
  ];

  const currentNav = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  ) || navItems[0];

  const daysLeft = useMemo(() => {
    if (!sub?.expires_at) return null;
    const expiresAt = new Date(sub.expires_at).getTime();
    const diff = Math.ceil((expiresAt - Date.now()) / 86400000);
    return Math.max(0, diff);
  }, [sub?.expires_at]);

  const outletContext: AccountOutletContext = useMemo(
    () => ({ me, sub, daysLeft, reload: load, token: accessToken || null, isLoading: loading, error }),
    [me, sub, daysLeft, load, accessToken, loading, error]
  );

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className={`account${isSheetOpen ? " account--sheet-open" : ""}`}>
      <div className="account__inner">
        <header className="account__header">
          <div className="account__header-desktop">
            <h1 className="account__title">Личный кабинет</h1>
          </div>
          <div className="account__header-mobile">
            <button
              className="account__mobile-toggle"
              onClick={() => setIsSheetOpen(true)}
              aria-label="Открыть меню"
            >
              <span className="account__mobile-toggle-label">{currentNav.label}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M4 12h16m-7 6h7" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="account__header-actions">
            <button
              type="button"
              className="account-logout-btn"
              onClick={handleOpenLogoutModal}
              title="Выйти"
            >
              <span className="account-logout-btn__label">Выйти</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className="account__layout">
          <nav className="account-nav" aria-label="Навигация по личному кабинету">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `account-nav__link${isActive ? " account-nav__link--active" : ""}`
                }
              >
                <span className="account-nav__label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="account__content">
            <Outlet context={outletContext} />
          </div>
        </div>
      </div>

      {/* Bottom Sheet for Mobile */}
      <div
        className={`account-sheet-overlay${isSheetOpen ? " is-visible" : ""}`}
        onClick={() => setIsSheetOpen(false)}
      />
      <div className={`account-sheet${isSheetOpen ? " is-open" : ""}`}>
        <div className="account-sheet__handle" />
        <div className="account-sheet__content">
          <div className="account-sheet__header">Навигация</div>
          <nav className="account-sheet__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `account-sheet__link${isActive ? " is-active" : ""}`
                }
                onClick={() => setIsSheetOpen(false)}
              >
                <span className="account-sheet__link-label">{item.label}</span>
                {location.pathname === item.to || (item.end === false && location.pathname.startsWith(item.to)) ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

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
              Вы всегда сможете вернуться, используя свою почту.
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
    </div>
  );
}
