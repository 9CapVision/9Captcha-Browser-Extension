(()=>{var f=chrome;var R="https://9captcha-api.pridesmp.fun/api/ext";var d="https://9captcha-api.pridesmp.fun",M="https://9captcha-api.pridesmp.fun",D="https://9captcha-api.pridesmp.fun/api-reference/",I={doc:{url:M,automation:{url:`${M}/guides/extension_advanced/#automation-build`}},ref:{url:D},api:{base:R,recognition:"/v1/recognition",status:"/v1/status"},www:{url:d,annoucement:{url:`${d}/json/announcement.json`},demo:{url:`${d}/captcha`,hcaptcha:{url:`${d}/captcha/hcaptcha`},recaptcha:{url:`${d}/captcha/recaptcha`},funcaptcha:{url:`${d}/captcha/funcaptcha`},awscaptcha:{url:`${d}/captcha/awscaptcha`},textcaptcha:{url:`${d}/captcha/textcaptcha`},turnstile:{url:`${d}/captcha/turnstile`},perimeterx:{url:`${d}/captcha/perimeterx`},geetest:{url:`${d}/captcha/geetest`},lemincaptcha:{url:`${d}/captcha/lemincaptcha`}},manage:{url:`${d}/manage`},pricing:{url:`${d}/pricing`},setup:{url:`${d}/setup`}},discord:{url:`${d}/discord`},github:{url:`${d}/github`,release:{url:`${d}/github/release`}}};function C(o){let r=("1c5971fa1a81de2a4f3eff34065e9d80eb0e16f5970375cf0b93dd1f42a8fb93"+o).split("").map(a=>a.charCodeAt(0));return P(r)}var v=new Uint32Array(256);for(let o=256;o--;){let r=o;for(let a=8;a--;)r=r&1?3988292384^r>>>1:r>>>1;v[o]=r}function P(o){let r=-1;for(let a of o)r=r>>>8^v[r&255^a];return(r^-1)>>>0}async function l(o,r){let a=`${[+new Date,performance.now(),Math.random()]}`,[b,c]=await new Promise(u=>{f.runtime.sendMessage([a,o,...r],h=>{u(h)})});if(b===C(a))return c}function N(){let o;return r=>o||(o=r().finally(()=>o=void 0),o)}var te=N();function k(o){f.runtime.connect({name:"broadcast"}).onMessage.addListener(a=>{a.event==="broadcast"&&o(a.data)})}function _(o){if(document.readyState!=="loading")setTimeout(o,0);else{let r;r=()=>{removeEventListener("DOMContentLoaded",r),o()},addEventListener("DOMContentLoaded",r)}}(()=>{if("__9captcha_locate"in window)return;window.__9captcha_locate=!0;function o(){try{return window.self!==window.top}catch{return!0}}class r{constructor(e,n=!1){this.NAMESPACE="__9CAPTCHA__",this.MARK_RADIUS=5,this.window_id=Math.random().toString(36).slice(2),this.locate=e,this.draw_mark=n,this.update_timer,this.css_selector,this.$last,this.initialize_style(),this.initialize_elements()}initialize_style(){let e=[`#${this.NAMESPACE}_wrapper {
                    position: fixed;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background-color: transparent;
                    pointer-events: none;
                    z-index: 10000000;
                }`,`.${this.NAMESPACE}_textbox {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;

                    position: absolute;
                    left: 0;
                    right: 0;

                    background-color: #222;
                    color: #fff;
                    font: normal 12px/12px Helvetica, sans-serif;
                    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
                    border: 1px solid #fff;
                    overflow: hidden;
                }`,`.${this.NAMESPACE}_textbox.${this.NAMESPACE}_header {
                    top: 0;
                }`,`.${this.NAMESPACE}_textbox.${this.NAMESPACE}_header > div {
                    padding: 4px 8px;
                }`,`.${this.NAMESPACE}_textbox.${this.NAMESPACE}_header > div:first-child {
                    flex-grow: 1;
                }`,`.${this.NAMESPACE}_textbox.${this.NAMESPACE}_footer {
                    bottom: 0;
                }`,`.${this.NAMESPACE}_textbox.${this.NAMESPACE}_footer > div {
                    padding: 4px 8px;
                }`,`.${this.NAMESPACE}_textbox.${this.NAMESPACE}_footer > div:first-child {
                    flex-grow: 1;
                }`,`.${this.NAMESPACE}_highlight {
                    position: absolute;
                    opacity: 0.2;
                }`,`.${this.NAMESPACE}_highlight.${this.NAMESPACE}_margin {
                    background-color: rgba(230, 165, 18, 127);
                }`,`.${this.NAMESPACE}_highlight.${this.NAMESPACE}_border {
                    background-color: rgba(255, 204, 121, 127);
                }`,`.${this.NAMESPACE}_highlight.${this.NAMESPACE}_padding {
                    background-color: rgba(50, 255, 50, 127);
                }`,`.${this.NAMESPACE}_highlight.${this.NAMESPACE}_content {
                    background-color: rgba(0, 153, 201, 127);
                }`,`.${this.NAMESPACE}_mark {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;

                    width: ${this.MARK_RADIUS*2}px;
                    height: ${this.MARK_RADIUS*2}px;
                    background-color: #f44;
                    border-radius: 50%;
                    z-index: 2;
                }`];o()||e.push(`.${this.NAMESPACE}_shadow {
                    position: fixed;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background-color: rgba(255, 255, 255, 0.1);
                    pointer-events: none;
                    z-index: 1;
                }`),this.$style=document.createElement("style"),this.$style.type="text/css","styleSheet"in this.$style&&typeof this.$style.styleSheet=="object"&&"cssText"in this.$style.styleSheet?this.$style.styleSheet.cssText=e.join(`
`):this.$style.innerHTML=e.join(`
`),document.getElementsByTagName("head")[0].appendChild(this.$style)}initialize_elements(){if(this.$wrapper=document.createElement("div"),this.$wrapper.id=`${this.NAMESPACE}_wrapper`,document.body.append(this.$wrapper),this.$shadow=document.createElement("div"),this.$shadow.classList.add(`${this.NAMESPACE}_shadow`),this.$wrapper.append(this.$shadow),this.$margin_box=document.createElement("div"),this.$margin_box.classList.add(`${this.NAMESPACE}_highlight`,`${this.NAMESPACE}_margin`),this.$wrapper.append(this.$margin_box),this.$border_box=document.createElement("div"),this.$border_box.classList.add(`${this.NAMESPACE}_highlight`,`${this.NAMESPACE}_border`),this.$wrapper.append(this.$border_box),this.$padding_box=document.createElement("div"),this.$padding_box.classList.add(`${this.NAMESPACE}_highlight`,`${this.NAMESPACE}_padding`),this.$wrapper.append(this.$padding_box),this.$content_box=document.createElement("div"),this.$content_box.classList.add(`${this.NAMESPACE}_highlight`,`${this.NAMESPACE}_content`),this.$wrapper.append(this.$content_box),!o()){this.$header=document.createElement("div"),this.$header.classList.add(`${this.NAMESPACE}_textbox`,`${this.NAMESPACE}_header`);let e=this.locate==="textcaptcha_image_selector"?"<b>Image</b>":"<b>Input</b>";this.$header.innerHTML=`
                    <div>
                        <div>Click on the CAPTCHA ${e} element to generate a CSS selector.</div>
                        <div>Press <b>ESC</b> to cancel.</div>
                    </div>
                    <div><b>9Captcha</b></div>
                `,this.$wrapper.append(this.$header),this.$footer=document.createElement("div"),this.$footer.classList.add(`${this.NAMESPACE}_textbox`,`${this.NAMESPACE}_footer`),this.$wrapper.append(this.$footer)}this.draw_mark&&(this.$mark=document.createElement("div"),this.$mark.classList.add(`${this.NAMESPACE}_mark`),this.$wrapper.append(this.$mark))}clip(e){let n={top:Math.max(0,e.top),left:Math.max(0,e.left),width:e.width+e.left>window.innerWidth?window.innerWidth-e.left:e.width,height:e.height+e.top>window.innerHeight?window.innerHeight-e.top:e.height};return e.top<0&&(n.height+=e.top),e.left<0&&(n.width+=e.left),n.width<0&&(n.width=0),n.height<0&&(n.height=0),n}computed_style(e,n){let s=window.getComputedStyle(e).getPropertyValue(n).match(/[\-]?[\d\.]+px/g);for(let m in s)s[m]=parseFloat(s[m].replace("px",""));return s.length===1&&s.push(s[0],s[0],s[0]),s.length===2&&s.push(s[0],s[1]),s.length===3&&s.push(s[1]),s}add_dim(e,n){for(let t of n)e.top-=t[0],e.left-=t[3],e.width+=t[1]+t[3],e.height+=t[0]+t[2];return e}sub_dim(e,n){for(let t of n)e.top+=t[0],e.left+=t[3],e.width-=t[1]+t[3],e.height-=t[0]+t[2];return e}set_dim(e,n){let t=this.clip(n);e.style.top=`${t.top}px`,e.style.left=`${t.left}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}get_center(e){let n=e.getBoundingClientRect();return{x:n.left+n.width/2,y:n.top+n.height/2}}get_css(e){if("CssSelectorGenerator"in window&&typeof window.CssSelectorGenerator=="object"&&"getCssSelector"in window.CssSelectorGenerator&&typeof window.CssSelectorGenerator.getCssSelector=="function")try{return window.CssSelectorGenerator.getCssSelector(e)}catch{}else throw new Error("selector lib not found")}clear(){this.$t=null;let e={top:0,left:0,width:0,height:0};this.set_dim(this.$margin_box,e),this.set_dim(this.$border_box,e),this.set_dim(this.$padding_box,e),this.set_dim(this.$content_box,e),this.draw_mark&&(this.$mark.style.top="0px",this.$mark.style.left="0px")}update(e=null,n=10){let t=this;t.$last&&t.$last===e||(e&&(t.$t=e),t.$t&&(clearTimeout(t.update_timer),t.update_timer=setTimeout(()=>{if(!t.$t?.getBoundingClientRect)return;let s=t.$t.getBoundingClientRect(),m=t.computed_style(t.$t,"margin"),w=t.computed_style(t.$t,"border-width"),H=t.computed_style(t.$t,"padding"),g={top:s.top,left:s.left,width:s.width,height:s.height},E=JSON.parse(JSON.stringify(g)),B=JSON.parse(JSON.stringify(g)),A=JSON.parse(JSON.stringify(g)),x=JSON.parse(JSON.stringify(g));t.add_dim(E,[m]),t.sub_dim(A,[w]),t.sub_dim(x,[w,H]),t.set_dim(t.$margin_box,E),t.set_dim(t.$border_box,B),t.set_dim(t.$padding_box,A),t.set_dim(t.$content_box,x);let S=t.get_css(t.$t);if(t.update_css_selector(t.window_id,S),l("tab::broadcast",[{action:"update_locate",window_id:t.window_id,css_selector:S}]),t.draw_mark){let y=t.get_center(e);t.$mark.style.top=`${Math.floor(y.y-t.MARK_RADIUS)}px`,t.$mark.style.left=`${Math.floor(y.x-t.MARK_RADIUS)}px`}},n)))}update_css_selector(e,n){this.window_id!==e&&this.clear(),o()||(this.$footer.innerHTML=`<div>${n}</div>`)}terminate(){clearTimeout(this.update_timer),this.$style.remove(),this.$wrapper.remove()}}let a=null;function b(i,e){l("settings::update",[{[i]:e}]),p(!0)}function c(i){i.preventDefault(),i.stopPropagation();let e=i.target,n=a.get_css(e);b(a.locate,n)}function u(i){let e=i.target;a.update(e)}function h(){a.update()}function $(i){i=i||window.event;let e=!1;if("key"in i?e=i.key==="Escape"||i.key==="Esc":"keyCode"in i&&(e=i.keyCode===27),e){p(!0);return}}function L(i){a=new r(i),document.body.addEventListener("mousedown",c),document.body.addEventListener("mouseup",c),document.body.addEventListener("click",c),document.body.addEventListener("mousemove",u),document.body.addEventListener("mousewheel",h),document.body.addEventListener("keydown",$)}function p(i){try{document.body.removeEventListener("mousedown",c),document.body.removeEventListener("mouseup",c),document.body.removeEventListener("click",c),document.body.removeEventListener("mousemove",u),document.body.removeEventListener("mousewheel",h),document.body.removeEventListener("keydown",$),a.terminate(),a=null}catch{}i&&l("tab::broadcast",[{action:"stop_locate"}])}async function T(){k(i=>{i.action==="start_locate"?(p(!1),L(i.locate)):i.action==="stop_locate"?p(!1):i.action==="update_locate"&&a.update_css_selector(i.window_id,i.css_selector)})}_(T)})();})();
