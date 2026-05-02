import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { completeOnboarding, fetchCurrentUser, saveOnboardingProfileName } from "@/lib/api";
import { resetImmersiveViewport, useImmersiveViewport } from "@/hooks/useImmersiveViewport";
import { useAuth } from "@/store/auth";
import { analytics } from "@/services/analytics";
import dayThemeBackground from "@/assets/intro screens/day_theme.png";
import logoIcon from "@/assets/intro screens/RestSecret logo.png";

type IntroLocationState = {
  next?: unknown;
  from?: unknown;
  profileName?: unknown;
};

function toInternalPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") ? value : null;
}

export default function OnboardingWelcomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuth((state) => state.accessToken);
  const previewParam = new URLSearchParams(location.search).get("preview");
  const isDevPreview =
    import.meta.env.DEV && typeof previewParam === "string" && previewParam.startsWith("1");
  const shouldAutoFocus = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches,
    []
  );

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isOnboardingAllowed, setIsOnboardingAllowed] = useState<boolean | null>(
    isDevPreview ? true : null
  );

  useImmersiveViewport(location.key);

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
    if (isDevPreview) {
      setIsOnboardingAllowed(true);
      return;
    }
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
  }, [accessToken, isDevPreview]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();

    if (isDevPreview) {
      if (!normalizedName) {
        setError("Введите имя");
        return;
      }
      window.sessionStorage.setItem("rs_onboarding_preview_name", normalizedName);
      resetImmersiveViewport({ blurActiveElement: true });
      navigate("/onboarding/profile/step-1?preview=1", {
        replace: true,
        state: { next: nextPath, profileName: normalizedName },
      });
      return;
    }

    if (!accessToken) {
      setError("Сессия истекла. Войдите снова.");
      return;
    }

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

      resetImmersiveViewport({ blurActiveElement: true });
      navigate("/onboarding/profile/step-1", {
        replace: true,
        state: { next: nextPath, profileName: normalizedName },
      });
    } catch (saveError) {
      console.error("Failed to save onboarding name", saveError);
      setError("Не удалось сохранить имя. Попробуйте еще раз.");
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isDevPreview) {
      resetImmersiveViewport({ blurActiveElement: true });
      navigate(nextPath, { replace: true });
      return;
    }

    if (!accessToken || isSubmitting || isSkipping) return;

    setIsSkipping(true);
    setError(null);

    try {
      await completeOnboarding(accessToken);
      analytics.track("onboarding_skipped", { step: "welcome" });
      resetImmersiveViewport({ blurActiveElement: true });
      navigate(nextPath, { replace: true });
    } catch (skipError) {
      console.error("Failed to skip onboarding welcome", skipError);
      setError("Не удалось пропустить онбординг. Попробуйте еще раз.");
      setIsSkipping(false);
    }
  };

  if (!accessToken && !isDevPreview) {
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
      className="intro intro--day"
      style={
        {
          "--intro-bg-mobile": `url(${dayThemeBackground})`,
          "--intro-bg-desktop": `url(${dayThemeBackground})`,
        } as CSSProperties
      }
    >
      <div className="intro__stage">
        <section className="intro__panel" aria-labelledby="intro-title">
          <ol className="intro__progress" aria-label="Прогресс онбординга">
            <li className="intro__progress-step intro__progress-step--active">
              <span>1</span>
            </li>
            <li className="intro__progress-line intro__progress-line--active" aria-hidden="true" />
            <li className="intro__progress-step">
              <span>2</span>
            </li>
            <li className="intro__progress-line" aria-hidden="true" />
            <li className="intro__progress-step">
              <span>3</span>
            </li>
          </ol>

          <div className="intro__brand">
            <img src={logoIcon} alt="" className="intro__logo" aria-hidden="true" />
          </div>

          <h1 id="intro-title" className="intro__title">
            <span>Добро пожаловать</span>
            <span>
              в <em>RestSecret</em>!
            </span>
          </h1>

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

          <div className="intro__form-panel">
            <form className="intro__form" onSubmit={handleSubmit}>
              <label className="intro__field" aria-label="Как к тебе обращаться?">
                <svg className="intro__field-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
                <input
                  className="intro__input"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Как к тебе обращаться?"
                  autoComplete="given-name"
                  autoFocus={shouldAutoFocus}
                  disabled={isSubmitting || isSkipping}
                  aria-invalid={Boolean(error)}
                />
              </label>
              {error && <p className="intro__error">{error}</p>}
              <button className="intro__button" type="submit" disabled={isSubmitting || isSkipping}>
                <span>{isSubmitting ? "Сохраняем..." : "Продолжить"}</span>
                <svg className="intro__button-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 12h14m-6-6 6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </button>
            </form>
          </div>

          <div className="intro__divider" aria-hidden="true">
            <span />
            <b>или</b>
            <span />
          </div>

          <button
            className="intro__skip"
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting || isSkipping}
          >
            <span className="intro__skip-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M9 7.8v8.4L16 12 9 7.8Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
            <span>{isSkipping ? "Пропускаем..." : "Пропустить сейчас"}</span>
          </button>
        </section>
      </div>
    </div>
  );
}
