import { apiRequest } from './client';
import type { ProgressSummary, Analytics, LearningPlan } from '../types';

export async function getProgress(): Promise<ProgressSummary> {
  return apiRequest<ProgressSummary>('/progress');
}

export async function getAnalytics(): Promise<Analytics> {
  return apiRequest<Analytics>('/progress/analytics');
}

export async function getLearningPlan(refresh: boolean = false): Promise<LearningPlan> {
  const path = `/progress/learning-plan${refresh ? '?refresh=true' : ''}`;
  return apiRequest<LearningPlan>(path);
}
