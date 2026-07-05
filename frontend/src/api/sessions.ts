import { apiRequest } from './client';
import type { Session, SessionSummary } from '../types';

export async function startSession(language: string, difficulty: string): Promise<Session> {
  return apiRequest<Session>('/sessions/start', {
    method: 'POST',
    body: JSON.stringify({ language, difficulty }),
  });
}

export async function getSessions(): Promise<Session[]> {
  return apiRequest<Session[]>('/sessions');
}

export async function getSession(sessionId: number): Promise<SessionSummary> {
  return apiRequest<SessionSummary>(`/sessions/${sessionId}`);
}

export async function endSession(sessionId: number): Promise<Session> {
  return apiRequest<Session>(`/sessions/${sessionId}/end`, {
    method: 'POST',
  });
}
