import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useGoalsStore } from '@/store/goals';

import goalMenuImg from '@/assets/icons/goal-menu.png';

export default function Goals() {
    const navigate = useNavigate();
    const token = useAuth(s => s.accessToken);
    const { data, isLoading, fetch } = useGoalsStore(s => ({
        data: s.data,
        isLoading: s.isLoading,
        fetch: s.fetch
    }));

    useEffect(() => {
        if (token) {
            fetch(token);
        }
    }, [token, fetch]);

    if (isLoading && !data) return <div className="goals-loading">Загрузка...</div>;

    const hasGoals = data && data.target_calories && data.target_calories > 0;

    const hintText = 'Заполните Ваши параметры в Профиле, для расчета вашей нормы';
    const buttonText = 'Заполнить параметры';

    const handleProfileClick = () => {
        navigate('/account');
    };

    return (
        <div className="account-section goals-hero">
            <div className="goals-hero__card">
                <h2 className="goals-hero__title">Мои цели</h2>
                <p className="goals-hero__subtitle">Суточная норма КБЖУ</p>

                <div className="goals-hero__illustration" aria-hidden="true">
                    <img
                        src={goalMenuImg}
                        alt="Target Goals"
                        style={{ maxWidth: '220px', height: 'auto', display: 'block', margin: '0 auto' }}
                    />
                </div>

                <div className="goals-hero__stats" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '24px', textAlign: 'center' }}>
                    <div className="goals-stat">
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#475569' }}>
                            {hasGoals ? Math.round(data.target_calories) : '-'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Ккал</div>
                    </div>
                    <div className="goals-stat">
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4b5563' }}>
                            {hasGoals ? Math.round(data.target_protein) : '-'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Белки</div>
                    </div>
                    <div className="goals-stat">
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4b5563' }}>
                            {hasGoals ? Math.round(data.target_fat) : '-'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Жиры</div>
                    </div>
                    <div className="goals-stat">
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4b5563' }}>
                            {hasGoals ? Math.round(data.target_carbs) : '-'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Углев.</div>
                    </div>
                </div>

                <p className="goals-hero__hint">{hintText}</p>
                <button className="goals-hero__button" type="button" onClick={handleProfileClick}>
                    {buttonText}
                </button>
            </div>
        </div>
    );
}
