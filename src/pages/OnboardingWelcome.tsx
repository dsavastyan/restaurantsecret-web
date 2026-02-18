import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { fetchCurrentUser, saveOnboardingProfileName } from "@/lib/api";
import { isMoscowDaytime } from "@/lib/moscowDaytime";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDayTheme, setIsDayTheme] = useState(() => isMoscowDaytime());
  const [isOnboardingAllowed, setIsOnboardingAllowed] = useState<boolean | null>(null);

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
    let isCancelled = false;

    (async () => {
      try {
        const me = await fetchCurrentUser(accessToken);
        if (isCancelled) return;
        const firstName = me?.user?.first_name?.trim();
        if (firstName) {
          setName(firstName);
        }
        setIsOnboardingAllowed(me?.user?.onboarding_completed !== true);
      } catch (statusError) {
        console.error("Failed to load onboarding status", statusError);
        if (!isCancelled) setIsOnboardingAllowed(true);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [accessToken]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken) {
      setError("Сессия истекла. Войдите снова.");
      return;
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Введите имя");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await saveOnboardingProfileName(accessToken, normalizedName);
      analytics.track("onboarding_welcome_completed", {
        name_length: normalizedName.length,
      });

      navigate("/onboarding/profile/step-1", {
        replace: true,
        state: { next: nextPath },
      });
    } catch (saveError) {
      console.error("Failed to save onboarding name", saveError);
      setError("Не удалось сохранить имя. Попробуйте еще раз.");
      setIsSubmitting(false);
    }
  };

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isOnboardingAllowed === null) {
    return null;
  }

  if (!isOnboardingAllowed) {
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
        <section className="intro__panel" aria-labelledby="intro-title">
          <div className="intro__brand">
            <img src={logoIcon} alt="" className="intro__logo" aria-hidden="true" />
          </div>

          <h1 id="intro-title" className="intro__title">
            Добро пожаловать в RestSecret!
          </h1>

          <p className="intro__subtitle">
            <span className="intro__subtitle-mobile">Я помогу тебе</span>
            <span className="intro__subtitle-desktop">Я помогу тебе</span>
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
                disabled={isSubmitting}
                aria-invalid={Boolean(error)}
              />
              {error && <p className="intro__error">{error}</p>}
              <button className="intro__button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Сохраняем..." : "Продолжить"}
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
