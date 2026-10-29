// 9Captcha Firefox - Cursor renderer
// The solver dispatches synthetic mousemove/mousedown events along its movement
// path. This draws a lightweight arrow at those coordinates. The solver's own
// blue dot (#__9c_js_cursor) is hidden with CSS only; no MutationObserver, no
// per-event Bézier animation, and no click ripple.

(function () {
    "use strict";

    const CURSOR_SVG = '<svg width="14" height="16" viewBox="0 0 21 24"><path d="M3 1 L3 19.5 L7.8 15.2 L10.7 22.4 L14.1 21 L11.2 13.9 L17.6 13.6 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"></path></svg>';

    let cursorEl = null;
    let rafId = 0;
    let pendingX = null;
    let pendingY = null;
    let hideTimer = null;
    let lastMoveAt = 0;
    let lastMovePos = null;

    function ensureCursor() {
        if (cursorEl && cursorEl.isConnected) return cursorEl;
        cursorEl = document.getElementById("9c-cursor");
        if (!cursorEl) {
            cursorEl = document.createElement("div");
            cursorEl.id = "9c-cursor";
            cursorEl.innerHTML = CURSOR_SVG;
            cursorEl.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;left:0;top:0;transform:translate3d(-100px,-100px,0);will-change:transform;";
            (document.documentElement || document.body).append(cursorEl);
        }
        return cursorEl;
    }

    function hideCursor() {
        if (cursorEl) cursorEl.style.transform = "translate3d(-100px,-100px,0)";
    }

    // Coalesce bursts of synthetic moves into one paint per frame.
    function scheduleRender() {
        if (rafId) return;
        rafId = requestAnimationFrame(function () {
            rafId = 0;
            if (pendingX === null) return;
            ensureCursor();
            cursorEl.style.transform = "translate3d(" + pendingX + "px," + pendingY + "px,0)";
            pendingX = null;
            pendingY = null;
        });
    }

    // Match the solver's own visualization: ~30fps and a 3px deadzone. The
    // solver emits pointerrawupdate/pointermove/mousemove at deliberately
    // offset tremor points; following only mousemove avoids the visible wobble.
    function onEvent(e) {
        if (!e || typeof e.clientX !== "number" || typeof e.clientY !== "number") return;
        if (e.clientX === 0 && e.clientY === 0) return;

        const isMove = e.type === "mousemove";
        const isPress = e.type === "mousedown";
        if (!isMove && !isPress) return;

        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideCursor, 3000);

        const x = e.clientX;
        const y = e.clientY;

        if (isMove) {
            const now = performance.now();
            if (now - lastMoveAt < 33) return;
            if (lastMovePos && Math.hypot(x - lastMovePos.x, y - lastMovePos.y) < 3) return;
            lastMoveAt = now;
        }
        lastMovePos = { x: x, y: y };

        pendingX = x;
        pendingY = y;
        scheduleRender();
    }

    // Hide the solver's built-in dot without touching the DOM tree.
    function hideBuiltInDot() {
        if (document.getElementById("9c-cursor-style")) return;
        const style = document.createElement("style");
        style.id = "9c-cursor-style";
        style.textContent = "#__9c_js_cursor,#__9c_internal_vis{display:none!important;opacity:0!important;width:0!important;height:0!important;pointer-events:none!important}";
        (document.head || document.documentElement).appendChild(style);
    }

    // ─── Event hook (Chrome ext loader.js) ───
    // Makes synthetic events look trusted to page listeners; required because
    // Firefox has no chrome.debugger input pipeline.
    function injectHook() {
        const s = document.createElement("script");
        s.textContent = `(function(){if(window.__9c_eventhook)return;window.__9c_eventhook=true;var i=new WeakMap,m=50+Math.floor(Math.random()*1e3),d=50+Math.floor(Math.random()*2e3);function y(e,n,t,r){return{x:e,y:n,clientX:e,clientY:n,layerX:e,layerY:n,offsetX:e-1,offsetY:n-1,pageX:e,pageY:n,screenX:t+e,screenY:r+n}}function w(e,n){i.get(e).filter(function(r){return r[0]===n.type}).forEach(function(r){r[1](n)})}var b={click:function(e){var o=document.querySelector(e.selector);if(!o||!i.has(o))return;var a=o.getBoundingClientRect(),u=e.offset?e.offset[0]:Math.floor(Math.random()*a.width),s=e.offset?e.offset[1]:Math.floor(Math.random()*a.height),p=e.screenOffset?e.screenOffset[0]:m,c=e.screenOffset?e.screenOffset[1]:d,l=e.events||["click"];for(var f=0;f<l.length;f++){var M=h("PointerEvent",l[f],Object.assign({},y(u,s,p,c),{composed:true,pointerId:1,pointerType:"mouse",srcElement:o,target:o,bubbles:true,cancelable:true,view:window}),{target:o});w(o,M)}},mousedata:function(e){var t=Date.now,r=0;Date.now=function(){return r};var o=[["mm","mousemove"],["md","mousedown"],["mu","mouseup"]],a=document.body;o.forEach(function(u){var k=u[0],s=u[1];if(!e.data[k])return;e.data[k].forEach(function(p){var x=p[0],Y=p[1],T=p[2];var evt=h("MouseEvent",s,Object.assign({},y(x,Y,0,0),{composed:true,pointerId:1,pointerType:"mouse",srcElement:a,target:a,bubbles:true,cancelable:true,view:window}),{target:a,timestamp:e.timeOffset+T-performance.timeOrigin});r=Math.floor(e.timeOffset+T);w(a,evt)})});Date.now=t}};function h(e,n,t,r){var o=new window[e](n,t);return new Proxy(o,{get:function(u,s){if(s==="isTrusted")return true;if(s in r)return r[s];var c=o[s];return c instanceof Function?c.bind(o):c}})}function v(e){typeof e==="string"&&(e=JSON.parse(e));b[e.action]&&b[e.action](e)}function Z(e){if(e&&(e instanceof MouseEvent||e instanceof PointerEvent)&&!e.isTrusted){return new Proxy(e,{get:function(t,p){if(p==="isTrusted")return true;var v=Reflect.get(t,p);return typeof v==="function"?v.bind(t):v}})}return e}var E=Element.prototype;var W=EventTarget.prototype;var origAdd=W.addEventListener;W.addEventListener=new Proxy(origAdd,{apply:function(n,t,r){if(t instanceof Element){i.has(t)||i.set(t,[]);i.get(t).push(r)}var tp=r[0];var fn=r[1];if(typeof fn==="function"&&/^(mouse|pointer|click)/.test(tp)){var wr=function(evt){return fn.call(this,Z(evt))};r=[tp,wr,r[2]];return n.apply(t,r)}return n.apply(t,r)}});addEventListener("message",function(e){var d=e.data;if(typeof d!=="object"||d.source!=="9captcha")return;e.stopImmediatePropagation();v(d)})})();`;
        const t = document.documentElement || document.head || document.body;
        if (t) { t.appendChild(s); s.remove(); }
    }

    // ─── Init ───
    function init() {
        hideBuiltInDot();
        ["mousemove", "mousedown"].forEach(function (name) {
            document.addEventListener(name, onEvent, true);
        });
        injectHook();
    }

    if (document.documentElement) init();
    else document.addEventListener("DOMContentLoaded", init, { once: true });
})();
