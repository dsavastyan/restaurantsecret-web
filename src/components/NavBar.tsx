import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";

export default function NavBar() {
  const token = useAuth((state) => state.accessToken);
  const location = useLocation();

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__brand-group">
          <Link to="/" className="navbar__home" aria-label="На главную">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 11.5L12 4l9 7.5v7a1.5 1.5 0 0 1-1.5 1.5H15v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5H4.5A1.5 1.5 0 0 1 3 18.5z"
                fill="currentColor"
              />
            </svg>
          </Link>
          <Link to="/" className="navbar__brand">
            RestaurantSecret
          </Link>
        </div>

        {token && !location.pathname.startsWith("/account") && (
          <Link to="/account" className="navbar__account" aria-label="Личный кабинет">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        )}
        {!token && (
          <Link
            to="/login"
            state={{ from: location.pathname + location.search }}
            className="btn btn--primary"
          >
            Войти
          </Link>
        )}
      </div>
    </header>
  );
}
