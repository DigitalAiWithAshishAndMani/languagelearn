import React, { useState, useEffect } from 'react';
import { getLearningPlan } from '../api/progress';
import type { LearningPlan } from '../types';

export const LearningPlanPage: React.FC = () => {
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPlan(false);
  }, []);

  const fetchPlan = async (refresh: boolean) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const planRes = await getLearningPlan(refresh);
      setPlan(planRes);
    } catch (err: any) {
      setErrorMsg(err.detail || err.message || 'Failed to retrieve learning roadmap.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'doc': return '📖';
      case 'video': return '🎥';
      case 'exercise': return '💻';
      case 'tutorial': return '📄';
      default: return '🔗';
    }
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <span style={styles.spinner}>🗺️</span>
        <p>Analyzing skill profile & constructing study timeline...</p>
      </div>
    );
  }

  return (
    <div className="container page-wrapper animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 className="page-title">Personalized Study Plan</h1>
          <p style={styles.subtitle}>AI-generated roadmap highlighting your weak concepts and resource recommendations.</p>
        </div>
        <button
          onClick={() => fetchPlan(true)}
          disabled={isRefreshing}
          className="btn btn-primary"
          style={styles.refreshBtn}
        >
          {isRefreshing ? 'Re-analyzing skills...' : 'Regenerate Study Plan 🔄'}
        </button>
      </div>

      <div style={styles.divider}></div>

      {isRefreshing && (
        <div style={styles.refreshOverlay} className="animate-fade-in">
          <span style={styles.overlaySpinner}>⚙️</span>
          <h4 style={styles.overlayTitle}>Constructing Study Roadmaps</h4>
          <p style={styles.overlaySub}>Local Qwen LLM is compiling proficiency logs and compiling curated exercises...</p>
        </div>
      )}

      {errorMsg && (
        <div style={styles.errorBox}>
          <p>⚠️ {errorMsg}</p>
        </div>
      )}

      {plan && !isRefreshing && (
        <div style={styles.layoutGrid}>
          {/* Left Side: Roadmap Timeline */}
          <div style={styles.roadmapTimeline}>
            {plan.roadmap.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>🎉</span>
                <p style={styles.emptyText}>All topics scored above threshold levels!</p>
                <p style={styles.emptySub}>Select harder difficulty levels in your interviews to test yourself.</p>
              </div>
            ) : (
              plan.roadmap.map((item, index) => (
                <div key={index} style={styles.timelineItem} className="animate-fade-in-up">
                  <div style={styles.timelineMarker}>
                    <div style={{
                      ...styles.markerDot,
                      borderColor: item.priority === 1 ? 'var(--accent-cyan)' : 'var(--accent-violet)'
                    }}>
                      {item.priority}
                    </div>
                    {index < plan.roadmap.length - 1 && <div style={styles.markerLine}></div>}
                  </div>

                  <div className="glass-card" style={styles.timelineCard}>
                    <div style={styles.cardHeader}>
                      <div>
                        <span style={styles.trackBadge}>{item.language.toUpperCase()}</span>
                        <h3 style={styles.topicTitle}>{item.topic.replace('_', ' ')}</h3>
                      </div>
                      <span className="badge badge-beginner" style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        borderColor: 'rgba(239, 68, 68, 0.2)'
                      }}>
                        Proficiency: {Math.round(item.current_score)}%
                      </span>
                    </div>

                    {item.why_important && (
                      <p style={styles.whyText}>💡 <b>Why it matters:</b> {item.why_important}</p>
                    )}

                    {/* Resources Row */}
                    {item.resources && item.resources.length > 0 && (
                      <div style={styles.detailSection}>
                        <h4 style={styles.detailHeader}>Recommended Resources</h4>
                        <div style={styles.resourceGrid}>
                          {item.resources.map((res, rIdx) => (
                            <a
                              key={rIdx}
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.resourceCard}
                            >
                              <span style={styles.resourceIcon}>{getResourceIcon(res.type)}</span>
                              <div>
                                <span style={styles.resourceTitle}>{res.title}</span>
                                <span style={styles.resourceType}>{res.type.toUpperCase()}</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exercises Row */}
                    {item.exercises && item.exercises.length > 0 && (
                      <div style={styles.detailSection}>
                        <h4 style={styles.detailHeader}>Suggested Practice Exercises</h4>
                        <ul style={styles.exerciseList}>
                          {item.exercises.map((ex, eIdx) => (
                            <li key={eIdx} style={styles.exerciseItem}>
                              <span style={styles.bullet}>🔹</span>
                              <span>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Side: Weak Topics List */}
          <div style={styles.weakCol}>
            <div className="glass-panel" style={styles.weakPanel}>
              <h4 style={styles.weakTitle}>Identified Knowledge Gaps</h4>
              <p style={styles.weakDesc}>Concepts currently scoring below 60% proficiency. Focus on these to level up your interview readiness.</p>
              
              <div style={styles.weakList}>
                {plan.weak_topics.length === 0 ? (
                  <div style={styles.gapSuccess}>
                    <span>✅ No significant gaps detected! Keep it up.</span>
                  </div>
                ) : (
                  plan.weak_topics.map((topic, idx) => (
                    <div key={idx} style={styles.weakItem}>
                      <span style={styles.weakIcon}>⚠️</span>
                      <span style={styles.weakText}>{topic.replace('/', ' ➔ ').replace('_', ' ')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '24px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
    marginTop: '6px',
  },
  refreshBtn: {
    padding: '12px 20px',
    fontWeight: '600',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.06)',
    margin: '24px 0',
  },
  refreshOverlay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    textAlign: 'center',
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
  },
  overlaySpinner: {
    fontSize: '3rem',
    animation: 'pulseGlow 1.5s infinite',
    marginBottom: '20px',
  },
  overlayTitle: {
    fontSize: '1.3rem',
    color: '#ffffff',
    marginBottom: '8px',
  },
  overlaySub: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    maxWidth: '500px',
    lineHeight: '1.4',
  },
  errorBox: {
    padding: '16px 24px',
    background: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '12px',
    color: '#ef4444',
    marginBottom: '24px',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '8fr 4fr',
    gap: '28px',
    alignItems: 'start',
    flexWrap: 'wrap',
  },
  roadmapTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  timelineItem: {
    display: 'flex',
    gap: '24px',
  },
  timelineMarker: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '36px',
  },
  markerDot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#111827',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
    color: '#ffffff',
    zIndex: 1,
  },
  markerLine: {
    width: '2px',
    flex: 1,
    background: 'rgba(255, 255, 255, 0.08)',
    marginTop: '4px',
    marginBottom: '4px',
  },
  timelineCard: {
    flex: 1,
    padding: '24px',
    textAlign: 'left',
    marginBottom: '28px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  trackBadge: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--accent-cyan)',
    letterSpacing: '0.05em',
  },
  topicTitle: {
    fontSize: '1.3rem',
    color: '#ffffff',
    marginTop: '4px',
    textTransform: 'capitalize',
  },
  whyText: {
    fontSize: '0.95rem',
    lineHeight: '1.5',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
  },
  detailSection: {
    marginTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '16px',
  },
  detailHeader: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '12px',
  },
  resourceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  resourceCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  },
  resourceIcon: {
    fontSize: '1.4rem',
  },
  resourceTitle: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#ffffff',
    fontWeight: '500',
  },
  resourceType: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--accent-cyan)',
    fontWeight: '600',
    marginTop: '2px',
  },
  exerciseList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  exerciseItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  bullet: {
    fontSize: '0.8rem',
    marginTop: '2px',
  },
  weakCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  weakPanel: {
    padding: '24px',
    borderRadius: '16px',
  },
  weakTitle: {
    fontSize: '1.1rem',
    color: '#ffffff',
    marginBottom: '8px',
  },
  weakDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    marginBottom: '20px',
  },
  weakList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  gapSuccess: {
    color: '#10b981',
    fontSize: '0.85rem',
    background: 'rgba(16, 185, 129, 0.08)',
    padding: '12px 16px',
    borderRadius: '8px',
  },
  weakItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(239,68,68,0.05)',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(239,68,68,0.1)',
  },
  weakIcon: {
    fontSize: '1rem',
  },
  weakText: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.01)',
    border: '1px dashed var(--border-color)',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    display: 'block',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '1rem',
    color: '#ffffff',
    fontWeight: '600',
  },
  emptySub: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginTop: '6px',
  },
};
