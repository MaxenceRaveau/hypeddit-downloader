# Hypeddit Downloader — Design

Date: 2026-10-19

## Intent

Hypeddit "free download" pages (e.g. `https://hypeddit.com/threshld/supernovathresholdfreedl`) put a gate in front of the file: give your name/email, follow/repost/like on SoundCloud, then download. The user downloads from these pages regularly and wants a Chrome extension that clears the gate automatically and saves the file to a chosen folder, with zero clicks once the page is open.

## Goals

- Runs automatically when a Hypeddit download page loads.
- Clears the gate steps, in whatever order the page presents them.
- Saves the downloaded file into a configured subfolder of Chrome's download location.
- Easy to extend: new step types will be added as the user encounters them.

## Non-goals (for now)

- Connecting accounts on other platforms (only skip links supported).
- Batch processing a list of URLs.
- Renaming files.
- Publishing to the Chrome Web Store (loaded unpacked).

## Anti-goals

- Silently doing nothing or looping forever on an unfamiliar page. Unknown situations must be surfaced to the user.
- Touching downloads that don't come from Hypeddit.

## How the Hypeddit gate works (observed by the user)

Clicking the initial "Download" button on the page opens the gate. Steps can appear in any order:

1. **Email step**
   - First name: `input.hype-form-control[name="email_name"]`
   - Email: `input.hype-form-control[name="email_address"]`
   - Then click `#email_to_downloads_next`.
2. **SoundCloud actions step**
   - Inside a `<span>`, several `<a>` elements with classes `hype-btn hype-btn-social hype-btn-soundcloud hype-btn-xlarge hype-w-100 undone`.
   - Replacing class `undone` with `done` validates the action. This is pure client-side JS — the user verified no request is sent to Hypeddit — so no tab needs to be opened.
   - Then click `#skipper_sc_next` if it exists; otherwise click `#skipper_sc_channel`.
   - The user is confident this is enough to get a working download: they never actually perform the SoundCloud actions, and no request leaves the browser during the gate. The first live test should still confirm a full gate ends in a real file. If it doesn't, the fallback is opening each link in a background tab and closing it right away.
3. **Skip steps** (Spotify, TikTok, YouTube, Instagram)
   - Each platform's step shows a skip link that advances to the next step without connecting the account:
     - Spotify: `#skipper[data-step="sp"]`
     - TikTok: `#skipper_tk`
     - YouTube: `#skipper_yt`
     - Instagram: `#skipper_ig`
   - The extension clicks the skip link to advance. Never connect accounts.
4. **Finish step**
   - Page shows "THANK YOU FOR YOUR SUPPORT".
   - Click `#gateDownloadButton` to get the file.

## Decided behavior

- **Trigger:** automatic on page load on hypeddit.com download pages. No button press.
- **Flow:** a loop that detects which step is currently visible, runs its handler, waits for the page to update, and repeats until the finish step's download is clicked.
- **Unknown step:** if no handler recognizes the current state, show a visible notice on the page saying the extension encountered a type of Hypeddit page it doesn't know yet, then stop and leave the page to the user.
- **Config:** set once in the extension popup (toolbar icon): first name, email, download subfolder name. Stored in `chrome.storage`.
- **Download location:** the file is saved to `<Chrome download folder>/<configured subfolder>/`. Chrome extensions cannot write outside the Downloads location; the user accepted a subfolder.
- **SoundCloud actions:** class swap `undone` → `done` on every matching `<a>`, no tabs opened.

## Builder's calls (Claude's, not the user's — open to change)

- Plain JavaScript, Manifest V3, no build tooling or frameworks. Loaded unpacked via `chrome://extensions`.
- Structure: content script with a registry of step handlers, each `{ name, detect(), run() }`, so adding a step = adding one handler. A service worker handles download routing. A popup page for config.
- Short waits between actions (e.g. wait for element / DOM change with a timeout) rather than fixed long sleeps.
- Only Hypeddit-initiated downloads go to the subfolder (via `chrome.downloads.onDeterminingFilename`). Exactly how to recognize "this download came from Hypeddit" (referrer/URL check, or the content script telling the service worker it's about to click `#gateDownloadButton`) is left to the builder — the file may be served from a non-hypeddit host.

- **Which pages:** content script matches `https://hypeddit.com/*` and `https://www.hypeddit.com/*`. It only acts if the page has a download gate (initial Download button / gate container present); otherwise it stays silent, so home and profile pages never show the unknown-step notice.
- **Status notice for every outcome:** one small on-page notice shows progress and ends in either "Downloaded to <subfolder>" (once the service worker confirms the download started) or "Stopped: <reason>". Reasons: unknown step, missing config, a step that didn't advance the page after its handler ran (no-progress detection with a retry limit), or no download started within a timeout after clicking `#gateDownloadButton`.
- **Strict SoundCloud detection:** if the actions block contains any button that isn't a SoundCloud `hype-btn-soundcloud` button (e.g. Spotify), treat it as an unknown step and stop, rather than swapping only the SoundCloud ones.
- **Finish detection:** primary signal is `#gateDownloadButton` being visible; "THANK YOU FOR YOUR SUPPORT" text is a secondary check only.
- **Empty subfolder:** downloads go to the Download folder root. The popup strips characters Chrome rejects in filenames and any `..`/leading slashes.

## Left to the builder

- Exact detection logic per step (element visible vs. present, text match for "THANK YOU FOR YOUR SUPPORT").
- Whether to also click the page's initial "Download" button automatically, and its selector (needs to be found on a live page).
- Timeouts, retry limits, and the look of the on-page notice.
- Missing config: if name/email aren't set when the email step appears, treat like a stop-and-notify case.
