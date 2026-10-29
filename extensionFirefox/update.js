// ─── 9Captcha Solver Extension (Firefox) ── update.js ───
// GitHub release notifier. This never downloads or installs code; the popup
// opens the release page for the user.

(function () {
  'use strict';

  var UPDATE_REPO = '9CapVision/9Captcha-Browser-Extension';
  var UPDATE_API = 'https://api.github.com/repos/' + UPDATE_REPO + '/releases?per_page=100';
  var UPDATE_TAG_PREFIX = 'ext-v';
  var UPDATE_FALLBACK_URL = 'https://github.com/' + UPDATE_REPO + '/releases';
  var UPDATE_STATE_KEY = 'updateState';
  var UPDATE_ALARM = '9c-update-check';
  var UPDATE_CHECK_INTERVAL_MINUTES = 720;
  var UPDATE_POPUP_STALE_MS = 6 * 60 * 60 * 1000;
  var UPDATE_FETCH_TIMEOUT_MS = 10000;

  var updatePorts = new Set();
  var updateCheckPromise = null;

  function getCurrentVersion() {
    try {
      return browser.runtime.getManifest().version || '0.0.0';
    } catch (e) {
      return '0.0.0';
    }
  }

  function normalizeVersion(value) {
    var match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(value || '').replace(/^v/i, ''));
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
  }

  function compareVersions(a, b) {
    var left = normalizeVersion(a);
    var right = normalizeVersion(b);
    for (var i = 0; i < 3; i++) {
      if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
    }
    return 0;
  }

  function parseReleaseTag(tag) {
    if (typeof tag !== 'string' || tag.indexOf(UPDATE_TAG_PREFIX) !== 0) return null;
    var version = tag.slice(UPDATE_TAG_PREFIX.length);
    return /^\d+\.\d+\.\d+$/.test(version) ? version : null;
  }

  function isSafeReleaseUrl(url) {
    if (typeof url !== 'string') return false;
    try {
      var parsed = new URL(url);
      var releasesPath = '/' + UPDATE_REPO + '/releases';
      return parsed.protocol === 'https:' &&
        parsed.hostname === 'github.com' &&
        (parsed.pathname === releasesPath || parsed.pathname.indexOf(releasesPath + '/') === 0);
    } catch (e) {
      return false;
    }
  }

  function pickLatestRelease(releases) {
    if (!Array.isArray(releases)) return null;
    var best = null;
    for (var i = 0; i < releases.length; i++) {
      var release = releases[i];
      if (!release || release.draft || release.prerelease) continue;
      var version = parseReleaseTag(release.tag_name);
      if (!version) continue;
      if (!best || compareVersions(version, best.version) > 0) {
        best = {
          version: version,
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
    return Promise.resolve()
      .then(function () { return browser.storage.local.get(key); })
      .then(function (data) { return data && data[key] ? data[key] : null; })
      .catch(function () { return null; });
  }

  function storageSet(key, value) {
    var values = {};
    values[key] = value;
    return Promise.resolve()
      .then(function () { return browser.storage.local.set(values); })
      .catch(function () {});
  }

  function getUpdateState() {
    var version = getCurrentVersion();
    return storageGet(UPDATE_STATE_KEY).then(function (state) {
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
    });
  }

  function isStale(state) {
    if (!state || state.status === 'unknown') return true;
    var lastAttempt = state.lastAttemptAt || state.checkedAt || 0;
    return Date.now() - lastAttempt > UPDATE_POPUP_STALE_MS;
  }

  function broadcastState(state) {
    updatePorts.forEach(function (port) {
      try {
        port.postMessage({ event: 'updateState', state: state });
      } catch (e) {
        updatePorts.delete(port);
      }
    });
  }

  function sendState(port, state) {
    try {
      port.postMessage({ event: 'updateState', state: state });
    } catch (e) {
      updatePorts.delete(port);
    }
  }

  function checkForUpdate(options) {
    var force = !!(options && options.force);
    if (updateCheckPromise) return updateCheckPromise;

    var promise = (function () {
      var previousState = null;
      var currentVersion = getCurrentVersion();

      return getUpdateState().then(function (previous) {
        previousState = previous;
        if (!force && previous && !isStale(previous)) return previous;

        var now = Date.now();
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, UPDATE_FETCH_TIMEOUT_MS);

        return fetch(UPDATE_API, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          signal: controller.signal
        }).then(function (response) {
          clearTimeout(timeout);
          if (!response.ok) throw new Error('update check failed');
          return response.json();
        }, function (error) {
          clearTimeout(timeout);
          throw error;
        }).then(function (releases) {
          var latest = pickLatestRelease(releases);
          var state;
          if (!latest) {
            state = {
              status: 'no_release',
              currentVersion: currentVersion,
              latestVersion: null,
              releaseUrl: null,
              releaseName: null,
              publishedAt: null,
              checkedAt: now,
              lastAttemptAt: now
            };
          } else if (compareVersions(latest.version, currentVersion) > 0) {
            state = {
              status: 'available',
              currentVersion: currentVersion,
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
              currentVersion: currentVersion,
              latestVersion: latest.version,
              releaseUrl: null,
              releaseName: null,
              publishedAt: null,
              checkedAt: now,
              lastAttemptAt: now
            };
          }
          return storageSet(UPDATE_STATE_KEY, state).then(function () {
            broadcastState(state);
            return state;
          });
        }, function () {
          var state = previousState && previousState.currentVersion === currentVersion
            ? Object.assign({}, previousState, { currentVersion: currentVersion, lastAttemptAt: now })
            : {
                status: 'error',
                currentVersion: currentVersion,
                latestVersion: null,
                releaseUrl: null,
                releaseName: null,
                publishedAt: null,
                checkedAt: 0,
                lastAttemptAt: now
              };
          return storageSet(UPDATE_STATE_KEY, state).then(function () {
            broadcastState(state);
            return state;
          });
        });
      });
    })();

    updateCheckPromise = promise;
    promise.finally(function () {
      if (updateCheckPromise === promise) updateCheckPromise = null;
    });
    return promise;
  }

  function ensureUpdateAlarm() {
    try {
      browser.alarms.get(UPDATE_ALARM).then(function (alarm) {
        if (!alarm) {
          browser.alarms.create(UPDATE_ALARM, {
            delayInMinutes: 1,
            periodInMinutes: UPDATE_CHECK_INTERVAL_MINUTES
          });
        }
      }).catch(function () {});
    } catch (e) {
      // The alarm is an optimization; the popup still checks on open.
    }
  }

  function registerUpdateListeners() {
    if (typeof browser === 'undefined' || !browser.runtime || !browser.runtime.onConnect) return;

    browser.runtime.onConnect.addListener(function (port) {
      if (!port || port.name !== 'update') return;
      updatePorts.add(port);
      port.onDisconnect.addListener(function () { updatePorts.delete(port); });
      port.onMessage.addListener(function (message) {
        if (!message || typeof message !== 'object') return;
        if (message.type === 'get') {
          getUpdateState().then(function (state) {
            sendState(port, state);
            if (isStale(state)) checkForUpdate({ force: false }).catch(function () {});
          }).catch(function () {});
        } else if (message.type === 'check') {
          checkForUpdate({ force: !!message.force })
            .then(function (state) { sendState(port, state); })
            .catch(function () {});
        }
      });
    });

    if (browser.runtime.onInstalled) {
      browser.runtime.onInstalled.addListener(function () {
        ensureUpdateAlarm();
        checkForUpdate({ force: true }).catch(function () {});
      });
    }

    if (browser.runtime.onStartup) {
      browser.runtime.onStartup.addListener(function () {
        ensureUpdateAlarm();
        checkForUpdate({ force: false }).catch(function () {});
      });
    }

    if (browser.alarms && browser.alarms.onAlarm) {
      browser.alarms.onAlarm.addListener(function (alarm) {
        if (alarm && alarm.name === UPDATE_ALARM) {
          checkForUpdate({ force: true }).catch(function () {});
        }
      });
    }

    ensureUpdateAlarm();
  }

  registerUpdateListeners();

  // Test hook: lets the Node test suite exercise the pure helpers.
  if (typeof globalThis !== 'undefined') {
    globalThis.__9cUpdate = {
      UPDATE_REPO: UPDATE_REPO,
      UPDATE_TAG_PREFIX: UPDATE_TAG_PREFIX,
      UPDATE_STATE_KEY: UPDATE_STATE_KEY,
      compareVersions: compareVersions,
      normalizeVersion: normalizeVersion,
      parseReleaseTag: parseReleaseTag,
      pickLatestRelease: pickLatestRelease,
      isSafeReleaseUrl: isSafeReleaseUrl,
      isStale: isStale,
      getUpdateState: getUpdateState,
      checkForUpdate: checkForUpdate
    };
  }
})();
