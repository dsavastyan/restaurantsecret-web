import { useEffect, useState } from "react";
import { subscribeToToasts, type ToastMessage } from "@/lib/toast";

export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const timers = new Map<number, number>();
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      const timer = window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
        timers.delete(toast.id);
      }, toast.duration);
      timers.set(toast.id, timer);
    });

    return () => {
      unsubscribe();
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.variant}`} role="status">
          {toast.message}
        </div>
      ))}
    </div>
  );
}
