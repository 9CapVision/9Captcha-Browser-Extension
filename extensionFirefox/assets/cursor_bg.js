// 9Captcha Firefox - Background Helpers
// 1. Cursor position sync across iframes
// 2. Solver status tracking (for popup UI)

(function () {
    "use strict";

    // ─── Cursor position sync ───
    const cursorState = new Map();

    browser.runtime.onMessage.addListener((msg, sender) => {
        // Only handle our cursor messages (object with type:"cursor")
        if (!msg || typeof msg !== "object" || msg.type !== "cursor") return;
        const tabId = sender.tab?.id;
        if (!tabId) return;

        if (msg.action === "updatePosition") {
            cursorState.set(tabId, {
                x: msg.x, y: msg.y,
                frameId: sender.frameId,
                time: Date.now()
            });
            return;
        }

        if (msg.action === "getLastPosition") {
            const pos = cursorState.get(tabId);
            return Promise.resolve(pos || null);
        }
    });

    browser.tabs.onRemoved.addListener(tabId => {
        cursorState.delete(tabId);
    });

    // ─── Solver status: track solving state via webRequest interception ───
    // The content script (3j6q82.js) doesn't send solver_status natively.
    // We intercept API calls to detect solving state changes.

    // Track solving state from API requests
    const solvingTabs = new Map();

    browser.webRequest.onBeforeRequest.addListener(
        (details) => {
            if (details.url.includes("/v1/recognition/") && details.method === "POST") {
                broadcastStatus("solving");
            }
        },
        { urls: ["*://9captcha-api.pridesmp.fun/*"] },
        []
    );

    browser.webRequest.onCompleted.addListener(
        (details) => {
            if (details.url.includes("/v1/recognition/") && details.method === "POST") {
                // Recognition POST completed → waiting for result
            } else if (details.url.includes("/v1/recognition/") && details.method === "GET" && details.statusCode === 200) {
                broadcastStatus("answer_received");
                setTimeout(() => broadcastStatus("solved"), 8000);
                setTimeout(() => broadcastStatus("idle"), 13000);
            }
        },
        { urls: ["*://9captcha-api.pridesmp.fun/*"] },
        []
    );

    browser.webRequest.onErrorOccurred.addListener(
        (details) => {
            if (details.url.includes("/v1/recognition/")) {
                broadcastStatus("idle");
            }
        },
        { urls: ["*://9captcha-api.pridesmp.fun/*"] }
    );

    // Broadcast solver status — store in settings for popup to read
    function broadcastStatus(status) {
        try {
            browser.storage.local.get("settings", (result) => {
                if (result && result.settings) {
                    result.settings.solver_status = status;
                    browser.storage.local.set({ settings: result.settings });
                }
            });
        } catch (e) {}
    }

    // ─── Badge: show balance (overrides internal script's badge) ───
    async function updateBadgeBalance() {
        try {
            const result = await new Promise(r => browser.storage.local.get("settings", r));
            const key = result?.settings?.key;
            if (!key) {
                browser.browserAction.setBadgeText({ text: "" });
                return;
            }
            const resp = await fetch("https://9captcha-api.pridesmp.fun/api/getBalance", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ apikey: key })
            });
            const data = await resp.json();
            if (resp.ok && data && typeof data.balance === "number") {
                browser.browserAction.setBadgeText({ text: data.balance.toFixed(1) });
                browser.browserAction.setBadgeBackgroundColor({ color: "#22c55e" });
            } else {
                browser.browserAction.setBadgeText({ text: resp.status.toString() });
                browser.browserAction.setBadgeBackgroundColor({ color: "#fde047" });
            }
        } catch (e) {
            browser.browserAction.setBadgeText({ text: "Err" });
            browser.browserAction.setBadgeBackgroundColor({ color: "#fde047" });
        }
    }

    // Run after internal script finishes setting its badge (2s delay), then every 60s
    setTimeout(() => {
        updateBadgeBalance();
        setInterval(updateBadgeBalance, 60000);
    }, 2000);
})();
