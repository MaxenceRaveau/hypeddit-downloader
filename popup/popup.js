/**
 * Load settings from chrome.storage.sync and populate form
 */
async function loadSettings() {
  try {
    const config = await HD.loadConfig();
    document.getElementById('firstName').value = config.firstName;
    document.getElementById('email').value = config.email;
    document.getElementById('subfolder').value = config.subfolder;
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('Failed to load settings', 'error');
  }
}

/**
 * Save settings to chrome.storage.sync
 */
async function saveSettings() {
  const firstName = document.getElementById('firstName').value.trim();
  const email = document.getElementById('email').value.trim();
  const subfolderInput = document.getElementById('subfolder').value;

  // Sanitize the subfolder
  const subfolder = HD.sanitizeSubfolder(subfolderInput);

  // Write the trimmed and sanitized values back
  document.getElementById('firstName').value = firstName;
  document.getElementById('email').value = email;
  document.getElementById('subfolder').value = subfolder;

  try {
    await new Promise((resolve, reject) => {
      chrome.storage.sync.set(
        {
          firstName: firstName,
          email: email,
          subfolder: subfolder
        },
        function() {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        }
      );
    });

    showStatus('Saved', 'success');

    // Clear the status message after 3 seconds
    setTimeout(() => {
      clearStatus();
    }, 3000);
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

/**
 * Show status message
 */
function showStatus(message, statusClass) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = statusClass || '';
}

/**
 * Clear status message
 */
function clearStatus() {
  const statusElement = document.getElementById('status');
  statusElement.textContent = '';
  statusElement.className = '';
}

/**
 * Initialize the popup
 */
function init() {
  loadSettings();

  const saveButton = document.getElementById('saveButton');
  saveButton.addEventListener('click', saveSettings);
}

// Load settings when popup opens
document.addEventListener('DOMContentLoaded', init);
