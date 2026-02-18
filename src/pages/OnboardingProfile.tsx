import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import logoIcon from "@/assets/intro screens/RestSecret logo.png";
import { completeOnboarding, fetchCurrentUser } from "@/lib/api";
import {
  getProfileNameForToken,
} from "@/lib/onboarding";
import { analytics } from "@/services/analytics";
import { useAuth } from "@/store/auth";
import { useGoalsStore } from "@/store/goals";

type IntroLocationState = {
  next?: unknown;
  from?: unknown;
};

type StepKey = "step-1" | "step-2";

type OnboardingFormState = {
  gender: "male" | "female" | "";
  age: string;
  goal: "lose" | "maintain" | "gain" | "";
  height: string;
  weight: string;
  activity: "min" | "light" | "avg" | "high" | "";
};

function toInternalPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") ? value : null;
}

function parseNumberOrNull(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function OnboardingProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { step: rawStep } = useParams();
  const accessToken = useAuth((state) => state.accessToken);

  const { data: goals, fetch, updateStats } = useGoalsStore((state) => ({
    data: state.data,
    fetch: state.fetch,
    updateStats: state.updateStats,
  }));

  const step = rawStep === "step-2" ? "step-2" : "step-1";
  const [isOnboardingAllowed, setIsOnboardingAllowed] = useState<boolean | null>(null);
  const [profileName, setProfileName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<OnboardingFormState>({
    gender: "",
    age: "",
    goal: "",
    height: "",
    weight: "",
    activity: "",
  });

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
    if (!accessToken) return;
    fetch(accessToken);
  }, [accessToken, fetch]);

  useEffect(() => {
    if (!accessToken) return;
    let isCancelled = false;

    (async () => {
      try {
        const me = await fetchCurrentUser(accessToken);
        if (isCancelled) return;
        const backendName = me?.user?.first_name?.trim();
        setProfileName(backendName || getProfileNameForToken(accessToken));
        setIsOnboardingAllowed(me?.user?.onboarding_completed !== true);
      } catch (statusError) {
        console.error("Failed to load onboarding status", statusError);
        if (!isCancelled) {
          setProfileName(getProfileNameForToken(accessToken));
          setIsOnboardingAllowed(true);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!goals) return;
    setForm({
      gender: goals.gender || "",
      age: goals.age?.toString() || "",
      goal: goals.goal_type || "",
      height: goals.height?.toString() || "",
      weight: goals.weight?.toString() || "",
      activity: goals.activity_level || "",
    });
  }, [goals]);

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (rawStep !== "step-1" && rawStep !== "step-2") {
    return <Navigate to="/onboarding/profile/step-1" replace state={{ next: nextPath }} />;
  }

  if (isOnboardingAllowed === null) {
    return null;
  }

  if (!isOnboardingAllowed) {
    return <Navigate to="/account" replace />;
  }

  const setField = (field: keyof OnboardingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value } as OnboardingFormState));
    if (error) setError(null);
  };

  const saveStep = async (currentStep: StepKey) => {
    if (!accessToken) return;

    const payload =
      currentStep === "step-1"
        ? {
            gender: form.gender || null,
            age: parseNumberOrNull(form.age),
            goal_type: form.goal || null,
          }
        : {
            height: parseNumberOrNull(form.height),
            weight: parseNumberOrNull(form.weight),
            activity_level: form.activity || null,
          };

    await updateStats(accessToken, payload);
  };

  const handleContinue = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await saveStep(step);

      if (step === "step-1") {
        analytics.track("onboarding_profile_step_completed", { step: 1 });
        navigate("/onboarding/profile/step-2", {
          replace: true,
          state: { next: nextPath },
        });
        return;
      }

      await completeOnboarding(accessToken);
      analytics.track("onboarding_profile_step_completed", { step: 2 });
      analytics.track("onboarding_completed", { source: "signup" });
      navigate(nextPath, { replace: true });
    } catch (saveError) {
      console.error("Failed to save onboarding profile step", saveError);
      setError("Не удалось сохранить данные. Попробуйте еще раз.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    setIsSaving(true);
    setError(null);
    (async () => {
      try {
        if (accessToken) {
          await completeOnboarding(accessToken);
        }
        analytics.track("onboarding_skipped", { step: step === "step-1" ? 1 : 2 });
        navigate(nextPath, { replace: true });
      } catch (skipError) {
        console.error("Failed to skip onboarding", skipError);
        setError("Не удалось завершить онбординг. Попробуйте еще раз.");
        setIsSaving(false);
      }
    })();
  };

  const handleBack = () => {
    if (step === "step-1") {
      navigate("/onboarding/welcome", { replace: true, state: { next: nextPath } });
      return;
    }

    navigate("/onboarding/profile/step-1", { replace: true, state: { next: nextPath } });
  };

  return (
    <section className="onboarding-flow" aria-labelledby="onboarding-profile-title">
      <div className="onboarding-flow__inner">
        <button
          type="button"
          className="onboarding-flow__back"
          onClick={handleBack}
          aria-label="Назад"
        >
          Назад
        </button>

        <img src={logoIcon} alt="" className="onboarding-flow__logo" aria-hidden="true" />

        <h1 id="onboarding-profile-title" className="onboarding-flow__title">
          Приятно познакомиться{profileName ? `, ${profileName}` : ""}
        </h1>

        <p className="onboarding-flow__subtitle">Чтобы я был тебе более полезен, расскажи о себе</p>

        <form className="onboarding-flow__form" onSubmit={(event) => event.preventDefault()}>
          {step === "step-1" ? (
            <>
              <div className="form-group full">
                <label htmlFor="onboarding-gender">Пол</label>
                <select
                  id="onboarding-gender"
                  value={form.gender}
                  onChange={(event) => setField("gender", event.target.value)}
                >
                  <option value="">Не указывать</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>

              <div className="form-group full">
                <label htmlFor="onboarding-age">Возраст (лет)</label>
                <input
                  id="onboarding-age"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="120"
                  placeholder="25"
                  value={form.age}
                  onChange={(event) => setField("age", event.target.value)}
                />
              </div>

              <div className="form-group full">
                <label htmlFor="onboarding-goal">Цель</label>
                <select
                  id="onboarding-goal"
                  value={form.goal}
                  onChange={(event) => setField("goal", event.target.value)}
                >
                  <option value="">Не указывать</option>
                  <option value="lose">Похудение</option>
                  <option value="maintain">Поддержание формы</option>
                  <option value="gain">Набор массы</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="form-group full">
                <label htmlFor="onboarding-height">Рост (см)</label>
                <input
                  id="onboarding-height"
                  type="number"
                  inputMode="decimal"
                  min="50"
                  max="250"
                  placeholder="164"
                  value={form.height}
                  onChange={(event) => setField("height", event.target.value)}
                />
              </div>

              <div className="form-group full">
                <label htmlFor="onboarding-weight">Вес (кг)</label>
                <input
                  id="onboarding-weight"
                  type="number"
                  inputMode="decimal"
                  min="20"
                  max="300"
                  placeholder="52"
                  value={form.weight}
                  onChange={(event) => setField("weight", event.target.value)}
                />
              </div>

              <div className="form-group full">
                <label htmlFor="onboarding-activity">Активность</label>
                <select
                  id="onboarding-activity"
                  value={form.activity}
                  onChange={(event) => setField("activity", event.target.value)}
                >
                  <option value="">Не указывать</option>
                  <option value="min">Минимальная (сидячая работа)</option>
                  <option value="light">Лёгкая (1-3 тренировки)</option>
                  <option value="avg">Средняя (3-5 тренировок)</option>
                  <option value="high">Высокая (6-7 тренировок)</option>
                </select>
              </div>
            </>
          )}

          {error && <p className="onboarding-flow__error">{error}</p>}

          <div className="onboarding-flow__actions">
            <button
              type="button"
              className="onboarding-flow__action onboarding-flow__action--primary"
              onClick={handleContinue}
              disabled={isSaving}
            >
              {isSaving ? "Сохраняем..." : "Продолжить"}
            </button>
            <button
              type="button"
              className="onboarding-flow__action onboarding-flow__action--secondary"
              onClick={handleSkip}
              disabled={isSaving}
            >
              Заполнить позже
            </button>
          </div>
        </form>

        <p className="onboarding-flow__legal">
          <a href="/legal" target="_blank" rel="noopener noreferrer">
            Пользовательское соглашение
          </a>
          <span aria-hidden="true">•</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Политика конфиденциальности
          </a>
        </p>
      </div>
    </section>
  );
}
