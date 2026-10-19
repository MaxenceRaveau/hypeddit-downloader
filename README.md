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

## Adding a New Step

To add a new automation step to the extension, add a new entry to the `HD.steps` array in `src/content/steps.js`. Each step is an object with the following properties:

- `name`: A string to identify the step (used in progress messages)
- `detect(root)`: A function that returns `true` if this step is currently visible on the page
- `run(root, config)`: A function that performs the step's action (fills fields, clicks buttons, etc.)

The extension will execute your steps in order (first match wins) to auto-clear the Hypeddit download gate.
