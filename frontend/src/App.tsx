import React, { useState, useEffect } from 'react';
import { ClassList } from './components/ClassList';
import { ApplicationDetail } from './components/ApplicationDetail';
import { MyApplications } from './components/MyApplications';
import { AdminPortal } from './components/AdminPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ErrorBoundary } from './ErrorBoundary';
import { Language, translations } from './i18n';

type Tab = 'classes' | 'my-applications' | 'admin';
type PreviousSource = 'seatmap' | 'my-applications' | 'classes';

const STUDENT_ID_KEY = 'studentId';
const IS_ADMIN_KEY = 'isAdmin';
const LANG_KEY = 'portal_lang';

function App() {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem(LANG_KEY) as Language) || 'en';
  });

  const setLang = (newLang: Language) => {
    localStorage.setItem(LANG_KEY, newLang);
    setLangState(newLang);
  };

  const t = translations[lang] || translations.en;

  const [studentId, setStudentId] = useState(() => localStorage.getItem(STUDENT_ID_KEY) || '');
  const [activeTab, setActiveTab] = useState<Tab>('classes');
  const [viewingHoldId, setViewingHoldId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [previousSource, setPreviousSource] = useState<PreviousSource>('classes');

  // Admin state
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(IS_ADMIN_KEY) === 'true');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STUDENT_ID_KEY);
    if (saved && saved.length === 17) setStudentId(saved);
  }, []);

  const handleApplied = (holdId: string) => {
    setPreviousSource('seatmap');
    setViewingHoldId(holdId);
  };

  const handleViewHold = (holdId: string) => {
    setPreviousSource(activeTab === 'my-applications' ? 'my-applications' : 'seatmap');
    setViewingHoldId(holdId);
  };

  // Immediate previous page navigation from payment/hold view
  const handleBackFromHold = () => {
    setViewingHoldId(null);
    if (previousSource === 'seatmap' && selectedClassId) {
      setActiveTab('classes');
      // keep selectedClassId active so user returns directly to that class seat map!
    } else if (previousSource === 'my-applications') {
      setActiveTab('my-applications');
      setSelectedClassId(null);
    } else {
      setActiveTab('classes');
      setSelectedClassId(null);
    }
  };

  const handleBackToDashboard = () => {
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
        <div className="top-header-inner">
          {/* Brand with Onnorokom Logo */}
          <div className="brand-wrapper" onClick={handleBackToDashboard}>
            <div style={styles.logoBadge} className="brand-logo-badge">
              <img
                src="/logo.jpg"
                alt="Onnorokom Academy Logo"
                style={styles.logoImg}
              />
            </div>
            <div className="brand-text-col">
              <span className="brand-heading">{t.brandName}</span>
              <span className="brand-subheading">{t.brandTag}</span>
            </div>
          </div>

          {/* Right Header Controls: Language Toggle & Admin Login */}
          <div className="header-right-actions">
            {/* Language Switcher */}
            <div style={styles.langToggle}>
              <button
                type="button"
                onClick={() => setLang('en')}
                className="lang-toggle-btn"
                style={{
                  ...styles.langBtn,
                  background: lang === 'en' ? 'var(--primary)' : 'transparent',
                  color: lang === 'en' ? '#ffffff' : 'var(--slate-600)',
                  fontWeight: lang === 'en' ? 700 : 500,
                }}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('bn')}
                className="lang-toggle-btn"
                style={{
                  ...styles.langBtn,
                  background: lang === 'bn' ? 'var(--primary)' : 'transparent',
                  color: lang === 'bn' ? '#ffffff' : 'var(--slate-600)',
                  fontWeight: lang === 'bn' ? 700 : 500,
                }}
              >
                বাং
              </button>
            </div>

            {/* Admin Controls */}
            {isAdmin ? (
              <div style={styles.adminGroup}>
                <button
                  type="button"
                  onClick={() => {
                    setViewingHoldId(null);
                    setSelectedClassId(null);
                    setActiveTab('admin');
                  }}
                  className="btn-admin-header"
                  style={{
                    ...styles.adminBtn,
                    background: activeTab === 'admin' ? 'var(--primary-dark)' : 'var(--primary)',
                  }}
                >
                  <span className="btn-text-full">{t.adminPortal}</span>
                  <span className="btn-text-short">{lang === 'bn' ? 'পোর্টাল' : 'Portal'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-admin-header"
                  style={styles.logoutBtn}
                  title={t.logout}
                >
                  {t.logout}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="btn btn-outline btn-admin-header"
                style={styles.adminLoginBtn}
              >
                <span className="btn-text-full">{t.adminLogin}</span>
                <span className="btn-text-short">{lang === 'bn' ? 'অ্যাডমিন' : 'Admin'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      {!viewingHoldId && (
        <nav style={styles.navBar}>
          <div style={styles.navInner} className="nav-inner-responsive">
            <TabButton
              label={t.classesTab}
              active={activeTab === 'classes'}
              onClick={() => {
                setSelectedClassId(null);
                setActiveTab('classes');
              }}
            />
            <TabButton
              label={t.myAppsTab}
              active={activeTab === 'my-applications'}
              onClick={() => setActiveTab('my-applications')}
            />
            {isAdmin && (
              <TabButton
                label={t.adminTab}
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
              lang={lang}
              onBack={handleBackFromHold}
            />
          ) : (
            <>
              {activeTab === 'classes' && (
                <ClassList
                  studentId={studentId}
                  lang={lang}
                  onApplied={handleApplied}
                  onViewHold={handleViewHold}
                  onUpdateStudentId={setStudentId}
                  selectedClassId={selectedClassId}
                  onSelectClass={setSelectedClassId}
                />
              )}

              {activeTab === 'my-applications' && (
                <MyApplications
                  studentId={studentId}
                  lang={lang}
                  onViewHold={handleViewHold}
                  onGoToClasses={() => setActiveTab('classes')}
                  onUpdateStudentId={setStudentId}
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
            <strong>{t.brandName}</strong>
            <span> • {t.brandTag}</span>
          </div>
          <div style={styles.techBadges}>
            <span style={styles.techPill}>.NET 10</span>
            <span style={styles.techPill}>PostgreSQL 16</span>
            <span style={styles.techPill}>React 18</span>
            <span style={styles.techPill}>Docker</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="tab-btn-responsive"
      style={{
        ...styles.tabBtn,
        color: active ? 'var(--primary)' : 'var(--slate-600)',
        borderBottom: active ? '2.5px solid var(--primary)' : '2.5px solid transparent',
        fontWeight: active ? 700 : 500,
        background: active ? 'rgba(30, 107, 184, 0.05)' : 'transparent',
      }}
      type="button"
    >
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
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
  },
  headerInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '0.65rem 1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'nowrap',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    cursor: 'pointer',
    userSelect: 'none',
    minWidth: 0,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--slate-200)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    flexShrink: 0,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  brandName: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: 'var(--primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  },
  brandTag: {
    fontSize: '0.7rem',
    color: 'var(--slate-500)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
  },
  langToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--slate-100)',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '2px',
  },
  langBtn: {
    padding: '0.25rem 0.5rem',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  adminGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  adminBtn: {
    color: '#ffffff',
    border: 'none',
    padding: '0.45rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(30, 107, 184, 0.25)',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'var(--slate-100)',
    border: '1px solid var(--slate-200)',
    color: 'var(--slate-600)',
    padding: '0.45rem 0.65rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.775rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  adminLoginBtn: {
    padding: '0.45rem 0.85rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    borderColor: 'var(--primary-border)',
    color: 'var(--primary)',
    background: 'var(--primary-light)',
    whiteSpace: 'nowrap',
  },
  navBar: {
    background: '#ffffff',
    borderBottom: '1px solid var(--slate-200)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
  },
  navInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '0 1.25rem',
    display: 'flex',
    gap: '0.25rem',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  main: {
    flex: 1,
    minHeight: 'calc(100vh - 160px)',
  },
  footer: {
    background: '#ffffff',
    borderTop: '1px solid var(--slate-200)',
    padding: '1.25rem',
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
    fontSize: '0.8rem',
    color: 'var(--slate-500)',
  },
  footerBrand: {
    color: 'var(--slate-600)',
  },
  techBadges: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  techPill: {
    background: 'var(--slate-100)',
    border: '1px solid var(--slate-200)',
    padding: '0.15rem 0.45rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.725rem',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-600)',
  },
};

export default App;
