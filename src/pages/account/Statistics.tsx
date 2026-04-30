import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useDiaryStore } from '@/store/diary';
import { useGoalsStore } from '@/store/goals';
import { useSubscriptionStore } from '@/store/subscription';
const formatDateCompact = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
    return `${day} ${month}`;
};

const shiftDateByDays = (dateStr: string, delta: number) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + delta);
    return date.toISOString().slice(0, 10);
};

const getProgress = (value: number, target?: number | null) => {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.max(0, (value / target) * 100));
};

const formatTarget = (value?: number | null, unit = '') => {
    if (!value || value <= 0) return '—';
    return `${Math.round(value)}${unit}`;
};

const NutritionIcon = ({ type }: { type: 'calories' | 'protein' | 'fat' | 'carbs' }) => {
    if (type === 'calories') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12.3 21c-4.1 0-7.3-2.9-7.3-7 0-2.8 1.4-4.7 3.3-6.5.6 2.1 1.8 3.1 3.1 3.5-.5-3.2.8-5.9 3.2-8 1 3.2 4.4 5.3 4.4 10.5 0 4.4-3.1 7.5-6.7 7.5Z" />
                <path d="M12 18.5c-1.9 0-3.4-1.3-3.4-3.3 0-1.4.7-2.4 1.6-3.2.3 1 .9 1.5 1.6 1.7-.3-1.5.4-2.8 1.5-3.8.5 1.5 2.1 2.5 2.1 5 0 2.1-1.5 3.6-3.4 3.6Z" />
            </svg>
        );
    }

    if (type === 'protein') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5.3 18.7c4.7-.2 8.4-2.1 11-5.8 2-2.9 2.4-5.7 2.4-7.6-4.2.3-7.7 1.9-10.4 4.7-2.4 2.5-3.3 5.5-3 8.7Z" />
                <path d="M5.3 18.7 18 6" />
                <path d="M8.5 15.6 5 12.1" />
            </svg>
        );
    }

    if (type === 'fat') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21a7 7 0 0 1-7-7c0-4.4 5.6-9.9 6.7-10.9a.4.4 0 0 1 .6 0C13.4 4.1 19 9.6 19 14a7 7 0 0 1-7 7Z" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7.2 18.8c5.1-.5 8.4-3.3 10.1-8.3.8-2.3.9-4.4.8-5.7-3.8.4-6.8 2.1-8.9 5-1.7 2.3-2.4 5.3-2 9Z" />
            <path d="M6.5 19.5 18 5" />
            <path d="M9.2 15.1 5.6 13" />
            <path d="m11.6 11.9-3.3-2" />
            <path d="m12.2 11.4 4 .3" />
            <path d="m9.8 14.7 4.5.5" />
        </svg>
    );
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

    const { hasActiveSub } = useSubscriptionStore(s => ({ hasActiveSub: s.hasActiveSub }));
    const navigate = useNavigate();

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

    const handleShiftDate = (delta: number) => {
        setDate(shiftDateByDays(selectedDate, delta));
    };

    const handleDelete = async (id: string) => {
        if (confirm('Удалить запись?')) {
            if (token) await removeEntry(token, id);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        if (!hasActiveSub) {
            navigate('/account/subscription', { state: { from: window.location.pathname + window.location.search } });
            return;
        }

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

    const targets = {
        calories: goalData?.target_calories || 0,
        protein: goalData?.target_protein || 0,
        fat: goalData?.target_fat || 0,
        carbs: goalData?.target_carbs || 0,
    };

    const progress = {
        calories: getProgress(dayStats.calories, targets.calories),
        protein: getProgress(dayStats.protein, targets.protein),
        fat: getProgress(dayStats.fat, targets.fat),
        carbs: getProgress(dayStats.carbs, targets.carbs),
    };

    const remainingCalories = Math.max(0, Math.round(targets.calories - dayStats.calories));

    return (
        <div className="account-section statistics-section">
            <div className="nds">
                <div className="ndsHeader">
                    <div className="ndsDateWrap">
                        <button className="ndsDateBtn" type="button" onClick={() => handleShiftDate(-1)} aria-label="Предыдущий день">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <div className="ndsDatePill">
                            <span className="ndsCalIcon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </span>
                            <span className="ndsDateText">{formatDateCompact(selectedDate)}</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="ndsDateInput"
                            />
                        </div>
                        <button className="ndsDateBtn" type="button" onClick={() => handleShiftDate(1)} aria-label="Следующий день">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="ndsCard ndsCardMain">
                    <div className="ndsMetricLayout">
                        <span className="ndsMetricIcon ndsMetricIcon--calories">
                            <NutritionIcon type="calories" />
                        </span>
                        <div className="ndsMetricBody">
                            <div className="ndsMetricTopline">
                                <div>
                                    <div className="ndsStrong">Калории</div>
                                    <div className="ndsCardValue">
                                        {Math.round(dayStats.calories)}
                                        <span className="ndsMuted">/ {formatTarget(targets.calories)}</span>
                                    </div>
                                </div>
                                {targets.calories > 0 && (
                                    <div className="ndsRemaining">Осталось <strong>{remainingCalories} ккал</strong></div>
                                )}
                            </div>
                            <div className="ndsProgressRow">
                                <div className="ndsBar">
                                    <div
                                        className="ndsBarFill ndsBarFillGreen"
                                        style={{ width: `${progress.calories}%` }}
                                    ></div>
                                </div>
                                <span className="ndsPercent">{Math.round(progress.calories)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ndsTiles">
                    <div className="ndsTile ndsTile--protein">
                        <div className="ndsTileMain">
                            <span className="ndsMetricIcon ndsMetricIcon--protein">
                                <NutritionIcon type="protein" />
                            </span>
                            <div>
                                <div className="ndsTileHead">Белки</div>
                                <div className="ndsTileNums">
                                    <span className="ndsStrong">{Math.round(dayStats.protein)}</span>
                                    <span className="ndsMuted">/ {formatTarget(targets.protein, ' г')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="ndsProgressRow">
                            <div className="ndsBar ndsBarSmall">
                                <div
                                    className="ndsBarFill toneGreen"
                                    style={{ width: `${progress.protein}%` }}
                                ></div>
                            </div>
                            <span className="ndsPercent">{Math.round(progress.protein)}%</span>
                        </div>
                    </div>
                    <div className="ndsTile ndsTile--fat">
                        <div className="ndsTileMain">
                            <span className="ndsMetricIcon ndsMetricIcon--fat">
                                <NutritionIcon type="fat" />
                            </span>
                            <div>
                                <div className="ndsTileHead">Жиры</div>
                                <div className="ndsTileNums">
                                    <span className="ndsStrong">{Math.round(dayStats.fat)}</span>
                                    <span className="ndsMuted">/ {formatTarget(targets.fat, ' г')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="ndsProgressRow">
                            <div className="ndsBar ndsBarSmall">
                                <div
                                    className="ndsBarFill toneAmber"
                                    style={{ width: `${progress.fat}%` }}
                                ></div>
                            </div>
                            <span className="ndsPercent">{Math.round(progress.fat)}%</span>
                        </div>
                    </div>
                    <div className="ndsTile ndsTile--carbs">
                        <div className="ndsTileMain">
                            <span className="ndsMetricIcon ndsMetricIcon--carbs">
                                <NutritionIcon type="carbs" />
                            </span>
                            <div>
                                <div className="ndsTileHead">Углеводы</div>
                                <div className="ndsTileNums">
                                    <span className="ndsStrong">{Math.round(dayStats.carbs)}</span>
                                    <span className="ndsMuted">/ {formatTarget(targets.carbs, ' г')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="ndsProgressRow">
                            <div className="ndsBar ndsBarSmall">
                                <div
                                    className="ndsBarFill tonePurple"
                                    style={{ width: `${progress.carbs}%` }}
                                ></div>
                            </div>
                            <span className="ndsPercent">{Math.round(progress.carbs)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Entry Button */}
            {!isAdding && (
                <button className="btn-add-product w-full" onClick={() => {
                    if (!hasActiveSub) {
                        navigate('/account/subscription', { state: { from: window.location.pathname + window.location.search } });
                        return;
                    }
                    setIsAdding(true);
                }}>
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
                {!isLoading && entries.length === 0 && (
                    <div className="diary-empty">
                        <div className="diary-empty__plate" aria-hidden="true">
                            <svg viewBox="0 0 160 160" fill="none">
                                <circle cx="74" cy="82" r="52" fill="#EEF4E7" />
                                <circle cx="74" cy="82" r="36" fill="#F8FAF3" />
                                <path d="M39 49v69M29 51v27c0 8 5 13 10 13s10-5 10-13V51M112 48c13 14 13 32 0 46v25" stroke="#88A96F" strokeWidth="7" strokeLinecap="round" />
                                <rect x="56" y="51" width="48" height="62" rx="9" fill="#FFFDF7" stroke="#D9E2CE" strokeWidth="3" />
                                <path d="M67 68h27M67 82h27M67 96h20" stroke="#D2DDC3" strokeWidth="5" strokeLinecap="round" />
                                <path d="M105 95c15-4 26-15 31-31 8 18 2 36-14 47-8 5-17 7-26 6 3-9 6-16 9-22Z" fill="#6DA466" />
                                <path d="M110 99c10-2 18-9 23-20" stroke="#4F8A52" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div className="diary-empty__content">
                            <h3>Пока здесь пусто</h3>
                            <p>Добавляйте блюда на страницах ресторанов или внесите их вручную.</p>
                            <p>Мы поможем отслеживать калории и баланс БЖУ каждый день.</p>
                        </div>
                    </div>
                )}

                {entries.map(entry => (
                    <div key={entry.id} className="diary-item">
                        <div className="diary-item-info">
                            <div className="diary-item-name">{entry.name}</div>
                            <div className="diary-item-meta">
                                {entry.calories} ккал • Б {Math.round(Number(entry.protein))} • Ж {Math.round(Number(entry.fat))} • У {Math.round(Number(entry.carbs))}
                                {entry.restaurant_slug && (
                                    <Link to={`/r/${entry.restaurant_slug}/menu`} className="badge-restaurant badge-restaurant-link">
                                        {entry.restaurant_name || entry.restaurant_slug}
                                    </Link>
                                )}
                            </div>
                        </div>
                        <button className="btn-icon-danger" onClick={() => handleDelete(entry.id)}>×</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
