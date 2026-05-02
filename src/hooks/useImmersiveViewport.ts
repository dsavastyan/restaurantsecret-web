import { useEffect } from "react";

const VIEWPORT_HEIGHT_VAR = "--rs-visual-viewport-height";

function updateViewportHeight() {
  if (typeof window === "undefined") return;

  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty(VIEWPORT_HEIGHT_VAR, `${viewportHeight}px`);
}

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

  updateViewportHeight();
  scrollDocumentToTop();

  window.requestAnimationFrame(() => {
    updateViewportHeight();
    scrollDocumentToTop();
  });

  window.setTimeout(() => {
    updateViewportHeight();
    scrollDocumentToTop();
  }, 80);

  window.setTimeout(() => {
    updateViewportHeight();
    scrollDocumentToTop();
  }, 260);
}

export function useImmersiveViewport(resetKey: unknown) {
  useEffect(() => {
    updateViewportHeight();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateViewportHeight);
    viewport?.addEventListener("scroll", updateViewportHeight);
    window.addEventListener("resize", updateViewportHeight);
    window.addEventListener("orientationchange", updateViewportHeight);

    return () => {
      viewport?.removeEventListener("resize", updateViewportHeight);
      viewport?.removeEventListener("scroll", updateViewportHeight);
      window.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("orientationchange", updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    resetImmersiveViewport();
  }, [resetKey]);
}
