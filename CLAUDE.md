# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reader Sidebar is a Chrome/Edge extension (Manifest V3) that extracts article content from web pages and displays it in a clean, distraction-free side panel. The extension works by analyzing page content in the DOM using heuristics to identify and extract the main article content, removing ads, navigation, and other clutter.

**Key Feature**: Extracts content directly from the loaded page DOM, allowing it to work with paywalled content that's already loaded in the browser.

## Architecture

The extension follows a three-tier architecture:

### 1. Background Script (`background.js`)
- Service worker that handles extension lifecycle
- Listens for extension icon clicks and opens the side panel
- Acts as message broker between side panel and content script
- Handles content script injection if not already loaded
- **Important**: Includes fallback popup window support for non-Chromium browsers lacking Side Panel API

### 2. Content Script (`content.js`)
- Injected into all web pages via manifest.json content_scripts
- Contains the core content extraction logic (`extractContent()`)
- Uses sophisticated heuristics to identify article content:
  - Checks for semantic HTML (`<article>`, `<main>`, `[role="main"]`)
  - Falls back to paragraph density analysis
  - Filters out navigation, ads, comments, social sharing
  - Removes elements with high link density or suspicious keywords
- Listens for messages from background script and returns extracted content

### 3. Side Panel (`sidepanel.html`, `sidepanel.js`, `sidepanel.css`)
- The UI layer that displays extracted content
- Implements font size adjustment (12-24px range) with localStorage persistence
- Handles extraction retry logic (up to 3 retries with increasing delays)
- Displays loading states and error messages

## Content Extraction Algorithm

The extraction logic in `content.js` is the most complex part of the codebase:

**Strategy**:
1. Try semantic selectors (article, main, etc.)
2. Analyze paragraph clusters by text density
3. Filter quality paragraphs (length, link ratio, parent class names)
4. Find common ancestor of good paragraphs
5. Extract structured content (headings, paragraphs, lists, images, blockquotes)
6. Clean unwanted elements using extensive blacklist

**Key Heuristics**:
- Text density ratio (text length / HTML length)
- Link density penalty (too many links suggests navigation)
- Negative pattern matching on class/id names (nav, sidebar, ad, etc.)
- Minimum paragraph length (40 chars, 8 words)
- Maximum link-to-text ratio for paragraphs

## Development Workflow

**Loading the Extension**:
1. Open `chrome://extensions/` in Chrome/Edge
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this extension directory

**Testing Changes**:
- After making changes, go to `chrome://extensions/`
- Click the refresh icon on the extension card
- Refresh the page you're testing on
- Reopen the side panel to see changes

**No Build Process**: This is a vanilla JavaScript extension with no bundling or build tools. All files are served directly to the browser.

## File Structure

- `manifest.json`: Extension configuration (permissions, content scripts, service worker)
- `background.js`: Service worker - handles extension icon clicks and message routing
- `content.js`: Content script - runs on all pages, extracts article content
- `sidepanel.html`: Side panel UI markup
- `sidepanel.js`: Side panel logic - fetches and displays content, manages font size
- `sidepanel.css`: Typography and layout for article display
- `generate-icons.html`: Helper for generating PNG icons from SVG source
- `icon*.png`: Extension icons (16, 48, 128px)

## Browser Compatibility

Primary support:
- Google Chrome 114+ (with Side Panel API)
- Microsoft Edge (with Side Panel API)
- Brave Browser (with Side Panel API)

Fallback support:
- Any Chromium browser supporting Manifest V3 but lacking Side Panel API
- Falls back to popup window (400x600px) positioned on right side of screen

The fallback logic in `background.js:4-15` detects Side Panel API availability and opens a popup window instead if unavailable.

## Key Patterns

**Message Passing**: The extension uses Chrome's message passing API extensively:
- Side panel → Background → Content script flow for content extraction
- Async response handling with `return true` to keep channels open

**Content Script Injection**: Dynamic injection in `background.js:30-43` handles cases where the content script hasn't loaded yet, with a 100ms delay before retry.

**DOM Tree Walking**: `content.js:249-267` uses TreeWalker API for efficient traversal of the content tree when extracting paragraphs.

**State Persistence**: Font size preference persists in localStorage with key `'fontSize'`.

## Styling Conventions

Typography is carefully tuned for readability (see `sidepanel.css`):
- Base font: 16px (adjustable 12-24px)
- Line height: 1.7 for body text
- Max content width: 680px
- Justified text with auto hyphens
- Specific styles for captions, code blocks, blockquotes, lists
- Color scheme: #1a1a1a (text), #666 (meta), #0066cc (links)

## Icon Management

Icons are generated from SVG sources using `generate-icons.html`. The `.gitignore` excludes SVG files since PNGs are the distributed format. When updating icons:
1. Edit SVG files
2. Open `generate-icons.html` in browser
3. Download generated PNGs
4. Replace `icon*.png` files
