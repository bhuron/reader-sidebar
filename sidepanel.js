const increaseFontBtn = document.getElementById('increaseFont');
const decreaseFontBtn = document.getElementById('decreaseFont');
const contentDiv = document.getElementById('content');

// Font size management
let currentFontSize = parseInt(localStorage.getItem('fontSize')) || 16;
let fontDebounceTimer = null;

function updateFontSize(newSize) {
  currentFontSize = newSize;
  const contentElement = document.querySelector('.article .content');
  if (contentElement) {
    contentElement.style.fontSize = currentFontSize + 'px';
  }

  // Debounce localStorage writes
  if (fontDebounceTimer) {
    clearTimeout(fontDebounceTimer);
  }
  fontDebounceTimer = setTimeout(() => {
    localStorage.setItem('fontSize', currentFontSize);
  }, 300);
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
      showExtractionError('Could not extract content from this page. The page may not contain readable article content.');
    }
  } catch (error) {
    console.error('Error extracting content:', error);

    // Retry up to 3 times with increasing delays
    if (retryCount < 3) {
      setTimeout(() => {
        extractContent(retryCount + 1);
      }, 300 * (retryCount + 1));
    } else {
      showExtractionError('Failed to extract content after multiple attempts. Please try refreshing the page.');
    }
  }
}

function showExtractionError(message) {
  const placeholder = document.createElement('div');
  placeholder.className = 'placeholder';

  const messageP = document.createElement('p');
  messageP.textContent = message;
  placeholder.appendChild(messageP);

  const retryBtn = document.createElement('button');
  retryBtn.className = 'retry-btn';
  retryBtn.textContent = 'Try Again';
  retryBtn.onclick = () => location.reload();
  placeholder.appendChild(retryBtn);

  contentDiv.innerHTML = '';
  contentDiv.appendChild(placeholder);
}

// Wait a bit before extracting to ensure content script is ready
setTimeout(() => {
  extractContent();
}, 100);

// Display extracted content
function displayContent(data) {
  // Set the document language from the source page
  if (data.lang) {
    document.documentElement.lang = data.lang;
  }

  const article = document.createElement('div');
  article.className = 'article';

  const title = document.createElement('h1');
  title.textContent = data.title;
  article.appendChild(title);

  // Add metadata section if we have author or reading time
  if (data.author || data.length) {
    const meta = document.createElement('div');
    meta.className = 'meta';

    if (data.author) {
      const authorSpan = document.createElement('span');
      authorSpan.className = 'author';
      authorSpan.textContent = data.author;
      meta.appendChild(authorSpan);
    }

    // Calculate reading time (200 words per minute, ~5 chars per word)
    if (data.length) {
      const wordCount = Math.floor(data.length / 5);
      const readTime = Math.max(1, Math.ceil(wordCount / 200));

      if (data.author) {
        const separator = document.createTextNode(' • ');
        meta.appendChild(separator);
      }

      const readTimeSpan = document.createElement('span');
      readTimeSpan.className = 'read-time';
      readTimeSpan.textContent = `${readTime} min read`;
      meta.appendChild(readTimeSpan);
    }

    article.appendChild(meta);
  }

  // Add excerpt if available
  if (data.excerpt) {
    const excerpt = document.createElement('div');
    excerpt.className = 'excerpt';
    excerpt.textContent = data.excerpt;
    article.appendChild(excerpt);
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
