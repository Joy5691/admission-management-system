import React, { useState } from 'react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export function AdminLoginModal({ isOpen, onClose, onLoginSuccess }: AdminLoginModalProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password === 'admin123') {
      localStorage.setItem('isAdmin', 'true');
      setError('');
      onLoginSuccess();
      onClose();
    } else {
      setError('Invalid credentials. Use demo: admin / admin123');
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem('isAdmin', 'true');
    setError('');
    onLoginSuccess();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={styles.header}>
          
          <div>
            <h3 style={styles.title}>Admin Portal Login</h3>
            <p style={styles.subtitle}>Sign in to manage classes, shifts, and view live admission analytics</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose} type="button">✕</button>
        </div>

        {/* Modal Body */}
        <div style={styles.body}>
          {error && <div style={styles.errorAlert}>{error}</div>}

          {/* Demo Credential Pill */}
          <div style={styles.demoCard}>
            <div style={styles.demoCardHeader}>
              <span style={styles.demoBadge}>Demo Access</span>
              <button
                type="button"
                onClick={handleDemoLogin}
                style={styles.oneClickBtn}
              >
                1-Click Demo Login →
              </button>
            </div>
            <p style={styles.demoCreds}>
              Username: <code style={styles.code}>admin</code> | Password: <code style={styles.code}>admin123</code>
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                placeholder="Enter admin username"
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter admin password"
                required
              />
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                Sign In as Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--slate-200)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    position: 'relative',
    background: 'var(--slate-50)',
  },
  headerIcon: {
    fontSize: '1.5rem',
    background: '#ffffff',
    padding: '0.4rem',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
  },
  title: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.8rem',
    color: 'var(--slate-500)',
    marginTop: '0.2rem',
  },
  closeBtn: {
    position: 'absolute',
    right: '1.25rem',
    top: '1.25rem',
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    color: 'var(--slate-400)',
    cursor: 'pointer',
    padding: '0.2rem',
  },
  body: {
    padding: '1.5rem',
  },
  errorAlert: {
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    fontWeight: 600,
  },
  demoCard: {
    background: 'var(--primary-light)',
    border: '1px solid var(--primary-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.85rem 1rem',
    marginBottom: '1.25rem',
  },
  demoCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
  },
  demoBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  oneClickBtn: {
    background: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '0.25rem 0.65rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  demoCreds: {
    fontSize: '0.8rem',
    color: 'var(--slate-600)',
    margin: 0,
  },
  code: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    color: 'var(--primary-dark)',
    background: '#ffffff',
    padding: '0.1rem 0.35rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--primary-border)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--slate-700)',
  },
  input: {
    padding: '0.7rem 0.9rem',
    border: '1px solid var(--slate-300)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.925rem',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
};
