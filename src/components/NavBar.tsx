import { Link } from "react-router-dom";
import { useAuth } from "@/store/auth";

export default function NavBar() {
  const token = useAuth((state) => state.accessToken);

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

        {token ? (
          <Link to="/account" className="btn btn--primary">
            Личный кабинет
          </Link>
        ) : (
          <Link to="/login" className="btn btn--primary">
            Войти
          </Link>
        )}
      </div>
    </header>
  );
}
