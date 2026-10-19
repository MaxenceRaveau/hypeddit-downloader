# Hypeddit Downloader

A Chrome extension that auto-clears Hypeddit download gates.

## Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked"
4. Select the project folder (the one containing `manifest.json`)
5. The extension should now appear in your extensions list

## Configuring the Extension

1. Click the extension icon in the toolbar
2. A popup window will open where you can set:
   - **First Name**: Your first name (required)
   - **Email**: Your email address (required)
   - **Subfolder**: Where to download files (optional, defaults to Downloads folder)
3. Click the **Save** button to save your settings to your Chrome account (via sync storage)

## Where Downloads Land

- If you specify a **subfolder**, files are downloaded to: `Downloads/<subfolder>/`
- If you leave **subfolder** empty, files go to your default Downloads folder
- Only downloads initiated by the extension are routed to the subfolder; other downloads are not affected

## Supported Steps

The extension currently handles the following gate steps:

1. **Email**: Fills in your first name and email
2. **SoundCloud**: Swaps button class from `undone` to `done` (client-side only)
3. **Spotify**: Clicks the skip link (`#skipper[data-step="sp"]`)
4. **TikTok**: Clicks the skip link (`#skipper_tk`)
5. **YouTube**: Clicks the skip link (`#skipper_yt`)
6. **Instagram**: Clicks the skip link (`#skipper_ig`)
7. **Twitch**: Clicks the skip link (`#skipper_th`) when the gate offers one. Otherwise clicks the Connect button (see "Twitch gates").

Note: Skip links do not connect your account — they simply advance to the next step.

## Twitch gates

- Gates with a skip link are skipped.
- Gates without one use the Connect button. This requires connecting Hypeddit to Twitch manually once, and allowing pop-ups for hypeddit.com (popup-blocked icon in the address bar, or Chrome Settings → Privacy and security → Site settings → Pop-ups and redirects → Allowed).
- Each run follows the gate's artists on your Twitch account, as a manual Connect would.

## Adding a New Skip Platform

To add another platform with a skip link, add one row to `HD.SKIP_STEPS` in `src/content/steps.js`:

```javascript
{ name: 'myplatform', skip: '#skipper_mp' }
```
