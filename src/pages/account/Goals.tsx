import { useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';
import { useGoalsStore } from '@/store/goals';
import { formatNumeric } from '@/lib/nutrition';

// Simple UI for displaying goals
// Similar card style
export default function Goals() {
    const token = useAuth(s => s.accessToken);
    const { data, isLoading, updateTargets, fetch, recalculate } = useGoalsStore(s => ({
        data: s.data,
        isLoading: s.isLoading,
        updateTargets: s.updateTargets,
        fetch: s.fetch,
        recalculate: s.recalculate
    }));

    // Local state for editing manual goals
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        calories: '', protein: '', fat: '', carbs: ''
    });

    useEffect(() => {
        if (token) {
            fetch(token);
        }
    }, [token, fetch]);

    const handleEditStart = () => {
        if (!data) return;
        setEditValues({
            calories: String(data.target_calories || ''),
            protein: String(data.target_protein || ''),
            fat: String(data.target_fat || ''),
            carbs: String(data.target_carbs || '')
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!token) return;
        const cals = parseInt(editValues.calories) || 0;
        const p = parseFloat(editValues.protein) || 0;
        const f = parseFloat(editValues.fat) || 0;
        const c = parseFloat(editValues.carbs) || 0;

        await updateTargets(token, {
            target_calories: cals,
            target_protein: p,
            target_fat: f,
            target_carbs: c,
            is_auto_calculated: false // Manual override implies auto-calc is off
        });
        setIsEditing(false);
    };

    const handleReset = async () => {
        if (!token) return;
        if (confirm("Пересчитать цели автоматически на основе ваших данных? Ручные настройки будут сброшены.")) {
            await recalculate(token);
        }
    };

    if (isLoading && !data) return <div className="goals-loading">Загрузка...</div>;

    const showPlaceholder = !data || (!data.target_calories && !data.weight);

    return (
        <div className="account-section">
            <div className="account-section-header">
                <div>
                    <h2 className="account-section-title">Мои Цели</h2>
                    <p className="account-section-subtitle">Суточная норма КБЖУ</p>
                </div>
                {!isEditing && data && (
                    <div className="goals-actions">
                        <button className="btn-secondary-sm" onClick={handleEditStart}>Изменить вручную</button>
                        {data.is_auto_calculated ? (
                            <span className="badge badge--success">Авто</span>
                        ) : (
                            <button className="btn-link-sm" onClick={handleReset}>Сбросить на авто</button>
                        )}
                    </div>
                )}
            </div>

            {showPlaceholder && (
                <div className="goals-empty">
                    <p>Заполните параметры тела в <a href="/account" onClick={(e) => { e.preventDefault(); location.hash = '#profile'; /* or nav */ }}>Профиле</a>, чтобы мы рассчитали вашу норму.</p>
                </div>
            )}

            {data && (
                <div className={`goals-grid ${isEditing ? 'is-editing' : ''}`}>
                    <div className="macro-card highlight">
                        <div className="macro-label">Калории</div>
                        <div className="macro-value">
                            {isEditing ? (
                                <input type="number" className="input-sm" value={editValues.calories} onChange={e => setEditValues(p => ({ ...p, calories: e.target.value }))} />
                            ) : (
                                <span>{data.target_calories || '—'}</span>
                            )}
                            <span className="macro-unit">ккал</span>
                        </div>
                    </div>

                    <div className="macros-row">
                        <div className="macro-card">
                            <div className="macro-label">Белки</div>
                            <div className="macro-value">
                                {isEditing ? (
                                    <input type="number" className="input-sm" value={editValues.protein} onChange={e => setEditValues(p => ({ ...p, protein: e.target.value }))} />
                                ) : (
                                    <span>{data.target_protein || '—'}</span>
                                )}
                                <span className="macro-unit">г</span>
                            </div>
                        </div>
                        <div className="macro-card">
                            <div className="macro-label">Жиры</div>
                            <div className="macro-value">
                                {isEditing ? (
                                    <input type="number" className="input-sm" value={editValues.fat} onChange={e => setEditValues(p => ({ ...p, fat: e.target.value }))} />
                                ) : (
                                    <span>{data.target_fat || '—'}</span>
                                )}
                                <span className="macro-unit">г</span>
                            </div>
                        </div>
                        <div className="macro-card">
                            <div className="macro-label">Углеводы</div>
                            <div className="macro-value">
                                {isEditing ? (
                                    <input type="number" className="input-sm" value={editValues.carbs} onChange={e => setEditValues(p => ({ ...p, carbs: e.target.value }))} />
                                ) : (
                                    <span>{data.target_carbs || '—'}</span>
                                )}
                                <span className="macro-unit">г</span>
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="goals-edit-actions">
                            <button className="btn-secondary" onClick={() => setIsEditing(false)}>Отмена</button>
                            <button className="btn-primary" onClick={handleSave}>Сохранить цели</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
