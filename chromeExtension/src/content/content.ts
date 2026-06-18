/**
 * Content Script
 * Runs on web pages, can extract job descriptions and resumes
 */

// Check if we're on a job posting site
const JOB_SITES = {
  linkedin: 'linkedin.com',
  indeed: 'indeed.com',
  glassdoor: 'glassdoor.com',
  monster: 'monster.com',
  dice: 'dice.com',
};

function getCurrentJobDescription(): string | null {
  const hostname = window.location.hostname;

  if (hostname.includes('linkedin.com')) {
    // LinkedIn changed its DOM in 2025 — current selectors live under
    // div.jobs-description__content / div.jobs-box__html-content. The old
    // [data-test-id="jobs-details__main-content"] no longer matches.
    const descElement =
      document.querySelector('div.jobs-description__content') ||
      document.querySelector('div.jobs-box__html-content') ||
      document.querySelector('[class*="jobs-description"]') ||
      document.querySelector('.show-more-less-html__markup');
    return descElement?.textContent?.trim() || null;
  }

  if (hostname.includes('indeed.com')) {
    const descElement =
      document.querySelector('#jobDescriptionText') ||
      document.querySelector('.jobsearch-jobDescriptionText') ||
      document.querySelector('#jobsearch-ViewjobPaneWrapper');
    return descElement?.textContent?.trim() || null;
  }

  if (hostname.includes('glassdoor.com')) {
    const descElement =
      document.querySelector('[data-test="jobDescription"]') ||
      document.querySelector('[class*="JobDetails_jobDescription"]') ||
      document.querySelector('.JobDetails_jobDescription__uW_LA');
    return descElement?.textContent?.trim() || null;
  }

  // ---- Generic fallbacks ----

  // Most modern ATS-driven boards (Greenhouse, Lever, Workable, etc.) emit a
  // JobPosting JSON-LD block with the description in HTML form. This works
  // even when the visual DOM changes.
  const ldNodes = document.querySelectorAll('script[type="application/ld+json"]');
  for (const node of Array.from(ldNodes)) {
    try {
      const parsed = JSON.parse(node.textContent || 'null');
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of list) {
        if (entry && (entry['@type'] === 'JobPosting' || (Array.isArray(entry['@type']) && entry['@type'].includes('JobPosting')))) {
          const html = entry.description;
          if (typeof html === 'string' && html.trim().length > 100) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent?.trim() || null;
          }
        }
      }
    } catch {
      /* skip malformed JSON-LD */
    }
  }

  // Last-resort: longest content block on the page.
  const candidates = Array.from(document.querySelectorAll('main, article, [class*="description"], [class*="job"], section'));
  let best: { el: Element; len: number } | null = null;
  for (const el of candidates) {
    const text = (el.textContent || '').trim();
    if (text.length > 600 && text.length < 12000 && /(responsib|requirement|qualif|experience)/i.test(text)) {
      if (!best || text.length > best.len) best = { el, len: text.length };
    }
  }
  return best?.el.textContent?.trim() || null;
}

function getJobTitle(): string | null {
  const titleElement =
    document.querySelector('h1.t-24') ||
    document.querySelector('h1.job-details-jobs-unified-top-card__job-title') ||
    document.querySelector('h1') ||
    document.querySelector('[data-test-id="top-card-title"]');
  return titleElement?.textContent?.trim() || null;
}

function getCompanyName(): string | null {
  const companyElement =
    document.querySelector('.job-details-jobs-unified-top-card__company-name a') ||
    document.querySelector('.job-details-jobs-unified-top-card__company-name') ||
    document.querySelector('[data-test-id="top-card-company-name"]') ||
    document.querySelector('[class*="topcard__org-name"]') ||
    document.querySelector('.company-name');
  return companyElement?.textContent?.trim() || null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'EXTRACT_JOB_DESCRIPTION') {
    const jobDescription = getCurrentJobDescription();
    const jobTitle = getJobTitle();
    const company = getCompanyName();

    sendResponse({
      success: !!jobDescription,
      data: {
        text: jobDescription,
        title: jobTitle,
        company: company,
        url: window.location.href,
      },
    });
  }

  if (message.action === 'HIGHLIGHT_KEYWORDS') {
    const keywords = message.payload.keywords || [];
    highlightKeywords(keywords);
    sendResponse({ success: true });
  }
});

function highlightKeywords(keywords: string[]) {
  const jobDesc = getCurrentJobDescription();
  if (!jobDesc) return;

  const container = document.querySelector('body');
  if (!container) return;

  // Create a TreeWalker to find text nodes
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);

  let node;
  const nodesToReplace: Array<{ node: Node; keyword: string }> = [];

  while ((node = walker.nextNode())) {
    const text = node.textContent || '';
    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        nodesToReplace.push({ node, keyword });
        break;
      }
    }
  }

  // Replace text with highlights
  nodesToReplace.forEach(({ node, keyword }) => {
    const parent = node.parentNode;
    if (parent) {
      const regex = new RegExp(`(${keyword})`, 'gi');
      const html = (node.textContent || '').replace(regex, '<mark style="background-color: #ffff00; padding: 2px;">$1</mark>');
      const span = document.createElement('span');
      span.innerHTML = html;
      parent.replaceChild(span, node);
    }
  });
}

console.log('[Content] Script initialized on', window.location.hostname);
