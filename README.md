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
3. Changes are automatically saved to your Chrome account (via sync storage)

## Where Downloads Land

- If you specify a **subfolder**, files are downloaded to: `Downloads/<subfolder>/`
- If you leave **subfolder** empty, files go to your default Downloads folder
- Only downloads initiated by the extension are routed to the subfolder; other downloads are not affected

## Adding a New Step

To add a new automation step to the extension:

1. Create a new entry in the `HD.steps` array in your step handler code
2. Each step should include:
   - A name to identify the step
   - Logic to detect when the step is visible on the page
   - Logic to perform the step's action (fill fields, click buttons, etc.)
   - Logic to verify the step completed successfully

The extension will execute your steps in order to auto-clear the Hypeddit download gate.
