globalThis.HD = globalThis.HD || {};

(async function() {
  if (!HD.isGatePage(document)) {
    return;
  }

  const STOP_PREFIX = 'Hypeddit Downloader stopped: ';
  const DOWNLOAD_TIMEOUT_MS = 30000;

  let config;
  try {
    config = await HD.loadConfig();
  } catch (err) {
    console.warn('Hypeddit Downloader: could not load config', err);
    HD.notice.show(STOP_PREFIX + 'name or email not set in the extension settings', 'error');
    return;
  }

  /**
   * Ask the worker to route the next download, then wait for it to start.
   * Never rejects: resolves the filename, or null on timeout or error.
   * @returns {Promise<string|null>}
   */
  function expectDownload() {
    return new Promise(function(resolve) {
      let timer = null;

      function settle(value) {
        chrome.runtime.onMessage.removeListener(onMessage);
        clearTimeout(timer);
        resolve(value);
      }

      function onMessage(message) {
        if (message && message.type === 'downloadStarted') {
          settle(message.filename || null);
        }
      }

      chrome.runtime.onMessage.addListener(onMessage);
      timer = setTimeout(function() { settle(null); }, DOWNLOAD_TIMEOUT_MS);

      try {
        const sent = chrome.runtime.sendMessage({ type: 'expectDownload' });
        if (sent && typeof sent.catch === 'function') {
          sent.catch(function() { settle(null); });
        }
      } catch (err) {
        settle(null);
      }
    });
  }

  let result;
  try {
    result = await HD.runGate(document, config, {
      onProgress: function(stepName) {
        HD.notice.show('Hypeddit Downloader: ' + stepName + '…', 'progress');
      },
      expectDownload: expectDownload
    });
  } catch (err) {
    console.warn('Hypeddit Downloader: run failed', err);
    result = { ok: false, reason: HD.UNKNOWN_REASON };
  }

  if (result.ok) {
    HD.notice.show('Hypeddit Downloader: downloaded to ' + (config.subfolder || 'Downloads'), 'success');
  } else {
    HD.notice.show(STOP_PREFIX + result.reason, 'error');
  }
})();
