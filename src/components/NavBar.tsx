import { Link } from "react-router-dom";
import { useAuth } from "@/store/auth";

export default function NavBar() {
  const token = useAuth((state) => state.accessToken);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          RestaurantSecret
        </Link>

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
