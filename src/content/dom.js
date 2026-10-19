globalThis.HD = globalThis.HD || {};

/**
 * Check if an element is visible.
 * An element is visible if it exists and getClientRects().length > 0 and computed visibility !== 'hidden'.
 * @param {Element|null} el
 * @returns {boolean}
 */
HD.isVisible = function(el) {
  if (!el) {
    return false;
  }
  if (el.getClientRects().length === 0) {
    return false;
  }
  const computed = window.getComputedStyle(el);
  if (computed.visibility === 'hidden') {
    return false;
  }
  return true;
};

/**
 * Check if an element is visible and not inside an inactive gate slide.
 * Inactive slides stay rendered (opacity 0, z-index -1), so visibility alone is not enough.
 * @param {Element|null} el
 * @returns {boolean}
 */
HD.isActive = function(el) {
  return HD.isVisible(el) &&
    !el.closest('.fangate-slider-content.upcomming-slide, .fangate-slider-content.move-left');
};

/**
 * Set input value and dispatch input and change events.
 * @param {HTMLInputElement} input
 * @param {string} value
 */
HD.setInputValue = function(input, value) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

/**
 * Wait for a predicate to return truthy.
 * @param {() => any} predicate
 * @param {Object} options
 * @param {number} options.timeoutMs - default 10000
 * @param {number} options.intervalMs - default 200
 * @returns {Promise<any>}
 */
HD.waitFor = function(predicate, options = {}) {
  const { timeoutMs = 10000, intervalMs = 200 } = options;

  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkPredicate = () => {
      let result;
      try {
        result = predicate();
      } catch (err) {
        result = null;
      }
      if (result) {
        resolve(result);
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        resolve(null);
        return;
      }

      setTimeout(checkPredicate, intervalMs);
    };

    checkPredicate();
  });
};

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
HD.sleep = function(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
