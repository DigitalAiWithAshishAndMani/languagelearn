import React from 'react';
import type { EvaluationResult as EvalResultType } from '../types';

interface EvaluationResultProps {
  result: EvalResultType;
  onNext: () => void;
  isLoadingNext: boolean;
}

export const EvaluationResult: React.FC<EvaluationResultProps> = ({ result, onNext, isLoadingNext }) => {
  const score = result.score;
  
  // Determine color based on score
  const getColor = () => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const color = getColor();
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass animate-fade-in" style={styles.container}>
      <h3 style={styles.title}>Interview Feedback</h3>
      
      <div style={styles.scoreRow}>
        <div style={styles.ringContainer}>
          <svg width="120" height="120" style={styles.svg}>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            />
          </svg>
          <div style={styles.scoreText}>
            <span style={{ ...styles.scoreNum, color }}>{Math.round(score)}</span>
            <span style={styles.scoreTotal}>/100</span>
          </div>
        </div>

        <div style={styles.summary}>
          <h4 style={styles.resultHeader}>Evaluation Summary</h4>
          <p style={styles.feedback}>{result.feedback}</p>
        </div>
      </div>

      {result.test_results && result.test_results.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Sandbox Execution Test Results</h4>
          <div style={styles.testGrid}>
            {result.test_results.map((test, index) => (
              <div 
                key={index} 
                style={{
                  ...styles.testCard,
                  borderColor: test.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  background: test.passed ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)',
                }}
              >
                <div style={styles.testHeader}>
                  <span style={styles.testLabel}>Test Case #{index + 1}</span>
                  <span 
                    className={`badge ${test.passed ? 'badge-success' : 'badge-danger'}`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {test.passed ? 'Passed ✅' : 'Failed ❌'}
                  </span>
                </div>
                
                <div style={styles.testIO}>
                  <div>
                    <span style={styles.ioLabel}>Input:</span>
                    <pre style={styles.ioVal}>{test.stdin || '<empty>'}</pre>
                  </div>
                  <div>
                    <span style={styles.ioLabel}>Expected:</span>
                    <pre style={styles.ioVal}>{test.expected_output}</pre>
                  </div>
                  <div>
                    <span style={styles.ioLabel}>Actual Output:</span>
                    <pre style={{
                      ...styles.ioVal,
                      color: test.passed ? '#10b981' : '#f87171'
                    }}>{test.actual_output || '<no output>'}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.optimization_suggestions && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>💡 Optimization Suggestions</h4>
          <p style={styles.suggestionsText}>{result.optimization_suggestions}</p>
        </div>
      )}

      <div style={styles.conceptsRow}>
        {result.missed_concepts && result.missed_concepts.length > 0 && (
          <div style={styles.conceptBox}>
            <span style={styles.conceptLabel}>⚠️ Missed Concepts</span>
            <div style={styles.tagList}>
              {result.missed_concepts.map((concept, i) => (
                <span key={i} className="badge badge-danger" style={styles.tag}>
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.suggested_topics && result.suggested_topics.length > 0 && (
          <div style={styles.conceptBox}>
            <span style={styles.conceptLabel}>🚀 Recommended Next Topics</span>
            <div style={styles.tagList}>
              {result.suggested_topics.map((topic, i) => (
                <span key={i} className="badge badge-coding" style={styles.tag}>
                  {topic.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={styles.actions}>
        <button 
          onClick={onNext} 
          className="btn btn-primary" 
          style={styles.nextBtn}
          disabled={isLoadingNext}
        >
          {isLoadingNext ? 'Generating next challenge...' : 'Continue Interview ➡️'}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '28px',
    marginTop: '24px',
    background: 'rgba(17, 24, 39, 0.6)',
    textAlign: 'left',
  },
  title: {
    fontSize: '1.4rem',
    marginBottom: '20px',
    color: '#ffffff',
  },
  scoreRow: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  ringContainer: {
    position: 'relative',
    width: '120px',
    height: '120px',
  },
  svg: {
    transform: 'rotate(-90deg)',
  },
  scoreText: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: {
    fontSize: '2rem',
    fontWeight: '800',
    lineHeight: '1',
  },
  scoreTotal: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    marginTop: '2px',
  },
  summary: {
    flex: 1,
    minWidth: '250px',
  },
  resultHeader: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  feedback: {
    fontSize: '0.95rem',
    lineHeight: '1.5',
    color: 'var(--text-primary)',
  },
  section: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '12px',
  },
  testGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginTop: '12px',
  },
  testCard: {
    border: '1px solid',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  testIO: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '0.8rem',
  },
  ioLabel: {
    fontWeight: '600',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '2px',
  },
  ioVal: {
    background: 'rgba(0,0,0,0.2)',
    padding: '6px 10px',
    borderRadius: '4px',
    fontFamily: "'Fira Code', monospace",
    overflowX: 'auto',
    whiteSpace: 'pre',
  },
  suggestionsText: {
    fontSize: '0.95rem',
    lineHeight: '1.5',
    color: 'var(--text-secondary)',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '14px 18px',
    borderRadius: '8px',
    borderLeft: '4px solid var(--accent-cyan)',
  },
  conceptsRow: {
    display: 'flex',
    gap: '24px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    flexWrap: 'wrap',
  },
  conceptBox: {
    flex: 1,
    minWidth: '220px',
  },
  conceptLabel: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '10px',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tag: {
    fontSize: '0.75rem',
    padding: '4px 10px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '28px',
  },
  nextBtn: {
    padding: '12px 28px',
    fontWeight: '600',
  },
};
