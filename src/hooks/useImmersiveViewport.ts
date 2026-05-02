import { useEffect } from "react";

function scrollDocumentToTop() {
  if (typeof window === "undefined") return;

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function resetImmersiveViewport({ blurActiveElement = false } = {}) {
  if (typeof window === "undefined") return;

  if (blurActiveElement && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  scrollDocumentToTop();

  window.requestAnimationFrame(() => {
    scrollDocumentToTop();
  });

  window.setTimeout(() => {
    scrollDocumentToTop();
  }, 80);

  window.setTimeout(() => {
    scrollDocumentToTop();
  }, 260);
}

export function useImmersiveViewport(resetKey: unknown) {
  useEffect(() => {
    resetImmersiveViewport();
  }, [resetKey]);
}
