export type ToastVariant = "success" | "error";

export type ToastOptions = {
  duration?: number;
};

export type ToastMessage = {
  id: number;
  variant: ToastVariant;
  message: string;
  duration: number;
};

type ToastListener = (toast: ToastMessage) => void;

const listeners = new Set<ToastListener>();
let counter = 0;
const DEFAULT_DURATION = 4000;

const emit = (variant: ToastVariant, message: string, options?: ToastOptions) => {
  const durationCandidate = options?.duration ?? DEFAULT_DURATION;
  const duration = durationCandidate > 0 ? durationCandidate : DEFAULT_DURATION;
  const toast: ToastMessage = {
    id: ++counter,
    variant,
    message,
    duration,
  };
  listeners.forEach((listener) => listener(toast));
};

export const toast = {
  success(message: string, options?: ToastOptions) {
    emit("success", message, options);
  },
  error(message: string, options?: ToastOptions) {
    emit("error", message, options);
  },
};

export const subscribeToToasts = (listener: ToastListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
