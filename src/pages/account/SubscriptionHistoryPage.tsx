import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { apiGet, isUnauthorizedError } from "@/lib/api";
import { useAuth } from "@/store/auth";
import type { AccountOutletContext } from "./Layout";

type RawHistoryResponse = unknown;

type SubscriptionHistoryItem = {
  plan?: string | null;
  status?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  source?: string | null;
};

type NormalizedHistoryItem = {
  plan: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
};

type FetchState = {
  data: NormalizedHistoryItem[];
  loading: boolean;
  error: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  monthly: "Месячный",
  annual: "Годовая",
  mock: "Бесплатный период",
};

function formatPlanName(plan: string): string {
  const normalized = plan.trim().toLowerCase();
  return PLAN_LABELS[normalized] ?? plan;
}

function normalizeHistoryResponse(response: RawHistoryResponse): NormalizedHistoryItem[] {
  const extractArray = (value: RawHistoryResponse): SubscriptionHistoryItem[] => {
    if (Array.isArray(value)) {
      return value as SubscriptionHistoryItem[];
    }

    if (value && typeof value === "object") {
      const entries = [
        (value as Record<string, unknown>).items,
        (value as Record<string, unknown>).data,
        (value as Record<string, unknown>).subscriptions,
      ];

      for (const candidate of entries) {
        if (Array.isArray(candidate)) {
          return candidate as SubscriptionHistoryItem[];
        }
      }
    }

    return [];
  };

  const rawItems = extractArray(response);

  const normalized: NormalizedHistoryItem[] = rawItems.map((item) => {
    const plan = typeof item.plan === "string" && item.plan.trim() ? item.plan.trim() : "—";
    const status = typeof item.status === "string" && item.status.trim() ? item.status.trim() : "—";

    const startedAt =
      typeof item.started_at === "string" && item.started_at.trim() ? item.started_at.trim() : null;
    const expiresAt =
      typeof item.expires_at === "string" && item.expires_at.trim() ? item.expires_at.trim() : null;

    return {
      plan: plan !== "—" ? formatPlanName(plan) : plan,
      status,
      started_at: startedAt,
      expires_at: expiresAt,
    };
  });

  const getTime = (value: string | null) => {
    if (!value) return 0;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  return normalized.sort((a, b) => getTime(b.started_at) - getTime(a.started_at));
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    console.error("Failed to format date", error);
    return "—";
  }
}

function getStatusTone(status: string): "active" | "cancelled" | "expired" | "pending" {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("active") || normalized.includes("актив")) {
    return "active";
  }
  if (normalized.includes("cancel") || normalized.includes("отмен")) {
    return "cancelled";
  }
  if (normalized.includes("expire") || normalized.includes("истек")) {
    return "expired";
  }
  return "pending";
}

export default function SubscriptionHistoryPage() {
  const { token } = useOutletContext<AccountOutletContext>();
  const [state, setState] = useState<FetchState>({ data: [], loading: true, error: null });
  const accessToken = token || undefined;
  const logout = useAuth((state) => state.logout);

  const loadHistory = useCallback(async () => {
    if (!accessToken) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiGet("/api/subscriptions/list", accessToken);
      const normalized = normalizeHistoryResponse(response);
      setState({ data: normalized, loading: false, error: null });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        logout();
        setState({ data: [], loading: false, error: null });
        return;
      }
      console.error("Failed to load subscription history", error);
      setState({ data: [], loading: false, error: "Не удалось загрузить историю. Попробуйте снова." });
    }
  }, [accessToken, logout]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const hasData = state.data.length > 0;

  const historyContent = useMemo(() => {
    if (state.loading) {
      return (
        <ul className="account-history__list" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index} className="account-history__item account-history__item--skeleton">
              <span className="account-history__skeleton-line account-history__skeleton-line--wide" />
              <span className="account-history__skeleton-line account-history__skeleton-line--narrow" />
              <span className="account-history__skeleton-grid">
                <span className="account-history__skeleton-dot" />
                <span className="account-history__skeleton-dot" />
                <span className="account-history__skeleton-dot" />
                <span className="account-history__skeleton-dot" />
              </span>
            </li>
          ))}
        </ul>
      );
    }

    if (hasData) {
      return (
        <ul className="account-history__list">
          {state.data.map((item, index) => {
            const tone = getStatusTone(item.status);
            return (
              <li key={`${item.plan}-${item.started_at ?? index}`} className="account-history__item">
                <div className="account-history__item-header">
                  <div className="account-history__plan-group">
                    <p className="account-history__plan">{item.plan}</p>
                  </div>
                  <span className={`account-history__status account-history__status--${tone}`}>
                    {item.status}
                  </span>
                </div>
                <dl className="account-history__meta">
                  <div className="account-history__meta-field">
                    <dt className="account-history__meta-term">Начало доступа</dt>
                    <dd className="account-history__meta-value">{formatDate(item.started_at)}</dd>
                  </div>
                  <div className="account-history__meta-field">
                    <dt className="account-history__meta-term">Окончание</dt>
                    <dd className="account-history__meta-value">{formatDate(item.expires_at)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      );
    }

    return (
      <div className="account-history__empty" role="status">
        <h3>История отстуствует</h3>
        <p>Как только вы оформите подписку, здесь появится информация о каждом периоде доступа</p>
      </div>
    );
  }, [state.loading, state.data, hasData]);

  return (
    <section className="account-panel" aria-labelledby="account-subscription-history-heading">
      <div className="account-panel__header">
        <div>
          <h2 id="account-subscription-history-heading" className="account-panel__title">
            История подписки
          </h2>
        </div>
        <div className="account-panel__actions">
          <Link to="/account/subscription" className="account-button account-button--outline">
            Управлять подпиской
          </Link>
        </div>
      </div>

      {state.error && (
        <div className="account-panel__box account-panel__box--error" role="alert">
          <p className="account-panel__error-text">{state.error}</p>
          <button type="button" className="account-button account-button--outline" onClick={loadHistory}>
            Повторить
          </button>
        </div>
      )}

      {historyContent}
    </section>
  );
}
