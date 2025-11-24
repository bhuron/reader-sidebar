// Get distance between two elements in the DOM tree
function getElementDistance(el1, el2) {
  let distance = 0;
  let current = el1;
  
  while (current && current !== el2 && distance < 10) {
    current = current.nextElementSibling || current.parentElement?.nextElementSibling;
    distance++;
  }
  
  return distance;
}

// Calculate text density score for an element
function getTextDensity(element) {
  const text = element.textContent.trim();
  const html = element.innerHTML;
  
  if (text.length === 0) return 0;
  
  // Calculate ratio of text to HTML (higher is better)
  const density = text.length / html.length;
  
  // Count links - too many links suggests navigation/related content
  const links = element.querySelectorAll('a').length;
  const linkDensity = links / Math.max(1, text.length / 100);
  
  // Penalize high link density
  return density * (1 - Math.min(linkDensity * 0.2, 0.8));
}

// Check if element is likely article content
function isLikelyContent(element) {
  const text = element.textContent.trim();
  const className = element.className.toLowerCase();
  const id = element.id.toLowerCase();
  
  // Too short to be meaningful content
  if (text.length < 50) return false;
  
  // Check for negative signals
  const negativePatterns = [
    'nav', 'menu', 'sidebar', 'footer', 'header',
    'related', 'recommend', 'popular', 'trending',
    'comment', 'share', 'social', 'subscribe',
    'newsletter', 'signup', 'promo', 'ad'
  ];
  
  for (const pattern of negativePatterns) {
    if (className.includes(pattern) || id.includes(pattern)) {
      return false;
    }
  }
  
  return true;
}

// Extract readable content from the page
function extractContent() {
  // Extract title
  const title = document.querySelector('h1')?.textContent || 
                document.title || 
                'Untitled';
  
  // Extract author if available
  const authorSelectors = [
    '[rel="author"]',
    '.author',
    '.byline',
    '[itemprop="author"]',
    '[class*="author"]'
  ];
  
  let author = '';
  for (const selector of authorSelectors) {
    const authorEl = document.querySelector(selector);
    if (authorEl) {
      author = authorEl.textContent.trim();
      break;
    }
  }
  
  // Try to find main content area
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.article-body',
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
  
  // Fallback: find the best content container by analyzing paragraphs
  if (!mainContent) {
    const candidates = document.querySelectorAll('div, section, article');
    let bestScore = 0;
    
    candidates.forEach(el => {
      if (!isLikelyContent(el)) return;
      
      const paragraphs = el.querySelectorAll('p');
      if (paragraphs.length < 3) return;
      
      // Calculate total paragraph text
      let totalParagraphText = 0;
      paragraphs.forEach(p => {
        totalParagraphText += p.textContent.trim().length;
      });
      
      // Score based on paragraph content and text density
      const score = totalParagraphText * getTextDensity(el);
      
      if (score > bestScore) {
        bestScore = score;
        mainContent = el;
      }
    });
  }
  
  // Last resort: use body
  if (!mainContent) {
    mainContent = document.body;
  }
  
  // Clone and clean the content
  const contentClone = mainContent.cloneNode(true);
  
  // Remove unwanted elements from the clone
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 
    'iframe', 'aside', 'button', 'form', 'input', 'select', 'textarea',
    'svg:not([class*="icon"])',
    // Ads and promotional content
    '.ad', '.advertisement', '.promo', '.sponsored',
    '[class*="ad-"]', '[class*="advertisement"]', '[class*="promo"]',
    '[id*="ad-"]', '[id*="advertisement"]',
    // Social and sharing
    '.social-share', '.share-buttons', '.social-buttons',
    '[class*="share"]', '[class*="social"]',
    // Comments and related content
    '.comments', '.comment-section', '.related-articles', '.related-posts',
    '[class*="comment"]', '[class*="related"]', '[class*="recommend"]',
    '[class*="popular"]', '[class*="trending"]',
    // Navigation and menus
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
    '[class*="nav"]', '[class*="menu"]', '[class*="sidebar"]',
    // Other clutter
    '.newsletter', '.subscription', '.paywall-prompt',
    '[class*="newsletter"]', '[class*="subscribe"]', '[class*="signup"]',
    '[class*="popup"]', '[class*="modal"]', '[class*="overlay"]',
    '[class*="widget"]', '[class*="banner"]'
  ];
  
  unwantedSelectors.forEach(selector => {
    contentClone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // Remove elements with low text density or too many links
  const allDivs = contentClone.querySelectorAll('div, section');
  allDivs.forEach(el => {
    const text = el.textContent.trim();
    const links = el.querySelectorAll('a').length;
    
    // Remove if mostly links (likely navigation/related)
    if (text.length > 0 && links > 5 && (links * 30) > text.length) {
      el.remove();
      return;
    }
    
    // Remove elements with suspicious keywords
    const textLower = text.toLowerCase();
    const suspiciousKeywords = [
      'related articles', 'you may also like', 'recommended for you',
      'more from', 'read next', 'popular posts', 'trending now',
      'sign up', 'subscribe', 'newsletter', 'follow us'
    ];
    
    for (const keyword of suspiciousKeywords) {
      if (textLower.includes(keyword) && text.length < 500) {
        el.remove();
        break;
      }
    }
  });
  
  // Find the densest cluster of paragraphs (the actual article)
  const allParagraphs = Array.from(contentClone.querySelectorAll('p'));
  
  // Filter paragraphs by quality
  const goodParagraphs = allParagraphs.filter(p => {
    const text = p.textContent.trim();
    const links = p.querySelectorAll('a').length;
    const words = text.split(/\s+/).length;
    
    // Must have substantial text
    if (text.length < 40 || words < 8) return false;
    
    // Not too many links relative to text
    if (links > 3 && (links * 25) > text.length) return false;
    
    // Check parent classes for negative signals
    let parent = p.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      const className = parent.className.toLowerCase();
      const id = parent.id.toLowerCase();
      
      const negativePatterns = [
        'related', 'recommend', 'popular', 'trending',
        'sidebar', 'widget', 'promo', 'newsletter'
      ];
      
      for (const pattern of negativePatterns) {
        if (className.includes(pattern) || id.includes(pattern)) {
          return false;
        }
      }
      
      parent = parent.parentElement;
      depth++;
    }
    
    return true;
  });
  
  // If we have good paragraphs, find their common ancestor
  const wrapper = document.createElement('div');
  
  if (goodParagraphs.length >= 3) {
    // Find common ancestor of all good paragraphs
    let commonAncestor = goodParagraphs[0];
    while (commonAncestor && !goodParagraphs.every(p => commonAncestor.contains(p))) {
      commonAncestor = commonAncestor.parentElement;
    }
    
    if (commonAncestor) {
      // Get all children of the common ancestor in order
      const walker = document.createTreeWalker(
        commonAncestor,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: function(node) {
            // Accept paragraphs, headings, images, lists, blockquotes, etc.
            if (['P', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'IMG', 'FIGURE', 'PRE', 'CODE'].includes(node.tagName)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );
      
      const contentElements = [];
      let node;
      while (node = walker.nextNode()) {
        contentElements.push(node);
      }
      
      // Find the range of good paragraphs
      const firstGoodIndex = contentElements.findIndex(el => goodParagraphs.includes(el));
      const lastGoodIndex = contentElements.length - 1 - contentElements.slice().reverse().findIndex(el => goodParagraphs.includes(el));
      
      if (firstGoodIndex !== -1 && lastGoodIndex !== -1) {
        // Track elements we've already added to avoid duplicates
        const addedElements = new Set();
        
        // Include everything between first and last good paragraph
        for (let i = firstGoodIndex; i <= lastGoodIndex; i++) {
          const el = contentElements[i];
          
          // Skip if already added or if a parent was already added
          if (addedElements.has(el)) continue;
          
          let parentAlreadyAdded = false;
          let parent = el.parentElement;
          while (parent && parent !== commonAncestor) {
            if (addedElements.has(parent)) {
              parentAlreadyAdded = true;
              break;
            }
            parent = parent.parentElement;
          }
          
          if (parentAlreadyAdded) continue;
          
          // Skip if it's in a bad container
          parent = el.parentElement;
          let skipElement = false;
          let depth = 0;
          
          while (parent && parent !== commonAncestor && depth < 5) {
            const className = parent.className.toLowerCase();
            const id = parent.id.toLowerCase();
            const tagName = parent.tagName.toLowerCase();
            
            const negativePatterns = [
              'nav', 'menu', 'sidebar', 'aside', 'widget',
              'related', 'recommend', 'popular', 'trending',
              'promo', 'newsletter', 'subscribe', 'signup',
              'footer', 'header', 'banner'
            ];
            
            // Check tag name
            if (['nav', 'aside'].includes(tagName)) {
              skipElement = true;
              break;
            }
            
            // Check class and id
            for (const pattern of negativePatterns) {
              if (className.includes(pattern) || id.includes(pattern)) {
                skipElement = true;
                break;
              }
            }
            
            if (skipElement) break;
            parent = parent.parentElement;
            depth++;
          }
          
          if (skipElement) continue;
          
          // Additional check: skip elements with too many links (likely navigation)
          if (['UL', 'OL'].includes(el.tagName)) {
            const items = el.querySelectorAll('li');
            const links = el.querySelectorAll('a');
            
            // If almost every list item is just a link, it's probably navigation
            if (items.length > 3 && links.length >= items.length * 0.8) {
              const avgTextLength = Array.from(items).reduce((sum, li) => sum + li.textContent.trim().length, 0) / items.length;
              
              // Navigation items are typically short
              if (avgTextLength < 50) {
                continue;
              }
            }
          }
          
          // Additional filtering
          if (el.tagName === 'P') {
            // Include all paragraphs in range with reasonable length
            if (el.textContent.trim().length >= 20) {
              wrapper.appendChild(el.cloneNode(true));
              addedElements.add(el);
            }
          } else if (['H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
            // Include headings
            if (el.textContent.trim().length > 3) {
              wrapper.appendChild(el.cloneNode(true));
              addedElements.add(el);
            }
          } else if (['IMG', 'FIGURE'].includes(el.tagName)) {
            // For figures, check if they contain an img we've already added
            if (el.tagName === 'FIGURE') {
              const imgs = el.querySelectorAll('img');
              const hasAddedImg = Array.from(imgs).some(img => addedElements.has(img));
              if (hasAddedImg) continue;
            }
            
            // Include all images/figures in the range
            wrapper.appendChild(el.cloneNode(true));
            addedElements.add(el);
            
            // Mark child images as added too
            if (el.tagName === 'FIGURE') {
              el.querySelectorAll('img').forEach(img => addedElements.add(img));
            }
          } else if (['BLOCKQUOTE', 'UL', 'OL', 'PRE'].includes(el.tagName)) {
            // Include lists, quotes, code blocks
            if (el.textContent.trim().length > 10) {
              wrapper.appendChild(el.cloneNode(true));
              addedElements.add(el);
            }
          }
        }
      }
    }
  }
  
  // If we got good content, use it; otherwise fall back to cleaned clone
  const finalContent = wrapper.children.length >= 3 ? wrapper : contentClone;
  
  return {
    title: title.trim(),
    author: author,
    content: finalContent.innerHTML,
    url: window.location.href
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
