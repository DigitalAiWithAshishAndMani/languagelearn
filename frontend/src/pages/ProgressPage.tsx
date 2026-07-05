import React, { useState, useEffect } from 'react';
import { getProgress, getAnalytics } from '../api/progress';
import { SkillChart } from '../components/SkillChart';
import type { SkillScore, SessionHistoryItem } from '../types';

export const ProgressPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('python');
  
  // Analytics State
  const [skills, setSkills] = useState<SkillScore[]>([]);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        const [progressRes, analyticsRes] = await Promise.all([
          getProgress(),
          getAnalytics()
        ]);
        setSkills(progressRes.skill_scores || []);
        setHistory(analyticsRes.session_history || []);
        setSolvedCount(analyticsRes.total_questions_solved || 0);
        setAccuracy(analyticsRes.accuracy_percentage || 0);
        setTotalSessions(analyticsRes.total_sessions || 0);
      } catch (err) {
        console.error('Failed to load progress details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressData();
  }, []);

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <span style={styles.spinner}>📊</span>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="container page-wrapper animate-fade-in" style={styles.container}>
      <h1 className="page-title">Progress Analytics</h1>
      <p style={styles.subtitle}>Track your language proficiencies, test accuracies, and full session history.</p>

      {/* Aggregate Stats Bar */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard} className="glass">
          <span style={styles.statEmoji}>🎯</span>
          <div>
            <span style={styles.statLabel}>Solved Challenges</span>
            <span style={styles.statValue}>{solvedCount}</span>
          </div>
        </div>

        <div style={styles.statCard} className="glass">
          <span style={styles.statEmoji}>📈</span>
          <div>
            <span style={styles.statLabel}>Average Accuracy</span>
            <span style={styles.statValue}>{Math.round(accuracy)}%</span>
          </div>
        </div>

        <div style={styles.statCard} className="glass">
          <span style={styles.statEmoji}>📁</span>
          <div>
            <span style={styles.statLabel}>Total Interviews</span>
            <span style={styles.statValue}>{totalSessions}</span>
          </div>
        </div>
      </div>

      <div style={styles.layoutGrid}>
        {/* Left Column: Mastery Details */}
        <div style={styles.leftCol} className="glass-panel">
          <div style={styles.tabsRow}>
            {['python', 'javascript', 'java', 'cpp'].map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                className="btn"
                style={{
                  ...styles.tabBtn,
                  background: activeTab === lang ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                  color: activeTab === lang ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderColor: activeTab === lang ? 'var(--accent-cyan)' : 'transparent',
                }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={styles.chartContainer}>
            <SkillChart scores={skills} selectedLanguage={activeTab} />
          </div>
        </div>

        {/* Right Column: Sessions History */}
        <div style={styles.rightCol} className="glass-panel">
          <h3 style={styles.sectionTitle}>Interview Logs</h3>
          {history.length === 0 ? (
            <p style={styles.emptyText}>No past sessions found. Start an interview to see logs here!</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Track</th>
                    <th style={styles.th}>Difficulty</th>
                    <th style={styles.th}>Solved</th>
                    <th style={styles.th}>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((sess, idx) => (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>
                        {sess.start_time ? new Date(sess.start_time).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ ...styles.td, fontWeight: '600', color: 'var(--accent-cyan)' }}>
                        {sess.language.toUpperCase()}
                      </td>
                      <td style={{ ...styles.td, textTransform: 'capitalize' }}>
                        {sess.difficulty}
                      </td>
                      <td style={styles.td}>
                        {sess.questions_answered}
                      </td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>
                        {sess.average_score ? `${Math.round(sess.average_score)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
    color: 'var(--text-secondary)',
  },
  spinner: {
    fontSize: '3rem',
    animation: 'pulseGlow 2s infinite',
  },
  container: {
    textAlign: 'left',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
    marginTop: '6px',
    marginBottom: '32px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '20px 24px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    background: 'rgba(30, 41, 59, 0.3)',
  },
  statEmoji: {
    fontSize: '2.2rem',
  },
  statLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },
  statValue: {
    display: 'block',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff',
    marginTop: '4px',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '5fr 7fr',
    gap: '28px',
    alignItems: 'start',
    flexWrap: 'wrap',
  },
  leftCol: {
    padding: '24px',
    borderRadius: '16px',
  },
  rightCol: {
    padding: '24px',
    borderRadius: '16px',
  },
  tabsRow: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
    gap: '8px',
    marginBottom: '20px',
    overflowX: 'auto',
  },
  tabBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: '600',
    border: '1px solid transparent',
    borderRadius: '6px',
  },
  chartContainer: {
    marginTop: '8px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    color: '#ffffff',
    marginBottom: '20px',
  },
  emptyText: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '40px 0',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.05em',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    transition: 'background 0.2s ease',
  },
  td: {
    padding: '16px',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
  },
};
