import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { AccountOutletContext } from "./Layout";
import { getProfileNameForToken } from "@/lib/onboarding";
import { useAuth } from "@/store/auth";
import { useGoalsStore } from "@/store/goals";

export default function AccountOverview() {
  const { me, sub } = useOutletContext<AccountOutletContext>();
  const { accessToken } = useAuth((state) => ({
    accessToken: state.accessToken,
  }));

  // Goals store
  const { goals, fetchGoals, updateStats } = useGoalsStore(s => ({
    goals: s.data,
    fetchGoals: s.fetch,
    updateStats: s.updateStats
  }));

  // Local form state for stats
  const [form, setForm] = useState({
    gender: 'male',
    age: '',
    weight: '',
    height: '',
    activity: 'min',
    goal: 'maintain'
  });
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'' | 'saving' | 'saved'>('');
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);

  useEffect(() => {
    if (accessToken) fetchGoals(accessToken);
  }, [accessToken, fetchGoals]);

  useEffect(() => {
    if (goals) {
      setForm({
        gender: goals.gender || 'male',
        age: goals.age?.toString() || '',
        weight: goals.weight?.toString() || '',
        height: goals.height?.toString() || '',
        activity: goals.activity_level || 'min',
        goal: goals.goal_type || 'maintain'
      });
    }
  }, [goals]);

  const handleStatChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
    setSaveStatus('');
  };

  const saveStats = async () => {
    if (!accessToken) return;
    setSaveStatus('saving');

    try {
      await updateStats(accessToken, {
        gender: form.gender as any,
        age: parseInt(form.age) || null,
        weight: parseFloat(form.weight) || null,
        height: parseFloat(form.height) || null,
        activity_level: form.activity as any,
        goal_type: form.goal as any
      });

      setSaveStatus('saved');
      setIsFormDirty(false);
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus('');
      alert('Ошибка при сохранении: ' + (err.message || 'Unknown error'));
    }
  };

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

  const profileName = useMemo(() => {
    const backendName = me?.user?.first_name?.trim();
    if (backendName) return backendName;
    return getProfileNameForToken(accessToken);
  }, [accessToken, me?.user?.first_name]);
  const profileInitial = useMemo(() => {
    const source = profileName || me?.user?.email || "U";
    return source.trim().charAt(0).toUpperCase();
  }, [profileName, me?.user?.email]);
  const hasPremium = Boolean(sub && sub.status !== "none" && !sub.expired);
  const subscriptionMenuLabel = hasPremium ? "Управлять подпиской" : "Оформить подписку";
  const profileCompletion = useMemo(() => {
    const fields = [
      form.gender,
      form.age,
      form.weight,
      form.height,
      form.activity,
      form.goal,
    ];
    const filled = fields.filter((field) => String(field || "").trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  return (
    <section
      className="account-panel account-overview"
      aria-labelledby="account-profile-heading"
    >
      <div className="account-overview-mobile">
        <div className="account-overview-mobile__hero">
          <div className="account-overview-mobile__avatar" aria-hidden="true">
            {profileInitial}
          </div>
          <div className="account-overview-mobile__identity">
            <h2 className="account-overview-mobile__name">{profileName || "Профиль"}</h2>
            <p className="account-overview-mobile__email">{me?.user?.email || "—"}</p>
            <span
              className={`account-overview-mobile__premium${
                hasPremium ? "" : " account-overview-mobile__premium--basic"
              }`}
            >
              {hasPremium ? "Премиум доступ" : "Базовый доступ"}
            </span>
          </div>
        </div>

        <div className="account-overview-mobile__quick">
          <Link className="account-overview-mobile__quick-card" to="/account/favorites">
            <span className="account-overview-mobile__quick-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-6.6-4.4-9.3-8C.1 9.8 1.4 5.7 5.2 4.5c2.1-.7 4.4 0 5.8 1.8 1.4-1.8 3.7-2.5 5.8-1.8 3.8 1.2 5.1 5.3 2.5 8.5C18.6 16.6 12 21 12 21z" />
              </svg>
            </span>
            <span>Избранное</span>
          </Link>
          <Link className="account-overview-mobile__quick-card" to="/account/goals">
            <span className="account-overview-mobile__quick-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="4" />
                <path d="M16 8l5-5M17 3h4v4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>Мои цели</span>
          </Link>
        </div>

        <div className="account-overview-mobile__menu">
          <button
            type="button"
            className="account-overview-mobile__menu-item account-overview-mobile__menu-item--profile"
            onClick={() => setIsMobileProfileOpen((prev) => !prev)}
            aria-expanded={isMobileProfileOpen}
            aria-controls="account-overview-form"
          >
            <span className="account-overview-mobile__menu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c1.6-3.5 4.3-5 8-5s6.4 1.5 8 5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="account-overview-mobile__menu-label">Мой профиль</span>
            <span className="account-overview-mobile__menu-progress" aria-label={`Профиль заполнен на ${profileCompletion}%`}>
              Заполнен на {profileCompletion}%
            </span>
          </button>

          <Link className="account-overview-mobile__menu-item" to="/account/payment-methods">
            <span className="account-overview-mobile__menu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10h18M7 14h4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="account-overview-mobile__menu-label">Способы платежа</span>
            <span className="account-overview-mobile__menu-arrow" aria-hidden="true">›</span>
          </Link>

          <Link
            className={`account-overview-mobile__menu-item${
              hasPremium ? "" : " account-overview-mobile__menu-item--subscription-cta"
            }`}
            to="/account/subscription"
          >
            <span className="account-overview-mobile__menu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 11a8 8 0 0113.7-5.7M20 13a8 8 0 01-13.7 5.7" strokeLinecap="round" />
                <path d="M17 3v4h4M7 21v-4H3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="account-overview-mobile__menu-label">{subscriptionMenuLabel}</span>
            <span className="account-overview-mobile__menu-arrow" aria-hidden="true">›</span>
          </Link>

          <Link className="account-overview-mobile__menu-item" to="/account/statistics">
            <span className="account-overview-mobile__menu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 3h11a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
                <path d="M9 3v18M12 8h4M12 12h4M12 16h4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="account-overview-mobile__menu-label">Дневник питания</span>
            <span className="account-overview-mobile__menu-arrow" aria-hidden="true">›</span>
          </Link>
        </div>
      </div>

      <div
        id="account-overview-form"
        className={`account-overview-form${isMobileProfileOpen ? " is-open" : ""}`}
      >
        <div className="account-profile-info">
          {profileName && (
            <div className="account-profile-info__item">
              <label className="account-profile-info__label">Имя</label>
              <span className="account-profile-info__value">{profileName}</span>
            </div>
          )}
          <div className="account-profile-info__item">
            <label className="account-profile-info__label">Электронная почта</label>
            <span className="account-profile-info__value">{me?.user?.email || "—"}</span>
          </div>
          {createdAt && (
            <div className="account-profile-info__item">
              <label className="account-profile-info__label">С нами с</label>
              <span className="account-profile-info__value">{createdAt}</span>
            </div>
          )}
        </div>

        <div className="account-divider"></div>

        <div className="account-panel__header">
          <div className="account-panel__intro">
            <h3 className="account-panel__title">О Вас</h3>
          </div>
          <div className="account-panel__actions">
            {saveStatus === 'saved' && <span className="text-success">Сохранено</span>}
            {isFormDirty && (
              <button
                className="account-button account-button--primary"
                onClick={saveStats}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? '...' : 'Сохранить'}
              </button>
            )}
          </div>
        </div>

        <div className="stats-grid">
          <div className="form-group">
            <label>Пол</label>
            <select value={form.gender} onChange={e => handleStatChange('gender', e.target.value)}>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </div>
          <div className="form-group">
            <label>Возраст (лет)</label>
            <input type="number" value={form.age} onChange={e => handleStatChange('age', e.target.value)} placeholder="30" />
          </div>
          <div className="form-group">
            <label>Вес (кг)</label>
            <input type="number" value={form.weight} onChange={e => handleStatChange('weight', e.target.value)} placeholder="80" />
          </div>
          <div className="form-group">
            <label>Рост (см)</label>
            <input type="number" value={form.height} onChange={e => handleStatChange('height', e.target.value)} placeholder="180" />
          </div>
          <div className="form-group full">
            <label>Активность</label>
            <select value={form.activity} onChange={e => handleStatChange('activity', e.target.value)}>
              <option value="min">Минимальная (сидячая работа)</option>
              <option value="light">Лёгкая (1-3 тренировки)</option>
              <option value="avg">Средняя (3-5 тренировок)</option>
              <option value="high">Высокая (6-7 тренировок)</option>
            </select>
          </div>
          <div className="form-group full">
            <label>Цель</label>
            <select value={form.goal} onChange={e => handleStatChange('goal', e.target.value)}>
              <option value="lose">Похудение</option>
              <option value="maintain">Поддержание формы</option>
              <option value="gain">Набор массы</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}
