globalThis.HD = globalThis.HD || {};

HD.UNKNOWN_REASON = "encountered a type of Hypeddit page it doesn't know yet";

/**
 * True iff the page is a Hypeddit gate page.
 * @param {Document|Element} root
 * @returns {boolean}
 */
HD.isGatePage = function(root) {
  return Boolean(root.querySelector('#downloadProcess') || root.querySelector('#all_steps'));
};

HD.SKIP_STEPS = [
  { name: 'spotify', skip: '#skipper[data-step="sp"]' },
  { name: 'tiktok', skip: '#skipper_tk' },
  { name: 'youtube', skip: '#skipper_yt' },
  { name: 'instagram', skip: '#skipper_ig' },
  { name: 'twitch', skip: '#skipper_th' }
];

HD.steps = [
  {
    name: 'start',
    detect(root) {
      return HD.isVisible(root.querySelector('#downloadProcess')) &&
        !HD.isVisible(root.querySelector('#all_steps'));
    },
    async run(root) {
      root.querySelector('#downloadProcess').click();
    }
  },
  {
    name: 'email',
    detect(root) {
      return HD.isActive(root.querySelector('#step_email'));
    },
    async run(root, config) {
      if (!config.firstName || !config.email) {
        throw new Error('name or email not set in the extension settings');
      }
      HD.setInputValue(root.querySelector('#email_name'), config.firstName);
      HD.setInputValue(root.querySelector('#email_address'), config.email);
      root.querySelector('#email_to_downloads_next').click();
    }
  },
  {
    name: 'soundcloud',
    detect(root) {
      return HD.isActive(root.querySelector('#step_sc'));
    },
    async run(root) {
      const buttons = root.querySelectorAll('#step_sc a.hype-btn-soundcloud.undone');
      for (const button of buttons) {
        button.classList.replace('undone', 'done');
      }
      const nextBtn = root.querySelector('#skipper_sc_next');
      if (nextBtn) {
        nextBtn.click();
      } else {
        root.querySelector('#skipper_sc_channel').click();
      }
    }
  },
  ...HD.SKIP_STEPS.map(({ name, skip }) => ({ name, detect(root) { return HD.isActive(root.querySelector(skip)); }, async run(root) { root.querySelector(skip).click(); } })),
  {
    name: 'twitch-connect',
    maxAttempts: 1,
    timeoutMs: 20000,
    stuckReason: "Twitch connect didn't complete. Allow pop-ups for hypeddit.com and connect to Twitch once manually",
    detect(root) {
      return HD.isActive(root.querySelector('#login_to_th'));
    },
    async run(root) {
      root.querySelector('#login_to_th').click();
    }
  },
  {
    name: 'finish',
    detect(root) {
      return HD.isActive(root.querySelector('#gateDownloadButton'));
    },
    async run(root) {
      root.querySelector('#gateDownloadButton').click();
    }
  }
];

/**
 * Decide what to do next on the page.
 * @param {Document|Element} root
 * @returns {{kind: 'step', step: Object}|{kind: 'stop', reason: string}|{kind: 'none'}}
 */
HD.detectStep = function(root) {
  if (HD.isVisible(root.querySelector('#gatePreviewCaptcha'))) {
    return { kind: 'stop', reason: 'captcha required' };
  }

  const stepSc = root.querySelector('#step_sc');
  if (HD.isActive(stepSc) &&
      stepSc.querySelector('.hype-btn-social:not(.hype-btn-soundcloud)')) {
    return { kind: 'stop', reason: HD.UNKNOWN_REASON };
  }

  const step = HD.steps.find((s) => s.detect(root));
  if (step) {
    return { kind: 'step', step };
  }

  if (HD.isVisible(root.querySelector('#all_steps'))) {
    return { kind: 'stop', reason: HD.UNKNOWN_REASON };
  }

  return { kind: 'none' };
};
