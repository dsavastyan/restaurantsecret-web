import React, { useEffect, useState } from "react";
import { analytics } from "../services/analytics";

export function ConsentBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const checkStatus = () => {
            const status = analytics.getConsentStatus();
            if (status === "unset") {
                setVisible(true);
            } else {
                setVisible(false);
            }
        };

        checkStatus();
        window.addEventListener("rs-consent-update", checkStatus);
        return () => window.removeEventListener("rs-consent-update", checkStatus);
    }, []);

    const handleAccept = () => {
        analytics.setConsent("granted");
    };

    const handleDecline = () => {
        analytics.setConsent("denied");
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[1000] p-4 animate-in slide-in-from-bottom">
            <div className="mx-auto max-w-4xl bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-200">
                    <p className="font-medium mb-1">Мы ценим вашу приватность</p>
                    <p className="text-gray-400">
                        Мы используем cookies для улучшения работы сайта и аналитики.{" "}
                        <a href="#" className="underline hover:text-white transition-colors">
                            Политика конфиденциальности
                        </a>
                    </p>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={handleDecline}
                        className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/5 bg-transparent border border-white/10"
                    >
                        Отклонить
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-100 transition-colors rounded-lg shadow-lg shadow-white/10"
                    >
                        Принять
                    </button>
                </div>
            </div>
        </div>
    );
}
