importScripts('../shared/config.js', 'routing.js');

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!message || !sender.tab) {
    return;
  }
  const tabId = sender.tab.id;

  if (message.type === 'expectDownload') {
    (async function() {
      let subfolder = '';
      try {
        subfolder = (await HD.loadConfig()).subfolder;
      } catch (err) {
        console.warn('Hypeddit Downloader: could not load config', err);
      }
      try {
        await chrome.storage.session.set({
          pending: { tabId: tabId, at: Date.now(), subfolder: subfolder }
        });
      } catch (err) {
        console.warn('Hypeddit Downloader: could not store pending download', err);
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'cancelExpect') {
    (async function() {
      try {
        const stored = await chrome.storage.session.get('pending');
        if (stored.pending && stored.pending.tabId === tabId) {
          await chrome.storage.session.remove('pending');
        }
      } catch (err) {
        console.warn('Hypeddit Downloader: could not cancel pending download', err);
      }
    })();
  }
});

chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
  (async function() {
    let suggestion;
    let tabToClose = null;
    try {
      const stored = await chrome.storage.session.get('pending');
      const pending = stored.pending || null;
      const filename = HD.routeDownload(pending, Date.now(), item.filename);
      if (filename) {
        suggestion = { filename: filename, conflictAction: 'uniquify' };
        await chrome.storage.session.remove('pending');
        chrome.tabs.sendMessage(pending.tabId, {
          type: 'downloadStarted',
          filename: filename
        }).catch(function() {});
        tabToClose = pending.tabId;
      }
    } catch (err) {
      console.warn('Hypeddit Downloader: download routing failed', err);
    }
    suggest(suggestion);
    // The download carries on without the gate page, so close it.
    if (tabToClose !== null) {
      chrome.tabs.remove(tabToClose).catch(function() {});
    }
  })();
  return true;
});
