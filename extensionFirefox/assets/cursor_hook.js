// 9Captcha Firefox - Cursor & Movement System
// Chrome ext Q() Bézier movement ported to rAF-based animation
// Smooth 60fps cursor rendering — no setTimeout, no CSS transitions

(function () {
    "use strict";

    const CURSOR_SVG = '<svg width="14" height="16" viewBox="0 0 21 24"><path d="M3 1 L3 19.5 L7.8 15.2 L10.7 22.4 L14.1 21 L11.2 13.9 L17.6 13.6 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"></path></svg>';

    let cursorEl = null;
    let curX = null, curY = null;

    // ─── Bézier math (Chrome ext Ke, ft) ───
    function cubicBezier(t, p0, p1, p2, p3) {
        const a = 1 - t;
        return a * a * a * p0 + 3 * a * a * t * p1 + 3 * a * t * t * p2 + t * t * t * p3;
    }
    function easeOut(t) { return 1 - (1 - t) * (1 - t); }

    // ─── Position history (Chrome ext _e) ───
    const history = [];
    function pushPos(x, y) { history.push({ x, y }); if (history.length > 80) history.shift(); }
    function near(a, b, d = 3) { return a && b && Math.abs(a.x - b.x) < d && Math.abs(a.y - b.y) < d; }

    // ─── Cursor DOM ───
    function ensureCursor() {
        if (cursorEl && cursorEl.isConnected) return cursorEl;
        cursorEl = document.getElementById("9c-cursor");
        if (!cursorEl) {
            cursorEl = document.createElement("div");
            cursorEl.id = "9c-cursor";
            cursorEl.innerHTML = CURSOR_SVG;
            cursorEl.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;will-change:transform;transform-origin:top left;left:0;top:0;";
            (document.documentElement || document.body).append(cursorEl);
        }
        return cursorEl;
    }

    function setCursorPos(x, y) {
        ensureCursor();
        cursorEl.style.transform = `translate(${x}px, ${y}px)`;
        curX = x; curY = y;
    }

    // ─── Kill internal solver cursor dot ───
    let _killed = false;
    function killNop() {
        if (_killed) return; _killed = true;
        const s = document.createElement("style");
        s.textContent = "#__9c_internal_vis,#__9c_js_cursor,#__9c_js_cursor~div,#__9c_internal_vis~div{display:none!important;opacity:0!important;width:0!important;height:0!important;pointer-events:none!important}";
        (document.documentElement || document.head || document.body).appendChild(s);
        const rm = () => document.querySelectorAll("#__9c_js_cursor, #__9c_internal_vis").forEach(e => e.remove());
        rm(); new MutationObserver(rm).observe(document.documentElement || document.body, { childList: true, subtree: true });
    }

    // ─── rAF-based Bézier animation (replaces Chrome's setTimeout Qe) ───
    let animId = 0;
    let currentAnim = null;

    function animateTo(tx, ty, onClick) {
        const id = ++animId;

        // Initialize cursor if needed
        if (curX === null) {
            curX = tx + (Math.random() > 0.5 ? -60 : 60) * Math.random();
            curY = Math.max(5, ty - 30 - Math.random() * 40);
            setCursorPos(curX, curY);
            pushPos(curX, curY);
        }

        const startX = curX, startY = curY;
        const dist = Math.hypot(tx - startX, ty - startY);

        // Skip tiny movements
        if (dist < 3) { setCursorPos(tx, ty); pushPos(tx, ty); if (onClick) onClick(); return; }

        // ─── Bézier control points (exact Chrome ext Q() logic) ───
        const target = { x: tx, y: ty };
        const rev = [...history].reverse();
        const lastP = rev.find(p => !near(p, target)) || { x: startX, y: startY };
        const prevP = rev.find(p => !near(p, target) && !near(p, lastP)) || null;

        const dx = tx - lastP.x, dy = ty - lastP.y;
        const f = Math.hypot(dx, dy) || 1;
        const P0 = lastP;
        const P1 = { x: 0, y: 0 };
        const P2 = { x: 0, y: 0 };
        const P3 = target;

        if (prevP && Math.hypot(lastP.x - prevP.x, lastP.y - prevP.y) > 1) {
            const pd = Math.hypot(lastP.x - prevP.x, lastP.y - prevP.y);
            P1.x = lastP.x + ((lastP.x - prevP.x) / pd) * f * 0.5;
            P1.y = lastP.y + ((lastP.y - prevP.y) / pd) * f * 0.5;
        } else {
            P1.x = P0.x + (P3.x - P0.x) * 0.2 + (Math.random() - 0.5) * 40;
            P1.y = P0.y + (P3.y - P0.y) * 0.2 + (Math.random() - 0.5) * 40;
        }

        const side = Math.random() > 0.5 ? 1 : -1;
        const arc = f * (0.2 + Math.random() * 0.3);
        P2.x = tx - dx * 0.4 + (-dy / f) * arc * side;
        P2.y = ty - dy * 0.4 + (dx / f) * arc * side;

        // Duration proportional to distance (Chrome: ~2-16ms per step, steps=dist*1.2/8)
        // At 60fps (16.67ms/frame), map to frame count
        const durationMs = Math.max(80, Math.min(500, dist * 1.5));
        const startTime = performance.now();

        function frame(now) {
            if (animId !== id) return; // cancelled by newer movement

            const elapsed = now - startTime;
            const rawProgress = Math.min(1, elapsed / durationMs);
            const t = easeOut(rawProgress);

            const x = cubicBezier(t, P0.x, P1.x, P2.x, P3.x);
            const y = cubicBezier(t, P0.y, P1.y, P2.y, P3.y);

            setCursorPos(x, y);

            // Save to history at milestones
            if ([0.25, 0.5, 0.75].some(m => Math.abs(rawProgress - m) < 0.02)) {
                pushPos(x, y);
            }

            if (rawProgress < 1) {
                requestAnimationFrame(frame);
            } else {
                // Animation complete
                pushPos(tx, ty);
                reportPos(tx, ty);
                if (onClick) onClick();
            }
        }

        requestAnimationFrame(frame);
    }

    // ─── Ripple ───
    function showRipple(x, y) {
        const r = document.createElement("div");
        r.style.cssText = `position:fixed;left:0;top:0;width:32px;height:32px;transform:translate(${x-9}px,${y-5}px) scale(0.3);background:rgba(10,149,255,0.4);border:3px solid rgba(255,255,255,0.8);border-radius:50%;z-index:2147483646;pointer-events:none;transition:transform 250ms ease-out,opacity 250ms ease-out;will-change:transform,opacity;`;
        (document.documentElement || document.body).append(r);
        requestAnimationFrame(() => { r.style.transform = `translate(${x-9}px,${y-5}px) scale(1.2)`; r.style.opacity = "0"; });
        setTimeout(() => r.remove(), 300);
    }

    // ─── Cross-frame sync ───
    function reportPos(x, y) {
        try { browser.runtime.sendMessage({ type: "cursor", action: "updatePosition", x, y }).catch(() => {}); } catch (e) {}
    }
    async function getLastPos() {
        try { return await browser.runtime.sendMessage({ type: "cursor", action: "getLastPosition" }); } catch (e) {} return null;
    }

    // ─── Event handling ───
    let lastTgt = null;
    let hideTimer = null;
    const THRESHOLD = 12;

    function onEvent(e) {
        if (typeof e.clientX !== "number" || typeof e.clientY !== "number") return;
        if (e.clientX === 0 && e.clientY === 0) return;
        killNop();

        const x = e.clientX, y = e.clientY;
        const isClick = e.type === "mousedown" || e.type === "pointerdown";
        const dist = lastTgt ? Math.hypot(x - lastTgt.x, y - lastTgt.y) : Infinity;

        if (dist >= THRESHOLD || isClick) {
            lastTgt = { x, y };
            animateTo(x, y, isClick ? () => showRipple(x, y) : null);
        }

        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { if (cursorEl) cursorEl.style.transform = "translate(-100px,-100px)"; }, 1200);
    }

    function setup() {
        ["mousemove","mousedown","mouseup","click","pointerdown","pointermove","pointerup"].forEach(n => {
            document.addEventListener(n, onEvent, true);
        });
    }

    // ─── Event hook (Chrome ext loader.js) ───
    function injectHook() {
        const s = document.createElement("script");
        s.textContent = `(function(){if(window.__9c_eventhook)return;window.__9c_eventhook=true;var i=new WeakMap,m=50+Math.floor(Math.random()*1e3),d=50+Math.floor(Math.random()*2e3);function y(e,n,t,r){return{x:e,y:n,clientX:e,clientY:n,layerX:e,layerY:n,offsetX:e-1,offsetY:n-1,pageX:e,pageY:n,screenX:t+e,screenY:r+n}}function w(e,n){i.get(e).filter(function(r){return r[0]===n.type}).forEach(function(r){r[1](n)})}var b={click:function(e){var o=document.querySelector(e.selector);if(!o||!i.has(o))return;var a=o.getBoundingClientRect(),u=e.offset?e.offset[0]:Math.floor(Math.random()*a.width),s=e.offset?e.offset[1]:Math.floor(Math.random()*a.height),p=e.screenOffset?e.screenOffset[0]:m,c=e.screenOffset?e.screenOffset[1]:d,l=e.events||["click"];for(var f=0;f<l.length;f++){var M=h("PointerEvent",l[f],Object.assign({},y(u,s,p,c),{composed:true,pointerId:1,pointerType:"mouse",srcElement:o,target:o,bubbles:true,cancelable:true,view:window}),{target:o});w(o,M)}},mousedata:function(e){var t=Date.now,r=0;Date.now=function(){return r};var o=[["mm","mousemove"],["md","mousedown"],["mu","mouseup"]],a=document.body;o.forEach(function(u){var k=u[0],s=u[1];if(!e.data[k])return;e.data[k].forEach(function(p){var x=p[0],Y=p[1],T=p[2];var evt=h("MouseEvent",s,Object.assign({},y(x,Y,0,0),{composed:true,pointerId:1,pointerType:"mouse",srcElement:a,target:a,bubbles:true,cancelable:true,view:window}),{target:a,timestamp:e.timeOffset+T-performance.timeOrigin});r=Math.floor(e.timeOffset+T);w(a,evt)})});Date.now=t}};function h(e,n,t,r){var o=new window[e](n,t);return new Proxy(o,{get:function(u,s){if(s==="isTrusted")return true;if(s in r)return r[s];var c=o[s];return c instanceof Function?c.bind(o):c}})}function v(e){typeof e==="string"&&(e=JSON.parse(e));b[e.action]&&b[e.action](e)}var E=Element.prototype;E.addEventListener=new Proxy(E.addEventListener,{apply:function(n,t,r){return i.has(t)||i.set(t,[]),i.get(t).push(r),n.apply(t,r)}});addEventListener("message",function(e){var d=e.data;if(typeof d!=="object"||d.source!=="9captcha")return;e.stopImmediatePropagation();v(d)})})();`;
        const t = document.documentElement || document.head || document.body;
        if (t) { t.appendChild(s); s.remove(); }
    }

    // ─── Init ───
    async function init() {
        killNop();
        setup();
        injectHook();
        const lp = await getLastPos();
        if (lp && typeof lp.x === "number") {
            const w = window.innerWidth || 400;
            curX = w * 0.3 + Math.random() * w * 0.4;
            curY = 15 + Math.random() * 20;
            setCursorPos(curX, curY);
            pushPos(curX, curY);
        }
    }

    document.documentElement ? init() : document.addEventListener("DOMContentLoaded", init, { once: true });
})();
