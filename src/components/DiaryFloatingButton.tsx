import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useDiaryStore } from '@/store/diary';

export default function DiaryFloatingButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuth((state) => state.accessToken);
  const todayEntriesCount = useDiaryStore((s) => s.todayEntriesCount);
  const isTodayEntriesLoading = useDiaryStore((s) => s.isTodayEntriesLoading);
  const fetchTodayEntriesCount = useDiaryStore((s) => s.fetchTodayEntriesCount);

  useEffect(() => {
    if (!accessToken) return;
    fetchTodayEntriesCount(accessToken);
  }, [accessToken, fetchTodayEntriesCount]);

  if (
    !accessToken ||
    isTodayEntriesLoading ||
    todayEntriesCount <= 0 ||
    location.pathname.startsWith('/account/statistics')
  ) {
    return null;
  }

  return (
    <button
      type="button"
      className="diary-floating-btn"
      onClick={() => navigate('/account/statistics')}
      aria-label={`Открыть дневник питания, добавлено сегодня: ${todayEntriesCount}`}
      title="Открыть дневник питания"
    >
      <span className="diary-floating-btn__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3h8a2 2 0 0 1 2 2v16l-6-3-6 3V5a2 2 0 0 1 2-2z" />
        </svg>
      </span>
      <span className="diary-floating-btn__count" aria-hidden="true">{todayEntriesCount}</span>
    </button>
  );
}
