globalThis.HD = globalThis.HD || {};

const HD_SETTINGS_REASON = 'name or email not set in the extension settings';

/**
 * Turn an error thrown by a step handler into a stop reason.
 * @param {Error} err
 * @returns {string}
 */
HD.reasonFromError = function(err) {
  if (err && err.message === HD_SETTINGS_REASON) {
    return err.message;
  }
  console.warn('Hypeddit Downloader: step failed', err);
  return HD.UNKNOWN_REASON;
};

/**
 * Drive the gate page from its current state to a download or a stop reason.
 * @param {Document|Element} root
 * @param {Object} config
 * @param {Object} deps
 * @param {() => {ready: Promise<void>, result: Promise<string|null>}} deps.expectDownload
 *   ready resolves once the download is armed (or after a short timeout); result resolves
 *   with the filename or null. Neither promise rejects.
 * @param {(stepName: string) => void} [deps.onProgress]
 * @param {number} [deps.stepTimeoutMs]
 * @param {number} [deps.maxAttempts]
 * @param {number} [deps.maxIterations]
 * @returns {Promise<{ok: true, filename: string}|{ok: false, reason: string}>}
 */
HD.runGate = async function(root, config, deps) {
  const {
    expectDownload,
    onProgress,
    stepTimeoutMs = 10000,
    maxAttempts = 2,
    maxIterations = 20
  } = deps;

  let lastName = null;
  let attempts = 0;

  for (let iteration = 0; ; iteration++) {
    if (iteration > maxIterations) {
      return lastName
        ? { ok: false, reason: `step "${lastName}" did not advance the page` }
        : { ok: false, reason: HD.UNKNOWN_REASON };
    }

    const detected = await HD.waitFor(() => {
      const d = HD.detectStep(root);
      return d.kind !== 'none' && d;
    }, { timeoutMs: stepTimeoutMs });

    if (!detected) {
      return { ok: false, reason: HD.UNKNOWN_REASON };
    }
    if (detected.kind === 'stop') {
      return { ok: false, reason: detected.reason };
    }

    const step = detected.step;
    const name = step.name;

    if (name !== lastName) {
      lastName = name;
      attempts = 0;
    }
    if (attempts >= (step.maxAttempts || maxAttempts)) {
      return { ok: false, reason: step.stuckReason || `step "${name}" did not advance the page` };
    }
    attempts++;

    if (onProgress) {
      onProgress(name);
    }

    if (name === 'finish') {
      const { ready, result } = expectDownload();
      await ready;
      try {
        await step.run(root, config);
      } catch (err) {
        return { ok: false, reason: HD.reasonFromError(err) };
      }
      const filename = await result;
      return filename
        ? { ok: true, filename }
        : { ok: false, reason: 'no download started' };
    }

    try {
      await step.run(root, config);
    } catch (err) {
      return { ok: false, reason: HD.reasonFromError(err) };
    }

    // Give the page time to move on; if it doesn't, the next turn retries or gives up.
    await HD.waitFor(() => {
      const d = HD.detectStep(root);
      return !(d.kind === 'step' && d.step.name === name);
    }, { timeoutMs: step.timeoutMs || stepTimeoutMs });
  }
};
