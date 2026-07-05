import React from 'react';
import type { Question } from '../types';

interface QuestionCardProps {
  question: Question;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const getDifficultyBadgeClass = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'beginner': return 'badge-beginner';
      case 'intermediate': return 'badge-intermediate';
      case 'advanced': return 'badge-advanced';
      default: return '';
    }
  };

  return (
    <div className="glass-card animate-fade-in-up" style={styles.card}>
      <div style={styles.header}>
        <div style={styles.badges}>
          <span className={`badge ${getDifficultyBadgeClass(question.difficulty)}`}>
            {question.difficulty}
          </span>
          <span className={`badge ${question.type === 'coding' ? 'badge-coding' : 'badge-theory'}`}>
            {question.type}
          </span>
          <span style={styles.topicBadge}>
            🏷️ {question.topic.replace('_', ' ')}
          </span>
        </div>
        <span style={styles.languageBadge}>
          {question.language.toUpperCase()}
        </span>
      </div>

      <div style={styles.divider}></div>

      <div style={styles.body}>
        <p style={styles.text}>{question.content}</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '28px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  badges: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  topicBadge: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  languageBadge: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--accent-cyan)',
    letterSpacing: '0.05em',
  },
  divider: {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.06)',
    marginBottom: '20px',
  },
  body: {
    lineHeight: '1.6',
  },
  text: {
    fontSize: '1.1rem',
    color: '#ffffff',
    whiteSpace: 'pre-wrap',
  },
};
