import React from 'react';
import type { SkillScore } from '../types';

interface SkillChartProps {
  scores: SkillScore[];
  selectedLanguage: string;
}

export const SkillChart: React.FC<SkillChartProps> = ({ scores, selectedLanguage }) => {
  // Filter scores to selected language
  const filteredScores = scores.filter(
    (s) => s.language.toLowerCase() === selectedLanguage.toLowerCase()
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'linear-gradient(90deg, #10b981, #34d399)'; // Green
    if (score >= 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24)'; // Amber
    return 'linear-gradient(90deg, #ef4444, #f87171)'; // Red
  };

  const getTrackColor = (score: number) => {
    if (score >= 80) return 'rgba(16, 185, 129, 0.15)';
    if (score >= 50) return 'rgba(245, 158, 11, 0.15)';
    return 'rgba(239, 68, 68, 0.15)';
  };

  if (filteredScores.length === 0) {
    return (
      <div style={styles.emptyState}>
        <span style={styles.emptyIcon}>📈</span>
        <p style={styles.emptyText}>No assessment scores found for {selectedLanguage.toUpperCase()} yet.</p>
        <p style={styles.emptySubtext}>Complete an interview session to update topic scores!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>{selectedLanguage.toUpperCase()} Topic Mastery</h4>
      <div style={styles.chartList}>
        {filteredScores.map((score, index) => {
          const formattedTopic = score.topic.replace('_', ' ');
          const pct = Math.round(score.proficiency_score);

          return (
            <div key={index} style={styles.row} className="animate-fade-in">
              <div style={styles.rowHeader}>
                <span style={styles.topicName}>{formattedTopic}</span>
                <span style={styles.scoreVal} title={`Last updated: ${new Date(score.updated_at).toLocaleDateString()}`}>
                  {pct}%
                </span>
              </div>
              <div 
                style={{
                  ...styles.progressBar,
                  background: getTrackColor(score.proficiency_score),
                }}
              >
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${pct}%`,
                    background: getScoreColor(score.proficiency_score),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '12px 0',
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  chartList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicName: {
    fontSize: '0.95rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  scoreVal: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--accent-cyan)',
    cursor: 'help',
  },
  progressBar: {
    height: '8px',
    borderRadius: '4px',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.01)',
    border: '1px dashed var(--border-color)',
  },
  emptyIcon: {
    fontSize: '2rem',
    display: 'block',
    marginBottom: '10px',
  },
  emptyText: {
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
};
