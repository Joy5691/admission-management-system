import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { ClassInfo } from '../types';

interface Props {
  studentId: string;
  onApplied: (holdId: string) => void;
  onGoToCreate?: () => void;
}

export function ClassList({ studentId, onApplied, onGoToCreate }: Props) {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchClasses = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsRefreshing(true);
    try {
      const data = await apiFetch('/classes');
      setClasses(data || []);
      setError('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      if (isInitial) setLoading(false);
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, []);

  useEffect(() => {
    fetchClasses(true);
    const id = setInterval(() => fetchClasses(false), 4000);
    return () => clearInterval(id);
  }, [fetchClasses]);

  const handleApply = async (cls: ClassInfo) => {
    if (!studentId) return;
    setApplying(cls.id);
    setApplyError(prev => ({ ...prev, [cls.id]: '' }));
    try {
      const hold = await apiFetch(`/classes/${cls.id}/holds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': studentId,
        },
      });
      onApplied(hold.holdId);
    } catch (err) {
      setApplyError(prev => ({ ...prev, [cls.id]: friendlyError(err) }));
    } finally {
      setApplying(null);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return classes;
    const term = search.toLowerCase();
    return classes.filter(c => c.name.toLowerCase().includes(term));
  }, [classes, search]);

  const totalSeatsAll = classes.reduce((sum, c) => sum + c.totalSeats, 0);
  const totalAvailableAll = classes.reduce((sum, c) => sum + c.availableSeats, 0);
  const totalConfirmedAll = classes.reduce((sum, c) => sum + c.confirmedSeats, 0);

  return (
    <div style={styles.container}>
      {/* Top Banner & Stats */}
      <div style={styles.headerBanner}>
        <div>
          <div style={styles.badgeRow}>
            <span style={styles.liveIndicator}>
              <span style={{ ...styles.liveDot, opacity: isRefreshing ? 0.3 : 1 }} />
              Live Sync (4s)
            </span>
            <span style={styles.protocolBadge}>⚡ First-Come, First-Served</span>
          </div>
          <h1 style={styles.title}>Academic Shifts & Available Seats</h1>
          <p style={styles.subtitle}>
            Seat holds lock instantly upon application. Pay the fake admission fee within the countdown to secure admission.
          </p>
        </div>

        {/* Global Stats Pill Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statPill}>
            <span style={styles.statLabel}>Total Classes</span>
            <span style={styles.statVal}>{classes.length}</span>
          </div>
          <div style={styles.statPill}>
            <span style={styles.statLabel}>Total Capacity</span>
            <span style={styles.statVal}>{totalSeatsAll}</span>
          </div>
          <div style={styles.statPill}>
            <span style={styles.statLabel}>Available Seats</span>
            <span style={{ ...styles.statVal, color: 'var(--primary)' }}>{totalAvailableAll}</span>
          </div>
          <div style={styles.statPill}>
            <span style={styles.statLabel}>Confirmed</span>
            <span style={{ ...styles.statVal, color: 'var(--success-dark)' }}>{totalConfirmedAll}</span>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by class name or shift (e.g. Morning, Class 6)..."
            style={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={styles.clearSearchBtn} type="button">
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div style={styles.cardsGrid}>
          {[1, 2, 3].map(i => (
            <div key={i} style={styles.skeletonCard}>
              <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 16, width: '100%', marginBottom: 20 }} />
              <div className="skeleton" style={{ height: 60, width: '100%', marginBottom: 20 }} />
              <div className="skeleton" style={{ height: 44, width: '100%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && classes.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📚</div>
          <h3 style={styles.emptyTitle}>No Classes Provisioned Yet</h3>
          <p style={styles.emptyText}>
            The admission catalog is currently empty. Head over to the Administrator tab to create classes and allocate seat capacities.
          </p>
          {onGoToCreate && (
            <button onClick={onGoToCreate} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              + Create First Class
            </button>
          )}
        </div>
      )}

      {/* Filtered Empty State */}
      {!loading && classes.length > 0 && filtered.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔎</div>
          <h3 style={styles.emptyTitle}>No Matching Classes</h3>
          <p style={styles.emptyText}>No classes matched your search "{search}".</p>
          <button onClick={() => setSearch('')} className="btn btn-outline" style={{ marginTop: '0.75rem' }}>
            Clear Search
          </button>
        </div>
      )}

      {/* Class Cards Grid */}
      <div style={styles.cardsGrid}>
        {filtered.map(cls => {
          const isMorning = cls.name.toLowerCase().includes('morning');
          const isDay = cls.name.toLowerCase().includes('day');
          const isFull = cls.availableSeats === 0;

          const pctConfirmed = Math.round((cls.confirmedSeats / cls.totalSeats) * 100);
          const pctHeld = Math.round((cls.heldSeats / cls.totalSeats) * 100);
          const pctAvailable = 100 - pctConfirmed - pctHeld;

          return (
            <div key={cls.id} className="card" style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <span
                    style={{
                      ...styles.shiftBadge,
                      background: isMorning ? 'var(--warning-light)' : isDay ? '#e0f2fe' : 'var(--primary-light)',
                      color: isMorning ? 'var(--warning-dark)' : isDay ? '#0369a1' : 'var(--primary)',
                      borderColor: isMorning ? 'var(--warning-border)' : isDay ? '#bae6fd' : 'var(--primary-border)',
                    }}
                  >
                    {isMorning ? '☀️ Morning Shift' : isDay ? '🌤️ Day Shift' : '🏫 Academic Class'}
                  </span>
                  <h3 style={styles.className}>{cls.name}</h3>
                </div>

                <div style={styles.statusPill}>
                  {isFull ? (
                    <span style={styles.fullPill}>Full</span>
                  ) : cls.availableSeats <= 5 ? (
                    <span style={styles.limitedPill}>Only {cls.availableSeats} Left</span>
                  ) : (
                    <span style={styles.openPill}>{cls.availableSeats} Available</span>
                  )}
                </div>
              </div>

              {/* Progress Bar of Capacity */}
              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressSegment,
                      width: `${pctConfirmed}%`,
                      background: 'var(--success)',
                    }}
                    title={`Confirmed: ${cls.confirmedSeats}`}
                  />
                  <div
                    style={{
                      ...styles.progressSegment,
                      width: `${pctHeld}%`,
                      background: 'var(--warning)',
                    }}
                    title={`Held: ${cls.heldSeats}`}
                  />
                  <div
                    style={{
                      ...styles.progressSegment,
                      width: `${Math.max(0, pctAvailable)}%`,
                      background: 'var(--slate-200)',
                    }}
                    title={`Available: ${cls.availableSeats}`}
                  />
                </div>
                <div style={styles.progressLegend}>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: 'var(--success)' }} />
                    Confirmed ({cls.confirmedSeats})
                  </span>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: 'var(--warning)' }} />
                    Held ({cls.heldSeats})
                  </span>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: 'var(--slate-300)' }} />
                    Available ({cls.availableSeats})
                  </span>
                </div>
              </div>

              {/* 4-KPI Metric Box */}
              <div style={styles.kpiGrid}>
                <div style={styles.kpiBox}>
                  <span style={styles.kpiLabel}>Total Capacity</span>
                  <span style={styles.kpiVal}>{cls.totalSeats}</span>
                </div>
                <div style={{ ...styles.kpiBox, background: 'var(--slate-50)' }}>
                  <span style={styles.kpiLabel}>Available</span>
                  <span
                    style={{
                      ...styles.kpiVal,
                      color: isFull ? 'var(--danger)' : 'var(--primary)',
                    }}
                  >
                    {cls.availableSeats}
                  </span>
                </div>
                <div style={styles.kpiBox}>
                  <span style={styles.kpiLabel}>Held</span>
                  <span style={{ ...styles.kpiVal, color: 'var(--warning-dark)' }}>{cls.heldSeats}</span>
                </div>
                <div style={styles.kpiBox}>
                  <span style={styles.kpiLabel}>Confirmed</span>
                  <span style={{ ...styles.kpiVal, color: 'var(--success-dark)' }}>{cls.confirmedSeats}</span>
                </div>
              </div>

              {/* Apply Error banner */}
              {applyError[cls.id] && (
                <div style={styles.cardError}>
                  <span>⚠️</span>
                  <span>{applyError[cls.id]}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                className="btn btn-primary"
                style={{
                  ...styles.applyBtn,
                  background: isFull
                    ? 'var(--slate-200)'
                    : !studentId
                    ? 'var(--slate-300)'
                    : 'var(--primary-gradient)',
                  color: isFull || !studentId ? 'var(--slate-600)' : '#fff',
                }}
                disabled={!studentId || isFull || applying === cls.id}
                onClick={() => handleApply(cls)}
              >
                {applying === cls.id
                  ? 'Reserving Seat…'
                  : isFull
                  ? 'Class Full (No Seats)'
                  : !studentId
                  ? 'Enter Student ID Above to Apply'
                  : 'Apply for Seat →'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem 1.5rem',
    maxWidth: 1240,
    margin: '0 auto',
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
    gap: '0.65rem',
    marginBottom: '0.65rem',
  },
  liveIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'var(--success-light)',
    color: 'var(--success-dark)',
    border: '1px solid var(--success-border)',
    padding: '0.2rem 0.65rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--success)',
    boxShadow: '0 0 6px var(--success)',
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
    marginBottom: '0.4rem',
  },
  subtitle: {
    color: 'var(--slate-500)',
    fontSize: '0.95rem',
    maxWidth: 620,
  },
  statsGrid: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  statPill: {
    background: '#fff',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '0.65rem 1.15rem',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 105,
  },
  statLabel: {
    fontSize: '0.725rem',
    color: 'var(--slate-500)',
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  statVal: {
    fontSize: '1.4rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-900)',
  },
  controlsBar: {
    marginBottom: '1.75rem',
  },
  searchWrapper: {
    position: 'relative',
    maxWidth: 480,
  },
  searchIcon: {
    position: 'absolute',
    left: '0.9rem',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '0.9rem',
    opacity: 0.6,
  },
  searchInput: {
    width: '100%',
    padding: '0.7rem 2.25rem 0.7rem 2.4rem',
    fontSize: '0.925rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--slate-300)',
    background: '#fff',
    outline: 'none',
    boxShadow: 'var(--shadow-sm)',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--slate-400)',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.5rem',
    fontWeight: 600,
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: '#fff',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  shiftBadge: {
    display: 'inline-block',
    fontSize: '0.725rem',
    fontWeight: 700,
    padding: '0.2rem 0.55rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid transparent',
    marginBottom: '0.5rem',
  },
  className: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--slate-900)',
    letterSpacing: '-0.02em',
    lineHeight: 1.25,
  },
  statusPill: {
    whiteSpace: 'nowrap',
  },
  openPill: {
    fontSize: '0.725rem',
    fontWeight: 700,
    padding: '0.2rem 0.6rem',
    borderRadius: 'var(--radius-full)',
    background: 'var(--success-light)',
    color: 'var(--success-dark)',
    border: '1px solid var(--success-border)',
  },
  limitedPill: {
    fontSize: '0.725rem',
    fontWeight: 700,
    padding: '0.2rem 0.6rem',
    borderRadius: 'var(--radius-full)',
    background: 'var(--warning-light)',
    color: 'var(--warning-dark)',
    border: '1px solid var(--warning-border)',
  },
  fullPill: {
    fontSize: '0.725rem',
    fontWeight: 700,
    padding: '0.2rem 0.6rem',
    borderRadius: 'var(--radius-full)',
    background: 'var(--danger-light)',
    color: 'var(--danger-dark)',
    border: '1px solid var(--danger-border)',
  },
  progressContainer: {
    marginBottom: '1.25rem',
  },
  progressBar: {
    height: 8,
    borderRadius: 'var(--radius-full)',
    background: 'var(--slate-100)',
    display: 'flex',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  progressSegment: {
    height: '100%',
    transition: 'width 0.4s ease',
  },
  progressLegend: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.725rem',
    color: 'var(--slate-500)',
    fontWeight: 500,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
    background: 'var(--slate-50)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--slate-200)',
    marginBottom: '1.25rem',
  },
  kpiBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  kpiLabel: {
    fontSize: '0.675rem',
    color: 'var(--slate-500)',
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: '0.3px',
    marginBottom: '0.15rem',
  },
  kpiVal: {
    fontSize: '1.15rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-800)',
  },
  cardError: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.65rem 0.85rem',
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--danger-dark)',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  applyBtn: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '0.95rem',
  },
  skeletonCard: {
    background: '#fff',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: '#fff',
    borderRadius: 'var(--radius-lg)',
    border: '1px dashed var(--slate-300)',
    maxWidth: 520,
    margin: '2rem auto',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--slate-800)',
    marginBottom: '0.5rem',
  },
  emptyText: {
    color: 'var(--slate-500)',
    fontSize: '0.925rem',
    lineHeight: 1.5,
  },
};

