import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import type { AccountOutletContext } from "./Layout";
import { useAuth } from "@/store/auth";
import { useGoalsStore } from "@/store/goals";

type ProfileFormState = {
  gender: string;
  age: string;
  weight: string;
  height: string;
  activity: string;
  goal: string;
};

export default function AccountOverview() {
  const { me, sub, isNightTheme, incomingFriendRequestsCount, toggleTheme } = useOutletContext<AccountOutletContext>();
  const location = useLocation();
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
  const [form, setForm] = useState<ProfileFormState>({
    gender: "male",
    age: "",
    weight: "",
    height: "",
    activity: "min",
    goal: "maintain",
  });
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved">("");

  useEffect(() => {
    if (accessToken) fetchGoals(accessToken);
  }, [accessToken, fetchGoals]);

  useEffect(() => {
    if (!goals) {
      setForm({
        gender: "",
        age: "",
        weight: "",
        height: "",
        activity: "",
        goal: "",
      });
      return;
    }

    setForm({
      gender: goals.gender || "",
      age: goals.age?.toString() || "",
      weight: goals.weight?.toString() || "",
      height: goals.height?.toString() || "",
      activity: goals.activity_level || "",
      goal: goals.goal_type || "",
    });
  }, [goals]);

  const handleStatChange = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
    setSaveStatus("");
  };

  const saveStats = async () => {
    if (!accessToken) return;
    setSaveStatus("saving");

    try {
      await updateStats(accessToken, {
        gender: form.gender ? (form.gender as any) : null,
        age: parseInt(form.age) || null,
        weight: parseFloat(form.weight) || null,
        height: parseFloat(form.height) || null,
        activity_level: form.activity ? (form.activity as any) : null,
        goal_type: form.goal ? (form.goal as any) : null,
      });

      setSaveStatus("saved");
      setIsFormDirty(false);
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus("");
      alert(`Ошибка при сохранении: ${err.message || "Unknown error"}`);
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
    return backendName || "";
  }, [me?.user?.first_name]);
  const profileInitial = useMemo(() => {
    const source = profileName || me?.user?.email || "U";
    return source.trim().charAt(0).toUpperCase();
  }, [profileName, me?.user?.email]);
  const hasPremium = Boolean(sub && sub.status !== "none" && !sub.expired);
  const subscriptionMenuLabel = hasPremium ? "Управлять подпиской" : "Оформить подписку";
  const accountTierLabel = hasPremium ? "Премиум доступ" : "Базовый доступ";
  const accountTierClassName = hasPremium
    ? "account-overview-dashboard__tier"
    : "account-overview-dashboard__tier account-overview-dashboard__tier--basic";

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
  const profileCompletionToneClass = useMemo(() => {
    if (profileCompletion < 50) return "danger";
    if (profileCompletion < 80) return "warning";
    return "success";
  }, [profileCompletion]);
  const isProfileDetailsPage = location.pathname === "/account/profile";

  return (
    <section
      className="account-panel account-overview"
      aria-labelledby="account-profile-heading"
    >
      {!isProfileDetailsPage && (
        <div className="account-overview-dashboard">
          <article className="account-overview-dashboard__hero">
            <button
              type="button"
              className="account-overview-dashboard__theme-toggle"
              onClick={toggleTheme}
              title={isNightTheme ? "Включить дневной режим" : "Включить ночной режим"}
              aria-label={isNightTheme ? "Включить дневной режим" : "Включить ночной режим"}
            >
              {isNightTheme ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path
                    d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            <div className="account-overview-dashboard__hero-main">
              <div className="account-overview-dashboard__avatar" aria-hidden="true">
                {profileInitial}
              </div>
              <div className="account-overview-dashboard__identity">
                <h2 className="account-overview-dashboard__name">{profileName || "Профиль"}</h2>
                <p className="account-overview-dashboard__email">{me?.user?.email || "—"}</p>
                <div className="account-overview-dashboard__tags">
                  <span className={accountTierClassName}>{accountTierLabel}</span>
                  {createdAt ? (
                    <span className="account-overview-dashboard__member-since">С нами с {createdAt}</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="account-overview-dashboard__stats">
              <Link className="account-overview-dashboard__stat-card" to="/account/profile">
                <span className="account-overview-dashboard__stat-label">Заполнение профиля</span>
                <strong
                  className={`account-overview-dashboard__stat-value account-overview-dashboard__stat-value--${profileCompletionToneClass}`}
                >
                  {profileCompletion}%
                </strong>
                <span className="account-overview-dashboard__progress" aria-hidden="true">
                  <span
                    className={`account-overview-dashboard__progress-fill account-overview-dashboard__progress-fill--${profileCompletionToneClass}`}
                    style={{ width: `${profileCompletion}%` }}
                  />
                </span>
              </Link>

              <Link
                className={`account-overview-dashboard__stat-card${hasPremium ? "" : " account-overview-dashboard__stat-card--accent"}`}
                to="/account/subscription"
              >
                <span className="account-overview-dashboard__stat-label">Подписка</span>
                <strong className="account-overview-dashboard__stat-value">{hasPremium ? "Активна" : "Не подключена"}</strong>
                <span className="account-overview-dashboard__stat-meta">{subscriptionMenuLabel}</span>
              </Link>

              <Link className="account-overview-dashboard__stat-card" to="/account/friends">
                <span className="account-overview-dashboard__stat-label">Запросы в друзья</span>
                <strong className="account-overview-dashboard__stat-value">
                  {incomingFriendRequestsCount > 0 ? `+${incomingFriendRequestsCount}` : "0"}
                </strong>
                <span className="account-overview-dashboard__stat-meta">Открыть друзей</span>
              </Link>
            </div>
          </article>

          <div className="account-overview-dashboard__quick-grid">
            <Link className="account-overview-dashboard__quick-card" to="/account/favorites">
              <span className="account-overview-dashboard__quick-title">Избранное</span>
              <span className="account-overview-dashboard__quick-meta">Сохраненные рестораны</span>
            </Link>
            <Link className="account-overview-dashboard__quick-card" to="/account/goals">
              <span className="account-overview-dashboard__quick-title">Мои цели</span>
              <span className="account-overview-dashboard__quick-meta">Питание и прогресс</span>
            </Link>
            <Link className="account-overview-dashboard__quick-card" to="/account/statistics">
              <span className="account-overview-dashboard__quick-title">Дневник питания</span>
              <span className="account-overview-dashboard__quick-meta">История и аналитика</span>
            </Link>
          </div>

          <div className="account-overview-dashboard__menu">
            <Link className="account-overview-dashboard__menu-item" to="/account/profile">
              <span className="account-overview-dashboard__menu-label">Мой профиль</span>
              <span className="account-overview-dashboard__menu-value">{profileCompletion}% заполнено</span>
            </Link>
            <Link className="account-overview-dashboard__menu-item" to="/account/payment-methods">
              <span className="account-overview-dashboard__menu-label">Способы оплаты</span>
              <span className="account-overview-dashboard__menu-value">Управление платежами</span>
            </Link>
            <Link
              className={`account-overview-dashboard__menu-item${hasPremium ? "" : " account-overview-dashboard__menu-item--accent"}`}
              to="/account/subscription"
            >
              <span className="account-overview-dashboard__menu-label">{subscriptionMenuLabel}</span>
              <span className="account-overview-dashboard__menu-value">{hasPremium ? "Доступ открыт" : "Получить доступ"}</span>
            </Link>
            <Link className="account-overview-dashboard__menu-item" to="/account/friends">
              <span className="account-overview-dashboard__menu-label">Друзья</span>
              <span className="account-overview-dashboard__menu-value">
                {incomingFriendRequestsCount > 0
                  ? `${incomingFriendRequestsCount} новых запросов`
                  : "Приглашайте друзей"}
              </span>
            </Link>
          </div>
        </div>
      )}

      <div
        id="account-overview-form"
        className={`account-overview-form${isProfileDetailsPage ? " is-open" : ""}`}
      >
        <div className="account-overview-editor">
          <div className="account-panel__header">
            <div className="account-panel__intro">
              <p className="account-overview-editor__eyebrow">Персонализация</p>
              <h3 className="account-panel__title">Профиль и параметры</h3>
              <p className="account-panel__lead">
                Заполните данные, чтобы точнее считать нормы и подбирать персональные рекомендации.
              </p>
            </div>
            <div className="account-panel__actions">
              {saveStatus === "saved" && <span className="text-success">Сохранено</span>}
              {isFormDirty && (
                <button
                  type="button"
                  className="account-button account-button--primary"
                  onClick={saveStats}
                  disabled={saveStatus === "saving"}
                >
                  {saveStatus === "saving" ? "..." : "Сохранить"}
                </button>
              )}
            </div>
          </div>

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

          <div className="stats-grid">
            <div className="form-group">
              <label htmlFor="profile-gender">Пол</label>
              <select id="profile-gender" value={form.gender} onChange={(e) => handleStatChange("gender", e.target.value)}>
                <option value="">Не указывать</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="profile-age">Возраст (лет)</label>
              <input
                id="profile-age"
                type="number"
                value={form.age}
                onChange={(e) => handleStatChange("age", e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="form-group">
              <label htmlFor="profile-weight">Вес (кг)</label>
              <input
                id="profile-weight"
                type="number"
                value={form.weight}
                onChange={(e) => handleStatChange("weight", e.target.value)}
                placeholder="80"
              />
            </div>
            <div className="form-group">
              <label htmlFor="profile-height">Рост (см)</label>
              <input
                id="profile-height"
                type="number"
                value={form.height}
                onChange={(e) => handleStatChange("height", e.target.value)}
                placeholder="180"
              />
            </div>
            <div className="form-group full">
              <label htmlFor="profile-activity">Активность</label>
              <select
                id="profile-activity"
                value={form.activity}
                onChange={(e) => handleStatChange("activity", e.target.value)}
              >
                <option value="">Не указывать</option>
                <option value="min">Минимальная (сидячая работа)</option>
                <option value="light">Лёгкая (1-3 тренировки)</option>
                <option value="avg">Средняя (3-5 тренировок)</option>
                <option value="high">Высокая (6-7 тренировок)</option>
              </select>
            </div>
            <div className="form-group full">
              <label htmlFor="profile-goal">Цель</label>
              <select id="profile-goal" value={form.goal} onChange={(e) => handleStatChange("goal", e.target.value)}>
                <option value="">Не указывать</option>
                <option value="lose">Похудение</option>
                <option value="maintain">Поддержание формы</option>
                <option value="gain">Набор массы</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
