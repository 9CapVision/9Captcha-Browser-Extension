(() => {
    var g = chrome; var x = "https://9captcha-api.pridesmp.fun/api/ext"; var n = "https://9captcha-api.pridesmp.fun", m = "https://9captcha-api.pridesmp.fun", y = "https://9captcha-api.pridesmp.fun/api-reference/", $ = { doc: { url: m, automation: { url: `${m}/guides/extension_advanced/#automation-build` } }, ref: { url: y }, api: { base: x, recognition: "/v1/recognition", status: "/v1/status" }, www: { url: n, annoucement: { url: `${n}/json/announcement.json` }, demo: { url: `${n}/captcha`, hcaptcha: { url: `${n}/captcha/hcaptcha` }, recaptcha: { url: `${n}/captcha/recaptcha` }, funcaptcha: { url: `${n}/captcha/funcaptcha` }, awscaptcha: { url: `${n}/captcha/awscaptcha` }, textcaptcha: { url: `${n}/captcha/textcaptcha` }, turnstile: { url: `${n}/captcha/turnstile` }, perimeterx: { url: `${n}/captcha/perimeterx` }, geetest: { url: `${n}/captcha/geetest` }, lemincaptcha: { url: `${n}/captcha/lemincaptcha` } }, manage: { url: `${n}/manage` }, pricing: { url: `${n}/pricing` }, setup: { url: `${n}/setup` } }, discord: { url: `${n}/discord` }, github: { url: `${n}/github`, release: { url: `${n}/github/release` } } }; function b(e) { let t = ("1c5971fa1a81de2a4f3eff34065e9d80eb0e16f5970375cf0b93dd1f42a8fb93" + e).split("").map(r => r.charCodeAt(0)); return f(t) } var h = new Uint32Array(256); for (let e = 256; e--;) { let t = e; for (let r = 8; r--;)t = t & 1 ? 3988292384 ^ t >>> 1 : t >>> 1; h[e] = t } function f(e) { let t = -1; for (let r of e) t = t >>> 8 ^ h[t & 255 ^ r]; return (t ^ -1) >>> 0 } async function T(e, t) { let r = `${[+new Date, performance.now(), Math.random()]}`, [i, o] = await new Promise(c => { g.runtime.sendMessage([r, e, ...t], l => { c(l) }) }); if (i === b(r)) return o } function p(e) { if (document.readyState !== "loading") setTimeout(e, 0); else { let t; t = () => { removeEventListener("DOMContentLoaded", t), e() }, addEventListener("DOMContentLoaded", t) } } [...document.body.children].forEach(e => e.remove()); function s(e, t, r = {}) { let i = document.createElement(e); return r && Object.entries(r).forEach(([o, c]) => i[o] = c), t.appendChild(i), i } function w() {
        s("style", document.head, {
            innerText: `
                * {
                    box-sizing: border-box;
                    word-wrap: break-word;
                }
                html, body {
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: monospace, monospace;
                    font-size: 14px;
                    margin: 16px;
                    line-height: 1;
                }

                p {
                    margin-top: 8px;
                    margin-bottom: 8px;
                }
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
                th {
                    background-color: #f2f2f2;
                }

                .bold {
                    font-weight: bold;
                }
                .small {
                    font-size: 0.825em;
                }
                .red {
                    color: #d9534f;
                }
                .muted {
                    color: #6c757d;
                }
            `})
    } function E() { s("p", document.body, { innerText: "Invalid URL", className: "bold red" }), s("p", document.body, { innerText: "Please set the URL hash and reload the page." }), s("p", document.body, { innerText: "Example: https://9captcha-api.pridesmp.fun/setup#YOUR_API_KEY", className: "small muted" }) } function _(e) { return /^(true|false)$/.test(e) ? e === "true" : /^\d+$/.test(e) ? +e : e } function L() { let e = "9Captcha Settings Import", t = document.querySelector("title"); document.title !== e && t && (t.innerText = e), w(); let r = document.location.hash.substring(1); if (!r) return E(); let i = r.split("|"), o = Object.fromEntries(i.map(a => a.includes("=") ? a.split("=") : ["key", a]).map(([a, d]) => [a, _(d)])); if ("disabled_hosts" in o) { let a = "" + o.disabled_hosts; a === "" ? o.disabled_hosts = [] : decodeURIComponent(a).startsWith("[") ? o.disabled_hosts = JSON.parse(decodeURIComponent(a)) : o.disabled_hosts = a.split(",") } "key" in o && o.key.includes(",") && (o.keys = o.key.split(","), delete o.key), s("p", document.body, { innerText: "Imported settings:", className: "bold" }); let c = s("table", document.body), l = s("tr", c); s("th", l, { innerText: "Name" }), s("th", l, { innerText: "Value" }), Object.entries(o).forEach(([a, d]) => { let u = s("tr", c); s("td", u, { innerText: a }), s("td", u, { innerText: JSON.stringify(d) }) }), T("settings::update", [o]) } p(L);
})();
