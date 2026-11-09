import React, { useState, useEffect } from 'react';
import { StudentIdBar } from './components/StudentIdBar';
import { ClassList } from './components/ClassList';
import { ApplicationDetail } from './components/ApplicationDetail';
import { MyApplications } from './components/MyApplications';
import { CreateClass } from './components/CreateClass';
import { ErrorBoundary } from './ErrorBoundary';

type Tab = 'classes' | 'my-applications' | 'admin';

const STUDENT_ID_KEY = 'studentId';

function App() {
  const [studentId, setStudentId] = useState(() => localStorage.getItem(STUDENT_ID_KEY) || '');
  const [activeTab, setActiveTab] = useState<Tab>('classes');
  const [viewingHoldId, setViewingHoldId] = useState<string | null>(null);

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
    setActiveTab('classes');
  };

  return (
    <div style={styles.appShell}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand} onClick={handleBack}>
            <div style={styles.logoBadge}>🎓</div>
            <div>
              <div style={styles.brandName}>APEX ACADEMY</div>
              <div style={styles.brandTag}>Online Admission Portal • First-Come, First-Served</div>
            </div>
          </div>

          <div style={styles.studentIdSection}>
            <StudentIdBar studentId={studentId} onStudentIdChange={setStudentId} />
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs (when not in detail view) */}
      {!viewingHoldId && (
        <nav style={styles.navBar}>
          <div style={styles.navInner}>
            <TabButton
              icon="🏫"
              label="Academic Classes"
              active={activeTab === 'classes'}
              onClick={() => setActiveTab('classes')}
            />
            <TabButton
              icon="📋"
              label="My Applications"
              active={activeTab === 'my-applications'}
              onClick={() => setActiveTab('my-applications')}
            />
            <TabButton
              icon="⚙️"
              label="Admin: Create Class"
              active={activeTab === 'admin'}
              onClick={() => setActiveTab('admin')}
            />
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
                  onGoToCreate={() => setActiveTab('admin')}
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
                <CreateClass onClassCreated={() => setActiveTab('classes')} />
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* Global Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerBrand}>
            <strong>Apex Academy Online Admission System</strong>
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
        background: active ? 'rgba(79, 70, 229, 0.04)' : 'transparent',
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
    background: 'var(--slate-900)',
    borderBottom: '1px solid var(--slate-800)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  headerInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '0.85rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
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
    width: 42,
    height: 42,
    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.4)',
  },
  brandName: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  brandTag: {
    fontSize: '0.725rem',
    color: 'var(--slate-400)',
    fontWeight: 500,
  },
  studentIdSection: {
    display: 'flex',
    alignItems: 'center',
  },
  navBar: {
    background: '#fff',
    borderBottom: '1px solid var(--slate-200)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
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
    padding: '0.9rem 1.25rem',
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
    background: '#fff',
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
