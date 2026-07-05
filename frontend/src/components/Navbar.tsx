import React from 'react';
import { useAuth } from '../context/AuthContext';

export type View = 'login' | 'register' | 'dashboard' | 'interview' | 'progress' | 'learning-plan';

interface NavbarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems: { view: View; label: string; icon: string }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: '📊' },
    { view: 'progress', label: 'My Progress', icon: '📈' },
    { view: 'learning-plan', label: 'Study Plan', icon: '🗺️' },
  ];

  return (
    <nav className="glass" style={styles.nav}>
      <div style={styles.logoContainer} onClick={() => onNavigate('dashboard')}>
        <span style={styles.logoIcon}>🧠</span>
        <span style={styles.logoText}>Antigravity Learn</span>
      </div>

      <div style={styles.menu}>
        {navItems.map((item) => {
          const isActive = currentView === item.view || (item.view === 'dashboard' && currentView === 'interview');
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className="btn btn-ghost"
              style={{
                ...styles.navBtn,
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                borderRadius: '0px',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.profile}>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{user.name}</span>
          <span style={styles.userEmail}>{user.email}</span>
        </div>
        <button onClick={logout} className="btn btn-danger" style={styles.logoutBtn}>
          Logout 🚪
        </button>
      </div>
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 1000,
    borderRadius: '0px',
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
    borderBottom: '1px solid var(--border-color)',
    background: 'rgba(11, 15, 25, 0.8)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  logoIcon: {
    fontSize: '1.6rem',
  },
  logoText: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: '700',
    fontSize: '1.2rem',
    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  menu: {
    display: 'flex',
    gap: '16px',
    height: '100%',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '100%',
    padding: '0 16px',
    fontSize: '0.95rem',
  },
  profile: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  userEmail: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  logoutBtn: {
    padding: '6px 12px',
    fontSize: '0.85rem',
  },
};
