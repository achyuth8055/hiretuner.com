/**
 * Background Service Worker
 * Handles message passing and persistent storage
 */

import type { ExtensionMessage } from '../common/types';
import { dlog } from '../common/debug';

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  void dlog('Background', `Received message: ${message.action}`);

  switch (message.action) {
    case 'GET_STORED_RESUME':
      chrome.storage.local.get(['storedResume'], (result) => {
        sendResponse({
          success: true,
          data: result.storedResume,
        });
      });
      return true; // Keep channel open for async response

    case 'SAVE_RESUME':
      chrome.storage.local.set({ storedResume: message.payload }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'SAVE_ANALYSIS_RESULT':
      chrome.storage.local.get(['analysisHistory'], (result) => {
        const history = result.analysisHistory || [];
        history.push({
          ...message.payload,
          timestamp: Date.now(),
        });
        // Keep last 50 results
        if (history.length > 50) {
          history.shift();
        }
        chrome.storage.local.set({ analysisHistory: history }, () => {
          sendResponse({ success: true });
        });
      });
      return true;

    case 'GET_ANALYSIS_HISTORY':
      chrome.storage.local.get(['analysisHistory'], (result) => {
        sendResponse({
          success: true,
          data: result.analysisHistory || [],
        });
      });
      return true;

    case 'CLEAR_HISTORY':
      chrome.storage.local.set({ analysisHistory: [] }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'GET_CONFIG':
      chrome.storage.sync.get(['apiUrl', 'debug'], (result) => {
        sendResponse({
          success: true,
          data: {
            // Default to production. Fresh installs should never hit localhost.
            apiUrl: result.apiUrl || 'https://hiretuner.com',
            debug: result.debug || false,
          },
        });
      });
      return true;

    case 'SAVE_CONFIG':
      chrome.storage.sync.set(message.payload, () => {
        sendResponse({ success: true });
      });
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Action badge state (EXT-E34). Reflects sign-in status at a glance and
 * flips to "…" while the popup is mid-analysis.
 *
 *  - empty badge      = signed in, idle
 *  - "in"             = signed in (initial bootstrap)
 *  - "out"            = signed out
 *  - "..."            = active API call from popup
 *  - "!"              = last call errored
 *
 * Listens for SET_BADGE messages from popup.ts. Also auto-syncs on init
 * from chrome.storage.local.firebaseIdToken.
 */
async function applyBadge(state: 'in' | 'out' | 'busy' | 'error') {
  const colors: Record<typeof state, string> = {
    in: '#10B981',
    out: '#94A3B8',
    busy: '#EAB308',
    error: '#EF4444',
  };
  const texts: Record<typeof state, string> = {
    in: '',
    out: 'OUT',
    busy: '…',
    error: '!',
  };
  await chrome.action.setBadgeBackgroundColor({ color: colors[state] });
  await chrome.action.setBadgeText({ text: texts[state] });
}

function refreshBadgeFromAuth() {
  chrome.storage.local.get(['firebaseIdToken', 'firebaseTokenIssuedAt'], (stored) => {
    const token = stored.firebaseIdToken as string | undefined;
    const issuedAt = (stored.firebaseTokenIssuedAt as number | undefined) ?? 0;
    const ageMinutes = (Date.now() - issuedAt) / 1000 / 60;
    const signedIn = Boolean(token) && ageMinutes < 60;
    void applyBadge(signedIn ? 'in' : 'out');
  });
}

refreshBadgeFromAuth();

// Patch the existing message router with badge-update messages without
// touching its switch statement (we register a second listener — Chrome
// allows multiple).
chrome.runtime.onMessage.addListener((message: { action?: string; state?: string }, _sender, sendResponse) => {
  if (message.action === 'SET_BADGE' && typeof message.state === 'string') {
    void applyBadge(message.state as 'in' | 'out' | 'busy' | 'error');
    sendResponse({ ok: true });
    return true;
  }
  if (message.action === 'REFRESH_BADGE') {
    refreshBadgeFromAuth();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

// Re-sync the badge whenever storage changes (sign-in / sign-out from popup).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.firebaseIdToken || changes.firebaseTokenIssuedAt) {
    refreshBadgeFromAuth();
  }
});

// Keyboard shortcut handler (EXT-E28). Both shortcuts target the active tab —
// `open-popup` is a no-op on Chrome (the popup opens via the OS-level
// keybinding) but documents the intent in `chrome://extensions/shortcuts`.
chrome.commands?.onCommand.addListener(async (command) => {
  if (command === 'extract-job') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_JOB_DESCRIPTION' });
    } catch {
      // Content script may not be loaded on this URL — ignore.
    }
  }
});

// Periodic cleanup of old results (weekly)
chrome.alarms.create('cleanup', { periodInMinutes: 60 * 24 * 7 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    chrome.storage.local.get(['analysisHistory'], (result) => {
      const history = result.analysisHistory || [];
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filtered = (history as Array<{ timestamp: number }>).filter(
        (item) => item.timestamp > oneWeekAgo,
      );
      chrome.storage.local.set({ analysisHistory: filtered });
    });
  }
});

void dlog('Background', 'Service Worker initialized');
