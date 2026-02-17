import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { isMoscowDaytime } from "@/lib/moscowDaytime";
import {
  clearOnboardingPendingForToken,
  getProfileNameForToken,
  isOnboardingPendingForToken,
  saveProfileNameForToken,
} from "@/lib/onboarding";
import { useAuth } from "@/store/auth";
import { analytics } from "@/services/analytics";
import dayThemeBackground from "@/assets/intro screens/day_theme.png";
import nightThemeBackground from "@/assets/intro screens/night_theme.png";
import logoIcon from "@/assets/intro screens/RestSecret logo.png";

type IntroLocationState = {
  next?: unknown;
  from?: unknown;
};

function toInternalPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") ? value : null;
}

export default function OnboardingWelcomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuth((state) => state.accessToken);

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDayTheme, setIsDayTheme] = useState(() => isMoscowDaytime());

  const isPending = isOnboardingPendingForToken(accessToken);

  const nextPath = useMemo(() => {
    const state = (location.state || {}) as IntroLocationState;
    const fromNext = toInternalPath(state.next);
    const fromState = toInternalPath(state.from);
    const resolved = fromNext || fromState;

    if (!resolved || resolved.startsWith("/onboarding")) {
      return "/account";
    }

    return resolved;
  }, [location.state]);

  useEffect(() => {
    const updateTheme = () => setIsDayTheme(isMoscowDaytime());
    updateTheme();
    const id = window.setInterval(updateTheme, 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const storedName = getProfileNameForToken(accessToken);
    if (storedName) {
      setName(storedName);
    }
  }, [accessToken]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Введите имя");
      return;
    }

    saveProfileNameForToken(accessToken, normalizedName);
    clearOnboardingPendingForToken(accessToken);
    analytics.track("onboarding_welcome_completed", {
      name_length: normalizedName.length,
    });

    navigate(nextPath, { replace: true });
  };

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isPending) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div
      className={`intro ${isDayTheme ? "intro--day" : "intro--night"}`}
      style={
        {
          "--intro-bg-mobile": `url(${isDayTheme ? dayThemeBackground : nightThemeBackground})`,
          "--intro-bg-desktop": `url(${isDayTheme ? dayThemeBackground : nightThemeBackground})`,
        } as CSSProperties
      }
    >
      <div className="intro__stage">
        <button
          type="button"
          className="intro__home"
          onClick={() => navigate("/")}
          aria-label="На главный экран"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 11.75 12 4l9 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.75 10.5v9.25h10.5V10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <section className="intro__panel" aria-labelledby="intro-title">
          <div className="intro__brand">
            <img src={logoIcon} alt="" className="intro__logo" aria-hidden="true" />
            <div className="intro__brand-badge">
              <span className="intro__brand-name">RestaurantSecret</span>
            </div>
          </div>

          <h1 id="intro-title" className="intro__title">
            Добро пожаловать в RestSecret!
          </h1>

          <p className="intro__subtitle">
            <span className="intro__subtitle-mobile">Я помогу тебе:</span>
            <span className="intro__subtitle-desktop">
              Чтобы я был тебе более полезен,
              <br />
              расскажи о себе
            </span>
          </p>

          <ul className="intro__benefits" aria-label="Преимущества сервиса">
            <li>
              <span className="intro__check" aria-hidden="true">✓</span>
              <span className="intro__benefit-text">Легко находить рестораны и блюда по фильтрам</span>
            </li>
            <li>
              <span className="intro__check" aria-hidden="true">✓</span>
              <span className="intro__benefit-text">Выбирать блюда, подходящие по составу и КБЖУ*</span>
            </li>
          </ul>

          <p className="intro__motto">Есть вкусно, выбирать осознанно</p>

          <div className="intro__form-panel">
            <form className="intro__form" onSubmit={handleSubmit}>
              <h2 className="intro__question">Как я могу к тебе обращаться?</h2>
              <input
                className="intro__input"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ваше имя"
                autoComplete="given-name"
                autoFocus
                aria-invalid={Boolean(error)}
              />
              {error && <p className="intro__error">{error}</p>}
              <button className="intro__button" type="submit">
                Продолжить
              </button>
            </form>
          </div>

          <p className="intro__footnote">
            * Размещение в Сервисе сведений носит справочно-информационный характер и не является
            медицинской консультацией. Любые решения, связанные с изменением рациона, ограничением
            питания или контролем калорийности, должны приниматься после консультации
            квалифицированного специалиста.
          </p>

          <p className="intro__legal">
            <a href="/legal" target="_blank" rel="noopener noreferrer">
              Пользовательское соглашение
            </a>
            <span aria-hidden="true">•</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Политика конфиденциальности
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
