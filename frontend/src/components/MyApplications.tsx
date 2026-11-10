import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { MyHold } from '../types';
import { Language, translations } from '../i18n';
import { AdmissionSlipModal } from './AdmissionSlipModal';

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
  const [rememberOnDevice, setRememberOnDevice] = useState(true);
  const [holds, setHolds] = useState<MyHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  // Slip modal state
  const [selectedSlipHold, setSelectedSlipHold] = useState<MyHold | null>(null);

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

  const formatDisplayId = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 17);
    if (clean.length <= 4) return clean;
    if (clean.length <= 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    if (clean.length <= 12) return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12)}`;
  };

  const rawSearchId = searchIdInput.replace(/\D/g, '').slice(0, 17);

  if (!studentId) {
    return (
      <div style={styles.container} className="animate-fade-in">
        <div style={styles.warnCard} className="card">
          <h3 style={styles.warnTitle}>{t.findApplicationsTitle}</h3>
          <p style={styles.warnText}>{t.findApplicationsNotice}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (rawSearchId.length === 17 && onUpdateStudentId) {
                if (rememberOnDevice) {
                  localStorage.setItem('studentId', rawSearchId);
                  localStorage.setItem('rememberStudentId', 'true');
                }
                onUpdateStudentId(rawSearchId);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 440, width: '100%', margin: '1.25rem auto 0' }}
          >
            <input
              type="text"
              maxLength={23}
              value={formatDisplayId(searchIdInput)}
              onChange={(e) => setSearchIdInput(e.target.value.replace(/\D/g, '').slice(0, 17))}
              placeholder="2015-2691-2345-67890"
              className="formatted-id-input"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1.5px solid var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
              }}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--slate-600)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberOnDevice}
                  onChange={e => setRememberOnDevice(e.target.checked)}
                />
                <span>{t.rememberOnDevice}</span>
              </label>

              <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontFamily: 'var(--font-mono)' }}>
                {rawSearchId.length} / 17 {t.digitsUnit}
              </span>
            </div>

            <button
              type="submit"
              disabled={rawSearchId.length !== 17}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.25rem', width: '100%' }}
            >
              {t.searchApplicationsBtn}
            </button>
          </form>
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
          <h1 style={styles.title}>{t.myAppsTab}</h1>
          <p style={styles.subtitle}>
            {t.studentIdentity}: <code style={styles.idCode}>{formatDisplayId(studentId)}</code>
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
                {t.switchStudentId}
              </button>
            )}
          </p>
        </div>

        {/* Quick Stat Chips */}
        <div style={styles.chipsRow}>
          <div style={styles.chip}>
            <span style={styles.chipNum}>{holds.length}</span>
            <span style={styles.chipText}>{t.totalChip}</span>
          </div>
          <div style={styles.chip}>
            <span style={{ ...styles.chipNum, color: 'var(--warning-dark)' }}>{heldCount}</span>
            <span style={styles.chipText}>{t.activeHoldsChip}</span>
          </div>
          <div style={styles.chip}>
            <span style={{ ...styles.chipNum, color: 'var(--success-dark)' }}>{confirmedCount}</span>
            <span style={styles.chipText}>{t.confirmedChip}</span>
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
                background: filter === f ? 'var(--primary)' : '#fff',
                color: filter === f ? '#fff' : 'var(--slate-600)',
                borderColor: filter === f ? 'transparent' : 'var(--slate-200)',
              }}
              type="button"
            >
              {f === 'ALL'
                ? `${t.filterAll} (${holds.length})`
                : f === 'HELD'
                ? `${t.filterActiveHolds} (${heldCount})`
                : f === 'CONFIRMED'
                ? `${t.filterConfirmedOnly} (${confirmedCount})`
                : t.filterPast}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {holds.length === 0 && (
        <div style={styles.emptyState} className="card">
          <h3 style={styles.emptyTitle}>{t.noAppsFound}</h3>
          {onGoToClasses && (
            <button onClick={onGoToClasses} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {t.classesTab} →
            </button>
          )}
        </div>
      )}

      {/* Filtered Empty State */}
      {holds.length > 0 && filtered.length === 0 && (
        <div style={styles.emptyState} className="card">
          <h3 style={styles.emptyTitle}>{t.noAppsFound}</h3>
          <button onClick={() => setFilter('ALL')} className="btn btn-outline" style={{ marginTop: '0.75rem' }}>
            {t.filterAll}
          </button>
        </div>
      )}

      {/* Cards Table List */}
      {filtered.length > 0 && (
        <div style={styles.list}>
          {filtered.map((h, idx) => {
            const isHeld = h.status === 'HELD';
            const isConfirmed = h.status === 'CONFIRMED';
            const isExpired = h.status === 'EXPIRED';

            const statusStyle = isConfirmed
              ? { bg: 'var(--success-light)', color: 'var(--success-dark)', border: 'var(--success-border)', label: t.confirmed }
              : isHeld
              ? { bg: 'var(--warning-light)', color: 'var(--warning-dark)', border: 'var(--warning-border)', label: t.held }
              : isExpired
              ? { bg: 'var(--danger-light)', color: 'var(--danger-dark)', border: 'var(--danger-border)', label: 'Expired' }
              : { bg: 'var(--slate-100)', color: 'var(--slate-600)', border: 'var(--slate-300)', label: 'Cancelled' };

            return (
              <div
                key={h.holdId}
                className="card card-interactive"
                style={styles.card}
                onClick={() => onViewHold(h.holdId)}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <span style={styles.classLabel}>{t.academicClass}</span>
                    <h3 style={styles.className}>{h.className}</h3>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      borderColor: statusStyle.border,
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.cardRow}>
                    <span style={styles.cardProp}>{t.assignedSeat}</span>
                    <strong style={{ ...styles.cardVal, color: 'var(--primary)' }}>
                      Seat #{h.seatNumber || (idx + 1)}
                    </strong>
                  </div>

                  <div style={styles.cardRow}>
                    <span style={styles.cardProp}>{t.holdReferenceId}</span>
                    <code style={styles.holdCode}>{h.holdId.slice(0, 12)}...</code>
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  {isHeld ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHold(h.holdId);
                      }}
                      className="btn btn-primary"
                      style={{ ...styles.actionBtn, background: 'var(--warning-dark)' }}
                      type="button"
                    >
                      {t.completePaymentBtn}
                    </button>
                  ) : isConfirmed ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSlipHold(h);
                      }}
                      className="btn btn-primary"
                      style={{ ...styles.actionBtn, background: 'var(--success-dark)' }}
                      type="button"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                      </svg>
                      {t.viewAdmissionSlip}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHold(h.holdId);
                      }}
                      className="btn btn-outline"
                      style={styles.actionBtn}
                      type="button"
                    >
                      {t.viewAdmissionDetails}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admission Slip Modal */}
      {selectedSlipHold && (
        <AdmissionSlipModal
          hold={{
            holdId: selectedSlipHold.holdId,
            studentId: studentId,
            classId: selectedSlipHold.classId,
            seatNumber: selectedSlipHold.seatNumber || 1,
            confirmedAt: selectedSlipHold.confirmedAt,
            createdAt: selectedSlipHold.createdAt,
          }}
          className={selectedSlipHold.className}
          studentId={studentId}
          studentName={
            localStorage.getItem('studentName_' + selectedSlipHold.holdId) ||
            localStorage.getItem('studentName_default') ||
            ''
          }
          lang={lang}
          onClose={() => setSelectedSlipHold(null)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1040,
    margin: '0 auto',
    padding: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '1.65rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--slate-500)',
    marginTop: '0.35rem',
  },
  idCode: {
    fontFamily: 'var(--font-mono)',
    background: 'var(--slate-100)',
    color: 'var(--primary)',
    fontWeight: 800,
    padding: '0.15rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
  },
  chipsRow: {
    display: 'flex',
    gap: '0.65rem',
    flexWrap: 'wrap',
  },
  chip: {
    background: '#ffffff',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '0.45rem 0.9rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
    minWidth: 70,
  },
  chipNum: {
    fontSize: '1.2rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-900)',
    lineHeight: 1,
  },
  chipText: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--slate-500)',
    marginTop: '0.2rem',
  },
  filterBar: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '0.45rem 0.85rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  warnCard: {
    maxWidth: 480,
    margin: '3rem auto',
    padding: '2rem',
    textAlign: 'center',
  },
  warnTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    margin: '0 0 0.5rem',
  },
  warnText: {
    fontSize: '0.875rem',
    color: 'var(--slate-600)',
    lineHeight: 1.5,
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
  },
  emptyTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--slate-800)',
    margin: 0,
  },
  list: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.25rem',
  },
  card: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  classLabel: {
    fontSize: '0.675rem',
    color: 'var(--slate-500)',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  className: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    margin: '0.15rem 0 0',
  },
  statusBadge: {
    fontSize: '0.725rem',
    fontWeight: 800,
    padding: '0.2rem 0.55rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    borderTop: '1px solid var(--slate-100)',
    paddingTop: '0.75rem',
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.825rem',
  },
  cardProp: {
    color: 'var(--slate-500)',
    fontWeight: 500,
  },
  cardVal: {
    fontWeight: 700,
  },
  holdCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--slate-600)',
    background: 'var(--slate-50)',
    padding: '0.1rem 0.35rem',
    borderRadius: 3,
  },
  cardFooter: {
    borderTop: '1px solid var(--slate-100)',
    paddingTop: '0.75rem',
  },
  actionBtn: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.825rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    background: 'var(--danger-light)',
    color: 'var(--danger-dark)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
};
