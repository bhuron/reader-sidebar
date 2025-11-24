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
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const tabId = tabs[0].id;
        
        try {
          // Try to send message to existing content script
          chrome.tabs.sendMessage(tabId, { action: 'getContent' }, (response) => {
            if (chrome.runtime.lastError) {
              // Content script not loaded, inject it
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
              }).then(() => {
                // Try again after injection
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabId, { action: 'getContent' }, (response) => {
                    sendResponse(response);
                  });
                }, 100);
              }).catch((error) => {
                console.error('Failed to inject content script:', error);
                sendResponse({ error: 'Failed to inject content script' });
              });
            } else {
              sendResponse(response);
            }
          });
        } catch (error) {
          console.error('Error:', error);
          sendResponse({ error: error.message });
        }
      }
    });
    return true; // Keep channel open for async response
  }
});
