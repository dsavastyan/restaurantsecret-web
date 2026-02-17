// src/pages/Login.tsx
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { useAuth, selectSetToken } from "@/store/auth"; // <— меняем импорт
import { analytics } from "@/services/analytics";
import mobileNightBackground from "@/assets/login/Login background.png";
import desktopNightBackground from "@/assets/login/Login background desctop.png";
import mobileDayBackground from "@/assets/login/Login bacground mobile day.png";
import desktopDayBackground from "@/assets/login/Login bachround desctop day.png";
import logoIcon from "@/assets/login/Icon.png";

const MOSCOW_LAT = 55.7558;
const MOSCOW_LON = 37.6173;
const MOSCOW_TZ_HOURS = 3;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function getMoscowDateParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: Number(byType.hour),
    minute: Number(byType.minute),
    second: Number(byType.second),
  };
}

function getDayOfYear(year: number, month: number, day: number) {
  const start = Date.UTC(year, 0, 0);
  const date = Date.UTC(year, month - 1, day);
  return Math.floor((date - start) / 86400000);
}

function getMoscowSunTimesMinutes(year: number, month: number, day: number) {
  const n = getDayOfYear(year, month, day);
  const gamma = (2 * Math.PI / 365) * (n - 1);
  const eqTime = 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );
  const decl = 0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = MOSCOW_LAT * DEG_TO_RAD;
  const zenith = 90.833 * DEG_TO_RAD;
  const cosHa = (Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decl))) - Math.tan(latRad) * Math.tan(decl);
  const ha = Math.acos(Math.min(1, Math.max(-1, cosHa)));

  const solarNoon = 720 - (4 * MOSCOW_LON) - eqTime + (MOSCOW_TZ_HOURS * 60);
  const delta = RAD_TO_DEG * ha * 4;

  return {
    sunrise: solarNoon - delta,
    sunset: solarNoon + delta,
  };
}

function isMoscowDaytime(now = new Date()) {
  const moscow = getMoscowDateParts(now);
  const hour = moscow.hour % 24;
  const nowMinutes = (hour * 60) + moscow.minute + (moscow.second / 60);
  const { sunrise, sunset } = getMoscowSunTimesMinutes(moscow.year, moscow.month, moscow.day);
  return nowMinutes >= sunrise && nowMinutes < sunset;
}

export default function LoginPage() {
  const setToken = useAuth(selectSetToken); // <— берём сеттер из стора
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"enter" | "code" | "done">("enter");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isDayTheme, setIsDayTheme] = useState(() => isMoscowDaytime());

  const redirectTo = useMemo(() => {
    let from = location.state?.from;

    // Handle case where 'from' is a Location object (from <Navigate />)
    if (from && typeof from === "object" && from.pathname) {
      from = from.pathname + (from.search || "");
    }

    const queryNext = searchParams.get("next");
    if (queryNext && queryNext.startsWith("/")) return queryNext;
    if (typeof from === "string" && from.startsWith("/")) return from;
    return "/account";
  }, [location.state, searchParams]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    const updateTheme = () => setIsDayTheme(isMoscowDaytime());
    updateTheme();
    const id = setInterval(updateTheme, 60000);
    return () => clearInterval(id);
  }, []);

  const sendCode = async () => {
    setErr(null);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setErr("Укажите корректный e-mail");
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost("/auth/request-otp", { email });
      if (res?.ok) {
        setStep("code");
        setTimer(60);
        analytics.track("otp_request");
      } else {
        setErr(res?.message || "Не удалось отправить код");
      }
    } catch {
      setErr("Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setErr(null);
    if (!code || code.length < 4) {
      setErr("Введите код из письма");
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost("/auth/verify-otp", { email, code });
      if (res?.ok && res?.access_token) {
        setToken(res.access_token);       // <— сохраняем токен в твой стор (rs_access)

        if (res.created) {
          analytics.track("signup_completed", { source_page: "login" });
        }
        analytics.track("login_success", { source_page: "login" });
        analytics.recordPolicyAcceptance(); // Record that user accepted policy upon login

        navigate(redirectTo, { replace: true });
      } else {
        setErr(res?.message || "Неверный код");
      }
    } catch {
      setErr("Не удалось подтвердить код");
    } finally {
      setLoading(false);
    }
  };

  const resend = () => {
    if (timer > 0) return;
    sendCode();
  };

  return (
    <div
      className="login"
      style={
        {
          "--login-bg-mobile": `url(${isDayTheme ? mobileDayBackground : mobileNightBackground})`,
          "--login-bg-desktop": `url(${isDayTheme ? desktopDayBackground : desktopNightBackground})`,
        } as CSSProperties
      }
    >
      <div className="login__stage">
        <button
          type="button"
          className="login__home"
          onClick={() => navigate("/")}
          aria-label="На главный экран"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 11.75 12 4l9 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.75 10.5v9.25h10.5V10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="login__brand-block">
          <div className="login__brand">
            <img src={logoIcon} alt="" className="login__brand-icon" aria-hidden="true" />
            <span className="login__brand-name">RestaurantSecret</span>
          </div>
        </div>
        <div className="login__wrap">
          <div className="login__card">
            {step === "enter" && <h1 className="login__title">Выбирай легко</h1>}
            <p className={`login__subtitle ${step === "code" ? "login__subtitle--plain" : ""}`}>
              {step === "code" ? "Отправили код на почту" : "Ешь вкусно, выбирай осознанно"}
            </p>

            {err && <div className="login__alert">{err}</div>}

            {step === "enter" && (
              <div className="login__form">
                <div className="login__input-wrap">
                  <span className="login__input-icon" aria-hidden="true">
                    <svg width="18" height="14" viewBox="0 0 24 18" fill="none">
                      <path
                        d="M2.5 4.5 12 10.5l9.5-6"
                        stroke="#8AA3A0"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3.5 2.5h17a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"
                        stroke="#8AA3A0"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    className="login__input"
                    placeholder="Введите email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                    aria-invalid={!!err}
                  />
                </div>
                <button className="login__submit" onClick={sendCode} disabled={loading}>
                  {loading ? "Отправляем…" : "Продолжить"}
                </button>
              </div>
            )}

            {step === "code" && (
              <div className="login__form">
                <label className="login__label sr-only" htmlFor="code">Код из письма</label>
                <div className="login__input-wrap login__input-wrap--plain login__otp-wrap">
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    className="login__input"
                    placeholder="Введите код"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").trim())}
                    autoFocus
                    disabled={loading}
                    aria-invalid={!!err}
                  />
                </div>
                <button className="login__submit" onClick={verifyCode} disabled={loading}>
                  {loading ? "Проверяем…" : "Войти"}
                </button>

                <button
                  type="button"
                  className="login__resend"
                  onClick={resend}
                  disabled={loading || timer > 0}
                  aria-disabled={loading || timer > 0}
                  title={timer > 0 ? `Повторно через ${timer} сек` : "Отправить код ещё раз"}
                >
                  {timer > 0 ? `Отправить код ещё раз — через ${timer} сек` : "Отправить код ещё раз"}
                </button>

                <p className="login__hint">Код придёт с адреса <b>noreply@restaurantsecret.ru</b>.</p>

                <p className="login__legal">
                  Продолжая, вы соглашаетесь на{" "}
                  <a href="/legal/pdn-consent.pdf" target="_blank" rel="noopener noreferrer">
                    обработку персональных данных
                  </a>
                  , а также с{" "}
                  <a href="https://restaurantsecret.ru/#/privacy" target="_blank" rel="noopener noreferrer">
                    политикой конфиденциальности
                  </a>{" "}
                  и{" "}
                  <a href="https://restaurantsecret.ru/#/legal" target="_blank" rel="noopener noreferrer">
                    пользовательским соглашением
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
