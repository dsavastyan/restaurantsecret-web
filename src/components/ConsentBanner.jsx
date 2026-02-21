import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { analytics } from "../services/analytics";

export function ConsentBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let showTimer = null;

        const checkStatus = () => {
            const status = analytics.getConsentStatus();
            if (status === "unset") {
                if (showTimer) clearTimeout(showTimer);
                showTimer = setTimeout(() => {
                    setVisible(true);
                }, 5000);
            } else {
                if (showTimer) {
                    clearTimeout(showTimer);
                    showTimer = null;
                }
                setVisible(false);
            }
        };

        checkStatus();
        window.addEventListener("rs-consent-update", checkStatus);
        return () => {
            if (showTimer) clearTimeout(showTimer);
            window.removeEventListener("rs-consent-update", checkStatus);
        };
    }, []);

    const handleAccept = () => {
        analytics.setConsent("granted");
    };

    const handleDecline = () => {
        analytics.setConsent("denied");
    };

    if (!visible) return null;

    return (
        <div className="rs-banner">
            <div className="rs-banner__inner">
                <div className="rs-banner__content">
                    <strong className="rs-banner__title">Мы ценим вашу приватность</strong>
                    <p className="rs-banner__text">
                        Мы используем cookies для улучшения работы сайта и аналитики.{" "}
                        <Link to="/privacy" className="underline hover:text-white transition-colors">
                            Политика конфиденциальности
                        </Link>
                    </p>
                </div>
                <div className="rs-banner__actions">
                    <button
                        onClick={handleDecline}
                        className="btn btn--ghost"
                    >
                        Отклонить
                    </button>
                    <button
                        onClick={handleAccept}
                        className="btn btn--primary"
                    >
                        Принять
                    </button>
                </div>
            </div>
        </div>
    );
}
