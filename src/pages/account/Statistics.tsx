import { useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';
import { useDiaryStore } from '@/store/diary';
import { useGoalsStore } from '@/store/goals';
import { formatNumeric } from '@/lib/nutrition';

export default function Statistics() {
    const token = useAuth(s => s.accessToken);
    const {
        entries, dayStats, selectedDate, isLoading, setDate, fetchDay, removeEntry, addEntry
    } = useDiaryStore(s => ({
        entries: s.entries,
        dayStats: s.dayStats,
        selectedDate: s.selectedDate,
        isLoading: s.isLoading,
        setDate: s.setDate,
        fetchDay: s.fetchDay,
        removeEntry: s.removeEntry,
        addEntry: s.addEntry
    }));

    // We need goals to calculate remaining
    const { data: goalData, fetch: fetchGoals } = useGoalsStore(s => ({ data: s.data, fetch: s.fetch }));

    const [manualForm, setManualForm] = useState({
        name: '', calories: '', protein: '', fat: '', carbs: '', weight: ''
    });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (token) {
            fetchDay(token, selectedDate);
            if (!goalData) fetchGoals(token);
        }
    }, [token, selectedDate, fetchDay, fetchGoals, goalData]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDate(e.target.value);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Удалить запись?')) {
            if (token) await removeEntry(token, id);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        await addEntry(token, {
            name: manualForm.name,
            calories: Number(manualForm.calories) || 0,
            protein: Number(manualForm.protein) || 0,
            fat: Number(manualForm.fat) || 0,
            carbs: Number(manualForm.carbs) || 0,
            weight: Number(manualForm.weight) || null
        });

        setManualForm({ name: '', calories: '', protein: '', fat: '', carbs: '', weight: '' });
        setIsAdding(false);
    };

    const remaining = {
        calories: (goalData?.target_calories || 0) - dayStats.calories,
        protein: (goalData?.target_protein || 0) - dayStats.protein,
        fat: (goalData?.target_fat || 0) - dayStats.fat,
        carbs: (goalData?.target_carbs || 0) - dayStats.carbs,
    };

    return (
        <div className="account-section">
            <div className="account-section-header">
                <div>
                    <h2 className="account-section-title">Статистика</h2>
                    <p className="account-section-subtitle">Контроль питания</p>
                </div>
                <div className="stats-date-picker">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="date-input"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="goals-grid">
                <div className="macro-card highlight">
                    <div className="macro-label">Калории (Остаток)</div>
                    <div className="macro-value">
                        {goalData ? Math.round(Math.max(0, remaining.calories)) : '—'}
                        <span className="macro-unit">ккал</span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(100, (dayStats.calories / (goalData?.target_calories || 1)) * 100)}%` }}
                        ></div>
                    </div>
                    <div className="macro-subtext">Съедено: {Math.round(dayStats.calories)} / {goalData?.target_calories || '—'}</div>
                </div>

                <div className="macros-row">
                    {/* Protein */}
                    <div className="macro-card">
                        <div className="macro-label">Белки</div>
                        <div className="macro-value">{Math.round(Math.max(0, remaining.protein))} г</div>
                        <div className="macro-subtext">Съедено: {Math.round(dayStats.protein)} / {goalData?.target_protein || '—'}</div>
                    </div>
                    {/* Fat */}
                    <div className="macro-card">
                        <div className="macro-label">Жиры</div>
                        <div className="macro-value">{Math.round(Math.max(0, remaining.fat))} г</div>
                        <div className="macro-subtext">Съедено: {Math.round(dayStats.fat)} / {goalData?.target_fat || '—'}</div>
                    </div>
                    {/* Carbs */}
                    <div className="macro-card">
                        <div className="macro-label">Углеводы</div>
                        <div className="macro-value">{Math.round(Math.max(0, remaining.carbs))} г</div>
                        <div className="macro-subtext">Съедено: {Math.round(dayStats.carbs)} / {goalData?.target_carbs || '—'}</div>
                    </div>
                </div>
            </div>

            {/* Manual Entry Button */}
            {!isAdding && (
                <button className="btn-secondary w-full" onClick={() => setIsAdding(true)}>
                    + Добавить продукт вручную
                </button>
            )}

            {/* Manual Entry Form */}
            {isAdding && (
                <form onSubmit={handleManualSubmit} className="manual-entry-form">
                    <h3 className="form-title">Добавить продукт</h3>
                    <div className="form-group">
                        <label>Название</label>
                        <input
                            type="text"
                            required
                            className="input-field"
                            value={manualForm.name}
                            onChange={e => setManualForm({ ...manualForm, name: e.target.value })}
                            placeholder="Например, Яблоко"
                        />
                    </div>
                    <div className="stats-grid">
                        <div className="form-group">
                            <label>Ккал</label>
                            <input type="number" required className="input-field" value={manualForm.calories} onChange={e => setManualForm({ ...manualForm, calories: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Вес (г)</label>
                            <input type="number" className="input-field" value={manualForm.weight} onChange={e => setManualForm({ ...manualForm, weight: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Белки</label>
                            <input type="number" className="input-field" value={manualForm.protein} onChange={e => setManualForm({ ...manualForm, protein: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Жиры</label>
                            <input type="number" className="input-field" value={manualForm.fat} onChange={e => setManualForm({ ...manualForm, fat: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Углев.</label>
                            <input type="number" className="input-field" value={manualForm.carbs} onChange={e => setManualForm({ ...manualForm, carbs: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn-ghost" onClick={() => setIsAdding(false)}>Отмена</button>
                        <button type="submit" className="btn-primary">Добавить</button>
                    </div>
                </form>
            )}

            {/* Diary List */}
            <div className="diary-list">
                <h3 className="diary-title">Дневник питания</h3>
                {isLoading && <p>Загрузка...</p>}
                {!isLoading && entries.length === 0 && <p className="text-muted">Пока ничего не добавлено.</p>}

                {entries.map(entry => (
                    <div key={entry.id} className="diary-item">
                        <div className="diary-item-info">
                            <div className="diary-item-name">{entry.name}</div>
                            <div className="diary-item-meta">
                                {entry.calories} ккал • Б {Math.round(Number(entry.protein))} • Ж {Math.round(Number(entry.fat))} • У {Math.round(Number(entry.carbs))}
                                {entry.restaurant_slug && <span className="badge-restaurant">Ресторан</span>}
                            </div>
                        </div>
                        <button className="btn-icon-danger" onClick={() => handleDelete(entry.id)}>×</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
