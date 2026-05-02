import { Link, useLocation } from "react-router-dom";

import { analytics } from "@/services/analytics";
import { useAuth } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";

import AccountButton from "./AccountButton";
import HomeIcon from "./HomeIcon";

export default function NavBar({ forceGuest = false }: { forceGuest?: boolean }) {
  const token = useAuth((state) => state.accessToken);
  const { showAccountAction, isSubscriptionStatusLoaded } = useSubscriptionStore((state) => ({
    showAccountAction: state.hasActiveSub || state.hasSubscriptionHistory,
    isSubscriptionStatusLoaded: state.isStatusLoaded,
  }));
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const isOnboardingPage = location.pathname.startsWith("/onboarding");
  const currentPath = location.pathname + location.search;

  if (forceGuest || !token) {
    return (
      <header className="navbar navbar--guest">
        <div className="navbar__inner navbar__inner--guest">
          <Link to="/" className="navbar__brand navbar__brand--guest" aria-label="RestaurantSecret">
            <HomeIcon />
            <span>RestaurantSecret</span>
          </Link>

          <nav className="navbar__center" aria-label="Разделы">
            <Link to="/restaurants">Рестораны</Link>
            <Link to="/how-it-works">Как работает</Link>
            <Link to="/tariffs">Тарифы</Link>
            <a href="https://t.me/RestSecretSupport_bot" target="_blank" rel="noopener noreferrer">Поддержка</a>
          </nav>

          <div className="navbar__right">
            {!isLoginPage && (
              <div className="navbar__guest-actions">
                <Link
                  to="/login"
                  state={{ from: currentPath }}
                  className="navbar__login-link"
                >
                  Войти
                </Link>
                <Link
                  to="/onboarding/welcome"
                  className="navbar__trial-link"
                  onClick={() => analytics.track("cta_clicked", { location: "nav", text: "Попробовать бесплатно" })}
                >
                  Попробовать бесплатно
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__left">
          <Link to="/" className="navbar__home" aria-label="На главную">
            <HomeIcon />
          </Link>
        </div>

        <Link to="/" className="navbar__brand navbar__brand--center">
          <span>RestaurantSecret</span>
        </Link>

        <div className="navbar__right">
          {token && showAccountAction && !location.pathname.startsWith("/account") && !isOnboardingPage && (
            <AccountButton />
          )}
          {token && isSubscriptionStatusLoaded && !showAccountAction && !isOnboardingPage && (
            <Link
              to="/onboarding/welcome"
              className="navbar__trial-link"
              onClick={() => analytics.track("cta_clicked", { location: "nav", text: "Попробовать бесплатно" })}
            >
              Попробовать бесплатно
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
