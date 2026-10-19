globalThis.HD = globalThis.HD || {};

HD.notice = HD.notice || {};

/**
 * Show a notice on the page.
 * Creates or updates a fixed-position notice element (#hd-notice) at top-right.
 * Survives being called before document.body exists by deferring attachment.
 * @param {string} text - The notice text
 * @param {string} kind - 'progress', 'success', or 'error'
 */
HD.notice.show = function(text, kind) {
  let notice = document.getElementById('hd-notice');

  // If notice doesn't exist, create it
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'hd-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');

    // Append to body if it exists, otherwise to documentElement
    const parent = document.body || document.documentElement;
    parent.appendChild(notice);
  }

  // Set inline styles based on kind
  const bgColor = kind === 'progress' ? '#757575' : kind === 'success' ? '#4CAF50' : '#f44336';

  notice.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 2147483647; background-color: ${bgColor}; color: white; padding: 12px 16px; border-radius: 4px; font-family: Arial, sans-serif; font-size: 14px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);`;

  notice.textContent = text;
};
