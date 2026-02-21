import { create } from 'zustand';
import { apiGet, apiDelete, apiPost } from '@/lib/api';
import { toast } from '@/lib/toast';

const getTodayIso = () => new Date().toISOString().split('T')[0];

export type DiaryEntry = {
    id: string;
    date: string;
    dish_id?: number | null;
    restaurant_slug?: string | null;
    restaurant_name?: string | null;
    name: string;
    calories: number;
    protein: string | number;
    fat: string | number;
    carbs: string | number;
    weight?: string | number | null;
    created_at: string;
};

export type DayStats = {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
};

type DiaryState = {
    selectedDate: string; // YYYY-MM-DD
    entries: DiaryEntry[];
    dayStats: DayStats;
    todayEntriesCount: number;
    isTodayEntriesLoading: boolean;
    isLoading: boolean;

    setDate: (date: string) => void;
    fetchDay: (token: string, date?: string) => Promise<void>;
    fetchTodayEntriesCount: (token: string) => Promise<void>;
    addEntry: (token: string, entry: Partial<DiaryEntry>) => Promise<void>;
    removeEntry: (token: string, id: string) => Promise<void>;
};

export const useDiaryStore = create<DiaryState>((set, get) => ({
    selectedDate: getTodayIso(),
    entries: [],
    dayStats: { calories: 0, protein: 0, fat: 0, carbs: 0 },
    todayEntriesCount: 0,
    isTodayEntriesLoading: false,
    isLoading: false,

    setDate: (date) => set({ selectedDate: date }),

    fetchDay: async (token, date) => {
        const targetDate = date || get().selectedDate;
        set({ isLoading: true });
        try {
            const res = await apiGet<{ ok: boolean, entries: DiaryEntry[], totals: DayStats }>(
                `/api/diary?date=${targetDate}`,
                token
            );
            if (res?.ok) {
                set({ entries: res.entries, dayStats: res.totals, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (e) {
            console.error(e);
            set({ isLoading: false });
        }
    },

    fetchTodayEntriesCount: async (token) => {
        const today = getTodayIso();
        set({ isTodayEntriesLoading: true });
        try {
            const res = await apiGet<{ ok: boolean, entries: DiaryEntry[] }>(
                `/api/diary?date=${today}`,
                token
            );
            if (res?.ok) {
                set({ todayEntriesCount: res.entries.length, isTodayEntriesLoading: false });
            } else {
                set({ isTodayEntriesLoading: false });
            }
        } catch (e) {
            console.error(e);
            set({ isTodayEntriesLoading: false });
        }
    },

    addEntry: async (token, entry) => {
        const currentDate = get().selectedDate;
        const isTodayEntry = currentDate === getTodayIso();
        try {
            const res = await apiPost<{ ok: boolean, entry?: any }>(
                '/api/diary',
                { ...entry, date: currentDate },
                token
            );

            if (res?.ok) {
                toast.success('Блюдо добавлено в дневник');
                if (isTodayEntry) {
                    set((state) => ({ todayEntriesCount: state.todayEntriesCount + 1 }));
                }
                // Refresh data
                await get().fetchDay(token, currentDate);
            } else {
                toast.error('Ошибка добавления');
            }
        } catch (e) {
            console.error(e);
            toast.error('Ошибка соединения');
        }
    },

    removeEntry: async (token, id) => {
        try {
            const res = await apiDelete(`/api/diary/${id}`, token);
            if (res?.ok) {
                toast.success('Блюдо удалено');
                if (get().selectedDate === getTodayIso()) {
                    set((state) => ({ todayEntriesCount: Math.max(0, state.todayEntriesCount - 1) }));
                }
                await get().fetchDay(token);
            } else {
                toast.error('Не удалось удалить');
            }
        } catch (e) {
            console.error(e);
            toast.error('Ошибка удаления');
        }
    }
}));
