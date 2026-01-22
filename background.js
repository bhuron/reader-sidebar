// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  // Check if sidePanel API is available
  if (chrome.sidePanel) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else {
    // Fallback: open as popup window
    chrome.windows.create({
      url: chrome.runtime.getURL('sidepanel.html'),
      type: 'popup',
      width: 400,
      height: 600,
      left: screen.width - 400
    });
  }
});

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    // Get the active tab from the sender (side panel)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        sendResponse({ error: 'No active tab found' });
        return;
      }

      const tabId = tab.id;

      // Try to send message to existing content script
      chrome.tabs.sendMessage(tabId, { action: 'getContent' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, inject it
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content-scripts/Readability.js',
                    'content-scripts/Readability-readerable.js',
                    'content-scripts/purify.min.js',
                    'content-scripts/content.js']
          }).then(() => {
            // After injection, try to get content with retries
            let retries = 0;
            const maxRetries = 5;

            function tryGetContent() {
              chrome.tabs.sendMessage(tabId, { action: 'getContent' }, (response) => {
                if (chrome.runtime.lastError) {
                  if (retries < maxRetries) {
                    retries++;
                    setTimeout(tryGetContent, 100 * retries);
                  } else {
                    sendResponse({ error: 'Content script failed to initialize' });
                  }
                } else {
                  sendResponse(response);
                }
              });
            }

            tryGetContent();
          }).catch((error) => {
            console.error('Failed to inject content script:', error);
            sendResponse({ error: 'Failed to inject content script: ' + error.message });
          });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // Keep channel open for async response
  }
});
