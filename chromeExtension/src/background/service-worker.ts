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
