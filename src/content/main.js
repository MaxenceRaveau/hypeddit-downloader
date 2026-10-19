globalThis.HD = globalThis.HD || {};

(async function() {
  if (!HD.isGatePage(document)) {
    return;
  }

  const STOP_PREFIX = 'Hypeddit Downloader stopped: ';
  const DOWNLOAD_TIMEOUT_MS = 30000;
  const READY_TIMEOUT_MS = 3000;

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
   * Neither promise rejects. ready resolves once the worker acknowledged (or after 3 s);
   * result resolves the filename, or null on timeout.
   * @returns {{ready: Promise<void>, result: Promise<string|null>}}
   */
  function expectDownload() {
    let timer = null;
    let resolveResult;
    const result = new Promise(function(resolve) { resolveResult = resolve; });

    function settle(value) {
      chrome.runtime.onMessage.removeListener(onMessage);
      clearTimeout(timer);
      resolveResult(value);
    }

    function onMessage(message) {
      if (message && message.type === 'downloadStarted') {
        settle(message.filename || null);
      }
    }

    chrome.runtime.onMessage.addListener(onMessage);
    timer = setTimeout(function() {
      settle(null);
      try {
        const cancelled = chrome.runtime.sendMessage({ type: 'cancelExpect' });
        if (cancelled && typeof cancelled.catch === 'function') {
          cancelled.catch(function() {});
        }
      } catch (err) {
        // fire and forget
      }
    }, DOWNLOAD_TIMEOUT_MS);

    const ready = new Promise(function(resolve) {
      const readyTimer = setTimeout(resolve, READY_TIMEOUT_MS);
      function done() {
        clearTimeout(readyTimer);
        resolve();
      }
      try {
        const sent = chrome.runtime.sendMessage({ type: 'expectDownload' });
        if (sent && typeof sent.then === 'function') {
          sent.then(done, done);
        } else {
          done();
        }
      } catch (err) {
        done();
      }
    });

    return { ready: ready, result: result };
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
