globalThis.HD = globalThis.HD || {};

/**
 * Decide where a download should go.
 * @param {{tabId: number, at: number, subfolder: string}|null} pending
 * @param {number} now
 * @param {string} filename - The browser's suggested filename (may contain / or \)
 * @returns {string|null} The routed filename, or null to leave the download untouched
 */
HD.routeDownload = function(pending, now, filename) {
  if (!pending || now - pending.at > 60000) {
    return null;
  }
  const base = String(filename).split(/[\\/]/).pop();
  return pending.subfolder ? pending.subfolder + '/' + base : base;
};
