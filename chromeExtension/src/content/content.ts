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
    // LinkedIn job description
    const descElement = document.querySelector('[data-test-id="jobs-details__main-content"]') ||
                       document.querySelector('.show-more-less-html__markup');
    return descElement?.textContent?.trim() || null;
  }

  if (hostname.includes('indeed.com')) {
    // Indeed job description
    const descElement = document.querySelector('#jobsearch-ViewjobPaneWrapper') ||
                       document.querySelector('.jobsearch-jobDescriptionText');
    return descElement?.textContent?.trim() || null;
  }

  if (hostname.includes('glassdoor.com')) {
    // Glassdoor job description
    const descElement = document.querySelector('[data-test="jobDescription"]') ||
                       document.querySelector('.JobDetails_jobDescription__uW_LA');
    return descElement?.textContent?.trim() || null;
  }

  // Generic fallback
  const main = document.querySelector('main') || document.querySelector('.job-description');
  return main?.textContent?.trim() || null;
}

function getJobTitle(): string | null {
  const titleElement = document.querySelector('h1') ||
                      document.querySelector('[data-test-id="top-card-title"]');
  return titleElement?.textContent?.trim() || null;
}

function getCompanyName(): string | null {
  const companyElement = document.querySelector('[data-test-id="top-card-company-name"]') ||
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
