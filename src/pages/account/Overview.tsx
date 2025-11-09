import { useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { apiPost } from "@/lib/api";
import type { AccountOutletContext } from "./Layout";

export default function AccountOverview() {
  const { me, sub, daysLeft, reload, token } = useOutletContext<AccountOutletContext>();

  const handleActivateMock = useCallback(async () => {
    const response = await apiPost("/subscriptions/activate-mock", undefined, token || undefined);
    if (!response?.ok) {
      alert(response?.error || "error");
      return;
    }
    await reload();
  }, [reload, token]);

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded">
        <div className="text-sm text-gray-500 mb-1">{me?.user?.email}</div>
        <div className="flex items-center gap-3">
          <span className="font-medium">Подписка:</span>
          {sub ? (
            <span className={`px-2 py-0.5 rounded text-white ${sub.expired ? "bg-gray-500" : "bg-green-600"}`}>
              {sub.plan} · {sub.status}
              {!sub.expired && daysLeft !== null ? ` · осталось ${daysLeft} дн.` : ""}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-gray-300">нет</span>
          )}
        </div>
        <div className="mt-4">
          <button onClick={handleActivateMock} className="px-4 py-2 rounded bg-black text-white">
            Активировать тест на 14 дней
          </button>
        </div>
      </div>
    </div>
  );
}
