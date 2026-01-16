import React, { useEffect, useState } from "react";
import { analytics } from "../services/analytics";

export function CookieSettingsModal({ isOpen, onClose }) {
    const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const status = analytics.getConsentStatus();
            setIsAnalyticsEnabled(status === "granted");
        }
    }, [isOpen]);

    const handleToggle = (e) => {
        const newVal = e.target.checked;
        setIsAnalyticsEnabled(newVal);
        analytics.setConsent(newVal ? "granted" : "denied");
    };

    if (!isOpen) return null;

    return (
        <div className="rs-modal-overlay" onClick={onClose}>
            <div
                className="rs-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="rs-modal__header">
                    <h2 className="rs-modal__title">Настройки Cookies</h2>
                    <button
                        onClick={onClose}
                        className="rs-modal__close"
                    >
                        ✕
                    </button>
                </div>

                <div className="rs-modal__body">
                    {/* Essential */}
                    <div className="rs-modal__item">
                        <div className="rs-modal__item-info">
                            <h3 className="rs-modal__item-label">Необходимые</h3>
                            <p className="rs-modal__item-desc">
                                Эти файлы cookie нужны для работы сайта (авторизация, навигация). Их нельзя отключить.
                            </p>
                        </div>
                        <label className="rs-toggle">
                            <input type="checkbox" checked disabled />
                            <span className="rs-toggle__slider"></span>
                        </label>
                    </div>

                    {/* Analytics */}
                    <div className="rs-modal__item">
                        <div className="rs-modal__item-info">
                            <h3 className="rs-modal__item-label">Аналитика</h3>
                            <p className="rs-modal__item-desc">
                                Помогают нам понимать, как вы используете сайт, чтобы улучшать его. Мы собираем только анонимные данные.
                            </p>
                        </div>
                        <label className="rs-toggle">
                            <input
                                type="checkbox"
                                checked={isAnalyticsEnabled}
                                onChange={handleToggle}
                            />
                            <span className="rs-toggle__slider"></span>
                        </label>
                    </div>
                </div>

                <div className="rs-modal__footer">
                    <button
                        onClick={onClose}
                        className="btn btn--primary"
                        style={{ width: "100%" }}
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}
