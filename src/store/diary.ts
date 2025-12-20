import { create } from 'zustand';
import { apiGet, apiDelete, doFetch } from '@/lib/api';
import { toast } from '@/lib/toast';

export type DiaryEntry = {
    id: string;
    date: string;
    dish_id?: number | null;
    restaurant_slug?: string | null;
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
    isLoading: boolean;

    setDate: (date: string) => void;
    fetchDay: (token: string, date?: string) => Promise<void>;
    addEntry: (token: string, entry: Partial<DiaryEntry>) => Promise<void>;
    removeEntry: (token: string, id: string) => Promise<void>;
};

export const useDiaryStore = create<DiaryState>((set, get) => ({
    selectedDate: new Date().toISOString().split('T')[0],
    entries: [],
    dayStats: { calories: 0, protein: 0, fat: 0, carbs: 0 },
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

    addEntry: async (token, entry) => {
        const currentDate = get().selectedDate;
        try {
            const res = await doFetch('/api/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...entry, date: currentDate })
            }, token);

            if (res.ok) {
                const data = await res.json();
                if (data.ok) {
                    toast.success('Блюдо добавлено в дневник');
                    // Refresh data
                    get().fetchDay(token, currentDate);
                } else {
                    toast.error('Ошибка добавления');
                }
            } else {
                toast.error('Не удалось добавить блюдо');
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
                get().fetchDay(token);
            } else {
                toast.error('Не удалось удалить');
            }
        } catch (e) {
            console.error(e);
            toast.error('Ошибка удаления');
        }
    }
}));
