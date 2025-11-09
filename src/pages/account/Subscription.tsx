import { useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import type { AccountOutletContext } from "./Layout";

export default function AccountSubscription() {
  const { sub, daysLeft, reload } = useOutletContext<AccountOutletContext>();

  const handleRefresh = useCallback(async () => {
    await reload();
  }, [reload]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Управление подпиской</h2>
        <p className="text-sm text-gray-600">
          Здесь можно посмотреть актуальный статус подписки и обновить данные после оплаты.
        </p>
      </div>

      {sub ? (
        <div className="space-y-3">
          <div className="p-4 border rounded">
            <div className="font-medium">Тариф: {sub.plan}</div>
            <div className="text-sm text-gray-600">Статус: {sub.status}</div>
            {daysLeft !== null && !sub.expired && (
              <div className="text-sm text-gray-600">Осталось: {daysLeft} дней</div>
            )}
            {sub.expired && (
              <div className="text-sm text-red-600">Подписка истекла</div>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Если вы только что оформили подписку и не видите изменений, попробуйте обновить данные.
          </p>
        </div>
      ) : (
        <div className="p-4 border rounded bg-gray-50 text-sm text-gray-600">
          У вас пока нет активной подписки. Оформите подписку, чтобы получить доступ к эксклюзивным материалам.
        </div>
      )}

      <div>
        <button onClick={handleRefresh} className="px-4 py-2 rounded bg-black text-white">
          Обновить данные
        </button>
      </div>
    </div>
  );
}
