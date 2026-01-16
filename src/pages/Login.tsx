// src/pages/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { useAuth, selectSetToken } from "@/store/auth"; // <— меняем импорт
import { analytics } from "@/services/analytics";

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

  const redirectTo = useMemo(() => {
    const stateFrom =
      location.state && typeof (location.state as any).from === "string"
        ? (location.state as any).from
        : null;
    const queryNext = searchParams.get("next");
    if (queryNext && queryNext.startsWith("/")) return queryNext;
    if (stateFrom && stateFrom.startsWith("/")) return stateFrom;
    return "/account";
  }, [location.state, searchParams]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

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
        analytics.track("otp_success");
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
    <div className="login">
      <div className="login__wrap">
        <div className="login__card">
          <h1 className="login__title">Вход по e-mail</h1>
          <p className="login__subtitle">Без пароля. Отправим одноразовый код на вашу почту.</p>

          {err && <div className="login__alert">{err}</div>}

          {step === "enter" && (
            <div className="login__form">
              <label className="login__label" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                className="login__input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={loading}
                aria-invalid={!!err}
              />
              <button className="btn btn--primary login__submit" onClick={sendCode} disabled={loading}>
                {loading ? "Отправляем…" : "Получить код"}
              </button>
            </div>
          )}

          {step === "code" && (
            <div className="login__form">
              <label className="login__label" htmlFor="code">Код из письма</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                className="login__input"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                autoFocus
                disabled={loading}
                aria-invalid={!!err}
              />
              <button className="btn btn--primary login__submit" onClick={verifyCode} disabled={loading}>
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
            </div>
          )}

          <p className="login__legal">
            Продолжая, вы соглашаетесь с
            {" "}
            <a href="https://restaurantsecret.ru/#/privacy" target="_blank" rel="noopener noreferrer">
              обработкой персональных данных
            </a>{" "}
            и
            {" "}
            <a href="https://restaurantsecret.ru/#/legal" target="_blank" rel="noopener noreferrer">
              пользовательским соглашением
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
