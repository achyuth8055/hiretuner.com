/**
 * Content Script
 * Runs on web pages, can extract job descriptions and resumes
 */

import { dlog } from '../common/debug';
import { reportTelemetry } from '../common/telemetry';

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
    // Indeed has several page templates. Prefer the actual description
    // container; only fall back to the page-section wrapper as a last resort.
    // `#jobsearch-ViewjobPaneWrapper` (the previous final fallback) returns
    // the entire right pane including apply buttons and recommendations.
    const descElement =
      document.querySelector('#jobDescriptionText') ||
      document.querySelector('.jobsearch-jobDescriptionText') ||
      document.querySelector('[id^="jobDetailsSection"]') ||
      document.querySelector('section[class*="jobsearch-JobComponent-description"]');
    return descElement?.textContent?.trim() || null;
  }

  if (hostname.includes('glassdoor.com')) {
    const descElement =
      document.querySelector('[data-test="jobDescription"]') ||
      document.querySelector('[class*="JobDetails_jobDescription"]') ||
      document.querySelector('.JobDetails_jobDescription__uW_LA');
    return descElement?.textContent?.trim() || null;
  }

  // Greenhouse-hosted boards (boards.greenhouse.io, job-boards.greenhouse.io,
  // *.greenhouse.io custom domains). Their layout exposes the description via
  // a stable `#content` id, but we keep a couple of fallbacks.
  if (hostname.endsWith('greenhouse.io')) {
    const descElement =
      document.querySelector('#content') ||
      document.querySelector('.app-content') ||
      document.querySelector('[class*="content--body"]');
    const text = descElement?.textContent?.trim();
    if (text && text.length > 200) return text;
    // Fall through to JSON-LD if the DOM didn't yield something substantial.
  }

  // Lever (jobs.lever.co). Description sits in `.section-wrapper.page-centered`
  // or a `.posting-content` block.
  if (hostname.includes('lever.co')) {
    const descElement =
      document.querySelector('.section-wrapper.page-centered') ||
      document.querySelector('.posting-page') ||
      document.querySelector('.posting-content') ||
      document.querySelector('[data-qa="job-description"]');
    const text = descElement?.textContent?.trim();
    if (text && text.length > 200) return text;
  }

  // Workday (*.myworkdayjobs.com). Workday's React app uses data-automation-id
  // attributes for stable hooks.
  if (hostname.includes('myworkdayjobs.com')) {
    const descElement =
      document.querySelector('[data-automation-id="jobPostingDescription"]') ||
      document.querySelector('[data-automation-id="jobPostingDetails"]') ||
      document.querySelector('[data-automation-id="job-description"]');
    const text = descElement?.textContent?.trim();
    if (text && text.length > 200) return text;
  }

  // Workable (apply.workable.com) and Ashby (*.ashbyhq.com) both emit
  // JobPosting JSON-LD reliably — fall through to the generic block below.

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
            // DOMParser produces a fully-detached document where <script>
            // tags are parsed but never executed; we only read textContent
            // so no DOM-attached innerHTML risk.
            const parsedDoc = new DOMParser().parseFromString(html, 'text/html');
            return parsedDoc.body.textContent?.trim() || null;
          }
        }
      }
    } catch {
      /* skip malformed JSON-LD */
    }
  }

  // Last-resort: longest content block on the page.
  // Upper bound raised from 12k → 100k so long Workday / Greenhouse JDs no
  // longer fall through the filter just for being verbose. The keyword regex
  // is multi-language (EXT-E13) so a JD in German / French / Spanish doesn't
  // get filtered out for not containing the literal English words.
  const JD_SHAPE_RE =
    /(responsib|requirement|qualif|experience|responsabil|exigenc|anford|qualifik|erfahr|requisito|experi|expérienc|compéten|aptitud|tâche|tarea)/i;
  const candidates = Array.from(document.querySelectorAll('main, article, [class*="description"], [class*="job"], section'));
  let best: { el: Element; len: number } | null = null;
  for (const el of candidates) {
    const text = (el.textContent || '').trim();
    if (text.length > 600 && text.length < 100000 && JD_SHAPE_RE.test(text)) {
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

    if (!jobDescription) {
      // Beacon back so we know which sites the extractor stopped working on.
      void reportTelemetry('extraction_failed', 'No JD detected on supported host', {
        host: window.location.host,
      });
    }

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

  const container = document.body;
  if (!container) return;

  // Filter out anything that smells like HTML or is unreasonable to highlight.
  // The keyword list comes from the HireTuner API; treat it as untrusted to
  // keep this content script safe against ever inserting live markup.
  const safeKeywords = keywords
    .map((k) => (k || '').trim())
    .filter((k) => k.length > 0 && k.length <= 60 && !/[<>]/.test(k));
  if (safeKeywords.length === 0) return;

  function shouldSkip(node: Node) {
    const parent = node.parentElement;
    if (!parent) return true;
    const tag = parent.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') return true;
    if (parent.isContentEditable) return true;
    // Don't recurse into a node we already highlighted.
    if (tag === 'MARK' && parent.dataset.hiretunerHighlight === '1') return true;
    return false;
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let current: Node | null = walker.nextNode();
  while (current) {
    if (!shouldSkip(current)) textNodes.push(current as Text);
    current = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const text = textNode.data;
    let lowest = -1;
    let chosenLen = 0;
    for (const keyword of safeKeywords) {
      const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
      if (idx >= 0 && (lowest === -1 || idx < lowest)) {
        lowest = idx;
        chosenLen = keyword.length;
      }
    }
    if (lowest < 0) continue;

    // Safe DOM splitting: split into [before][match][after], wrap [match] in a
    // <mark> whose content is set via textContent. No innerHTML, no template
    // interpolation, no path for attacker-controlled HTML to enter the page.
    const after = textNode.splitText(lowest);
    after.splitText(chosenLen);
    const mark = document.createElement('mark');
    mark.dataset.hiretunerHighlight = '1';
    mark.style.backgroundColor = '#ffff00';
    mark.style.padding = '0 2px';
    mark.textContent = after.data;
    after.parentNode!.replaceChild(mark, after);
  }
}

// Debug logging is gated through common/debug. Production users see no
// console noise; toggle `debug=true` in Options to see traces.
void dlog('Content', `Script initialized on ${window.location.hostname}`);
