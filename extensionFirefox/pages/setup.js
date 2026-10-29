// 9Captcha Firefox - Setup Content Script
// Reads URL hash params, renders the imported settings table, and sends
// settings::update to the background.

(function () {
    "use strict";

    // CRC32 (matches background protocol)
    const T = new Uint32Array(256);
    for (let i = 256; i--;) {
        let c = i;
        for (let j = 8; j--;) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        T[i] = c;
    }
    function crc32(d) {
        let c = -1;
        for (const b of d) c = c >>> 8 ^ T[c & 255 ^ b];
        return (c ^ -1) >>> 0;
    }
    function hashN(nonce) {
        return crc32((nonce + 1946698961).split("").map(c => c.charCodeAt(0)));
    }

    function sendMsg(action, args) {
        return new Promise(resolve => {
            const nonce = `${[+new Date, performance.now(), Math.random()]}`;
            browser.runtime.sendMessage([nonce, action, ...args], resp => {
                if (resp && resp[0] === hashN(nonce)) {
                    resolve(resp[1]);
                } else {
                    resolve(resp ? resp[1] : null);
                }
            });
        });
    }

    function parseVal(v) {
        if (/^(true|false)$/.test(v)) return v === "true";
        if (/^\d+$/.test(v)) return +v;
        return v;
    }

    function el(tag, parent, props = {}) {
        const node = document.createElement(tag);
        Object.entries(props).forEach(([key, value]) => { node[key] = value; });
        parent.appendChild(node);
        return node;
    }

    function addStyle() {
        el("style", document.head, {
            innerText: `
                * { box-sizing: border-box; word-wrap: break-word; }
                html, body { margin: 0; padding: 0; }
                body {
                    font-family: monospace, monospace;
                    font-size: 14px;
                    margin: 16px;
                    line-height: 1;
                }
                p { margin-top: 8px; margin-bottom: 8px; }
                table {
                    border-collapse: collapse;
                    margin-top: 8px;
                    margin-bottom: 16px;
                }
                th, td {
                    font-size: 14px;
                    border: 1px solid #dddddd;
                    text-align: left;
                    padding: 8px;
                }
                th { background-color: #f2f2f2; }
                .bold { font-weight: bold; }
                .small { font-size: 0.825em; }
                .red { color: #d9534f; }
                .muted { color: #6c757d; }
            `
        });
    }

    function showInvalidUrl() {
        el("p", document.body, { innerText: "Invalid URL", className: "bold red" });
        el("p", document.body, { innerText: "Please set the URL hash and reload the page." });
        el("p", document.body, {
            innerText: "Example: https://9captcha-api.pridesmp.fun/setup#YOUR_API_KEY",
            className: "small muted"
        });
    }

    function apply() {
        document.title = "9Captcha Settings Import";
        addStyle();

        const hash = location.hash.substring(1);
        if (!hash) {
            showInvalidUrl();
            return;
        }

        const parts = hash.split("|");
        const settings = Object.fromEntries(
            parts.map(p => p.includes("=") ? p.split("=") : ["key", p])
                 .map(([k, v]) => [k, parseVal(v)])
        );

        // Handle disabled_hosts array
        if ("disabled_hosts" in settings) {
            const a = "" + settings.disabled_hosts;
            if (a === "") settings.disabled_hosts = [];
            else if (decodeURIComponent(a).startsWith("[")) settings.disabled_hosts = JSON.parse(decodeURIComponent(a));
            else settings.disabled_hosts = a.split(",");
        }

        // Handle comma-separated keys
        if ("key" in settings && typeof settings.key === "string" && settings.key.includes(",")) {
            settings.keys = settings.key.split(",");
            delete settings.key;
        }

        // Importing a key clears a previous fatal status.
        if ("key" in settings || "keys" in settings) {
            settings.solver_status = "idle";
            settings.solver_message = "";
        }

        el("p", document.body, { innerText: "Imported settings:", className: "bold" });
        const table = el("table", document.body);
        const head = el("tr", table);
        el("th", head, { innerText: "Name" });
        el("th", head, { innerText: "Value" });
        Object.entries(settings).forEach(([name, value]) => {
            const row = el("tr", table);
            el("td", row, { innerText: name });
            el("td", row, { innerText: JSON.stringify(value) });
        });

        sendMsg("settings::update", [settings]).then(() => {
            // Signal to automation that setup is complete.
            document.title = "9Captcha - Setup Complete";
        });
    }

    if (document.readyState !== "loading") {
        setTimeout(apply, 0);
    } else {
        document.addEventListener("DOMContentLoaded", apply, { once: true });
    }
})();
