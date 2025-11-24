# Reader Sidebar Extension

A Chrome extension that extracts article content from the current tab and displays it in a clean, readable sidebar format.

## Features

- Extracts content directly from the loaded page (works with paywalled content)
- Clean, distraction-free reading interface
- Adjustable font size with +/- buttons
- Removes ads, navigation, and other clutter
- Works on any Chromium-based browser

## Installation

1. Open Chrome/Edge/Brave and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this extension directory
5. The extension icon will appear in your toolbar

## Usage

1. Navigate to any article or webpage
2. Click the extension icon in the toolbar
3. The sidebar will open automatically and extract the content
4. Use the +/- buttons in the toolbar to adjust font size

## Generating Icons

1. Open `generate-icons.html` in your browser
2. Click each download button to save the PNG icons
3. The icons will be saved to your downloads folder

## Browser Compatibility

Works on:
- Google Chrome 114+ (with sidebar)
- Microsoft Edge (with sidebar)
- Brave Browser (with sidebar)
- Any Chromium-based browser supporting Manifest V3

For browsers without Side Panel API support, the extension will open as a popup window instead.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
