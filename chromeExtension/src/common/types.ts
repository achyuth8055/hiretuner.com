/**
 * Shared types for the Chrome extension
 */

export interface ResumeData {
  text: string;
  file?: {
    name: string;
    type: string;
    size: number;
  };
}

export interface JobDescription {
  text: string;
  title?: string;
  company?: string;
  url?: string;
}

export interface AnalysisResult {
  type: 'ats-score' | 'resume-match' | 'keyword-scan' | 'bullet-generator' | 'interview-questions';
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface ExtensionMessage {
  action: string;
  payload?: any;
}

export interface StoredSession {
  userId?: string;
  token?: string;
  expiresAt?: number;
}

export interface ExtensionConfig {
  apiUrl: string;
  debug: boolean;
  maxFileSize: number;
}
