import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { MyHold } from '../types';
import { Language, translations } from '../i18n';

interface Props {
  studentId: string;
  lang?: Language;
  onViewHold: (holdId: string) => void;
  onGoToClasses?: () => void;
  onUpdateStudentId?: (id: string) => void;
}

type Filter = 'ALL' | 'HELD' | 'CONFIRMED' | 'TERMINAL';

export function MyApplications({ studentId, lang = 'en', onViewHold, onGoToClasses, onUpdateStudentId }: Props) {
  const t = translations[lang] || translations.en;
  const [searchIdInput, setSearchIdInput] = useState('');
  const [holds, setHolds] = useState<MyHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const fetchHolds = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch('/me/holds', {
        headers: { 'X-Student-Id': studentId },
      });
      setHolds(data || []);
      setError('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    setLoading(true);
    fetchHolds();
    const id = setInterval(fetchHolds, 4000);
    return () => clearInterval(id);
  }, [fetchHolds]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return holds;
    if (filter === 'HELD') return holds.filter(h => h.status === 'HELD');
    if (filter === 'CONFIRMED') return holds.filter(h => h.status === 'CONFIRMED');
    return holds.filter(h => h.status === 'EXPIRED' || h.status === 'CANCELLED');
  }, [holds, filter]);

  if (!studentId) {
    return (
      <div style={styles.container} className="animate-fade-in">
        <div style={styles.warnCard} className="card">
          
          <h3 style={styles.warnTitle}>Find Your Applications</h3>
          <p style={styles.warnText}>
            Enter your 17-digit Birth Registration Number to view your held seats, payment status, and confirmed admissions.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = searchIdInput.trim();
              if (clean.length === 17 && /^\d{17}$/.test(clean) && onUpdateStudentId) {
                localStorage.setItem('studentId', clean);
                onUpdateStudentId(clean);
              }
            }}
            style={{ display: 'flex', gap: '0.65rem', maxWidth: 440, width: '100%', margin: '1.25rem auto 0', flexWrap: 'wrap' }}
          >
            <input
              type="text"
              maxLength={17}
              value={searchIdInput}
              onChange={(e) => setSearchIdInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 17-digit Student ID..."
              style={{
                flex: '1 1 240px',
                padding: '0.75rem 1rem',
                border: '1.5px solid var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
              autoFocus
            />
            <button
              type="submit"
              disabled={searchIdInput.length !== 17}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.25rem' }}
            >
              {t.searchApplicationsBtn || 'Search Applications →'}
            </button>
          </form>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.5rem', display: 'block', fontFamily: 'var(--font-mono)' }}>
            {searchIdInput.length} / 17 digits
          </span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="skeleton" style={{ height: 32, width: 220, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 180, width: '100%', borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  const heldCount = holds.filter(h => h.status === 'HELD').length;
  const confirmedCount = holds.filter(h => h.status === 'CONFIRMED').length;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Banner */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Applications</h1>
          <p style={styles.subtitle}>
            Student ID: <code style={styles.idCode}>{studentId}</code>
            {onUpdateStudentId && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('studentId');
                  onUpdateStudentId('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.775rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginLeft: '0.5rem',
                  textDecoration: 'underline',
                }}
              >
                ${t.switchStudentId || 'Switch Student ID'}
              </button>
            )}
          </p>
        </div>

        {/* Quick Stat Chips */}
        <div style={styles.chipsRow}>
          <div style={styles.chip}>
            <span style={styles.chipNum}>{holds.length}</span>
            <span style={styles.chipText}>Total</span>
          </div>
          <div style={styles.chip}>
            <span style={{ ...styles.chipNum, color: 'var(--warning-dark)' }}>{heldCount}</span>
            <span style={styles.chipText}>Active Holds</span>
          </div>
          <div style={styles.chip}>
            <span style={{ ...styles.chipNum, color: 'var(--success-dark)' }}>{confirmedCount}</span>
            <span style={styles.chipText}>Confirmed</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      {holds.length > 0 && (
        <div style={styles.filterBar}>
          {(['ALL', 'HELD', 'CONFIRMED', 'TERMINAL'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                background: filter === f ? 'var(--primary-gradient)' : '#fff',
                color: filter === f ? '#fff' : 'var(--slate-600)',
                borderColor: filter === f ? 'transparent' : 'var(--slate-200)',
              }}
              type="button"
            >
              {f === 'ALL'
                ? `All (${holds.length})`
                : f === 'HELD'
                ? `Active Holds (${heldCount})`
                : f === 'CONFIRMED'
                ? `Confirmed (${confirmedCount})`
                : 'Expired / Cancelled'}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {holds.length === 0 && (
        <div style={styles.emptyState} className="card">
          
          <h3 style={styles.emptyTitle}>No Applications on Record</h3>
          <p style={styles.emptyText}>
            You have not applied for any class seats yet. Explore available shifts and apply online.
          </p>
          {onGoToClasses && (
            <button onClick={onGoToClasses} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Browse Available Classes →
            </button>
          )}
        </div>
      )}

      {/* Filtered Empty State */}
      {holds.length > 0 && filtered.length === 0 && (
        <div style={styles.emptyState} className="card">
          <h3 style={styles.emptyTitle}>No Applications Match This Filter</h3>
          <button onClick={() => setFilter('ALL')} className="btn btn-outline" style={{ marginTop: '0.75rem' }}>
            Show All Applications
          </button>
        </div>
      )}

      {/* Cards Table List */}
      {filtered.length > 0 && (
        <div style={styles.list}>
          {filtered.map(h => {
            const isHeld = h.status === 'HELD';
            const isConfirmed = h.status === 'CONFIRMED';
            const isExpired = h.status === 'EXPIRED';

            const badgeClass = isHeld
              ? 'badge-held'
              : isConfirmed
              ? 'badge-confirmed'
              : isExpired
              ? 'badge-expired'
              : 'badge-cancelled';

            const statusText = isHeld
              ? 'HELD — Awaiting Payment'
              : isConfirmed
              ? 'Confirmed Admission'
              : isExpired
              ? 'Expired'
              : 'Cancelled';

            return (
              <div key={h.holdId} className="card" style={styles.appCard}>
                <div style={styles.cardMain}>
                  <div style={styles.cardHeader}>
                    <span className={`badge ${badgeClass}`}>{statusText}</span>
                    <span style={styles.holdRef}>Ref: {h.holdId.slice(0, 8)}…</span>
                  </div>

                  <h3 style={styles.className}>{h.className}</h3>

                  <div style={styles.dateRow}>
                    <span style={styles.dateLabel}>Expiry / Expiration:</span>
                    <span style={styles.dateVal}>
                      {h.expiresAt ? new Date(h.expiresAt).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>

                <div style={styles.cardActions}>
                  <button
                    onClick={() => onViewHold(h.holdId)}
                    className={`btn ${isHeld ? 'btn-primary' : 'btn-outline'}`}
                    style={styles.actionBtn}
                  >
                    {isHeld ? 'Pay Admission Fee →' : 'View Details →'}
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
    padding: '2rem 1.5rem',
    maxWidth: 960,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '1.85rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    letterSpacing: '-0.025em',
    marginBottom: '0.35rem',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--slate-500)',
  },
  idCode: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    color: 'var(--primary)',
    background: 'var(--primary-light)',
    padding: '0.2rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
  },
  chipsRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  chip: {
    background: '#fff',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
    minWidth: 85,
  },
  chipNum: {
    fontSize: '1.3rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-900)',
  },
  chipText: {
    fontSize: '0.675rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
    letterSpacing: '0.3px',
  },
  filterBar: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  warnCard: {
    padding: '3rem 2rem',
    textAlign: 'center',
    maxWidth: 520,
    margin: '3rem auto',
    background: '#fff',
  },
  warnIcon: {
    fontSize: '2.5rem',
    display: 'block',
    marginBottom: '1rem',
  },
  warnTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    marginBottom: '0.5rem',
  },
  warnText: {
    fontSize: '0.925rem',
    color: 'var(--slate-600)',
    lineHeight: 1.5,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.85rem 1.25rem',
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.5rem',
    fontWeight: 600,
  },
  emptyState: {
    padding: '3.5rem 2rem',
    textAlign: 'center',
    background: '#fff',
    border: '1px dashed var(--slate-300)',
    maxWidth: 500,
    margin: '2rem auto',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.75rem',
  },
  emptyTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'var(--slate-800)',
    marginBottom: '0.4rem',
  },
  emptyText: {
    fontSize: '0.9rem',
    color: 'var(--slate-500)',
    lineHeight: 1.5,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  appCard: {
    padding: '1.25rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  cardMain: {
    flex: 1,
    minWidth: 260,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  holdRef: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--slate-400)',
  },
  className: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--slate-900)',
    marginBottom: '0.5rem',
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
  },
  dateLabel: {
    color: 'var(--slate-500)',
  },
  dateVal: {
    fontWeight: 600,
    color: 'var(--slate-700)',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
  },
  actionBtn: {
    padding: '0.65rem 1.25rem',
  },
};
