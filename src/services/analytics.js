export const COOKIE_POLICY_VERSION = "cookies_v1_2026-01-16";
const CONSENT_KEY = "rs_consent_v1";
const ANON_ID_KEY = "rs_anon_id";

// Helper to generate UUID v4
function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    );
}

class AnalyticsService {
    constructor() {
        this.apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
    }

    getConsentStatus() {
        try {
            const stored = localStorage.getItem(CONSENT_KEY);
            if (!stored) return "unset";
            const parsed = JSON.parse(stored);
            if (parsed.policyVersion !== COOKIE_POLICY_VERSION) return "unset";
            return parsed.analytics || "unset";
        } catch {
            return "unset";
        }
    }

    getAnonId() {
        return localStorage.getItem(ANON_ID_KEY) || null;
    }

    ensureAnonId() {
        let id = this.getAnonId();
        if (!id) {
            id = uuidv4();
            localStorage.setItem(ANON_ID_KEY, id);
        }
        return id;
    }

    async setConsent(status) {
        const validStatuses = ["granted", "denied"];
        if (!validStatuses.includes(status)) return;

        // Save to local storage
        const consentData = {
            analytics: status,
            updatedAt: new Date().toISOString(),
            policyVersion: COOKIE_POLICY_VERSION,
        };
        localStorage.setItem(CONSENT_KEY, JSON.stringify(consentData));

        // Handle Anon ID
        let anonId = null;
        if (status === "granted") {
            anonId = this.ensureAnonId();
        } else {
            // Optional: remove anon ID if denied?
            // For now, metrics usually require keeping it or rotating.
            // User requested: "(optional) delete rs_anon_id".
            // Let's keep it simple: if denied, we just don't send events.
            // But for the CONSENT call, we can send it if we have it, or not.
            anonId = this.getAnonId();
        }

        // Call Backend
        try {
            const payload = {
                status,
                policy_version: COOKIE_POLICY_VERSION,
                anon_id: anonId,
            };

            // Get token if exists (assuming stored in localStorage 'rs_token' or similar, 
            // but if we are in main app we might need to access auth store.
            // For simplicity, we'll try to read from a common place or just send anon if distinct).
            // Ideally, track() gets headers from a centralized API client.
            // Here we will use fetch directly for now, adding Auth header if we can find it.

            const token = localStorage.getItem("rs_auth_token"); // Example key
            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            await fetch(`${this.apiUrl}/consent/analytics`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
        } catch (err) {
            console.error("[Analytics] Failed to set consent", err);
        }

        // Trigger event for UI updates if needed
        window.dispatchEvent(new Event("rs-consent-update"));
    }

    async track(eventName, props = {}) {
        if (this.getConsentStatus() !== "granted") return;

        const anonId = this.ensureAnonId(); // Should already exist if granted

        // Session ID: simple session storage
        let sessionId = sessionStorage.getItem("rs_session_id");
        if (!sessionId) {
            sessionId = uuidv4();
            sessionStorage.setItem("rs_session_id", sessionId);
        }

        const payload = {
            event_name: eventName,
            props,
            session_id: sessionId,
            anon_id: anonId,
        };

        try {
            const token = localStorage.getItem("rs_auth_token");
            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            // Use sendBeacon if available for strictly better reliability on navigation, 
            // but standardized JSON POST is required by our backend.
            // fetch with keepalive is good.
            await fetch(`${this.apiUrl}/analytics/event`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
                keepalive: true,
            });
        } catch (err) {
            // Silent fail for analytics
            if (import.meta.env.DEV) console.warn("[Analytics] Track failed", err);
        }
    }
}

export const analytics = new AnalyticsService();
