# Hypeddit Downloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Chrome extension that clears Hypeddit download gates automatically and saves the file into a configured subfolder of Chrome's download folder.

**Architecture:** A content script runs on hypeddit.com, exits silently unless the page has a gate (`#downloadProcess`), then loops: detect the visible step → run its handler → wait for the page to change, until the finish step's download is clicked. Step handlers live in one registry so new steps are one entry. A classic service worker routes the next download after an "expect download" message into the subfolder and reports back so the page can show "Downloaded" or "Stopped: …".

**Tech Stack:** Plain JavaScript, Manifest V3, no build tools, no npm.

**Spec:** `docs/specs/2026-10-19-hypeddit-downloader-design.md`

## Global Constraints

- **User decision: no automated tests.** Verification is a syntax check plus manual checks in Chrome.
- Manifest V3; loaded unpacked; no dependencies, no bundler.
- Content scripts are classic scripts sharing one namespace: every file starts with `globalThis.HD = globalThis.HD || {};` and attaches to `HD`. The service worker is classic too and loads shared code with `importScripts`.
- Content script matches: `https://hypeddit.com/*`, `https://www.hypeddit.com/*`.
- Permissions: `storage`, `downloads`. Host permissions: the two hypeddit patterns above.
- Config keys in `chrome.storage.sync`: `firstName`, `email`, `subfolder`.
- Selectors (verified on the live page 2026-10-19):
  - gate start button `#downloadProcess`; gate steps container `#all_steps`
  - email step `#step_email`, inputs `input.hype-form-control[name="email_name"]`, `input.hype-form-control[name="email_address"]`, next `#email_to_downloads_next`
  - SoundCloud step `#step_sc`, buttons `a.hype-btn-social.hype-btn-soundcloud.undone` inside it, next `#skipper_sc_channel`
  - finish: `#gateDownloadButton` visible (primary); text "Thank you for your support" case-insensitive (secondary)
  - captcha `#gatePreviewCaptcha` (stop if visible)
- "Visible" = `HD.isVisible(el)`: element exists and `el.getClientRects().length > 0` and computed `visibility !== 'hidden'`.
- SoundCloud validation is the class swap `undone` → `done`; never open tabs.
- Notice copy (exact): progress `Hypeddit Downloader: <step name>…`; success `Hypeddit Downloader: downloaded to <subfolder or "Downloads">`; stop `Hypeddit Downloader stopped: <reason>`.
- Stop reasons (exact): `encountered a type of Hypeddit page it doesn't know yet`, `name or email not set in the extension settings`, `step "<name>" did not advance the page`, `captcha required`, `no download started`.
- Only the download following an `expectDownload` message (within 60 s) is routed to the subfolder; all other downloads untouched.
- Self-check before committing: re-read each file for syntax errors and confirm every `HD.*` name used matches the Interfaces blocks exactly.

## Review Focus

Reviewers check these by reading the code, since there are no tests:

1. Captcha shown (`#gatePreviewCaptcha` visible) → stop with `captcha required`, never click through.
2. `#step_sc` contains a non-SoundCloud social button (e.g. `hype-btn-spotify`) → unknown step, stop; do not swap only the SoundCloud ones.
3. A handler runs but the same step is still visible after it → stop with `step "<name>" did not advance the page` after 2 attempts, no infinite loop.
4. `#gateDownloadButton` clicked but no download arrives → `no download started` after 30 s.
5. A hypeddit.com page with no gate (home, profile) → script does nothing, no notice.

---

### Task 1: Scaffold and shared config

**Files:**
- Create: `manifest.json`, `src/shared/config.js`, `.gitignore`, `README.md`

**Interfaces:**
- Produces:
  - `HD.sanitizeSubfolder(input: string) -> string`: trims; replaces `\` with `/`; drops empty, `.` and `..` segments; removes chars `<>:"|?*` and control chars from each segment; trims trailing dots/spaces per segment; joins with `/`. Empty result → `''`. Examples: `' Hypeddit '`→`'Hypeddit'`, `'Music\\Promos/'`→`'Music/Promos'`, `'../..//x'`→`'x'`, `'a:b*c?'`→`'abc'`.
  - `HD.loadConfig() -> Promise<{firstName: string, email: string, subfolder: string}>`: reads `chrome.storage.sync`, defaults `''`, returns subfolder already sanitized.

- [ ] **Step 1:** `git init` in the project root; `.gitignore` with `*.zip`.
- [ ] **Step 2:** Write `manifest.json`: name "Hypeddit Downloader", version "0.1.0", MV3, permissions/hosts per Global Constraints, `action.default_popup: "popup/popup.html"`, `background.service_worker: "src/background/background.js"`. Content script `run_at: "document_idle"` with js in this order: `src/shared/config.js`, `src/content/dom.js`, `src/content/notice.js`, `src/content/steps.js`, `src/content/runner.js`, `src/content/main.js`.
- [ ] **Step 3:** Implement `src/shared/config.js`.
- [ ] **Step 4:** `README.md`: load unpacked, set config in the popup, where files land, how to add a new step (one entry in `HD.steps`).
- [ ] **Step 5:** Commit `feat: scaffold extension and config helpers`.

### Task 2: DOM utilities and on-page notice

**Files:**
- Create: `src/content/dom.js`, `src/content/notice.js`

**Interfaces:**
- Produces:
  - `HD.isVisible(el: Element|null) -> boolean` (definition in Global Constraints).
  - `HD.setInputValue(input: HTMLInputElement, value: string) -> void`: sets `.value`, dispatches bubbling `input` and `change` events.
  - `HD.waitFor(predicate: () => any, {timeoutMs = 10000, intervalMs = 200} = {}) -> Promise<any>`: resolves with the first truthy predicate value, resolves `null` on timeout (never rejects).
  - `HD.sleep(ms: number) -> Promise<void>`.
  - `HD.notice.show(text: string, kind: 'progress'|'success'|'error') -> void`: single fixed-position element `#hd-notice` (top-right, z-index 2147483647, inline styles only). Calling again updates the same element. kind sets the background: progress grey, success green, error red.

- [ ] **Step 1:** Implement both files.
- [ ] **Step 2:** Commit `feat: dom helpers and status notice`.

### Task 3: Step detection and handlers

**Files:**
- Create: `src/content/steps.js`

**Interfaces:**
- Consumes: `HD.isVisible`, `HD.setInputValue` (Task 2).
- Produces:
  - `HD.isGatePage(root: Document|Element) -> boolean`: true iff `#downloadProcess` or `#all_steps` exists under root.
  - `HD.steps: Array<{name: string, detect(root): boolean, run(root, config): Promise<void>}>` in this order:
    - `start`: detect `#downloadProcess` visible and `#all_steps` not visible. run: click `#downloadProcess`.
    - `email`: detect `#step_email` visible. run: set the name and email inputs from `config.firstName`/`config.email`, then click `#email_to_downloads_next`. Throws `Error('name or email not set in the extension settings')` if either is empty.
    - `soundcloud`: detect `#step_sc` visible. run: for every `a.hype-btn-soundcloud.undone` inside `#step_sc`, `classList.replace('undone','done')`, then click `#skipper_sc_channel`.
    - `finish`: detect `#gateDownloadButton` visible. run: click it.
  - `HD.detectStep(root) -> {kind: 'step', step} | {kind: 'stop', reason: string} | {kind: 'none'}`, evaluated in this order:
    1. `#gatePreviewCaptcha` visible → stop `captcha required`.
    2. `#step_sc` visible and contains any `.hype-btn-social` without `.hype-btn-soundcloud` → stop with the unknown reason.
    3. The first `HD.steps` entry whose `detect` is true → step.
    4. `#all_steps` visible (gate open, nothing matched) → stop with the unknown reason.
    5. Otherwise → none (page still loading or transitioning).

- [ ] **Step 1:** Implement `src/content/steps.js`.
- [ ] **Step 2:** Commit `feat: gate step detection and handlers`.

### Task 4: Gate runner

**Files:**
- Create: `src/content/runner.js`

**Interfaces:**
- Consumes: `HD.detectStep`, `HD.waitFor` (Tasks 2–3).
- Produces: `HD.runGate(root, config, deps) -> Promise<{ok: true, filename: string} | {ok: false, reason: string}>` where
  `deps = { expectDownload: () => Promise<string|null>, onProgress?: (stepName) => void, stepTimeoutMs = 10000, maxAttempts = 2, maxIterations = 20 }`.
  - `expectDownload` is called **before** clicking the finish button. It resolves with the downloaded filename, or `null` on timeout. Task 5 wires it up for real.
  - Loop:
    - Wait for a detected state: `HD.waitFor(() => { const d = HD.detectStep(root); return d.kind !== 'none' && d; }, {timeoutMs: stepTimeoutMs})`.
    - `null` → stop with the unknown reason.
    - `stop` → return its reason.
    - `step` → call `onProgress(name)`, then:
      - `finish`: start `expectDownload()`, run the click, and await it. A filename gives `{ok:true, filename}`; `null` gives `{ok:false, reason:'no download started'}`.
      - Any other step: run the handler. A thrown error gives `{ok:false, reason: err.message}`. Then wait up to `stepTimeoutMs` for `detectStep` to stop returning the same step. If it's still the same, run it again. After `maxAttempts` runs, stop with `step "<name>" did not advance the page`.
  - Safety cap: after more than `maxIterations` loop turns, stop with `step "<name>" did not advance the page` for the last step.

- [ ] **Step 1:** Implement `src/content/runner.js`.
- [ ] **Step 2:** Commit `feat: gate runner loop`.

### Task 5: Download routing, service worker, content entry point

**Files:**
- Create: `src/background/routing.js`, `src/background/background.js`, `src/content/main.js`

**Interfaces:**
- Consumes: `HD.loadConfig` (Task 1), `HD.isGatePage`, `HD.runGate`, `HD.notice` (Tasks 2–4).
- Produces:
  - `HD.routeDownload(pending: {tabId: number, at: number, subfolder: string}|null, now: number, filename: string) -> string|null`:
    - Returns `null` if there's no pending entry or `now - at > 60000`.
    - Otherwise returns `subfolder + '/' + basename(filename)`, or just `basename(filename)` when the subfolder is empty. basename is the part after the last `/` or `\`.
  - Messages: content → worker `{type: 'expectDownload'}`; worker → tab `{type: 'downloadStarted', filename: string}`.
  - `background.js` (classic; `importScripts('../shared/config.js', 'routing.js')`):
    - On `expectDownload`, store `{tabId: sender.tab.id, at: Date.now(), subfolder}` (subfolder from `HD.loadConfig()`) in `chrome.storage.session` under the key `pending`.
    - `chrome.downloads.onDeterminingFilename` listener: read `pending` and compute `HD.routeDownload`.
      - If it returns a name, call `suggest({filename, conflictAction: 'uniquify'})`, clear `pending`, and send `downloadStarted` to `pending.tabId`.
      - Otherwise call `suggest()`.
      - The listener returns `true`, because `suggest` is called asynchronously.
  - `main.js`:
    - If `!HD.isGatePage(document)`, return.
    - Otherwise load config, then call `HD.runGate(document, config, deps)` with:
      - `onProgress` → progress notice.
      - `expectDownload` → send `expectDownload`, then resolve on the first `downloadStarted` runtime message, or `null` after 30000 ms.
    - Show the success or stop notice using the exact copy from Global Constraints.

- [ ] **Step 1:** Implement the three files.
- [ ] **Step 2:** Commit `feat: download routing and content entry point`.

### Task 6: Settings popup

**Files:**
- Create: `popup/popup.html`, `popup/popup.js`

**Interfaces:**
- Consumes: `HD.sanitizeSubfolder` (load `../src/shared/config.js` in the popup).
- Produces: a popup with:
  - three labelled inputs: First name, Email, and Download subfolder (placeholder `Hypeddit`)
  - a Save button and a status line
  - On open, it fills the inputs from `chrome.storage.sync`.
  - On save, it writes `firstName`, `email` and `subfolder`. The subfolder is sanitized and the input updated to the sanitized value. Then it shows `Saved`.
  - About 300 px wide, system font, no external resources.

- [ ] **Step 1:** Implement both files.
- [ ] **Step 2:** Commit `feat: settings popup`.

### Task 7: Live check (with the user)

- [ ] **Step 1:** The user loads the extension unpacked at `chrome://extensions`. Expected: no errors on the card.
- [ ] **Step 2:** In the popup, save the name, email and `../Hype:ddit`, then reopen the popup. Expected: the subfolder shows `Hypeddit`.
- [ ] **Step 3:** Open `https://hypeddit.com/threshld/supernovathresholdfreedl`. Expected: the notice goes through the steps and ends with `downloaded to Hypeddit`, and the file is in `<Downloads>/Hypeddit/`. This also confirms the class-swap assumption.
- [ ] **Step 4:** Open `https://hypeddit.com/`. Expected: no notice.
- [ ] **Step 5:** If something doesn't match, fix the step or selector and commit `fix: <what changed>`.
