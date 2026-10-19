globalThis.HD = globalThis.HD || {};

HD.notice = HD.notice || {};

let dismissed = false;

/**
 * Show a notice on the page.
 * Creates or updates a fixed-position notice element (#hd-notice) at top-right.
 * Survives being called before document.body exists by deferring attachment.
 * Once dismissed by the user, does nothing for the rest of the page's life.
 * @param {string} text - The notice text
 * @param {string} kind - 'progress', 'success', or 'error'
 */
HD.notice.show = function(text, kind) {
  if (dismissed) {
    return;
  }

  let notice = document.getElementById('hd-notice');

  // If notice doesn't exist, create it
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'hd-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');

    // Create text span and close button
    const textSpan = document.createElement('span');
    textSpan.id = 'hd-notice-text';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = 'background: transparent; border: none; color: inherit; cursor: pointer; font-size: 20px; padding: 0; margin-left: 8px; vertical-align: middle;';

    closeBtn.addEventListener('click', function() {
      notice.remove();
      dismissed = true;
    });

    notice.appendChild(textSpan);
    notice.appendChild(closeBtn);

    // Append to body if it exists, otherwise to documentElement
    const parent = document.body || document.documentElement;
    parent.appendChild(notice);
  }

  // Set inline styles based on kind
  const bgColor = kind === 'progress' ? '#757575' : kind === 'success' ? '#4CAF50' : '#f44336';

  notice.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 2147483647; background-color: ${bgColor}; color: white; padding: 12px 16px; border-radius: 4px; font-family: Arial, sans-serif; font-size: 14px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);`;

  const textSpan = notice.querySelector('#hd-notice-text');
  textSpan.textContent = text;
};
