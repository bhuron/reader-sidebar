// Extract readable content from the page using Readability.js
function extractContent() {
  const startTime = performance.now();

  // Pre-check: Use isProbablyReaderable to detect if page has extractable content
  if (typeof isProbablyReaderable === 'function') {
    const isReadable = isProbablyReaderable(document);
    if (!isReadable) {
      console.log('Page does not appear to have readable article content');
    }
  }

  // Method 1: Try Readability.js with document clone (doesn't modify original)
  let article = tryReadabilityParse();

  // Method 2: If Readability fails, try with relaxed parameters
  if (!article) {
    console.log('Readability parse failed, trying with relaxed parameters...');
    article = tryReadabilityParse({ charThreshold: 200, nbTopCandidates: 3 });
  }

  // Method 3: Fallback to simplified custom extraction
  if (!article) {
    console.log('Relaxed parse failed, using custom fallback...');
    article = fallbackExtraction();
  }

  const endTime = performance.now();
  console.log(`Content extraction completed in ${(endTime - startTime).toFixed(0)}ms`);

  return article;
}

function tryReadabilityParse(options = {}) {
  try {
    // Clone document to avoid modifying the original page
    const documentClone = document.cloneNode(true);

    // Default Readability options
    const defaultOptions = {
      charThreshold: 500,
      nbTopCandidates: 5,
      keepClasses: false
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Parse with Readability
    const reader = new Readability(documentClone, mergedOptions);
    const article = reader.parse();

    if (!article || !article.content) {
      return null;
    }

    // Detect page language
    const pageLang = document.documentElement.lang ||
                     document.querySelector('html')?.getAttribute('lang') ||
                     navigator.language?.split('-')[0] ||
                     'en';

    // Sanitize content with DOMPurify
    const sanitizedContent = DOMPurify.sanitize(article.content, {
      ALLOWED_TAGS: ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
                     'a', 'img', 'blockquote', 'code', 'pre', 'strong', 'em', 'br',
                     'span', 'figure', 'figcaption'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover']
    });

    return {
      title: article.title || document.title,
      author: article.byline || '',
      content: sanitizedContent,
      excerpt: article.excerpt || '',
      length: article.length || 0,
      url: window.location.href,
      lang: pageLang
    };

  } catch (error) {
    console.error('Readability parsing error:', error);
    return null;
  }
}

// Simplified fallback extraction
function fallbackExtraction() {
  // Detect page language
  const pageLang = document.documentElement.lang ||
                   document.querySelector('html')?.getAttribute('lang') ||
                   navigator.language?.split('-')[0] ||
                   'en';

  // Extract title
  const title = document.querySelector('h1')?.textContent ||
                document.title ||
                'Untitled';

  // Extract author if available
  const authorSelectors = [
    '[rel="author"]',
    '.author',
    '.byline',
    '[itemprop="author"]'
  ];

  let author = '';
  for (const selector of authorSelectors) {
    const authorEl = document.querySelector(selector);
    if (authorEl) {
      author = authorEl.textContent.trim();
      break;
    }
  }

  // Try to find main content area using semantic selectors
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.article-content',
    '.post-content',
    '.entry-content',
    '[itemprop="articleBody"]'
  ];

  let mainContent = null;
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim().length > 200) {
      mainContent = element;
      break;
    }
  }

  // Last resort: use body
  if (!mainContent) {
    mainContent = document.body;
  }

  // Sanitize the content
  const sanitizedContent = DOMPurify.sanitize(mainContent.innerHTML, {
    ALLOWED_TAGS: ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
                   'a', 'img', 'blockquote', 'code', 'pre', 'strong', 'em', 'br', 'span'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title']
  });

  return {
    title: title.trim(),
    author: author,
    content: sanitizedContent,
    excerpt: '',
    length: sanitizedContent.length,
    url: window.location.href,
    lang: pageLang
  };
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getContent') {
    const content = extractContent();
    sendResponse(content);
  }
  return true;
});
