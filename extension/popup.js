// ─── 9Captcha Solver Extension ── popup.js ───

(function () {
  'use strict';

  const BACKEND_URL = 'https://9captcha-api.pridesmp.fun';

  // ─── DOM References ───
  const authScreen = document.getElementById('auth-screen');
  const mainScreen = document.getElementById('main-screen');
  const apiKeyInput = document.getElementById('api-key-input');
  const btnActivate = document.getElementById('btn-activate');
  const authError = document.getElementById('auth-error');
  const statInternalKey = document.getElementById('stat-internal-key');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const btnPower = document.getElementById('btn-power');
  const powerIcon = document.getElementById('power-icon');
  const btnLogout = document.getElementById('btn-logout');

  // ─── Storage Helpers ───
  function getSettings() {
      return new Promise(resolve => {
          const nonce = Date.now().toString() + Math.random().toString();
          chrome.runtime.sendMessage([nonce, "settings::get", []], resp => {
              resolve(resp ? resp[1] : {});
          });
      });
  }

  function updateSettings(overrides) {
      return new Promise(resolve => {
          const nonce = Date.now().toString() + Math.random().toString();
          chrome.runtime.sendMessage([nonce, "settings::update", overrides], resp => {
              resolve();
          });
      });
  }

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
    if (statInternalKey) {
      statInternalKey.textContent = (settings.key && settings.key.substring(0, 16) + '...') || 'Not Set';
    }
  }

  // ─── API Key Activation ───
  btnActivate.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      authError.textContent = 'Please enter your API key';
      return;
    }
    if (!key.startsWith('9cap-')) {
      authError.textContent = 'Invalid key format. Keys start with 9cap-';
      return;
    }

    btnActivate.disabled = true;
    btnActivate.textContent = 'Validating...';
    authError.textContent = '';

    try {
      const resp = await fetch(`${BACKEND_URL}/api/usage?key=${encodeURIComponent(key)}`);
      // Update settings with the key, enabling it, AND overriding the base_api to our proxy server!
      await updateSettings({ key: key, base_api: "https://9captcha-api.pridesmp.fun/api/ext", enabled: true });
      showMainScreen({ key: key, enabled: true });
    } catch (e) {
      authError.textContent = e.message || 'Failed to validate key';
      await updateSettings({ key: key, base_api: "https://9captcha-api.pridesmp.fun/api/ext", enabled: true });
      showMainScreen({ key: key, enabled: true });
    } finally {
      btnActivate.disabled = false;
      btnActivate.textContent = 'Activate';
    }
  });

  // ─── Solver Status Updates ───
  function setSolverStatus(status) {
    const icon = document.getElementById('solver-status-icon');
    const text = document.getElementById('solver-status-text');
    
    if (status === 'solving') {
      icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle><path d="M12 2a10 10 0 0 1 10 10"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"></animateTransform></path></svg>`;
      icon.style.filter = 'none';
      icon.style.opacity = '1';
      icon.classList.remove('spin-anim'); // Let SVG handle the animation
      text.textContent = 'Solving...';
      text.style.color = '#eab308'; // yellow
    } else if (status === 'solved') {
      icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke-dasharray="60" stroke-dashoffset="60" d="M22 11.08V12a10 10 0 1 1-5.93-9.14"><animate attributeName="stroke-dashoffset" values="60;0" dur="0.4s" fill="freeze"></animate></path><polyline stroke-dasharray="30" stroke-dashoffset="30" points="22 4 12 14.01 9 11.01"><animate attributeName="stroke-dashoffset" values="30;0" dur="0.3s" begin="0.3s" fill="freeze"></animate></polyline></svg>`;
      icon.style.filter = 'none';
      icon.style.opacity = '1';
      icon.classList.remove('spin-anim');
      text.textContent = 'Solved';
      text.style.color = '#22c55e'; // green
    } else {
      icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle><circle cx="12" cy="12" r="3"><animate attributeName="r" values="3;4.5;3" dur="2s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"></animate></circle></svg>`;
      icon.style.filter = 'none';
      icon.style.opacity = '1';
      icon.classList.remove('spin-anim');
      text.textContent = 'No task detected';
      text.style.color = '#a0a0a0'; // gray
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

  // ─── Live Updates ───
  const port = chrome.runtime.connect({ name: 'stream' });
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

  // ─── Start ───
  init();
})();
