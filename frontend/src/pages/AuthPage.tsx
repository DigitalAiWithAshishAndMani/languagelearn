import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser, getMe } from '../api/auth';

export const AuthPage: React.FC = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  
  // Form fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        // Login flow
        const tokenRes = await loginUser(email, password);
        localStorage.setItem('auth_token', tokenRes.access_token);
        const profile = await getMe();
        login(tokenRes.access_token, profile);
      } else {
        // Register flow
        const tokenRes = await registerUser(name, email, password);
        localStorage.setItem('auth_token', tokenRes.access_token);
        const profile = await getMe();
        login(tokenRes.access_token, profile);
      }
    } catch (err: any) {
      setErrorMsg(err.detail || err.message || 'Authentication failed. Please check inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel animate-fade-in-up" style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>🧠</span>
          <h2 style={styles.logoText}>Antigravity Learn</h2>
        </div>
        
        <p style={styles.subtitle}>
          {isLogin 
            ? 'Access your personalized learning coach & interviewer.' 
            : 'Start generating local RAG-powered interviews today.'}
        </p>

        {errorMsg && (
          <div style={styles.errorBox} className="animate-fade-in">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading 
              ? 'Processing...' 
              : (isLogin ? 'Sign In ➡️' : 'Create Account ➡️')}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerText}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }} 
            className="btn btn-ghost" 
            style={styles.toggleBtn}
          >
            {isLogin ? 'Register Here' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    padding: '24px',
    background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 60%)',
  },
  card: {
    width: '100%',
    maxWidth: '450px',
    textAlign: 'center',
    padding: '40px 32px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  logoIcon: {
    fontSize: '2.2rem',
  },
  logoText: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: '800',
    fontSize: '1.6rem',
    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
    lineHeight: '1.4',
  },
  form: {
    marginTop: '20px',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    marginTop: '10px',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#ef4444',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    textAlign: 'left',
    marginBottom: '20px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '28px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '20px',
  },
  footerText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  toggleBtn: {
    padding: '4px 8px',
    fontSize: '0.85rem',
    color: 'var(--accent-cyan)',
    fontWeight: '600',
  },
};
