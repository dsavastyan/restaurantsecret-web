import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";

import AccountButton from "./AccountButton";

export default function NavBar() {
  const token = useAuth((state) => state.accessToken);
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const isOnboardingPage = location.pathname.startsWith("/onboarding");

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__left">
          <Link to="/" className="navbar__home" aria-label="На главную">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 11.5L12 4l9 7.5v7a1.5 1.5 0 0 1-1.5 1.5H15v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5H4.5A1.5 1.5 0 0 1 3 18.5z"
                fill="currentColor"
              />
            </svg>
          </Link>
        </div>

        <Link to="/" className="navbar__brand navbar__brand--center">
          <img src="/assets/logo.png" alt="" className="navbar__logo" aria-hidden="true" />
          <span>RestaurantSecret</span>
        </Link>

        <div className="navbar__right">
          {token && !location.pathname.startsWith("/account") && !isOnboardingPage && (
            <AccountButton />
          )}
          {!token && !isLoginPage && (
            <Link
              to="/login"
              state={{ from: location.pathname + location.search }}
              className="btn btn--primary"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
