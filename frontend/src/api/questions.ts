import { apiRequest } from './client';
import type { Question, EvaluationResult } from '../types';

export async function getNextQuestion(
  sessionId: number,
  language: string,
  difficulty: string
): Promise<Question> {
  const params = new URLSearchParams({
    session_id: sessionId.toString(),
    language,
    difficulty,
  });
  return apiRequest<Question>(`/questions/next?${params.toString()}`);
}

export interface EvaluatePayload {
  session_id: number;
  question_id: string;
  question_text: string;
  question_type: 'theory' | 'coding';
  question_topic: string;
  language: string;
  user_answer: string;
  test_cases?: any[] | null;
}

export async function evaluateAnswer(payload: EvaluatePayload): Promise<EvaluationResult> {
  return apiRequest<EvaluationResult>('/questions/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
