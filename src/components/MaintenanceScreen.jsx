import React from 'react';

/**
 * High-quality maintenance screen that matches the RestaurantSecret brand.
 * Blocks all interaction when the site is undergoing technical maintenance.
 */
export default function MaintenanceScreen({ cfg }) {
    const fromDate = cfg.from ? new Date(cfg.from).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    }) : null;

    const toDate = cfg.to ? new Date(cfg.to).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    }) : null;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            background: 'radial-gradient(circle at 18% 20%, rgba(47, 143, 91, 0.08), transparent 32%), radial-gradient(circle at 82% 0%, rgba(242, 95, 58, 0.12), transparent 38%), linear-gradient(135deg, #f8fafc, #ffffff)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: 'var(--rs-text, #111827)'
        }}>
            <div style={{
                maxWidth: '560px',
                padding: '40px',
                background: '#fff',
                borderRadius: 'var(--rs-radius, 24px)',
                boxShadow: 'var(--rs-shadow, 0 12px 34px rgba(17, 24, 39, 0.08))',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, var(--rs-accent, #2f8f5b), var(--rs-primary, #f25f3a))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px'
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                    </svg>
                </div>

                <h1 style={{
                    margin: 0,
                    fontSize: '32px',
                    fontWeight: '800',
                    letterSpacing: '-0.02em',
                    lineHeight: '1.1'
                }}>
                    {cfg.title || 'Технические работы'}
                </h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    {(fromDate || toDate) && (
                        <div style={{
                            padding: '8px 16px',
                            borderRadius: '999px',
                            background: 'rgba(47, 143, 91, 0.08)',
                            color: '#14532d',
                            fontSize: '14px',
                            fontWeight: '600',
                            border: '1px solid rgba(47, 143, 91, 0.15)'
                        }}>
                            {fromDate && <>с <b>{fromDate}</b></>}
                            {toDate && <> по <b>{toDate}</b></>}
                        </div>
                    )}

                    <p style={{
                        margin: '8px 0 0',
                        fontSize: '16px',
                        lineHeight: '1.5',
                        color: 'var(--rs-muted, #6b7280)',
                        maxWidth: '420px'
                    }}>
                        {cfg.message || 'Мы скоро вернемся. Пожалуйста, обновите страницу через некоторое время.'}
                    </p>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="btn btn--primary"
                    style={{
                        marginTop: '12px',
                        minWidth: '160px',
                        padding: '14px 24px',
                        fontSize: '15px'
                    }}
                >
                    Обновить страницу
                </button>
            </div>

            <div style={{
                marginTop: '24px',
                fontSize: '13px',
                color: 'var(--rs-muted, #6b7280)',
                opacity: 0.8
            }}>
                © {new Date().getFullYear()} RestaurantSecret
            </div>
        </div>
    );
}
