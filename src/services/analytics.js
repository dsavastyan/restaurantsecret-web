import { PD_API_BASE } from "@/config/api";

export const COOKIE_POLICY_VERSION = "cookies_v1_2026-01-16";
export const USER_AGREEMENT_VERSION = "agreement_v1_2026-02-12";
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
        this.apiUrl = PD_API_BASE;
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

            const token = localStorage.getItem("rs_access"); // Corrected key from rs_auth_token to rs_access
            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            await fetch(`${this.apiUrl}/api/consent/analytics`, {
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

    getSessionId() {
        const now = Date.now();
        const storedSession = sessionStorage.getItem("rs_session_id");
        const lastActivity = localStorage.getItem("rs_last_activity");

        let sessionId = storedSession;

        if (!sessionId || !lastActivity || (now - Number(lastActivity) > 30 * 60 * 1000)) {
            // New session
            sessionId = uuidv4();
            sessionStorage.setItem("rs_session_id", sessionId);
            sessionStorage.removeItem("rs_session_started"); // Reset flag for new session
        }

        localStorage.setItem("rs_last_activity", now.toString());
        return sessionId;
    }

    async trackSessionStart() {
        if (this.getConsentStatus() !== "granted") return;

        // Ensure session exists
        this.getSessionId();

        if (sessionStorage.getItem("rs_session_started")) return;

        // Gather props
        const params = new URLSearchParams(window.location.search);
        const props = {
            landing_path: window.location.pathname,
            referrer: document.referrer || null,
            utm_source: params.get("utm_source"),
            utm_medium: params.get("utm_medium"),
            utm_campaign: params.get("utm_campaign"),
            utm_content: params.get("utm_content"),
            utm_term: params.get("utm_term"),
            tg_start_param: params.get("tgWebAppStartParam") || params.get("start"),
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            device_pixel_ratio: window.devicePixelRatio,
        };

        await this.track("session_start", props);
        sessionStorage.setItem("rs_session_started", "true");
    }

    async track(eventName, props = {}) {
        if (this.getConsentStatus() !== "granted") return;

        const anonId = this.ensureAnonId();
        const sessionId = this.getSessionId();

        const payload = {
            event_name: eventName,
            props,
            session_id: sessionId,
            anon_id: anonId,
        };

        try {
            const token = localStorage.getItem("rs_access"); // Corrected key
            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            // Using fetch with keepalive ensures reliability on page unload
            await fetch(`${this.apiUrl}/api/analytics/event`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
                keepalive: true,
            });
        } catch (err) {
            if (import.meta.env.DEV) console.warn("[Analytics] Track failed", err);
        }
    }

    /**
     * Records that the user has accepted the latest policy/agreement.
     * Called upon login.
     */
    async recordPolicyAcceptance() {
        try {
            const token = localStorage.getItem("rs_access");
            if (!token) return;

            const headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            };

            await fetch(`${this.apiUrl}/api/consent/policy`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    policy_version: USER_AGREEMENT_VERSION
                }),
            });
        } catch (err) {
            console.error("[Analytics] Failed to record policy acceptance", err);
        }
    }

}

export const analytics = new AnalyticsService();
