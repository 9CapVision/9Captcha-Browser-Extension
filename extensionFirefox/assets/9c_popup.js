// ─── 9Captcha Solver Extension (Firefox) ── popup.js ───
// 9Captcha Firefox Extension popup

(function () {
  'use strict';

  const BACKEND_URL = 'https://9captcha-api.pridesmp.fun';

  // ─── CRC32 hash (matches background script protocol) ───
  const crcTable = new Uint32Array(256);
  for (let i = 256; i--;) {
    let c = i;
    for (let j = 8; j--;) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    crcTable[i] = c;
  }

  function crc32(data) {
    let crc = -1;
    for (const b of data) crc = crc >>> 8 ^ crcTable[crc & 255 ^ b];
    return (crc ^ -1) >>> 0;
  }

  function hashNonce(nonce) {
    const bytes = ("1c5971fa1a81de2a4f3eff34065e9d80eb0e16f5970375cf0b93dd1f42a8fb93" + nonce)
      .split("").map(c => c.charCodeAt(0));
    return crc32(bytes);
  }

  // ─── Send message to background script ───
  function sendMsg(action, args) {
    return new Promise(resolve => {
      const nonce = `${[+new Date, performance.now(), Math.random()]}`;
      browser.runtime.sendMessage([nonce, action, ...args], resp => {
        if (resp && resp[0] === hashNonce(nonce)) {
          resolve(resp[1]);
        } else {
          resolve(resp ? resp[1] : null);
        }
      });
    });
  }

  function getSettings() { return sendMsg("settings::get", []); }
  function updateSettings(overrides) { return sendMsg("settings::update", [overrides]); }

  // ─── DOM References ───
  const authScreen = document.getElementById('auth-screen');
  const mainScreen = document.getElementById('main-screen');
  const apiKeyInput = document.getElementById('api-key-input');
  const btnActivate = document.getElementById('btn-activate');
  const authError = document.getElementById('auth-error');
  const statBalance = document.getElementById('stat-balance');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const btnPower = document.getElementById('btn-power');
  const powerIcon = document.getElementById('power-icon');
  const btnLogout = document.getElementById('btn-logout');

  // ─── Initialization ───
  async function init() {
    const settings = await getSettings();
    if (settings && settings.key && settings.key !== "") {
      showMainScreen(settings);
    } else {
      showAuthScreen();
    }
  }

  function showAuthScreen() {
    authScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
    authError.textContent = '';
    apiKeyInput.value = '';
  }

  async function showMainScreen(settings) {
    authScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    const enabled = settings.enabled !== false;
    setSolverStatus(settings.solver_status || 'idle');
    setEnabled(enabled);
    // Fetch balance (same as Chrome ext mt() function)
    fetchBalance(settings.key);
  }
  // ─── Balance Fetch (Chrome ext mt() equivalent) ───
  async function fetchBalance(key) {
    if (!statBalance) return;
    if (!key) { statBalance.textContent = 'No Key'; statBalance.style.color = '#fde047'; return; }
    statBalance.textContent = '...';
    try {
      const resp = await fetch(`${BACKEND_URL}/api/getBalance`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apikey: key })
      });
      const data = await resp.json();
      if (resp.ok && data && typeof data.balance === 'number') {
        statBalance.textContent = data.balance.toFixed(1);
        statBalance.style.color = '#22c55e'; // green
      } else {
        statBalance.textContent = resp.status.toString();
        statBalance.style.color = '#fde047'; // yellow
      }
    } catch (e) {
      statBalance.textContent = 'Error';
      statBalance.style.color = '#fde047';
    }
  }

  // ─── API Key Activation ───
  btnActivate.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) { authError.textContent = 'Please enter your API key'; return; }
    if (!key.startsWith('9cap-')) { authError.textContent = 'Invalid key format. Keys start with 9cap-'; return; }

    btnActivate.disabled = true;
    btnActivate.textContent = 'Validating...';
    authError.textContent = '';

    try {
      await fetch(`${BACKEND_URL}/api/usage?key=${encodeURIComponent(key)}`);
      await updateSettings({ key: key, base_api: "https://9captcha-api.pridesmp.fun/api/ext", enabled: true });
      showMainScreen({ key: key, enabled: true });
      sendMsg("api::fetchStatus", []);
    } catch (e) {
      authError.textContent = e.message || 'Failed to validate key';
      await updateSettings({ key: key, base_api: "https://9captcha-api.pridesmp.fun/api/ext", enabled: true });
      showMainScreen({ key: key, enabled: true });
    } finally {
      btnActivate.disabled = false;
      btnActivate.textContent = 'Activate';
    }
  });

  // ─── Solver Status (exact same states as Chrome ext) ───
  function setSolverStatus(status) {
    const icon = document.getElementById('solver-status-icon');
    const text = document.getElementById('solver-status-text');

    if (status === 'solving') {
      icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle><path d="M12 2a10 10 0 0 1 10 10"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"></animateTransform></path></svg>`;
      icon.style.filter = 'none'; icon.style.opacity = '1';
      text.textContent = 'Solving...';
      text.style.color = '#eab308';
    } else if (status === 'solved') {
      icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke-dasharray="60" stroke-dashoffset="60" d="M22 11.08V12a10 10 0 1 1-5.93-9.14"><animate attributeName="stroke-dashoffset" values="60;0" dur="0.4s" fill="freeze"></animate></path><polyline stroke-dasharray="30" stroke-dashoffset="30" points="22 4 12 14.01 9 11.01"><animate attributeName="stroke-dashoffset" values="30;0" dur="0.3s" begin="0.3s" fill="freeze"></animate></polyline></svg>`;
      icon.style.filter = 'none'; icon.style.opacity = '1';
      text.textContent = 'Solved';
      text.style.color = '#22c55e';
    } else if (status === 'answer_received') {
      icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke-dasharray="60" stroke-dashoffset="60" d="M22 11.08V12a10 10 0 1 1-5.93-9.14"><animate attributeName="stroke-dashoffset" values="60;0" dur="0.4s" fill="freeze"></animate></path><polyline stroke-dasharray="30" stroke-dashoffset="30" points="22 4 12 14.01 9 11.01"><animate attributeName="stroke-dashoffset" values="30;0" dur="0.3s" begin="0.3s" fill="freeze"></animate></polyline></svg>`;
      icon.style.filter = 'none'; icon.style.opacity = '1';
      text.textContent = 'Answer received';
      text.style.color = '#3b82f6';
    } else {
      icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle><circle cx="12" cy="12" r="3"><animate attributeName="r" values="3;4.5;3" dur="2s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"></animate></circle></svg>`;
      icon.style.filter = 'none'; icon.style.opacity = '1';
      text.textContent = 'No task detected';
      text.style.color = '#a0a0a0';
    }
  }

  // ─── Power Toggle ───
  function setEnabled(enabled) {
    const pauseIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    const playIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;

    if (enabled) {
      statusDot.className = 'dot active';
      statusText.textContent = 'Active';
      btnPower.classList.remove('off');
      powerIcon.innerHTML = pauseIcon;
    } else {
      statusDot.className = 'dot disabled';
      statusText.textContent = 'Paused';
      btnPower.classList.add('off');
      powerIcon.innerHTML = playIcon;
    }
  }

  btnPower.addEventListener('click', async () => {
    const settings = await getSettings();
    const newEnabled = settings.enabled === false;
    await updateSettings({ enabled: newEnabled });
    setEnabled(newEnabled);
  });

  // ─── Logout ───
  btnLogout.addEventListener('click', async () => {
    await updateSettings({ key: "", enabled: false });
    showAuthScreen();
  });

  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnActivate.click();
  });

  // ─── Live Updates (stream port + storage polling) ───
  try {
    const port = browser.runtime.connect({ name: 'stream' });
    port.onMessage.addListener(msg => {
      if (msg && msg.event === 'settingsUpdate' && msg.settings) {
        if (msg.settings.solver_status !== undefined) {
          setSolverStatus(msg.settings.solver_status);
        }
        if (msg.settings.enabled !== undefined) {
          setEnabled(msg.settings.enabled);
        }
      }
    });
  } catch (e) {}

  // Also poll storage for solver_status (set by cursor_bg.js webRequest tracking)
  let lastStatus = 'idle';
  setInterval(() => {
    browser.storage.local.get("settings", (result) => {
      if (result && result.settings && result.settings.solver_status) {
        if (result.settings.solver_status !== lastStatus) {
          lastStatus = result.settings.solver_status;
          setSolverStatus(lastStatus);
        }
      }
    });
  }, 500);

  // ─── Start ───
  init();
})();
