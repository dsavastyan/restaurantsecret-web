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
export type Me = {
  ok: boolean;
  user?: {
    id: string;
    email: string;
    first_name?: string | null;
    created_at: string;
    onboarding_completed?: boolean;
    onboarding_completed_at?: string | null;
    subscription: Sub | null;
  };
};

export type AccountOutletContext = {
  me: Me | null;
  sub: Sub | null;
  daysLeft: number | null;
  reload: () => Promise<void>;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isNightTheme: boolean;
  incomingFriendRequestsCount: number;
  toggleTheme: () => void;
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
  const [incomingFriendRequestsCount, setIncomingFriendRequestsCount] = useState(0);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNightTheme, setIsNightTheme] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-rs-theme") === "night";
  });

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

  const loadIncomingFriendRequestsCount = useCallback(async () => {
    if (!accessToken) {
      setIncomingFriendRequestsCount(0);
      return;
    }

    try {
      const response = await apiGet<{ ok: boolean; incoming_requests?: unknown[] }>("/api/friends", accessToken);
      if (!response?.ok) {
        throw new Error("FRIENDS_NOT_OK");
      }
      const incoming = Array.isArray(response.incoming_requests) ? response.incoming_requests : [];
      setIncomingFriendRequestsCount(incoming.length);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        logout();
        setIncomingFriendRequestsCount(0);
        return;
      }
      console.error("Failed to load incoming friend requests count", err);
      setIncomingFriendRequestsCount(0);
    }
  }, [accessToken, logout]);

  useEffect(() => {
    if (accessToken) {
      load();
    }
  }, [accessToken, load]);

  useEffect(() => {
    if (accessToken) {
      loadIncomingFriendRequestsCount();
    } else {
      setIncomingFriendRequestsCount(0);
    }
  }, [accessToken, loadIncomingFriendRequestsCount, location.pathname]);

  useEffect(() => {
    const onIncomingRequestsCountUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      const count = Number(customEvent.detail?.count);
      if (Number.isFinite(count) && count >= 0) {
        setIncomingFriendRequestsCount(count);
      }
    };
    window.addEventListener("rs:friends-incoming-count", onIncomingRequestsCountUpdate as EventListener);
    return () => {
      window.removeEventListener("rs:friends-incoming-count", onIncomingRequestsCountUpdate as EventListener);
    };
  }, []);

  const sub = me?.user?.subscription || null;
  const isAccountRoot = location.pathname === "/account";

  const navItems = [
    { to: "/account", label: "Профиль", end: true },
    { to: "/account/subscription", label: (!sub || sub.status === "none") ? "Оформить подписку" : "Управлять подпиской" },
    { to: "/account/payment-methods", label: "Способы оплаты" },
    { to: "/account/goals", label: "Мои цели" },
    { to: "/account/statistics", label: "Дневник питания" },
    { to: "/account/favorites", label: "Избранное" },
    { to: "/account/friends", label: "Друзья", badge: incomingFriendRequestsCount > 0 ? `+${incomingFriendRequestsCount}` : null },
  ];

  const daysLeft = useMemo(() => {
    if (!sub?.expires_at) return null;
    const expiresAt = new Date(sub.expires_at).getTime();
    const diff = Math.ceil((expiresAt - Date.now()) / 86400000);
    return Math.max(0, diff);
  }, [sub?.expires_at]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme = isNightTheme ? "day" : "night";
    document.documentElement.setAttribute("data-rs-theme", nextTheme);
    document.body.setAttribute("data-rs-theme", nextTheme);
    window.localStorage.setItem("rs_theme_preference", nextTheme);
    setIsNightTheme(!isNightTheme);
  }, [isNightTheme]);

  const outletContext: AccountOutletContext = useMemo(
    () => ({
      me,
      sub,
      daysLeft,
      reload: load,
      token: accessToken || null,
      isLoading: loading,
      error,
      isNightTheme,
      incomingFriendRequestsCount,
      toggleTheme: handleToggleTheme,
    }),
    [me, sub, daysLeft, load, accessToken, loading, error, isNightTheme, incomingFriendRequestsCount, handleToggleTheme]
  );

  useEffect(() => {
    const syncThemeState = () => {
      setIsNightTheme(document.documentElement.getAttribute("data-rs-theme") === "night");
    };
    syncThemeState();

    const observer = new MutationObserver(syncThemeState);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-rs-theme"] });
    return () => observer.disconnect();
  }, []);

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="account">
      <div className="account__inner">
        <header className="account__header">
          <div className="account__header-desktop">
            <h1 className="account__title">Личный кабинет</h1>
          </div>
          <div className="account__header-mobile">
            {isAccountRoot ? (
              <span className="account__mobile-placeholder" aria-hidden="true" />
            ) : (
              <button
                type="button"
                className="account__mobile-back"
                onClick={() => navigate("/account")}
                aria-label="Назад в личный кабинет"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Назад в личный кабинет</span>
              </button>
            )}
            <div className="account__mobile-controls">
              <button
                type="button"
                className="account-logout-btn account-logout-btn--mobile"
                onClick={handleOpenLogoutModal}
                title="Выйти"
                aria-label="Выйти"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="account__header-actions">
            <button
              type="button"
              className="account-theme-toggle"
              onClick={handleToggleTheme}
              title={isNightTheme ? "Включить дневную тему" : "Включить ночную тему"}
              aria-label={isNightTheme ? "Включить дневную тему" : "Включить ночную тему"}
            >
              {isNightTheme ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4.5" />
                  <path d="M12 2.8v2.2M12 19v2.2M21.2 12h-2.2M5 12H2.8M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6M18.9 18.9l-1.6-1.6M6.7 6.7L5.1 5.1" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 14.2A9 9 0 1 1 9.8 3a7.2 7.2 0 0 0 11.2 11.2Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
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
                {item.badge ? <span className="account-nav__badge">{item.badge}</span> : null}
              </NavLink>
            ))}
          </nav>

          <div className="account__content">
            <Outlet context={outletContext} />
          </div>
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
