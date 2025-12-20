import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { apiGet, isUnauthorizedError } from "@/lib/api";
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
  const { accessToken, logout } = useAuth((state) => ({
    accessToken: state.accessToken,
    logout: state.logout,
  }));
  const location = useLocation();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(accessToken));
  const [error, setError] = useState<string | null>(null);

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

  const sub = me?.user?.subscription || null;
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
    <div className="account">
      <div className="account__inner">
        <header className="account__header">
          <h1 className="account__title">Личный кабинет</h1>
          <p className="account__subtitle">
            Управляйте профилем и подпиской в едином пространстве
          </p>
        </header>
        <div className="account__layout">
          <nav className="account-nav" aria-label="Навигация по личному кабинету">
            <NavLink
              to="/account"
              end
              className={({ isActive }) =>
                `account-nav__link${isActive ? " account-nav__link--active" : ""}`
              }
            >
              <span className="account-nav__label">Профиль</span>
            </NavLink>
            <NavLink
              to="/account/subscription"
              className={({ isActive }) =>
                `account-nav__link${isActive ? " account-nav__link--active" : ""}`
              }
            >
              <span className="account-nav__label">Управлять подпиской</span>
            </NavLink>
            <NavLink
              to="/account/goals"
              className={({ isActive }) =>
                `account-nav__link${isActive ? " account-nav__link--active" : ""}`
              }
            >
              <span className="account-nav__label">Мои цели</span>
            </NavLink>
            <NavLink
              to="/account/statistics"
              className={({ isActive }) =>
                `account-nav__link${isActive ? " account-nav__link--active" : ""}`
              }
            >
              <span className="account-nav__label">Статистика</span>
            </NavLink>
            <NavLink
              to="/account/favorites"
              className={({ isActive }) =>
                `account-nav__link${isActive ? " account-nav__link--active" : ""}`
              }
            >
              <span className="account-nav__label">Избранное</span>
            </NavLink>
          </nav>
          <div className="account__content">
            <Outlet context={outletContext} />
          </div>
        </div>
      </div>
    </div>
  );
}
