import { useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';
import { useDiaryStore } from '@/store/diary';
import { useGoalsStore } from '@/store/goals';
import { formatNumeric } from '@/lib/nutrition';

const formatDateCompact = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
    return `${day} ${month}`;
};

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
                    <h2 className="account-section-title">Дневник питания</h2>
                </div>
                <div className="stats-date-picker">
                    <div className="stats-date-compact">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>{formatDateCompact(selectedDate)}</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="date-input-hidden"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="goals-grid">
                <div className="macro-card highlight">
                    <div className="macro-label">Калории</div>
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
                    {/* Desktop subtext */}
                    <div className="macro-subtext desktop-only">Съедено: {Math.round(dayStats.calories)} / {goalData?.target_calories || '—'}</div>
                    {/* Mobile subtext */}
                    <div className="macro-subtext mobile-only">{Math.round(dayStats.calories)} / {goalData?.target_calories || '—'}</div>
                </div>

                {/* Desktop Macros */}
                <div className="macros-row desktop-only">
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

                {/* Mobile Macros */}
                <div className="macro-tiles-grid mobile-only">
                    <div className="macro-tile">
                        <div className="macro-tile-label">Б</div>
                        <div className="macro-tile-value">{Math.round(dayStats.protein)} / {goalData?.target_protein || '—'}</div>
                        <div className="mini-progress-bar">
                            <div className="mini-progress-fill" style={{ width: `${Math.min(100, (dayStats.protein / (goalData?.target_protein || 1)) * 100)}%` }}></div>
                        </div>
                    </div>
                    <div className="macro-tile">
                        <div className="macro-tile-label">Ж</div>
                        <div className="macro-tile-value">{Math.round(dayStats.fat)} / {goalData?.target_fat || '—'}</div>
                        <div className="mini-progress-bar">
                            <div className="mini-progress-fill" style={{ width: `${Math.min(100, (dayStats.fat / (goalData?.target_fat || 1)) * 100)}%` }}></div>
                        </div>
                    </div>
                    <div className="macro-tile">
                        <div className="macro-tile-label">У</div>
                        <div className="macro-tile-value">{Math.round(dayStats.carbs)} / {goalData?.target_carbs || '—'}</div>
                        <div className="mini-progress-bar">
                            <div className="mini-progress-fill" style={{ width: `${Math.min(100, (dayStats.carbs / (goalData?.target_carbs || 1)) * 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Entry Button */}
            {!isAdding && (
                <button className="btn-add-product w-full" onClick={() => setIsAdding(true)}>
                    <span className="btn-add-product__icon">+</span>
                    <span>Добавить продукт вручную</span>
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
                {isLoading && <p>Загрузка...</p>}
                {!isLoading && entries.length === 0 && <p className="text-muted">Добавляйте блюда на страницах ресторанов или введите вручную</p>}

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
