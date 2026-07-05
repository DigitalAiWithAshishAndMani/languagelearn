import React, { useState, useEffect } from 'react';
import type { Session, Question, EvaluationResult as EvalResultType } from '../types';
import { getNextQuestion, evaluateAnswer } from '../api/questions';
import { endSession } from '../api/sessions';
import { QuestionCard } from '../components/QuestionCard';
import { CodeEditor } from '../components/CodeEditor';
import { EvaluationResult } from '../components/EvaluationResult';

interface InterviewPageProps {
  session: Session;
  onEndSession: () => void;
}

export const InterviewPage: React.FC<InterviewPageProps> = ({ session, onEndSession }) => {
  // Question & Evaluation States
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [evaluation, setEvaluation] = useState<EvalResultType | null>(null);
  
  // Loading States
  const [isLoadingQuestion, setIsLoadingQuestion] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch first question on mount
  useEffect(() => {
    fetchNextChallenge();
  }, [session.id]);

  const fetchNextChallenge = async () => {
    setIsLoadingQuestion(true);
    setEvaluation(null);
    setUserAnswer('');
    setErrorMsg(null);

    try {
      const question = await getNextQuestion(
        session.id,
        session.language,
        session.difficulty
      );
      setCurrentQuestion(question);
    } catch (err: any) {
      setErrorMsg(err.detail || err.message || 'Failed to retrieve next interview question.');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    if (!userAnswer.trim()) {
      setErrorMsg('Please enter a response before submitting.');
      return;
    }

    setIsEvaluating(true);
    setErrorMsg(null);

    // Set default mockup test cases for evaluation if coding
    const testCases = currentQuestion.type === 'coding' ? [
      { stdin: '1', expected_output: '1' },
      { stdin: '2', expected_output: '4' }
    ] : null;

    try {
      const evalRes = await evaluateAnswer({
        session_id: session.id,
        question_id: currentQuestion.id,
        question_text: currentQuestion.content,
        question_type: currentQuestion.type,
        question_topic: currentQuestion.topic,
        language: session.language,
        user_answer: userAnswer,
        test_cases: testCases,
      });
      setEvaluation(evalRes);
    } catch (err: any) {
      setErrorMsg(err.detail || err.message || 'Error occurred during AI answer evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await endSession(session.id);
      onEndSession();
    } catch (err) {
      console.error('Failed to end session:', err);
      // Fallback
      onEndSession();
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="container page-wrapper animate-fade-in" style={styles.container}>
      {/* Active Session Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <h2 style={styles.title}>Interview Session #{session.id}</h2>
          <div style={styles.meta}>
            <span style={styles.metaItem}>🎯 Track: <b>{session.language.toUpperCase()}</b></span>
            <span style={styles.metaItem}>⚡ Level: <b>{session.difficulty.toUpperCase()}</b></span>
          </div>
        </div>
        <button 
          onClick={handleEndSession} 
          className="btn btn-danger" 
          disabled={isEnding}
          style={styles.endBtn}
        >
          {isEnding ? 'Closing...' : 'End Session 🚪'}
        </button>
      </div>

      <div style={styles.divider}></div>

      {isLoadingQuestion ? (
        <div style={styles.loadingBox}>
          <span style={styles.loaderIcon}>🤖</span>
          <p style={styles.loaderText}>Local RAG pipeline retrieving relevant context and generating question...</p>
        </div>
      ) : errorMsg && !currentQuestion ? (
        <div style={styles.errorBox}>
          <p>⚠️ {errorMsg}</p>
          <button onClick={fetchNextChallenge} className="btn btn-secondary" style={{ marginTop: '12px' }}>
            Try Again
          </button>
        </div>
      ) : (
        currentQuestion && (
          <div style={styles.workspace}>
            {/* Question card */}
            <QuestionCard question={currentQuestion} />

            {errorMsg && (
              <div style={styles.errorBanner} className="animate-fade-in">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            {/* Answer Editor Area */}
            {!evaluation && (
              <div style={styles.answerArea} className="animate-fade-in">
                {currentQuestion.type === 'theory' ? (
                  <div style={styles.theoryBox}>
                    <label className="form-label" style={{ marginBottom: '12px' }}>
                      Your Solution Explanation
                    </label>
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="form-input"
                      style={styles.textarea}
                      placeholder="Explain your approach, list technical factors, or structure your theoretical response..."
                    />
                  </div>
                ) : (
                  <div style={styles.codeBox}>
                    <label className="form-label" style={{ marginBottom: '12px' }}>
                      Your Sandbox Solution Code
                    </label>
                    <CodeEditor
                      value={userAnswer}
                      onChange={setUserAnswer}
                      language={session.language}
                    />
                  </div>
                )}

                <div style={styles.actions}>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={isEvaluating}
                    className="btn btn-primary"
                    style={styles.submitBtn}
                  >
                    {isEvaluating ? 'AI Evaluation in progress...' : 'Submit Solution ✅'}
                  </button>
                </div>
              </div>
            )}

            {/* Evaluation Result overlay/inline */}
            {isEvaluating && (
              <div style={styles.evaluatingBox} className="animate-fade-in">
                <span style={styles.spinner}>🎛️</span>
                <h4 style={styles.spinnerTitle}>Evaluating Submission</h4>
                <p style={styles.spinnerSub}>
                  {currentQuestion.type === 'coding' 
                    ? 'Executing code sandbox run in Judge0 and checking compilation...' 
                    : 'Extracting RAG guidelines and grading conceptual accuracy...'}
                </p>
              </div>
            )}

            {evaluation && (
              <EvaluationResult
                result={evaluation}
                onNext={fetchNextChallenge}
                isLoadingNext={isLoadingQuestion}
              />
            )}
          </div>
        )
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '20px',
  },
  headerTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  title: {
    fontSize: '1.6rem',
    color: '#ffffff',
    margin: 0,
  },
  meta: {
    display: 'flex',
    gap: '16px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  metaItem: {
    background: 'rgba(255,255,255,0.02)',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border-color)',
  },
  endBtn: {
    padding: '8px 16px',
    fontSize: '0.9rem',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.06)',
    marginBottom: '24px',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.01)',
    border: '1px dashed var(--border-color)',
    borderRadius: '16px',
    color: 'var(--text-secondary)',
  },
  loaderIcon: {
    fontSize: '2.5rem',
    marginBottom: '16px',
    animation: 'pulseGlow 2.5s infinite',
  },
  loaderText: {
    fontSize: '1rem',
    maxWidth: '500px',
    lineHeight: '1.5',
  },
  errorBox: {
    padding: '24px',
    background: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '12px',
    color: '#ef4444',
    textAlign: 'center',
  },
  workspace: {
    display: 'flex',
    flexDirection: 'column',
  },
  answerArea: {
    marginTop: '12px',
  },
  theoryBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  textarea: {
    height: '240px',
    resize: 'vertical',
    fontFamily: 'var(--font-sans)',
    lineHeight: '1.6',
    fontSize: '1rem',
  },
  codeBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px',
  },
  submitBtn: {
    padding: '12px 28px',
    fontWeight: '600',
  },
  evaluatingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    marginTop: '24px',
  },
  spinner: {
    fontSize: '2.5rem',
    display: 'block',
    animation: 'pulseGlow 1.5s infinite',
    marginBottom: '16px',
  },
  spinnerTitle: {
    fontSize: '1.2rem',
    color: '#ffffff',
    marginBottom: '8px',
  },
  spinnerSub: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    maxWidth: '450px',
    lineHeight: '1.4',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#ef4444',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '16px',
  },
};
