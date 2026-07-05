import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { SkillChart } from '../components/SkillChart';
import { startSession, getSessions } from '../api/sessions';
import { getProgress } from '../api/progress';
import type { Session, SkillScore } from '../types';

interface DashboardPageProps {
  onStartSession: (session: Session) => void;
  onNavigate: (view: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onStartSession, onNavigate }) => {
  const { user } = useAuth();
  
  // Selection States
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('intermediate');
  
  // Loaded States
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [skills, setSkills] = useState<SkillScore[]>([]);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [sessionsData, progressData] = await Promise.all([
          getSessions(),
          getProgress()
        ]);
        setPastSessions(sessionsData.slice(0, 5)); // show recent 5
        setSkills(progressData.skill_scores || []);
        setSolvedCount(progressData.total_questions_solved || 0);
        setAccuracy(progressData.accuracy_percentage || 0);
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleStartInterview = async () => {
    setIsStarting(true);
    setErrorMsg(null);
    try {
      const session = await startSession(selectedLanguage, selectedDifficulty);
      onStartSession(session);
    } catch (err: any) {
      setErrorMsg(err.detail || err.message || 'Failed to start interview session.');
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <span style={styles.spinner}>🧠</span>
        <p>Loading your Dashboard profile...</p>
      </div>
    );
  }

  return (
    <div className="container page-wrapper animate-fade-in">
      <div style={styles.welcomeRow}>
        <div>
          <h1 className="page-title">Welcome back, {user?.name}!</h1>
          <p style={styles.subtitle}>Select your track and test your programming skills using local AI feedback.</p>
        </div>

        <div style={{ ...styles.statsCard, cursor: 'pointer' }} className="glass" onClick={() => onNavigate('progress')}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Solved</span>
            <span style={styles.statValue}>{solvedCount} 🎯</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Avg Accuracy</span>
            <span style={styles.statValue}>{Math.round(accuracy)}%</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="animate-fade-in" style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '0.9rem'
        }}>
          {errorMsg}
        </div>
      )}

      <div style={styles.layoutGrid}>
        {/* Left Column: Language & Difficulty Selector */}
        <div style={styles.selectorCol}>
          <div className="glass-panel" style={styles.panel}>
            <h3 style={styles.sectionTitle}>1. Choose Programming Track</h3>
            <LanguageSelector 
              selectedLanguage={selectedLanguage}
              onSelect={setSelectedLanguage}
            />

            <h3 style={{ ...styles.sectionTitle, marginTop: '24px' }}>2. Select Level</h3>
            <div style={styles.difficultyRow}>
              {['beginner', 'intermediate', 'advanced'].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedDifficulty(level)}
                  className={`btn ${selectedDifficulty === level ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, textTransform: 'capitalize' }}
                >
                  {level}
                </button>
              ))}
            </div>

            <button
              onClick={handleStartInterview}
              disabled={isStarting}
              className="btn btn-primary"
              style={styles.startBtn}
            >
              {isStarting ? 'Initiating Sandbox...' : '🚀 Launch AI Interview Session'}
            </button>
          </div>
        </div>

        {/* Right Column: Mastery Chart & Recent History */}
        <div style={styles.sidebarCol}>
          <div className="glass-panel" style={{ ...styles.panel, marginBottom: '24px' }}>
            <SkillChart scores={skills} selectedLanguage={selectedLanguage} />
          </div>

          <div className="glass-panel" style={styles.panel}>
            <h4 style={styles.sidebarHeader}>Recent Sessions</h4>
            {pastSessions.length === 0 ? (
              <p style={styles.emptyText}>No sessions found. Start your first challenge!</p>
            ) : (
              <div style={styles.sessionList}>
                {pastSessions.map((sess) => (
                  <div key={sess.id} style={styles.sessionItem}>
                    <div style={styles.sessionMeta}>
                      <span style={styles.sessionLang}>
                        {sess.language.toUpperCase()}
                      </span>
                      <span style={styles.sessionDate}>
                        {new Date(sess.start_time).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={styles.sessionDetail}>
                      <span style={styles.sessionDiff}>Level: {sess.difficulty}</span>
                      <span style={{
                        color: sess.is_active ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {sess.is_active ? 'Active 🟢' : 'Completed 📁'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
  welcomeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '24px',
    marginBottom: '32px',
    textAlign: 'left',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
    marginTop: '6px',
  },
  statsCard: {
    display: 'flex',
    padding: '16px 24px',
    gap: '32px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    background: 'rgba(30, 41, 59, 0.3)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#ffffff',
    marginTop: '4px',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '7fr 5fr',
    gap: '28px',
    alignItems: 'start',
    width: '100%',
    textAlign: 'left',
  },
  panel: {
    padding: '24px',
    borderRadius: '16px',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    color: '#ffffff',
    marginBottom: '16px',
  },
  difficultyRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  startBtn: {
    width: '100%',
    padding: '14px',
    fontWeight: '600',
    fontSize: '1.05rem',
    marginTop: '16px',
  },
  selectorCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    fontSize: '1.1rem',
    color: '#ffffff',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '24px 0',
  },
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sessionItem: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sessionMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLang: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--accent-cyan)',
  },
  sessionDate: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  sessionDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDiff: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
  },
};
