# 9Captcha Browser Extension

This is the official browser extension for 9Captcha, available for both Google Chrome and Mozilla Firefox. It automatically detects and solves hCaptcha challenges in the background using your 9Captcha API key.

## Installation

### For Google Chrome

1. Download this repository or the release ZIP and extract it to a folder.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Turn on **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder you just extracted (make sure it's the Chrome extension folder).

### For Mozilla Firefox

1. Download this repository or the release ZIP and extract it to a folder.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click on the **Load Temporary Add-on...** button.
4. Navigate to the extracted folder, open the `extensionFirefox` directory, and select the `manifest.json` file.

*(Note: Temporary add-ons in Firefox are removed when you close the browser. For a permanent installation, the extension must be signed or you must use Firefox Developer Edition with `xpinstall.signatures.required` set to false.)*

## Usage

1. Pin the extension to your browser toolbar.
2. Click the extension icon.
3. Paste your 9Captcha API key (it should look like `9cap-xxx...`). You can get your API key at [9captcha.com](https://9captcha.com).
4. Click **Activate**.

Once activated, the extension will run silently in the background. Whenever you visit a page with a supported captcha, it will automatically intercept and solve it.
