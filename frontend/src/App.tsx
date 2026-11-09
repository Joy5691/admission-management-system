import React, { useState, useEffect } from 'react';
import { StudentIdBar } from './components/StudentIdBar';
import { ClassList } from './components/ClassList';
import { ApplicationDetail } from './components/ApplicationDetail';
import { MyApplications } from './components/MyApplications';
import { AdminPortal } from './components/AdminPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ErrorBoundary } from './ErrorBoundary';

type Tab = 'classes' | 'my-applications' | 'admin';

const STUDENT_ID_KEY = 'studentId';
const IS_ADMIN_KEY = 'isAdmin';

function App() {
  const [studentId, setStudentId] = useState(() => localStorage.getItem(STUDENT_ID_KEY) || '');
  const [activeTab, setActiveTab] = useState<Tab>('classes');
  const [viewingHoldId, setViewingHoldId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(IS_ADMIN_KEY) === 'true');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STUDENT_ID_KEY);
    if (saved && saved.length === 17) setStudentId(saved);
  }, []);

  const handleApplied = (holdId: string) => {
    setViewingHoldId(holdId);
  };

  const handleViewHold = (holdId: string) => {
    setViewingHoldId(holdId);
  };

  const handleBack = () => {
    setViewingHoldId(null);
    setSelectedClassId(null);
    setActiveTab('classes');
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setActiveTab('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem(IS_ADMIN_KEY);
    setIsAdmin(false);
    if (activeTab === 'admin') setActiveTab('classes');
  };

  const handleViewClassSeatMap = (classId: string) => {
    setSelectedClassId(classId);
    setActiveTab('classes');
    setViewingHoldId(null);
  };

  return (
    <div style={styles.appShell}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          {/* Brand with Onnorokom Logo */}
          <div style={styles.brand} onClick={handleBack}>
            <div style={styles.logoBadge}>
              <img
                src="/logo.jpg"
                alt="Onnorokom Academy Logo"
                style={styles.logoImg}
              />
            </div>
            <div>
              <div style={styles.brandName}>ONNOROKOM ACADEMY</div>
              <div style={styles.brandTag}>অনন্যরকম একাডেমি • Online Admission Portal</div>
            </div>
          </div>

          {/* Student ID Center Box */}
          <div style={styles.studentIdSection}>
            <StudentIdBar studentId={studentId} onStudentIdChange={setStudentId} />
          </div>

          {/* Upper Right Corner: Admin Login / Profile */}
          <div style={styles.adminSection}>
            {isAdmin ? (
              <div style={styles.adminLoggedInRow}>
                <button
                  type="button"
                  onClick={() => {
                    setViewingHoldId(null);
                    setSelectedClassId(null);
                    setActiveTab('admin');
                  }}
                  style={{
                    ...styles.adminModeBtn,
                    background: activeTab === 'admin' ? 'var(--primary-dark)' : 'var(--primary)',
                  }}
                >
                  🛡️ Admin Portal
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={styles.logoutPill}
                  title="Sign out of admin mode"
                >
                  🚪 Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="btn btn-outline"
                style={styles.adminLoginBtn}
              >
                🔐 Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs (when not in application detail view) */}
      {!viewingHoldId && (
        <nav style={styles.navBar}>
          <div style={styles.navInner}>
            <TabButton
              icon="🏫"
              label="Academic Classes"
              active={activeTab === 'classes'}
              onClick={() => {
                setSelectedClassId(null);
                setActiveTab('classes');
              }}
            />
            <TabButton
              icon="📋"
              label="My Applications"
              active={activeTab === 'my-applications'}
              onClick={() => setActiveTab('my-applications')}
            />
            {isAdmin && (
              <TabButton
                icon="⚙️"
                label="Admin Portal & Shifts"
                active={activeTab === 'admin'}
                onClick={() => setActiveTab('admin')}
              />
            )}
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <main style={styles.main}>
        <ErrorBoundary>
          {viewingHoldId ? (
            <ApplicationDetail
              holdId={viewingHoldId}
              studentId={studentId}
              onBack={handleBack}
            />
          ) : (
            <>
              {activeTab === 'classes' && (
                <ClassList
                  studentId={studentId}
                  onApplied={handleApplied}
                  onViewHold={handleViewHold}
                  onGoToCreate={() => {
                    if (isAdmin) {
                      setActiveTab('admin');
                    } else {
                      setIsLoginModalOpen(true);
                    }
                  }}
                  onUpdateStudentId={setStudentId}
                  selectedClassId={selectedClassId}
                  onSelectClass={setSelectedClassId}
                />
              )}

              {activeTab === 'my-applications' && (
                <MyApplications
                  studentId={studentId}
                  onViewHold={handleViewHold}
                  onGoToClasses={() => setActiveTab('classes')}
                />
              )}

              {activeTab === 'admin' && (
                <AdminPortal
                  onViewClassSeatMap={handleViewClassSeatMap}
                  onLogout={handleLogout}
                />
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Global Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerBrand}>
            <strong>Onnorokom Academy Online Admission System</strong>
            <span> • First-Come, First-Served Concurrency Engine</span>
          </div>
          <div style={styles.techBadges}>
            <span style={styles.techPill}>.NET 10 Minimal API</span>
            <span style={styles.techPill}>PostgreSQL 16 (Row Lock)</span>
            <span style={styles.techPill}>React 18 + Vite</span>
            <span style={styles.techPill}>Docker Compose</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabBtn,
        color: active ? 'var(--primary)' : 'var(--slate-600)',
        borderBottom: active ? '2.5px solid var(--primary)' : '2.5px solid transparent',
        fontWeight: active ? 700 : 500,
        background: active ? 'rgba(30, 107, 184, 0.06)' : 'transparent',
      }}
      type="button"
    >
      <span style={{ fontSize: '1.05rem' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appShell: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--slate-50)',
  },
  header: {
    background: '#ffffff',
    borderBottom: '1px solid var(--slate-200)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  headerInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '0.75rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    cursor: 'pointer',
    userSelect: 'none',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--slate-200)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  brandName: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  brandTag: {
    fontSize: '0.725rem',
    color: 'var(--slate-500)',
    fontWeight: 600,
  },
  studentIdSection: {
    display: 'flex',
    alignItems: 'center',
  },
  adminSection: {
    display: 'flex',
    alignItems: 'center',
  },
  adminLoggedInRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  adminModeBtn: {
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(30, 107, 184, 0.3)',
    transition: 'all 0.15s ease',
  },
  logoutPill: {
    background: 'var(--slate-100)',
    border: '1px solid var(--slate-200)',
    color: 'var(--slate-600)',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  adminLoginBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    borderColor: 'var(--primary-border)',
    color: 'var(--primary)',
    background: 'var(--primary-light)',
  },
  navBar: {
    background: '#ffffff',
    borderBottom: '1px solid var(--slate-200)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  navInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '0 1.5rem',
    display: 'flex',
    gap: '0.5rem',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.85rem 1.25rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.925rem',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  main: {
    flex: 1,
    minHeight: 'calc(100vh - 180px)',
  },
  footer: {
    background: '#ffffff',
    borderTop: '1px solid var(--slate-200)',
    padding: '1.5rem',
    marginTop: 'auto',
  },
  footerInner: {
    maxWidth: 1240,
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    fontSize: '0.825rem',
    color: 'var(--slate-500)',
  },
  footerBrand: {
    color: 'var(--slate-600)',
  },
  techBadges: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  techPill: {
    background: 'var(--slate-100)',
    border: '1px solid var(--slate-200)',
    padding: '0.2rem 0.55rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-600)',
  },
};

export default App;
