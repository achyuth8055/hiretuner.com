/**
 * Popup Script
 * Handles UI interactions and communicates with background script and API
 */

import { apiClient } from '../common/api';
import {
  getCurrentIdToken,
  getStoredUser,
  signInWithGoogle,
  signOut,
} from '../common/auth';
import { dlog } from '../common/debug';
import type { ResumeData, JobDescription, AnalysisResult } from '../common/types';

// DOM Elements
const resumeInput = document.getElementById('resumeInput') as HTMLTextAreaElement;
const jobDescInput = document.getElementById('jobDescInput') as HTMLTextAreaElement;
const analysisType = document.getElementById('analysisType') as HTMLSelectElement;
const analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
const loadingSpinner = document.getElementById('loadingSpinner') as HTMLElement;
const resultContainer = document.getElementById('resultContainer') as HTMLElement;
const resultContent = document.getElementById('resultContent') as HTMLElement;
const errorMessage = document.getElementById('errorMessage') as HTMLElement;
const copyResultBtn = document.getElementById('copyResultBtn') as HTMLButtonElement;
const extractJobBtn = document.getElementById('extractJobBtn') as HTMLButtonElement;
const loadResumeBtn = document.getElementById('loadResumeBtn') as HTMLButtonElement;
const saveResumeBtn = document.getElementById('saveResumeBtn') as HTMLButtonElement;
const extractJobPageBtn = document.getElementById('extractJobPageBtn') as HTMLButtonElement;
const clearHistoryBtn = document.getElementById('clearHistoryBtn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
const historyList = document.getElementById('historyList') as HTMLElement;

// Tab switching
document.querySelectorAll('.tab-btn').forEach((btn) => {
  // ARIA tab pattern (EXT-E29): make the tab button keyboard-navigable with
  // arrow keys and announce the active state to screen readers.
  btn.setAttribute('role', 'tab');
  btn.setAttribute('tabindex', btn.classList.contains('active') ? '0' : '-1');
  btn.setAttribute('aria-selected', btn.classList.contains('active') ? 'true' : 'false');
  const panelId = btn.getAttribute('data-tab');
  if (panelId) btn.setAttribute('aria-controls', panelId);

  const activate = () => {
    const tabName = btn.getAttribute('data-tab');
    if (!tabName) return;

    document.querySelectorAll('.tab-content').forEach((tab) => {
      tab.classList.remove('active');
      tab.setAttribute('role', 'tabpanel');
    });
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('tabindex', '-1');
    });

    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.setAttribute('tabindex', '0');
    (btn as HTMLElement).focus();

    if (tabName === 'history') {
      loadHistory();
    }
  };

  btn.addEventListener('click', activate);

  btn.addEventListener('keydown', (event) => {
    const evt = event as KeyboardEvent;
    if (evt.key !== 'ArrowLeft' && evt.key !== 'ArrowRight' && evt.key !== 'Home' && evt.key !== 'End') return;
    evt.preventDefault();
    const tabs = Array.from(document.querySelectorAll('.tab-btn')) as HTMLElement[];
    const idx = tabs.indexOf(btn as HTMLElement);
    let nextIdx = idx;
    if (evt.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (evt.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
    else if (evt.key === 'Home') nextIdx = 0;
    else if (evt.key === 'End') nextIdx = tabs.length - 1;
    tabs[nextIdx].click();
  });
});

// Set the tablist role on the container holding the tab buttons.
const firstTab = document.querySelector('.tab-btn');
if (firstTab?.parentElement) {
  firstTab.parentElement.setAttribute('role', 'tablist');
  firstTab.parentElement.setAttribute('aria-label', 'HireTuner features');
}

// Main analyze button
analyzeBtn.addEventListener('click', async () => {
  const resumeText = resumeInput.value.trim();
  const jobDescText = jobDescInput.value.trim();
  const type = analysisType.value;

  if (!resumeText) {
    showError('Please enter or load a resume');
    return;
  }

  if (!jobDescText && type !== 'bullet-generator') {
    showError('Please enter a job description');
    return;
  }

  showLoading(true);
  hideError();

  const resume: ResumeData = { text: resumeText };
  const jobDesc: JobDescription = { text: jobDescText };

  // Flip the action badge to busy while we run; flip back to idle/error in
  // the finally / catch branches (EXT-E34).
  chrome.runtime.sendMessage({ action: 'SET_BADGE', state: 'busy' });

  try {
    let result: AnalysisResult;

    switch (type) {
      case 'ats-score':
        result = await apiClient.analyzeATS(resume, jobDesc);
        break;
      case 'resume-match':
        result = await apiClient.checkResumeMatch(resume, jobDesc);
        break;
      case 'keyword-scan':
        result = await apiClient.scanKeywords(resume, jobDesc);
        break;
      case 'bullet-generator':
        result = await apiClient.generateBulletPoints(resumeText, jobDescText);
        break;
      case 'interview-questions':
        result = await apiClient.generateInterviewQuestions(resume, jobDesc);
        break;
      default:
        throw new Error('Unknown analysis type');
    }

    if (result.success && result.data) {
      displayResult(result.data);
      chrome.runtime.sendMessage({ action: 'REFRESH_BADGE' });

      // Save to history
      chrome.runtime.sendMessage({
        action: 'SAVE_ANALYSIS_RESULT',
        payload: result,
      });
    } else {
      showError(result.error || 'Analysis failed');
      chrome.runtime.sendMessage({ action: 'SET_BADGE', state: 'error' });
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : 'An error occurred');
    chrome.runtime.sendMessage({ action: 'SET_BADGE', state: 'error' });
  } finally {
    showLoading(false);
  }
});

// Inspect chrome.runtime.lastError so we can tell apart "content script not
// injected on this page" from "content script ran but found nothing". Both
// previously surfaced the same vague message.
function describeMessageError(): string {
  const err = chrome.runtime.lastError?.message ?? '';
  if (err.includes('Could not establish connection') || err.includes('Receiving end does not exist')) {
    return 'HireTuner doesn\'t run on this page. Open a supported job site (LinkedIn, Indeed, Greenhouse, Lever, Workday, etc.) and try again.';
  }
  if (err) return err;
  return 'No job description detected on this page. Try paste the text manually.';
}

extractJobBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab?.id) {
      showError('Could not access the active tab.');
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_JOB_DESCRIPTION' }, (response) => {
      if (response?.success && response.data?.text) {
        jobDescInput.value = response.data.text;
        hideError();
      } else {
        showError(describeMessageError());
      }
    });
  } catch {
    showError('Failed to extract job description.');
  }
});

extractJobPageBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab?.id) {
      showError('Could not access the active tab.');
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_JOB_DESCRIPTION' }, (response) => {
      if (response?.success && response.data?.text) {
        const extractedJob = document.getElementById('extractedJob') as HTMLElement;
        extractedJob.textContent = response.data.text;
        extractedJob.style.display = 'block';
        hideError();
      } else {
        showError(describeMessageError());
      }
    });
  } catch {
    showError('Failed to extract job description.');
  }
});

// Load stored resume — tries the website's master resume first when signed
// in (EXT-E16) and falls back to the extension's locally cached text. This
// removes the "I uploaded my resume on the website but the extension says
// nothing is stored" confusion from the audit.
loadResumeBtn.addEventListener('click', async () => {
  // 1. Try the server master resume if we have an ID token.
  try {
    const serverText = await apiClient.fetchMasterResumeText();
    if (serverText) {
      resumeInput.value = serverText;
      hideError();
      // Also cache to local for offline use.
      chrome.runtime.sendMessage({ action: 'SAVE_RESUME', payload: serverText });
      return;
    }
  } catch {
    /* fall through to local cache */
  }
  // 2. Fall back to whatever's cached in chrome.storage.local.
  chrome.runtime.sendMessage({ action: 'GET_STORED_RESUME' }, (response) => {
    if (response?.success && response.data) {
      resumeInput.value = response.data;
      hideError();
    } else {
      showError('No stored resume found. Upload one at hiretuner.com/dashboard, then click Load again.');
    }
  });
});

// Save current resume
saveResumeBtn.addEventListener('click', () => {
  const resumeText = resumeInput.value.trim();
  if (!resumeText) {
    showError('Please enter a resume first');
    return;
  }

  chrome.runtime.sendMessage(
    { action: 'SAVE_RESUME', payload: resumeText },
    (response) => {
      if (response?.success) {
        // Show temporary success message
        const originalText = saveResumeBtn.textContent;
        saveResumeBtn.textContent = '✓ Saved';
        setTimeout(() => {
          saveResumeBtn.textContent = originalText;
        }, 2000);
      }
    }
  );
});

// Copy result to clipboard
copyResultBtn.addEventListener('click', () => {
  const text = resultContent.textContent;
  if (text) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = copyResultBtn.textContent;
      copyResultBtn.textContent = '✓ Copied';
      setTimeout(() => {
        copyResultBtn.textContent = originalText;
      }, 2000);
    });
  }
});

// Clear history
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all history?')) {
    chrome.runtime.sendMessage({ action: 'CLEAR_HISTORY' }, () => {
      loadHistory();
    });
  }
});

// Settings button
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Helper functions
function displayResult(data: any) {
  resultContent.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  resultContainer.style.display = 'block';
}

function showError(message: string) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function hideError() {
  errorMessage.style.display = 'none';
}

function showLoading(show: boolean) {
  loadingSpinner.style.display = show ? 'flex' : 'none';
}

function loadHistory() {
  chrome.runtime.sendMessage({ action: 'GET_ANALYSIS_HISTORY' }, (response) => {
    if (response?.success && response.data) {
      const history = response.data as AnalysisResult[];
      historyList.innerHTML = '';

      if (history.length === 0) {
        historyList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No history yet</p>';
        return;
      }

      // Show most recent first
      history.reverse().forEach((item) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const time = new Date(item.timestamp).toLocaleDateString();
        div.innerHTML = `
          <div class="history-item-type">${item.type}</div>
          <div class="history-item-time">${time}</div>
        `;
        historyList.appendChild(div);
      });
    }
  });
}

// ---- Auth wiring ----
const signInBtn = document.getElementById('signInBtn') as HTMLButtonElement | null;
const signOutBtn = document.getElementById('signOutBtn') as HTMLButtonElement | null;
const authSignedIn = document.getElementById('authSignedIn') as HTMLElement | null;
const authSignedOut = document.getElementById('authSignedOut') as HTMLElement | null;
const authUserLabel = document.getElementById('authUserLabel') as HTMLElement | null;
const authError = document.getElementById('authError') as HTMLElement | null;

async function refreshAuthUI(): Promise<void> {
  const token = await getCurrentIdToken().catch(() => null);
  const stored = await getStoredUser();
  if (token && (stored.email || stored.uid)) {
    if (authSignedIn) authSignedIn.style.display = '';
    if (authSignedOut) authSignedOut.style.display = 'none';
    if (authUserLabel) {
      authUserLabel.textContent = `Signed in as ${stored.email ?? stored.name ?? 'user'}`;
    }
  } else {
    if (authSignedIn) authSignedIn.style.display = 'none';
    if (authSignedOut) authSignedOut.style.display = '';
  }
}

function showAuthError(message: string): void {
  if (!authError) return;
  authError.textContent = message;
  authError.style.display = 'block';
  setTimeout(() => {
    authError.style.display = 'none';
  }, 6000);
}

signInBtn?.addEventListener('click', async () => {
  if (!signInBtn) return;
  signInBtn.disabled = true;
  signInBtn.textContent = 'Signing in…';
  try {
    await signInWithGoogle();
    await refreshAuthUI();
  } catch (error) {
    showAuthError(error instanceof Error ? error.message : 'Sign-in failed.');
  } finally {
    signInBtn.disabled = false;
    signInBtn.textContent = 'Sign in with Google';
  }
});

signOutBtn?.addEventListener('click', async () => {
  if (!signOutBtn) return;
  signOutBtn.disabled = true;
  try {
    await signOut();
    await refreshAuthUI();
  } finally {
    signOutBtn.disabled = false;
  }
});

void refreshAuthUI();

// Debug-gated — silent in production. Toggle `debug=true` in Options to enable.
void dlog('Popup', 'Script initialized');
