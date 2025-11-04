import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/store/auth";

type Sub = { plan:string; status:string; expires_at:string; expired:boolean };
type Me = { ok:boolean; user?: { id:string; email:string; created_at:string; subscription: Sub|null } };

export default function Account() {
  const token = useAuth(s=>s.accessToken);
  const location = useLocation();
  const [me, setMe] = useState<Me|null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r: Me = await apiGet("/me", token || undefined);
    setMe(r);
    setLoading(false);
  }
  useEffect(()=>{ if (token) load(); }, [token]);

  async function activateMock() {
    const r = await apiPost("/subscriptions/activate-mock", undefined, token || undefined);
    if (!r?.ok) return alert(r?.error || "error");
    await load();
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (loading) return <div className="p-6">Загрузка…</div>;

  const sub = me?.user?.subscription || null;
  const daysLeft = sub?.expires_at ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now())/86400000)) : null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Личный кабинет</h1>
      <div className="p-4 border rounded">
        <div className="text-sm text-gray-500 mb-1">{me?.user?.email}</div>
        <div className="flex items-center gap-3">
          <span className="font-medium">Подписка:</span>
          {sub ? (
            <span className={`px-2 py-0.5 rounded text-white ${sub.expired ? "bg-gray-500" : "bg-green-600"}`}>
              {sub.plan} · {sub.status}{!sub.expired && daysLeft!==null ? ` · осталось ${daysLeft} дн.` : ""}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-gray-300">нет</span>
          )}
        </div>
        <div className="mt-4">
          <button onClick={activateMock} className="px-4 py-2 rounded bg-black text-white">
            Активировать тест на 14 дней
          </button>
        </div>
      </div>
    </div>
  );
}
