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
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Настройки Cookies</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Essential */}
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h3 className="text-white font-medium mb-1">Необходимые</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Эти файлы cookie нужны для работы сайта (авторизация, навигация). Их нельзя отключить.
                            </p>
                        </div>
                        <div className="relative inline-flex items-center shrink-0">
                            <input type="checkbox" checked disabled className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-600/50 rounded-full peer-checked:bg-emerald-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </div>
                    </div>

                    {/* Analytics */}
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h3 className="text-white font-medium mb-1">Аналитика</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Помогают нам понимать, как вы используете сайт, чтобы улучшать его. Мы собираем только анонимные данные.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isAnalyticsEnabled}
                                onChange={handleToggle}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>

                <div className="p-5 border-t border-white/10 bg-white/5">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-white text-black font-medium rounded-xl hover:bg-gray-100 transition-colors shadow-lg shadow-black/20"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}
