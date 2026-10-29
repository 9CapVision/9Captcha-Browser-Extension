// 9Captcha Firefox - Background Helpers
// 1. Cursor position sync across iframes
// 2. Solver status tracking (for popup UI + in-page overlay)

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

    // ─── Stream ports (popup + challenge content scripts) ───
    const streamPorts = new Set();

    browser.runtime.onConnect.addListener(port => {
        if (!port || (port.name !== "stream" && port.name !== "popup-stream")) return;
        streamPorts.add(port);
        port.onDisconnect.addListener(() => streamPorts.delete(port));
    });

    // Statuses that must stay visible until an explicit settings::update
    // (key activation, logout, or setup import) clears them.
    const PERSIST_STATUSES = new Set(["invalid_key", "no_solves", "api_error"]);
    let lastFatalStatus = null;

    browser.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes.settings) return;
        const next = changes.settings.newValue || {};
        if (PERSIST_STATUSES.has(next.solver_status)) {
            lastFatalStatus = next.solver_status;
        } else if (next.solver_status === "idle" || next.solver_status === "solving") {
            lastFatalStatus = null;
        }
    });

    function broadcastStatus(status, message) {
        if (lastFatalStatus) return;

        browser.storage.local.get("settings").then(result => {
            const current = (result && result.settings) || {};
            if (PERSIST_STATUSES.has(current.solver_status)) {
                lastFatalStatus = current.solver_status;
                return;
            }

            const next = Object.assign({}, current, {
                solver_status: status,
                solver_message: message || ""
            });

            return browser.storage.local.set({ settings: next }).then(() => {
                const update = { solver_status: status, solver_message: message || "" };
                streamPorts.forEach(port => {
                    try {
                        port.postMessage({ event: "settingsUpdate", settings: update });
                    } catch (e) {
                        streamPorts.delete(port);
                    }
                });
            });
        }).catch(() => {});
    }

    // ─── Solver status: track solving state via webRequest interception ───
    const statusTimers = new Set();

    function clearStatusTimers() {
        statusTimers.forEach(timer => clearTimeout(timer));
        statusTimers.clear();
    }

    function scheduleStatus(status, delayMs, message) {
        const timer = setTimeout(() => {
            statusTimers.delete(timer);
            broadcastStatus(status, message);
        }, delayMs);
        statusTimers.add(timer);
        return timer;
    }

    browser.webRequest.onBeforeRequest.addListener(
        (details) => {
            if (details.url.includes("/v1/recognition/") && details.method === "POST") {
                clearStatusTimers();
                broadcastStatus("solving");
            }
        },
        { urls: ["*://9captcha-api.pridesmp.fun/*"] },
        []
    );

    browser.webRequest.onCompleted.addListener(
        (details) => {
            if (details.url.includes("/v1/recognition/") && details.method === "POST") {
                // POST completed — still solving (waiting for answer)
                broadcastStatus("solving");
            } else if (details.url.includes("/v1/recognition/") && details.method === "GET" && details.statusCode === 200) {
                clearStatusTimers();
                broadcastStatus("answer_received");
                scheduleStatus("solved", 3000);
                scheduleStatus("idle", 6000);
            }
        },
        { urls: ["*://9captcha-api.pridesmp.fun/*"] },
        []
    );

    browser.webRequest.onErrorOccurred.addListener(
        (details) => {
            if (details.url.includes("/v1/recognition/")) {
                // Don't set idle on error during retries — keep solving
                // Only set idle after a timeout if no new requests come
                clearStatusTimers();
                scheduleStatus("idle", 5000);
            }
        },
        { urls: ["*://9captcha-api.pridesmp.fun/*"] }
    );

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
