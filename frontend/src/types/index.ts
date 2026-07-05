export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Question {
  id: string; // Either DB int stringified or 'gen_{hash}'
  language: string;
  difficulty: string;
  topic: string;
  type: 'theory' | 'coding';
  content: string;
  test_cases?: any[] | null;
}

export interface TestCaseResult {
  stdin: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  execution_time?: string | null;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  missed_concepts: string[];
  suggested_topics: string[];
  // Coding fields
  passed_tests?: number | null;
  total_tests?: number | null;
  test_results?: TestCaseResult[] | null;
  optimization_suggestions?: string | null;
}

export interface SubmissionSummary {
  id: number;
  question_text: string | null;
  question_topic: string | null;
  question_type: string | null;
  score: number | null;
  submitted_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  language: string;
  difficulty: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
}

export interface SessionSummary {
  session: Session;
  submissions: SubmissionSummary[];
  total_questions: number;
  average_score: number | null;
}

export interface SkillScore {
  language: string;
  topic: string;
  proficiency_score: number;
  updated_at: string;
}

export interface ProgressSummary {
  total_questions_solved: number;
  accuracy_percentage: number;
  skill_scores: SkillScore[];
  skill_map: Record<string, Record<string, number>>;
}

export interface SessionHistoryItem {
  session_id: number;
  language: string;
  difficulty: string;
  start_time: string | null;
  questions_answered: number;
  average_score: number;
}

export interface Analytics {
  total_questions_solved: number;
  accuracy_percentage: number;
  total_sessions: number;
  session_history: SessionHistoryItem[];
}

export interface Resource {
  title: string;
  url: string;
  type: 'doc' | 'video' | 'exercise' | 'tutorial';
}

export interface RoadmapItem {
  topic: string;
  language: string;
  priority: number;
  current_score: number;
  why_important?: string;
  resources: Resource[];
  exercises: string[];
}

export interface LearningPlan {
  id: number;
  generated_at: string;
  weak_topics: string[];
  roadmap: RoadmapItem[];
}
