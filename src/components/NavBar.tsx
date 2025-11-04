import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";

export default function NavBar() {
  const token = useAuth((state) => state.accessToken);
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-semibold tracking-tight">
          RestaurantSecret
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            to="/catalog"
            className={`text-sm ${isActive("/catalog") ? "font-semibold" : "text-gray-600 hover:text-gray-900"}`}
          >
            Каталог
          </Link>
          <Link
            to="/search"
            className={`text-sm ${isActive("/search") ? "font-semibold" : "text-gray-600 hover:text-gray-900"}`}
          >
            Поиск
          </Link>

          {token ? (
            <Link
              to="/account"
              className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium hover:shadow-sm"
            >
              Личный кабинет
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center rounded-full bg-black text-white px-3 py-1.5 text-sm font-medium hover:bg-gray-900"
            >
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
