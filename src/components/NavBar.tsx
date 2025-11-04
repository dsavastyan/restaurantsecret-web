import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";

export default function NavBar() {
  const token = useAuth((state) => state.accessToken);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const linkClassName = (path: string) =>
    isActive(path)
      ? "text-sm font-semibold"
      : "text-sm text-gray-600 hover:text-gray-900";

  return (
    <header className="w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-semibold tracking-tight">
          RestaurantSecret
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            to="/catalog"
            className={linkClassName("/catalog")}
            aria-current={isActive("/catalog") ? "page" : undefined}
          >
            Каталог
          </Link>
          <Link
            to="/search"
            className={linkClassName("/search")}
            aria-current={isActive("/search") ? "page" : undefined}
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
              className="inline-flex items-center rounded-full bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
            >
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
