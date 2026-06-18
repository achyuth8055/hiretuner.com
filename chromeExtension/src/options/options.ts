/**
 * Options Page Script
 * Handles settings management
 */

const FIELDS = [
  'apiUrl',
  'firebaseApiKey',
  'firebaseAuthDomain',
  'firebaseProjectId',
  'firebaseAppId',
  'firebaseStorageBucket',
  'firebaseMessagingSenderId',
] as const;

type FieldName = (typeof FIELDS)[number];

const debugModeCheckbox = document.getElementById('debugMode') as HTMLInputElement | null;
const maxFileSizeInput = document.getElementById('maxFileSize') as HTMLInputElement | null;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement | null;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement | null;
const statusMessage = document.getElementById('statusMessage') as HTMLElement | null;

const DEFAULT_CONFIG: Record<FieldName | 'debugMode' | 'maxFileSize', string | number | boolean> = {
  apiUrl: 'https://hiretuner.com',
  firebaseApiKey: '',
  firebaseAuthDomain: '',
  firebaseProjectId: '',
  firebaseAppId: '',
  firebaseStorageBucket: '',
  firebaseMessagingSenderId: '',
  debugMode: false,
  maxFileSize: 8,
};

function getField(name: FieldName): HTMLInputElement | null {
  return document.getElementById(name) as HTMLInputElement | null;
}

window.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(DEFAULT_CONFIG, (config) => {
    for (const field of FIELDS) {
      const el = getField(field);
      if (el) el.value = String(config[field] ?? DEFAULT_CONFIG[field] ?? '');
    }
    if (debugModeCheckbox) debugModeCheckbox.checked = Boolean(config.debugMode);
    if (maxFileSizeInput) {
      maxFileSizeInput.value = String(config.maxFileSize ?? DEFAULT_CONFIG.maxFileSize);
    }
  });
});

saveBtn?.addEventListener('click', () => {
  const apiUrl = getField('apiUrl')?.value.trim() || (DEFAULT_CONFIG.apiUrl as string);
  try {
    new URL(apiUrl);
  } catch {
    showStatus('Invalid API URL format', 'error');
    return;
  }

  const config: Record<string, string | boolean | number> = {
    apiUrl,
    debugMode: Boolean(debugModeCheckbox?.checked),
    maxFileSize: parseInt(maxFileSizeInput?.value ?? '8', 10) || (DEFAULT_CONFIG.maxFileSize as number),
  };

  for (const field of FIELDS) {
    if (field === 'apiUrl') continue;
    const el = getField(field);
    if (el) config[field] = el.value.trim();
  }

  chrome.storage.sync.set(config, () => {
    showStatus('Settings saved successfully!', 'success');
  });
});

resetBtn?.addEventListener('click', () => {
  if (!confirm('Reset all settings to defaults?')) return;
  chrome.storage.sync.set(DEFAULT_CONFIG, () => {
    for (const field of FIELDS) {
      const el = getField(field);
      if (el) el.value = String(DEFAULT_CONFIG[field] ?? '');
    }
    if (debugModeCheckbox) debugModeCheckbox.checked = Boolean(DEFAULT_CONFIG.debugMode);
    if (maxFileSizeInput) maxFileSizeInput.value = String(DEFAULT_CONFIG.maxFileSize);
    showStatus('Settings reset to defaults', 'success');
  });
});

function showStatus(message: string, type: 'success' | 'error') {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  setTimeout(() => {
    statusMessage.className = 'status-message';
  }, 3000);
}

console.log('[Options] Script initialized');
