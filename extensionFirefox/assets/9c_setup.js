// 9Captcha Firefox - Setup Content Script

// Reads URL hash params and sends settings::update to background

(function() {
    "use strict";

    // CRC32 (matches background protocol)
    const T = new Uint32Array(256);
    for (let i = 256; i--;) { let c = i; for (let j = 8; j--;) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1; T[i] = c; }
    function crc32(d) { let c = -1; for (const b of d) c = c >>> 8 ^ T[c & 255 ^ b]; return (c ^ -1) >>> 0; }
    function hashN(n) {
        return crc32(("1c5971fa1a81de2a4f3eff34065e9d80eb0e16f5970375cf0b93dd1f42a8fb93" + n).split("").map(c => c.charCodeAt(0)));
    }

    function sendMsg(action, args) {
        return new Promise(resolve => {
            const nonce = `${[+new Date, performance.now(), Math.random()]}`;
            browser.runtime.sendMessage([nonce, action, ...args], resp => {
                resolve(resp ? resp[1] : null);
            });
        });
    }

    function parseVal(v) {
        if (/^(true|false)$/.test(v)) return v === "true";
        if (/^\d+$/.test(v)) return +v;
        return v;
    }

    const hash = location.hash.substring(1);
    if (!hash) return;

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

    sendMsg("settings::update", [settings]).then(() => {
        // Signal to Playwright that setup is complete
        document.title = "9Captcha - Setup Complete";
        try {
            document.body.innerHTML = "<p><b>Settings applied:</b></p><pre>" + JSON.stringify(settings, null, 2) + "</pre>";
        } catch(e) {}
    });
})();
