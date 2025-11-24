const increaseFontBtn = document.getElementById('increaseFont');
const decreaseFontBtn = document.getElementById('decreaseFont');
const contentDiv = document.getElementById('content');

// Font size management
let currentFontSize = parseInt(localStorage.getItem('fontSize')) || 16;

function updateFontSize(newSize) {
  currentFontSize = newSize;
  const contentElement = document.querySelector('.article .content');
  if (contentElement) {
    contentElement.style.fontSize = currentFontSize + 'px';
  }
  localStorage.setItem('fontSize', currentFontSize);
}

increaseFontBtn.addEventListener('click', () => {
  if (currentFontSize < 24) {
    updateFontSize(currentFontSize + 2);
  }
});

decreaseFontBtn.addEventListener('click', () => {
  if (currentFontSize > 12) {
    updateFontSize(currentFontSize - 2);
  }
});

// Extract content with retry logic
async function extractContent(retryCount = 0) {
  contentDiv.innerHTML = '<div class="loading">Extracting content...</div>';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'extractContent' });
    
    if (response && response.content) {
      displayContent(response);
    } else {
      contentDiv.innerHTML = '<div class="placeholder"><p>Could not extract content from this page.</p></div>';
    }
  } catch (error) {
    console.error('Error extracting content:', error);
    
    // Retry up to 3 times with increasing delays
    if (retryCount < 3) {
      setTimeout(() => {
        extractContent(retryCount + 1);
      }, 300 * (retryCount + 1));
    } else {
      contentDiv.innerHTML = '<div class="placeholder"><p>Could not extract content from this page.</p></div>';
    }
  }
}

// Wait a bit before extracting to ensure content script is ready
setTimeout(() => {
  extractContent();
}, 100);

// Display extracted content
function displayContent(data) {
  const article = document.createElement('div');
  article.className = 'article';
  
  const title = document.createElement('h1');
  title.textContent = data.title;
  article.appendChild(title);
  
  if (data.author) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span class="author">${data.author}</span>`;
    article.appendChild(meta);
  }
  
  const content = document.createElement('div');
  content.className = 'content';
  content.innerHTML = data.content;
  article.appendChild(content);
  
  contentDiv.innerHTML = '';
  contentDiv.appendChild(article);
  
  // Apply saved font size
  content.style.fontSize = currentFontSize + 'px';
}
