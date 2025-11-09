import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/store/auth";

export type Sub = { plan: string; status: string; expires_at: string; expired: boolean };
export type Me = { ok: boolean; user?: { id: string; email: string; created_at: string; subscription: Sub | null } };

export type AccountOutletContext = {
  me: Me | null;
  sub: Sub | null;
  daysLeft: number | null;
  reload: () => Promise<void>;
  token: string | null;
};

export default function AccountLayout() {
  const token = useAuth((state) => state.accessToken);
  const location = useLocation();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response: Me = await apiGet("/me", token || undefined);
    setMe(response);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token, load]);

  const sub = me?.user?.subscription || null;
  const daysLeft = useMemo(() => {
    if (!sub?.expires_at) return null;
    const expiresAt = new Date(sub.expires_at).getTime();
    const diff = Math.ceil((expiresAt - Date.now()) / 86400000);
    return Math.max(0, diff);
  }, [sub?.expires_at]);

  const outletContext: AccountOutletContext = useMemo(
    () => ({ me, sub, daysLeft, reload: load, token: token || null }),
    [me, sub, daysLeft, load, token]
  );

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading) {
    return <div className="p-6">Загрузка…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Личный кабинет</h1>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <nav className="md:w-64 flex md:flex-col gap-2">
          <NavLink
            to="/account"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`
            }
          >
            Профиль
          </NavLink>
          <NavLink
            to="/account/subscription"
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`
            }
          >
            Управлять подпиской
          </NavLink>
        </nav>
        <div className="flex-1 min-w-0">
          <Outlet context={outletContext} />
        </div>
      </div>
    </div>
  );
}
