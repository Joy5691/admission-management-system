import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { ClassInfo } from '../types';
import { ClassSeatMap } from './ClassSeatMap';

interface ClassListProps {
  studentId: string;
  onApplied: (holdId: string) => void;
  onViewHold?: (holdId: string) => void;
  onGoToCreate?: () => void;
  onUpdateStudentId?: (id: string) => void;
  selectedClassId?: string | null;
  onSelectClass?: (id: string | null) => void;
}

export function ClassList({
  studentId,
  onApplied,
  onViewHold = () => {},
  onGoToCreate,
  onUpdateStudentId = () => {},
  selectedClassId: externalSelectedClassId,
  onSelectClass: externalOnSelectClass,
}: ClassListProps) {
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

  // Quick Filter Mode: ALL or OPEN seats only
  const [filterMode, setFilterMode] = useState<'ALL' | 'OPEN'>('ALL');

  const openClasses = useMemo(() => classes.filter(c => c.availableSeats > 0), [classes]);

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
          <h1 style={styles.title}>Student Admission</h1>
        </div>

        {/* Suggested Classes with Available Seats */}
        {openClasses.length > 0 && (
          <div style={styles.suggestedContainer}>
            <span style={styles.suggestedLabel}>Suggested Classes with Open Seats:</span>
            <div style={styles.suggestedPills}>
              {openClasses.map(cls => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassId(cls.id)}
                  style={styles.suggestedPill}
                  title={`Select ${cls.name} (${cls.availableSeats} seats open)`}
                >
                  <span style={styles.suggestedDot} />
                  <strong style={styles.suggestedName}>{cls.name}</strong>
                  <span style={styles.suggestedBadge}>{cls.availableSeats} seats left</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by class or shift (e.g. Morning, Class 6, KG)..."
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
            All Classes ({classes.length})
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
            🟢 Open Seats Only ({openClasses.length})
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={styles.errorAlert}>
          <span>⚠️ {error}</span>
          <button onClick={() => loadClasses(true)} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={styles.emptyState}>
          <div style={styles.spinner} />
          <p style={{ marginTop: '1rem', color: 'var(--slate-500)', fontWeight: 600 }}>
            Syncing real-time class occupancy...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState} className="card">
          <span style={{ fontSize: '2.5rem' }}>🏫</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--slate-800)' }}>
            {search ? 'No classes matched your search' : 'No academic classes open yet'}
          </h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', maxWidth: 420, margin: '0.4rem 0 1.25rem' }}>
            {search
              ? 'Try searching with different keywords like "Morning", "Class 6", or clear the search filter.'
              : 'Admissions have not been configured yet. Administrators can create the first class module now.'}
          </p>
          {search ? (
            <button onClick={() => setSearch('')} className="btn btn-primary">
              Clear Search Filter
            </button>
          ) : (
            <button onClick={onGoToCreate} className="btn btn-primary">
              ➕ Create Academic Class
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
            const shiftIcon = isMorning ? '🌅' : isEvening ? '🌙' : '☀️';

            return (
              <div
                key={c.id}
                className="card card-interactive"
                style={styles.moduleCard}
                onClick={() => setSelectedClassId(c.id)}
              >
                {/* Module Header */}
                <div style={styles.moduleHeader}>
                  <div style={styles.moduleTitleGroup}>
                    <span style={styles.shiftIconBox}>{shiftIcon}</span>
                    <div>
                      <h3 style={styles.moduleClassName}>{c.name}</h3>
                      <span style={styles.moduleShiftTag}>
                        {isMorning ? 'Morning Shift' : isEvening ? 'Evening Shift' : 'Day Shift'}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      background: isFull ? 'var(--danger-light)' : 'var(--success-light)',
                      color: isFull ? 'var(--danger-dark)' : 'var(--success-dark)',
                      borderColor: isFull ? 'var(--danger-border)' : 'var(--success-border)',
                    }}
                  >
                    {isFull ? '🔴 Capacity Full' : '🟢 Open for Admission'}
                  </span>
                </div>

                {/* Seat Metrics Row */}
                <div style={styles.seatPillRow}>
                  <div style={styles.seatPill}>
                    <span style={styles.seatPillLabel}>Available</span>
                    <span style={{ ...styles.seatPillVal, color: 'var(--primary)' }}>
                      {c.availableSeats}
                    </span>
                  </div>
                  <div style={styles.seatPill}>
                    <span style={styles.seatPillLabel}>Held</span>
                    <span style={{ ...styles.seatPillVal, color: 'var(--warning-dark)' }}>
                      {c.heldSeats}
                    </span>
                  </div>
                  <div style={styles.seatPill}>
                    <span style={styles.seatPillLabel}>Confirmed</span>
                    <span style={{ ...styles.seatPillVal, color: 'var(--success-dark)' }}>
                      {c.confirmedSeats}
                    </span>
                  </div>
                  <div style={styles.seatPill}>
                    <span style={styles.seatPillLabel}>Total</span>
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
                      title={`Confirmed: ${c.confirmedSeats}`}
                    />
                    <div
                      style={{
                        width: `${(c.heldSeats / c.totalSeats) * 100}%`,
                        background: 'var(--warning)',
                      }}
                      title={`Held: ${c.heldSeats}`}
                    />
                  </div>
                  <div style={styles.progressLabelRow}>
                    <span>{occupancyPct}% Occupied</span>
                    <span>{c.availableSeats} of {c.totalSeats} seats open</span>
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
                    🪑 View Seat Map & Apply →
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
    padding: '2rem 1.5rem',
  },
  headerBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '2rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
    flexWrap: 'wrap',
  },
  liveIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'var(--slate-100)',
    border: '1px solid var(--slate-200)',
    padding: '0.2rem 0.65rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-600)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--success)',
    transition: 'opacity 0.2s ease',
  },
  protocolBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--primary-light)',
    color: 'var(--primary)',
    border: '1px solid var(--primary-border)',
    padding: '0.2rem 0.65rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  title: {
    fontSize: '1.85rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    letterSpacing: '-0.025em',
    marginBottom: '0.35rem',
  },
  subtitle: {
    color: 'var(--slate-500)',
    fontSize: '0.95rem',
    maxWidth: 640,
    lineHeight: 1.5,
  },
  suggestedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'flex-start',
  },
  suggestedLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
    gap: '0.5rem',
    background: '#ffffff',
    border: '1.5px solid var(--primary-border)',
    borderRadius: 'var(--radius-full)',
    padding: '0.4rem 0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: 'var(--shadow-sm)',
  },
  suggestedDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--success)',
  },
  suggestedName: {
    fontSize: '0.85rem',
    color: 'var(--slate-900)',
  },
  suggestedBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    background: 'var(--primary-light)',
    color: 'var(--primary-dark)',
    padding: '0.15rem 0.5rem',
    borderRadius: 'var(--radius-full)',
  },
  filterGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  filterBtn: {
    padding: '0.65rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.75rem',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 100%',
    maxWidth: 600,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.9rem',
    color: 'var(--slate-400)',
    fontSize: '0.95rem',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 2.2rem 0.75rem 2.4rem',
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
    fontSize: '0.85rem',
  },
  createBtn: {
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  errorAlert: {
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 38,
    height: 38,
    border: '3.5px solid var(--slate-200)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  modulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '1.5rem',
  },
  moduleCard: {
    padding: '1.5rem',
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
    marginBottom: '1.25rem',
  },
  moduleTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  shiftIconBox: {
    fontSize: '1.5rem',
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    padding: '0.45rem',
    borderRadius: 'var(--radius-md)',
    lineHeight: 1,
  },
  moduleClassName: {
    fontSize: '1.15rem',
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
    padding: '0.2rem 0.6rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  },
  seatPillRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    marginBottom: '1.25rem',
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
    fontSize: '1.1rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-800)',
  },
  progressContainer: {
    marginBottom: '1.25rem',
  },
  progressBar: {
    height: 7,
    borderRadius: 'var(--radius-full)',
    background: 'var(--slate-200)',
    display: 'flex',
    overflow: 'hidden',
    marginBottom: '0.4rem',
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
    paddingTop: '1rem',
  },
  viewSeatsBtn: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '0.925rem',
  },
};
