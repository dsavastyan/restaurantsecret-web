import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AccountOutletContext } from "./Layout";
import { apiPostAuth } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useGoalsStore } from "@/store/goals";

export default function AccountOverview() {
  const { me } = useOutletContext<AccountOutletContext>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth((state) => ({
    accessToken: state.accessToken,
    logout: state.logout,
  }));

  // Goals store
  const { goals, fetchGoals, updateStats } = useGoalsStore(s => ({
    goals: s.data,
    fetchGoals: s.fetch,
    updateStats: s.updateStats
  }));

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      const response = await apiPostAuth("/auth/logout", undefined, accessToken ?? undefined);
      if (!response.ok) {
        console.error("Logout request failed", response.status);
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

  return (
    <section
      className="account-panel"
      aria-labelledby="account-profile-heading"
    >
      <div className="account-panel__header">
        <div className="account-panel__intro">
          <h2 id="account-profile-heading" className="account-panel__title">
            Профиль
          </h2>
        </div>
        <div className="account-panel__actions">
          <button
            type="button"
            className="account-button account-button--outline"
            onClick={handleOpenLogoutModal}
          >
            Выйти
          </button>
        </div>
      </div>
      <dl className="account-panel__list">
        <div className="account-panel__item">
          <dt className="account-panel__term">Электронная почта</dt>
          <dd className="account-panel__description">{me?.user?.email || "—"}</dd>
        </div>
        {createdAt && (
          <div className="account-panel__item">
            <dt className="account-panel__term">С нами с</dt>
            <dd className="account-panel__description">{createdAt}</dd>
          </div>
        )}
      </dl>

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
    </section>
  );
}
