import { useState, useEffect } from 'react';
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
    // Sync studentId from localStorage on mount
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

  if (viewingHoldId) {
    return (
      <div style={styles.appShell}>
        <TopBar studentId={studentId} onStudentIdChange={setStudentId} />
        <ErrorBoundary>
          <ApplicationDetail holdId={viewingHoldId} studentId={studentId} onBack={handleBack} />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div style={styles.appShell}>
      <TopBar studentId={studentId} onStudentIdChange={setStudentId} />
      <nav style={styles.nav}>
        <TabButton label="Classes" active={activeTab === 'classes'} onClick={() => setActiveTab('classes')} />
        <TabButton label="My Applications" active={activeTab === 'my-applications'} onClick={() => setActiveTab('my-applications')} />
        <TabButton label="Admin: Create Class" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
      </nav>
      <main style={styles.main}>
        <ErrorBoundary>
          {activeTab === 'classes' && (
            <ClassList studentId={studentId} onApplied={handleApplied} />
          )}
          {activeTab === 'my-applications' && (
            <MyApplications studentId={studentId} onViewHold={handleViewHold} />
          )}
          {activeTab === 'admin' && <CreateClass />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function TopBar({ studentId, onStudentIdChange }: { studentId: string; onStudentIdChange: (id: string) => void }) {
  return (
    <header style={styles.header}>
      <div style={styles.appTitle}>🎓 School Admission System</div>
      <StudentIdBar studentId={studentId} onStudentIdChange={onStudentIdChange} />
    </header>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabBtn,
        borderBottom: active ? '3px solid #2980b9' : '3px solid transparent',
        color: active ? '#2980b9' : '#555',
        fontWeight: active ? 700 : 400,
      }}
    >
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appShell: { minHeight: '100vh', background: '#f4f6f8', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: '#2c3e50',
    padding: '0.5rem 1.5rem',
    flexWrap: 'wrap',
  },
  appTitle: { color: '#ecf0f1', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' },
  nav: {
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    padding: '0 1rem',
    gap: '0.25rem',
  },
  tabBtn: {
    padding: '0.85rem 1.25rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'color 0.15s',
    whiteSpace: 'nowrap',
  },
  main: { minHeight: 'calc(100vh - 120px)' },
};

export default App;
