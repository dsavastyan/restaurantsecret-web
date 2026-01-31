import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete, isUnauthorizedError } from "@/lib/api";
import { useAuth } from "@/store/auth";

type PaymentMethod = {
    id: number;
    yk_id: string;
    status: string;
    title: string | null;
    card_last4: string | null;
    expiry_month: string | null;
    expiry_year: string | null;
    card_type: string | null;
    issuer_name: string | null;
    is_default: boolean;
};

export default function PaymentMethods() {
    const { accessToken, logout } = useAuth((state) => ({
        accessToken: state.accessToken,
        logout: state.logout,
    }));

    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attaching, setAttaching] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Polling state
    const [pollCount, setPollCount] = useState(0);

    const fetchMethods = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await apiGet<{ items: PaymentMethod[] }>("/api/payment-methods", accessToken);
            if (res && Array.isArray(res.items)) {
                setMethods(res.items);
            }
        } catch (err) {
            if (isUnauthorizedError(err)) {
                logout();
            } else {
                console.error("Failed to fetch payment methods", err);
                setError("Не удалось загрузить карты.");
            }
        } finally {
            setLoading(false);
        }
    }, [accessToken, logout]);

    // Initial load
    useEffect(() => {
        fetchMethods();
    }, [fetchMethods]);

    // Polling effect after adding a card
    useEffect(() => {
        if (pollCount > 0) {
            const timer = setTimeout(() => {
                fetchMethods().then(() => {
                    setPollCount(prev => prev - 1);
                });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [pollCount, fetchMethods]);

    const handleAddCard = async () => {
        if (!accessToken || attaching) return;
        setAttaching(true);
        setError(null);
        try {
            const res = await apiPost<{ confirmation_url?: string }>("/api/payment-methods/attach", {}, accessToken);
            if (res?.confirmation_url) {
                // Redirect to Yookassa
                window.location.href = res.confirmation_url;
            } else {
                setError("Не удалось начать привязку карты.");
            }
        } catch (err) {
            console.error("Attach error", err);
            setError("Ошибка при создании привязки.");
        } finally {
            setAttaching(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Вы уверены, что хотите удалить карту из сохранённых?")) {
            return;
        }
        setDeletingId(id);
        try {
            await apiDelete(`/api/payment-methods/${id}`, accessToken);
            // Remove locally
            setMethods(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            console.error("Delete error", err);
            alert("Не удалось удалить карту.");
        } finally {
            setDeletingId(null);
        }
    };

    // Check if we just returned from redirect
    useEffect(() => {
        setPollCount(3);
    }, []);

    return (
        <section className="account-panel-v2" aria-labelledby="payment-methods-heading">
            <header className="account-panel-v2__header">
                <h2 id="payment-methods-heading" className="account-panel-v2__title">
                    Способы оплаты
                </h2>
                <button
                    className="account-button account-button--primary account-button--sm"
                    onClick={handleAddCard}
                    disabled={attaching || loading}
                >
                    {attaching ? "..." : "+ Добавить карту"}
                </button>
            </header>

            {error && (
                <div className="account-subscription-v2__error-box" style={{ marginBottom: 16 }}>
                    <p>{error}</p>
                </div>
            )}

            {loading && methods.length === 0 ? (
                <div className="account-skeleton">
                    <div className="account-skeleton__line" />
                    <div className="account-skeleton__line" />
                </div>
            ) : (
                <div className="payment-methods-list">
                    {methods.length === 0 ? (
                        <p className="payment-methods-empty">Нет привязанных карт.</p>
                    ) : (
                        methods.map(method => (
                            <div key={method.id} className="payment-method-card">
                                <div className="payment-method-card__icon">
                                    {/* Simple Card Icon */}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                        <line x1="1" y1="10" x2="23" y2="10" />
                                    </svg>
                                </div>
                                <div className="payment-method-card__info">
                                    <div className="payment-method-card__title">
                                        {method.title || `Карта •••• ${method.card_last4 || "????"}`}
                                    </div>
                                    <div className="payment-method-card__meta">
                                        {method.expiry_month}/{method.expiry_year} &bull; {method.card_type}
                                        {method.status === 'pending' && <span style={{ marginLeft: 8, color: 'orange' }}>(Проверяется...)</span>}
                                    </div>
                                </div>
                                <button
                                    className="payment-method-card__delete"
                                    onClick={() => handleDelete(method.id)}
                                    disabled={deletingId === method.id}
                                    title="Удалить карту"
                                >
                                    {deletingId === method.id ? "..." : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            <style>{`
        .payment-methods-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 16px;
        }
        .payment-method-card {
            display: flex;
            align-items: center;
            background: var(--bg-surface-2, #f5f5f5);
            padding: 12px 16px;
            border-radius: 12px;
            gap: 16px;
        }
        .payment-method-card__icon {
            color: var(--text-secondary, #666);
        }
        .payment-method-card__info {
            flex: 1;
        }
        .payment-method-card__title {
            font-weight: 500;
            color: var(--text-primary, #000);
        }
        .payment-method-card__meta {
            font-size: 0.85em;
            color: var(--text-secondary, #666);
        }
        .payment-method-card__delete {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-secondary, #999);
            padding: 8px;
            transition: color 0.2s;
        }
        .payment-method-card__delete:hover {
            color: #ef4444; 
        }
        .account-button--sm {
            padding: 6px 16px;
            font-size: 0.9em;
        }
      `}</style>
        </section>
    );
}
