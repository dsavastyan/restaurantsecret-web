import { useState } from "react";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/store/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"email"|"code">("email");
  const [code, setCode] = useState("");
  const setToken = useAuth((s)=>s.setToken);

  async function requestOtp() {
    const r = await apiPost("/auth/request-otp", { email });
    if (r?.ok) setStage("code");
    else alert(r?.error || "error");
  }
  async function verifyOtp() {
    const r = await apiPost("/auth/verify-otp", { email, code });
    // наш PD-API сейчас возвращает { ok, access_token, expires_in } (без refresh)
    if (r?.access_token) {
      setToken(r.access_token);
      window.location.href = "/account";
    } else alert(r?.error || "error");
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Вход по e-mail</h1>
      {stage==="email" ? (
        <>
          <input value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="you@example.com"
            className="border rounded w-full p-2 mb-3"/>
          <button onClick={requestOtp} className="px-4 py-2 rounded bg-black text-white w-full">
            Получить код
          </button>
        </>
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600">Мы отправили код на {email}</p>
          <input value={code} onChange={e=>setCode(e.target.value)}
            placeholder="6-значный код" className="border rounded w-full p-2 mb-3"/>
          <button onClick={verifyOtp} className="px-4 py-2 rounded bg-black text-white w-full">
            Войти
          </button>
        </>
      )}
    </div>
  );
}
