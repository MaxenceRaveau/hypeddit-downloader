globalThis.HD = globalThis.HD || {};

/**
 * Sanitizes a subfolder path string:
 * - Trims whitespace
 * - Replaces backslashes with forward slashes
 * - Drops empty, '.', and '..' segments
 * - Removes illegal chars: <>":|?* and control chars from each segment
 * - Trims trailing dots and spaces from each segment
 * - Joins remaining segments with '/'
 * - Returns empty string if result is empty
 *
 * @param {string} input - The subfolder path to sanitize
 * @returns {string} The sanitized path, or empty string
 */
HD.sanitizeSubfolder = function(input) {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim and replace backslashes with forward slashes
  let normalized = input.trim().replace(/\\/g, '/');

  // Split by / and process each segment
  let segments = normalized.split('/');
  let cleaned = [];

  for (let segment of segments) {
    // Skip empty, '.', and '..' segments
    if (!segment || segment === '.' || segment === '..') {
      continue;
    }

    // Remove illegal characters: < > " : | ? * and control chars (0x00-0x1F, 0x7F)
    segment = segment.replace(/[<>":|?*\x00-\x1F\x7F]/g, '');

    // Trim trailing dots and spaces from each segment
    segment = segment.replace(/[\s.]+$/, '');

    // Only add non-empty segments
    if (segment) {
      cleaned.push(segment);
    }
  }

  // Join and return
  return cleaned.join('/');
};

/**
 * Loads configuration from chrome.storage.sync.
 * Returns an object with firstName, email, and subfolder (already sanitized).
 * Each key defaults to empty string if not found.
 *
 * @returns {Promise<{firstName: string, email: string, subfolder: string}>}
 */
HD.loadConfig = async function() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      ['firstName', 'email', 'subfolder'],
      function(result) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const config = {
          firstName: result.firstName || '',
          email: result.email || '',
          subfolder: HD.sanitizeSubfolder(result.subfolder || '')
        };

        resolve(config);
      }
    );
  });
};
