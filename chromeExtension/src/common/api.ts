/**
 * API client for communicating with the main HireTuner app.
 *
 * The server returns `{ ok, data, error }` envelopes — we unwrap them here
 * so the extension UI can deal in plain results.
 *
 * When a Firebase ID token is available (i.e. the user signed in through the
 * extension popup), it is attached as `Authorization: Bearer <token>` so
 * server-side requireApiUserAsync can apply the user's real plan/quota.
 */

import type { AnalysisResult, ResumeData, JobDescription } from './types';
import { getCurrentIdToken } from './auth';
import { reportTelemetry } from './telemetry';

// Single source of truth for the API URL. The Options page can override this
// via chrome.storage.sync, but fresh installs should hit production by
// default — never localhost.
const DEFAULT_API_URL = 'https://hiretuner.com';

interface ApiEnvelope {
  ok?: boolean;
  data?: unknown;
  error?: { message?: string; code?: string; details?: unknown };
}

class APIClient {
  private apiUrl: string;

  constructor(apiUrl: string = DEFAULT_API_URL) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
  }

  setApiUrl(apiUrl: string) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
  }

  /**
   * Pull the signed-in user's master resume text from the website so the
   * extension can analyze against it without the user re-pasting (EXT-E16).
   * Returns null when not signed in, when no master resume exists, or on
   * network error — callers should fall back to the local cached text.
   */
  async fetchMasterResumeText(): Promise<string | null> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const token = await getCurrentIdToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch {
        return null;
      }
      const response = await fetch(`${this.apiUrl}/api/resumes/master`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) return null;
      const envelope = (await response.json().catch(() => ({}))) as ApiEnvelope;
      const data = envelope.data as { masterResume?: { parsedText?: string } } | undefined;
      return data?.masterResume?.parsedText?.trim() || null;
    } catch {
      return null;
    }
  }

  /** ATS score (server expects { resumeText, targetRole }). */
  async analyzeATS(resume: ResumeData, jobDescription: JobDescription): Promise<AnalysisResult> {
    return this.callAPI(
      '/api/tools/ats-score',
      { resumeText: resume.text, targetRole: jobDescription.title ?? jobDescription.text.slice(0, 200) },
      'ats-score',
    );
  }

  /** Resume match (server expects { resumeText, jobDescriptionText }). */
  async checkResumeMatch(
    resume: ResumeData,
    jobDescription: JobDescription,
  ): Promise<AnalysisResult> {
    return this.callAPI(
      '/api/tools/resume-match',
      { resumeText: resume.text, jobDescriptionText: jobDescription.text },
      'resume-match',
    );
  }

  /** Keyword scan (server expects { resumeText, targetRole }). */
  async scanKeywords(
    resume: ResumeData,
    jobDescription?: JobDescription,
  ): Promise<AnalysisResult> {
    return this.callAPI(
      '/api/tools/keyword-scan',
      {
        resumeText: resume.text,
        targetRole: jobDescription?.title ?? jobDescription?.text.slice(0, 200) ?? '',
      },
      'keyword-scan',
    );
  }

  /**
   * Bullet point generator (server expects
   * { jobTitle, existingBullet, toolsUsed, impactMetric, targetRole }).
   */
  async generateBulletPoints(existingBullet: string, jobTitle: string): Promise<AnalysisResult> {
    return this.callAPI(
      '/api/tools/bullet-generator',
      { jobTitle, existingBullet, toolsUsed: '', impactMetric: '', targetRole: jobTitle },
      'bullet-generator',
    );
  }

  /** Interview questions (server expects { jobDescription, role, experienceLevel }). */
  async generateInterviewQuestions(
    _resume: ResumeData,
    jobDescription: JobDescription,
  ): Promise<AnalysisResult> {
    return this.callAPI(
      '/api/tools/interview-questions',
      {
        jobDescription: jobDescription.text,
        role: jobDescription.title ?? '',
        experienceLevel: '',
      },
      'interview-questions',
    );
  }

  private async callAPI(
    endpoint: string,
    payload: Record<string, unknown>,
    type: AnalysisResult['type'],
  ): Promise<AnalysisResult> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const token = await getCurrentIdToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch {
        /* not signed in — call hits anonymous quotas */
      }

      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const envelope = (await response.json().catch(() => ({}))) as ApiEnvelope;

      if (!response.ok || envelope.ok === false) {
        // 5xx and unexpected errors are worth telemetering; quota/validation
        // are expected user-recoverable conditions, skip those.
        const code = envelope.error?.code ?? '';
        const isExpectedUserError =
          response.status === 422 ||
          response.status === 402 ||
          response.status === 429 ||
          code === 'usage_limit' ||
          code === 'validation_error' ||
          code === 'rate_limited' ||
          code === 'unauthorized';
        if (!isExpectedUserError) {
          void reportTelemetry('api_error', `${endpoint} ${response.status} ${code}`, {
            endpoint,
            status: response.status,
            code,
          });
        }
        return {
          type,
          success: false,
          error:
            envelope.error?.message ||
            `API error: ${response.status} ${response.statusText || ''}`.trim(),
          timestamp: Date.now(),
        };
      }

      return {
        type,
        success: true,
        data: envelope.data ?? envelope,
        timestamp: Date.now(),
      };
    } catch (error) {
      void reportTelemetry('api_error', error instanceof Error ? error.message : 'fetch threw', {
        endpoint,
      });
      return {
        type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }
}

export const apiClient = new APIClient();

// Sync the API URL from extension settings on load.
if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
  chrome.storage.sync.get(['apiUrl'], (result) => {
    if (typeof result.apiUrl === 'string' && result.apiUrl) {
      apiClient.setApiUrl(result.apiUrl);
    }
  });
}
