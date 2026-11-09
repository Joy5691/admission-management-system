import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { ClassInfo } from '../types';
import { ClassSeatMap } from './ClassSeatMap';
import { Language, translations } from '../i18n';

interface ClassListProps {
  studentId: string;
  lang?: Language;
  onApplied: (holdId: string) => void;
  onViewHold?: (holdId: string) => void;
  onGoToCreate?: () => void;
  onUpdateStudentId?: (id: string) => void;
  selectedClassId?: string | null;
  onSelectClass?: (id: string | null) => void;
}

export function ClassList({
  studentId,
  lang = 'en',
  onApplied,
  onViewHold = () => {},
  onUpdateStudentId = () => {},
  selectedClassId: externalSelectedClassId,
  onSelectClass: externalOnSelectClass,
}: ClassListProps) {
  const t = translations[lang] || translations.en;
  const [internalSelectedClassId, setInternalSelectedClassId] = useState<string | null>(null);

  const selectedClassId = externalSelectedClassId !== undefined ? externalSelectedClassId : internalSelectedClassId;
  const setSelectedClassId = (id: string | null) => {
    if (externalOnSelectClass) externalOnSelectClass(id);
    else setInternalSelectedClassId(id);
  };

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Quick Filter Mode: ALL or OPEN seats only
  const [filterMode, setFilterMode] = useState<'ALL' | 'OPEN'>('ALL');

  const openClasses = useMemo(() => classes.filter(c => c.availableSeats > 0), [classes]);

  // Fetch classes
  const loadClasses = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data: ClassInfo[] = await apiFetch('/classes');
      setClasses(data);
      setError(null);
    } catch (err: any) {
      if (isInitial) setError(friendlyError(err));
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses(true);
    const interval = setInterval(() => loadClasses(false), 4000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let list = classes;
    if (filterMode === 'OPEN') {
      list = list.filter(c => c.availableSeats > 0);
    }
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(c => c.name.toLowerCase().includes(term));
  }, [classes, filterMode, search]);

  // If a class is selected, show its interactive seat map
  const activeClass = classes.find(c => c.id === selectedClassId);
  if (selectedClassId && activeClass) {
    return (
      <ClassSeatMap
        classInfo={activeClass}
        studentId={studentId}
        lang={lang}
        onBack={() => setSelectedClassId(null)}
        onApplied={onApplied}
        onViewHold={onViewHold}
        onUpdateStudentId={onUpdateStudentId}
      />
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Banner & Suggested Classes */}
      <div style={styles.headerBanner}>
        <div>
          <h1 style={styles.title}>{t.studentAdmissionTitle}</h1>
        </div>

        {/* Suggested Classes with Available Seats */}
        {openClasses.length > 0 && (
          <div style={styles.suggestedContainer}>
            <span style={styles.suggestedLabel}>{t.suggestedLabel}</span>
            <div style={styles.suggestedPills}>
              {openClasses.map(cls => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassId(cls.id)}
                  style={styles.suggestedPill}
                  title={`${cls.name} (${cls.availableSeats} ${t.seatsOpen})`}
                >
                  <span style={styles.suggestedDot} />
                  <strong style={styles.suggestedName}>{cls.name}</strong>
                  <span style={styles.suggestedBadge}>{cls.availableSeats} {t.seatsLeft}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.searchWrapper}>
          <svg style={styles.searchSvg} viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={styles.clearSearchBtn}>✕</button>
          )}
        </div>

        <div style={styles.filterGroup}>
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            style={{
              ...styles.filterBtn,
              background: filterMode === 'ALL' ? 'var(--primary)' : '#ffffff',
              color: filterMode === 'ALL' ? '#ffffff' : 'var(--slate-700)',
              borderColor: filterMode === 'ALL' ? 'var(--primary)' : 'var(--slate-300)',
              fontWeight: filterMode === 'ALL' ? 700 : 500,
            }}
          >
            {t.allClassesFilter} ({classes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('OPEN')}
            style={{
              ...styles.filterBtn,
              background: filterMode === 'OPEN' ? 'var(--success-dark)' : '#ffffff',
              color: filterMode === 'OPEN' ? '#ffffff' : 'var(--success-dark)',
              borderColor: filterMode === 'OPEN' ? 'var(--success-dark)' : 'var(--success-border)',
              fontWeight: filterMode === 'OPEN' ? 700 : 500,
            }}
          >
            <span style={{ ...styles.suggestedDot, marginRight: 6 }} />
            {t.openOnlyFilter} ({openClasses.length})
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={styles.errorAlert}>
          <span>{error}</span>
          <button onClick={() => loadClasses(true)} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={styles.emptyState}>
          <div style={styles.spinner} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState} className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--slate-800)' }}>
            {t.noClasses}
          </h3>
          {search && (
            <button onClick={() => setSearch('')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {t.clearFilter}
            </button>
          )}
        </div>
      ) : (
        /* Academic Class Modules Grid */
        <div style={styles.modulesGrid}>
          {filtered.map(c => {
            const isFull = c.availableSeats === 0;
            const occupancyPct = c.totalSeats > 0 ? Math.round(((c.confirmedSeats + c.heldSeats) / c.totalSeats) * 100) : 0;
            const isMorning = c.name.toLowerCase().includes('morning');
            const isEvening = c.name.toLowerCase().includes('evening');
            const shiftName = isMorning
              ? (lang === 'bn' ? 'মর্নিং শিফট' : 'Morning Shift')
              : isEvening
              ? (lang === 'bn' ? 'ইভনিং শিফট' : 'Evening Shift')
              : (lang === 'bn' ? 'ডে শিফট' : 'Day Shift');

            return (
              <div
                key={c.id}
                className="card card-interactive"
                style={styles.moduleCard}
                onClick={() => setSelectedClassId(c.id)}
              >
                {/* Module Header */}
                <div style={styles.moduleHeader}>
                  <div>
                    <h3 style={styles.moduleClassName}>{c.name}</h3>
                    <span style={styles.moduleShiftTag}>{shiftName}</span>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      background: isFull ? 'var(--danger-light)' : 'var(--success-light)',
                      color: isFull ? 'var(--danger-dark)' : 'var(--success-dark)',
                      borderColor: isFull ? 'var(--danger-border)' : 'var(--success-border)',
                    }}
                  >
                    <span
                      style={{
                        ...styles.statusDot,
                        background: isFull ? 'var(--danger)' : 'var(--success)',
                      }}
                    />
                    {isFull ? t.capacityFull : t.openForAdmission}
                  </span>
                </div>

                {/* Seat Metrics Row */}
                <div style={styles.seatPillRow}>
                  <div style={styles.seatPill}>
                    <span style={styles.seatPillLabel}>{t.available}</span>
                    <span style={{ ...styles.seatPillVal, color: 'var(--primary)' }}>
                      {c.availableSeats}
                    </span>
                  </div>
                  <div style={styles.seatPill}>
                    <span style={styles.seatPillLabel}>{t.held}</span>
                    <span style={{ ...styles.seatPillVal, color: 'var(--warning-dark)' }}>
                      {c.heldSeats}
                    </span>
                  </div>
                  <div style={styles.seatPill}>
                    <span style={styles.seatPillLabel}>{t.confirmed}</span>
                    <span style={{ ...styles.seatPillVal, color: 'var(--success-dark)' }}>
                      {c.confirmedSeats}
                    </span>
                  </div>
                  <div style={styles.seatPill}>
                    <span style={styles.seatPillLabel}>{t.total}</span>
                    <span style={styles.seatPillVal}>{c.totalSeats}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={styles.progressContainer}>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        width: `${(c.confirmedSeats / c.totalSeats) * 100}%`,
                        background: 'var(--success-dark)',
                      }}
                    />
                    <div
                      style={{
                        width: `${(c.heldSeats / c.totalSeats) * 100}%`,
                        background: 'var(--warning)',
                      }}
                    />
                  </div>
                  <div style={styles.progressLabelRow}>
                    <span>{occupancyPct}% {t.occupied}</span>
                    <span>{c.availableSeats} {t.seatsOpen}</span>
                  </div>
                </div>

                {/* Footer Action */}
                <div style={styles.moduleFooter}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={styles.viewSeatsBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClassId(c.id);
                    }}
                  >
                    {t.viewSeatMap}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '1.5rem',
  },
  headerBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    letterSpacing: '-0.025em',
    margin: 0,
  },
  suggestedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    alignItems: 'flex-start',
  },
  suggestedLabel: {
    fontSize: '0.725rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    color: 'var(--slate-500)',
  },
  suggestedPills: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  suggestedPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: '#ffffff',
    border: '1px solid var(--primary-border)',
    borderRadius: 'var(--radius-full)',
    padding: '0.35rem 0.8rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: 'var(--shadow-sm)',
  },
  suggestedDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--success)',
    display: 'inline-block',
  },
  suggestedName: {
    fontSize: '0.825rem',
    color: 'var(--slate-900)',
    fontWeight: 600,
  },
  suggestedBadge: {
    fontSize: '0.725rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    background: 'var(--primary-light)',
    color: 'var(--primary-dark)',
    padding: '0.1rem 0.45rem',
    borderRadius: 'var(--radius-full)',
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 320px',
    maxWidth: 500,
    display: 'flex',
    alignItems: 'center',
  },
  searchSvg: {
    position: 'absolute',
    left: '0.85rem',
    color: 'var(--slate-400)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '0.65rem 2rem 0.65rem 2.4rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--slate-300)',
    background: '#ffffff',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxShadow: 'var(--shadow-sm)',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    color: 'var(--slate-400)',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  filterGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  filterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.6rem 0.9rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    fontSize: '0.825rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  errorAlert: {
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    padding: '0.85rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3.5rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 34,
    height: 34,
    border: '3px solid var(--slate-200)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  modulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.25rem',
  },
  moduleCard: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: '#ffffff',
  },
  moduleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  moduleClassName: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    margin: 0,
    lineHeight: 1.25,
  },
  moduleShiftTag: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--slate-500)',
  },
  statusBadge: {
    fontSize: '0.725rem',
    fontWeight: 700,
    padding: '0.2rem 0.55rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    display: 'inline-block',
  },
  seatPillRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.4rem',
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '0.65rem',
    marginBottom: '1rem',
  },
  seatPill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  seatPillLabel: {
    fontSize: '0.675rem',
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
    fontWeight: 700,
  },
  seatPillVal: {
    fontSize: '1.05rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-800)',
  },
  progressContainer: {
    marginBottom: '1rem',
  },
  progressBar: {
    height: 6,
    borderRadius: 'var(--radius-full)',
    background: 'var(--slate-200)',
    display: 'flex',
    overflow: 'hidden',
    marginBottom: '0.35rem',
  },
  progressLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.725rem',
    color: 'var(--slate-500)',
    fontWeight: 600,
  },
  moduleFooter: {
    borderTop: '1px solid var(--slate-100)',
    paddingTop: '0.85rem',
  },
  viewSeatsBtn: {
    width: '100%',
    padding: '0.7rem 1rem',
    fontSize: '0.875rem',
  },
};
