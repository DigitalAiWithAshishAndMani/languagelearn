import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar, type View } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { InterviewPage } from './pages/InterviewPage';
import { ProgressPage } from './pages/ProgressPage';
import { LearningPlanPage } from './pages/LearningPlanPage';
import type { Session } from './types';

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  if (isLoading) {
    return (
      <div style={styles.loadingScreen}>
        <span style={styles.spinner}>🧠</span>
        <p style={{ marginTop: '16px' }}>Initializing local coding coach...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const handleStartSession = (session: Session) => {
    setActiveSession(session);
    setCurrentView('interview');
  };

  const handleEndSession = () => {
    setActiveSession(null);
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardPage
            onStartSession={handleStartSession}
            onNavigate={setCurrentView}
          />
        );
      case 'interview':
        if (!activeSession) {
          setCurrentView('dashboard');
          return null;
        }
        return (
          <InterviewPage
            session={activeSession}
            onEndSession={handleEndSession}
          />
        );
      case 'progress':
        return <ProgressPage />;
      case 'learning-plan':
        return <LearningPlanPage />;
      default:
        return <DashboardPage onStartSession={handleStartSession} onNavigate={setCurrentView} />;
    }
  };

  return (
    <>
      <Navbar currentView={currentView} onNavigate={setCurrentView} />
      <main style={styles.mainContent}>
        {renderContent()}
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0b0f19',
    color: '#9ca3af',
    fontFamily: 'system-ui, sans-serif',
  },
  spinner: {
    fontSize: '3rem',
    display: 'block',
    animation: 'pulseGlow 2s infinite',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
};

export default App;
