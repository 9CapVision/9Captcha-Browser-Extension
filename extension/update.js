// ─── 9Captcha Solver Extension ── update.js ───
// GitHub release notifier. This never downloads or installs code; the popup
// opens the release page for the user.

'use strict';

const UPDATE_REPO = '9CapVision/9Captcha-Browser-Extension';
const UPDATE_API = `https://api.github.com/repos/${UPDATE_REPO}/releases?per_page=100`;
const UPDATE_TAG_PREFIX = 'ext-v';
const UPDATE_FALLBACK_URL = `https://github.com/${UPDATE_REPO}/releases`;
const UPDATE_STATE_KEY = 'updateState';
const UPDATE_ALARM = '9c-update-check';
const UPDATE_CHECK_INTERVAL_MINUTES = 720;
const UPDATE_POPUP_STALE_MS = 6 * 60 * 60 * 1000;
const UPDATE_FETCH_TIMEOUT_MS = 10000;

const updatePorts = new Set();
let updateCheckPromise = null;

function getCurrentVersion() {
  try {
    return chrome.runtime.getManifest().version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function normalizeVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(value || '').replace(/^v/i, ''));
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

function compareVersions(a, b) {
  const left = normalizeVersion(a);
  const right = normalizeVersion(b);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  }
  return 0;
}

function parseReleaseTag(tag) {
  if (typeof tag !== 'string' || !tag.startsWith(UPDATE_TAG_PREFIX)) return null;
  const version = tag.slice(UPDATE_TAG_PREFIX.length);
  return /^\d+\.\d+\.\d+$/.test(version) ? version : null;
}

function isSafeReleaseUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const releasesPath = `/${UPDATE_REPO}/releases`;
    return parsed.protocol === 'https:' &&
      parsed.hostname === 'github.com' &&
      (parsed.pathname === releasesPath || parsed.pathname.startsWith(`${releasesPath}/`));
  } catch {
    return false;
  }
}

function pickLatestRelease(releases) {
  if (!Array.isArray(releases)) return null;
  let best = null;
  for (const release of releases) {
    if (!release || release.draft || release.prerelease) continue;
    const version = parseReleaseTag(release.tag_name);
    if (!version) continue;
    if (!best || compareVersions(version, best.version) > 0) {
      best = {
        version,
        url: isSafeReleaseUrl(release.html_url) ? release.html_url : UPDATE_FALLBACK_URL,
        name: typeof release.name === 'string' && release.name.trim()
          ? release.name.trim().slice(0, 120)
          : release.tag_name,
        publishedAt: typeof release.published_at === 'string' ? release.published_at : null
      };
    }
  }
  return best;
}

function storageGet(key) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.get(key, data => resolve(data && data[key] ? data[key] : null));
    } catch {
      resolve(null);
    }
  });
}

function storageSet(key, value) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    } catch {
      resolve();
    }
  });
}

async function getUpdateState() {
  const version = getCurrentVersion();
  const state = await storageGet(UPDATE_STATE_KEY);
  if (state && state.currentVersion === version) return state;
  if (state) {
    return {
      status: 'unknown',
      currentVersion: version,
      latestVersion: null,
      releaseUrl: null,
      releaseName: null,
      publishedAt: null,
      checkedAt: state.checkedAt || 0,
      lastAttemptAt: state.lastAttemptAt || 0
    };
  }
  return null;
}

function isStale(state) {
  if (!state || state.status === 'unknown') return true;
  const lastAttempt = state.lastAttemptAt || state.checkedAt || 0;
  return Date.now() - lastAttempt > UPDATE_POPUP_STALE_MS;
}

function broadcastState(state) {
  for (const port of updatePorts) {
    try {
      port.postMessage({ event: 'updateState', state });
    } catch {
      updatePorts.delete(port);
    }
  }
}

function sendState(port, state) {
  try {
    port.postMessage({ event: 'updateState', state });
  } catch {
    updatePorts.delete(port);
  }
}

function checkForUpdate({ force = false } = {}) {
  if (updateCheckPromise) return updateCheckPromise;

  const promise = (async () => {
    const previous = await getUpdateState();
    if (!force && previous && !isStale(previous)) return previous;

    const now = Date.now();
    const version = getCurrentVersion();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), UPDATE_FETCH_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(UPDATE_API, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) throw new Error('update check failed');
      const releases = await response.json();
      const latest = pickLatestRelease(releases);

      let state;
      if (!latest) {
        state = {
          status: 'no_release',
          currentVersion: version,
          latestVersion: null,
          releaseUrl: null,
          releaseName: null,
          publishedAt: null,
          checkedAt: now,
          lastAttemptAt: now
        };
      } else if (compareVersions(latest.version, version) > 0) {
        state = {
          status: 'available',
          currentVersion: version,
          latestVersion: latest.version,
          releaseUrl: latest.url,
          releaseName: latest.name,
          publishedAt: latest.publishedAt,
          checkedAt: now,
          lastAttemptAt: now
        };
      } else {
        state = {
          status: 'up_to_date',
          currentVersion: version,
          latestVersion: latest.version,
          releaseUrl: null,
          releaseName: null,
          publishedAt: null,
          checkedAt: now,
          lastAttemptAt: now
        };
      }

      await storageSet(UPDATE_STATE_KEY, state);
      broadcastState(state);
      return state;
    } catch {
      const state = previous && previous.currentVersion === version
        ? { ...previous, currentVersion: version, lastAttemptAt: now }
        : {
            status: 'error',
            currentVersion: version,
            latestVersion: null,
            releaseUrl: null,
            releaseName: null,
            publishedAt: null,
            checkedAt: 0,
            lastAttemptAt: now
          };
      await storageSet(UPDATE_STATE_KEY, state);
      broadcastState(state);
      return state;
    }
  })();

  updateCheckPromise = promise;
  promise.finally(() => {
    if (updateCheckPromise === promise) updateCheckPromise = null;
  });
  return promise;
}

function ensureUpdateAlarm() {
  try {
    chrome.alarms.get(UPDATE_ALARM, alarm => {
      if (!alarm) {
        chrome.alarms.create(UPDATE_ALARM, {
          delayInMinutes: 1,
          periodInMinutes: UPDATE_CHECK_INTERVAL_MINUTES
        });
      }
    });
  } catch {
    // The alarm is an optimization; the popup still checks on open.
  }
}

function registerUpdateListeners() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onConnect) return;

  chrome.runtime.onConnect.addListener(port => {
    if (!port || port.name !== 'update') return;
    updatePorts.add(port);
    port.onDisconnect.addListener(() => updatePorts.delete(port));
    port.onMessage.addListener(message => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'get') {
        getUpdateState().then(state => {
          sendState(port, state);
          if (isStale(state)) checkForUpdate({ force: false }).catch(() => {});
        }).catch(() => {});
      } else if (message.type === 'check') {
        checkForUpdate({ force: !!message.force })
          .then(state => sendState(port, state))
          .catch(() => {});
      }
    });
  });

  chrome.runtime.onInstalled.addListener(() => {
    ensureUpdateAlarm();
    checkForUpdate({ force: true }).catch(() => {});
  });

  chrome.runtime.onStartup.addListener(() => {
    ensureUpdateAlarm();
    checkForUpdate({ force: false }).catch(() => {});
  });

  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm && alarm.name === UPDATE_ALARM) {
      checkForUpdate({ force: true }).catch(() => {});
    }
  });

  ensureUpdateAlarm();
}

registerUpdateListeners();

export {
  UPDATE_REPO,
  UPDATE_TAG_PREFIX,
  UPDATE_STATE_KEY,
  compareVersions,
  normalizeVersion,
  parseReleaseTag,
  pickLatestRelease,
  isSafeReleaseUrl,
  isStale,
  getUpdateState,
  checkForUpdate
};
