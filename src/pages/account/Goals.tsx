import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useGoalsStore } from '@/store/goals';

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

    const showPlaceholder = !data || (!data.target_calories && !data.weight);
    const hintText = showPlaceholder
        ? 'Заполните параметры тела в Профиле, чтобы мы рассчитали вашу норму.'
        : 'Вы можете обновить параметры тела в Профиле, чтобы пересчитать вашу норму.';
    const buttonText = showPlaceholder ? 'Заполнить параметры' : 'Обновить параметры';

    const handleProfileClick = () => {
        navigate('/account');
        requestAnimationFrame(() => {
            location.hash = '#profile';
        });
    };

    return (
        <div className="account-section goals-hero">
            <div className="goals-hero__card">
                <h2 className="goals-hero__title">Мои цели</h2>
                <p className="goals-hero__subtitle">Суточная норма КБЖУ</p>

                <div className="goals-hero__illustration" aria-hidden="true">
                    <svg viewBox="0 0 260 220" role="presentation">
                        <defs>
                            <radialGradient id="plate" cx="50%" cy="40%" r="70%">
                                <stop offset="0%" stopColor="#ffffff" />
                                <stop offset="100%" stopColor="#e2e8f0" />
                            </radialGradient>
                            <linearGradient id="green" x1="0" x2="1">
                                <stop offset="0%" stopColor="#bfe7c2" />
                                <stop offset="100%" stopColor="#86c99b" />
                            </linearGradient>
                            <linearGradient id="mint" x1="0" x2="1">
                                <stop offset="0%" stopColor="#b7e0e0" />
                                <stop offset="100%" stopColor="#82c7c5" />
                            </linearGradient>
                            <linearGradient id="yellow" x1="0" x2="1">
                                <stop offset="0%" stopColor="#ffe6a8" />
                                <stop offset="100%" stopColor="#f2c86d" />
                            </linearGradient>
                            <linearGradient id="orange" x1="0" x2="1">
                                <stop offset="0%" stopColor="#ffd18b" />
                                <stop offset="100%" stopColor="#e7a94d" />
                            </linearGradient>
                        </defs>
                        <ellipse cx="130" cy="120" rx="110" ry="85" fill="url(#plate)" />
                        <ellipse cx="130" cy="120" rx="95" ry="72" fill="#f8fafc" stroke="#d7dee5" strokeWidth="3" />
                        <g transform="translate(130 120)">
                            <path d="M0 0 L0 -64 A64 64 0 0 1 58 -28 Z" fill="url(#green)" />
                            <path d="M0 0 L58 -28 A64 64 0 0 1 38 52 Z" fill="url(#yellow)" />
                            <path d="M0 0 L38 52 A64 64 0 0 1 -42 48 Z" fill="url(#orange)" />
                            <path d="M0 0 L-42 48 A64 64 0 0 1 -60 -24 Z" fill="url(#mint)" />
                            <path d="M0 0 L-60 -24 A64 64 0 0 1 0 -64 Z" fill="url(#green)" opacity="0.75" />
                        </g>
                        <circle cx="130" cy="120" r="32" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3" />
                        <text x="130" y="124" textAnchor="middle" fontSize="18" fontWeight="700" fill="#475569">Ккал</text>
                        <text x="103" y="92" textAnchor="middle" fontSize="18" fontWeight="700" fill="#4b5563">Б</text>
                        <text x="158" y="92" textAnchor="middle" fontSize="18" fontWeight="700" fill="#4b5563">Ж</text>
                        <text x="158" y="158" textAnchor="middle" fontSize="18" fontWeight="700" fill="#4b5563">У</text>
                    </svg>
                </div>

                <p className="goals-hero__hint">{hintText}</p>
                <button className="goals-hero__button" type="button" onClick={handleProfileClick}>
                    {buttonText}
                </button>
            </div>
        </div>
    );
}
