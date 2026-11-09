import React, { useState, useEffect } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { ClassInfo, MyHold } from '../types';
import { Language, translations } from '../i18n';

interface ClassSeatMapProps {
  classInfo: ClassInfo;
  studentId: string;
  lang?: Language;
  onBack: () => void;
  onApplied: (holdId: string) => void;
  onViewHold: (holdId: string) => void;
  onUpdateStudentId: (id: string) => void;
}

export function ClassSeatMap({
  classInfo,
  studentId,
  lang = 'en',
  onBack,
  onApplied,
  onViewHold,
  onUpdateStudentId,
}: ClassSeatMapProps) {
  const t = translations[lang] || translations.en;
  const [currentClass, setCurrentClass] = useState<ClassInfo>(classInfo);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User's active hold in this class
  const [userActiveHold, setUserActiveHold] = useState<MyHold | null>(null);

  // Modals
  const [applyModalSeat, setApplyModalSeat] = useState<number | null>(null);
  const [modalStudentId, setModalStudentId] = useState(studentId);
  const [heldSeatModalNumber, setHeldSeatModalNumber] = useState<number | null>(null);
  const [heldModalInputId, setHeldModalInputId] = useState(studentId);
  const [heldModalError, setHeldModalError] = useState<string | null>(null);
  const [heldModalChecking, setHeldModalChecking] = useState(false);

  // Poll class info every 3 seconds to keep seat state live
  const refreshClass = async () => {
    try {
      const data: ClassInfo = await apiFetch(`/classes/${classInfo.id}`);
      setCurrentClass(data);
    } catch {
      // ignore poll errors
    }
  };

  // Check if current student has an active hold
  const checkUserHold = async () => {
    if (studentId.trim().length === 17) {
      try {
        const holds: MyHold[] = await apiFetch('/me/holds', {
          headers: { 'X-Student-Id': studentId.trim() },
        });
        const match = holds.find(h => h.classId === classInfo.id && h.status === 'HELD');
        setUserActiveHold(match || null);
      } catch {
        setUserActiveHold(null);
      }
    } else {
      setUserActiveHold(null);
    }
  };

  useEffect(() => {
    refreshClass();
    checkUserHold();
    const interval = setInterval(refreshClass, 3000);
    return () => clearInterval(interval);
  }, [classInfo.id, studentId]);

  // Execute hold API
  const submitHold = async (targetStudentId: string, _seatNum?: number) => {
    const cleanId = targetStudentId.trim();
    if (cleanId.length !== 17 || !/^\d{17}$/.test(cleanId)) {
      setError('Student ID must be exactly 17 digits.');
      return;
    }

    setApplying(true);
    setError(null);
    try {
      const res = await apiFetch(`/classes/${classInfo.id}/holds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': cleanId,
        },
      });
      onUpdateStudentId(cleanId);
      setApplyModalSeat(null);
      onApplied(res.holdId);
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setApplying(false);
    }
  };

  // Click on a seat
  const handleSeatClick = (seatIndex: number, status: 'AVAILABLE' | 'HELD' | 'CONFIRMED', isUserHeld: boolean) => {
    setError(null);
    if (isUserHeld && userActiveHold) {
      onViewHold(userActiveHold.holdId);
      return;
    }

    if (status === 'CONFIRMED') {
      setError(`Seat #${seatIndex} is confirmed and already admitted.`);
      return;
    }

    if (status === 'HELD') {
      setHeldSeatModalNumber(seatIndex);
      setHeldModalInputId(studentId || '');
      setHeldModalError(null);
      return;
    }

    // Available seat
    if (studentId.trim().length === 17) {
      submitHold(studentId, seatIndex);
    } else {
      setApplyModalSeat(seatIndex);
      setModalStudentId(studentId);
    }
  };

  // Recover held seat
  const handleVerifyHeldSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = heldModalInputId.trim();
    if (cleanId.length !== 17 || !/^\d{17}$/.test(cleanId)) {
      setHeldModalError('Please enter a valid 17-digit Birth Registration Number.');
      return;
    }

    setHeldModalChecking(true);
    setHeldModalError(null);
    try {
      const holds: MyHold[] = await apiFetch('/me/holds', {
        headers: { 'X-Student-Id': cleanId },
      });
      const activeMatch = holds.find(h => h.classId === classInfo.id && h.status === 'HELD');
      if (activeMatch) {
        onUpdateStudentId(cleanId);
        setHeldSeatModalNumber(null);
        onViewHold(activeMatch.holdId);
      } else {
        setHeldModalError(`No active reservation found for ID ${cleanId} in this class.`);
      }
    } catch (err: any) {
      setHeldModalError(friendlyError(err));
    } finally {
      setHeldModalChecking(false);
    }
  };

  // Generate seat map
  const { totalSeats, confirmedSeats, heldSeats, availableSeats } = currentClass;

  const seats = Array.from({ length: totalSeats }, (_, i) => {
    const seatNum = i + 1;
    let status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' = 'AVAILABLE';
    if (seatNum <= confirmedSeats) {
      status = 'CONFIRMED';
    } else if (seatNum <= confirmedSeats + heldSeats) {
      status = 'HELD';
    } else {
      status = 'AVAILABLE';
    }

    const isUserHeld = Boolean(userActiveHold && status === 'HELD' && seatNum === confirmedSeats + 1);
    return { seatNum, status, isUserHeld };
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Navigation */}
      <div style={styles.topNav}>
        <button onClick={onBack} className="btn btn-outline" style={styles.backBtn} type="button">
          {t.backToClasses}
        </button>
      </div>

      {/* Class Hero Banner */}
      <div className="card" style={styles.heroCard}>
        <div style={styles.heroContent}>
          <div>
            <div style={styles.shiftBadgeRow}>
              <span style={styles.classLevelBadge}>{t.academicClass}</span>
            </div>
            <h1 style={styles.heroTitle}>{currentClass.name}</h1>
          </div>

          <div style={styles.heroRight}>
            {userActiveHold ? (
              <div style={styles.userHoldBanner}>
                <span style={styles.userHoldTitle}>{t.yourSeatReserved}</span>
                <p style={styles.userHoldSub}>{t.countdownRunning}</p>
                <button
                  type="button"
                  onClick={() => onViewHold(userActiveHold.holdId)}
                  className="btn btn-success"
                  style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.85rem' }}
                >
                  {t.resumePaymentNow}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (studentId.trim().length === 17) submitHold(studentId);
                  else setApplyModalSeat(1);
                }}
                disabled={availableSeats === 0 || applying}
                className="btn btn-primary"
                style={styles.heroApplyBtn}
              >
                {applying ? t.holdingSeat : availableSeats === 0 ? t.seatFull : t.applyForAvailableSeat}
              </button>
            )}
          </div>
        </div>

        {/* Global Class Stat Pills */}
        <div style={styles.statPillsRow}>
          <div style={styles.statPillItem}>
            <span style={styles.statPillLabel}>{t.total}</span>
            <span style={styles.statPillVal}>{totalSeats}</span>
          </div>
          <div style={{ ...styles.statPillItem, background: 'var(--seat-avail-bg)', borderColor: 'var(--seat-avail-border)' }}>
            <span style={{ ...styles.statPillLabel, color: 'var(--primary)' }}>{t.available}</span>
            <span style={{ ...styles.statPillVal, color: 'var(--primary)' }}>{availableSeats}</span>
          </div>
          <div style={{ ...styles.statPillItem, background: 'var(--seat-held-bg)', borderColor: 'var(--seat-held-border)' }}>
            <span style={{ ...styles.statPillLabel, color: 'var(--warning-dark)' }}>{t.held}</span>
            <span style={{ ...styles.statPillVal, color: 'var(--warning-dark)' }}>{heldSeats}</span>
          </div>
          <div style={{ ...styles.statPillItem, background: 'var(--seat-conf-bg)', borderColor: 'var(--seat-conf-border)' }}>
            <span style={{ ...styles.statPillLabel, color: 'var(--success-dark)' }}>{t.confirmed}</span>
            <span style={{ ...styles.statPillVal, color: 'var(--success-dark)' }}>{confirmedSeats}</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={styles.errorAlert} className="animate-fade-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} style={styles.alertClose}>Cancel</button>
        </div>
      )}

      {/* Classroom Visualization Card without blackboard */}
      <div className="card" style={styles.classroomCard}>
        {/* Modern Clean Legend with Dots (No Emojis) */}
        <div style={styles.legendRow}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: 'var(--primary)' }} />
            <span>{t.legendAvailable}</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: 'var(--warning-dark)' }} />
            <span>{t.legendHeld}</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: 'var(--success-dark)' }} />
            <span>{t.legendConfirmed}</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#f59e0b', boxShadow: '0 0 0 2px #d97706' }} />
            <span>{t.legendUserHeld}</span>
          </div>
        </div>

        {/* Responsive Seat Grid */}
        <div style={styles.gridContainer}>
          <div style={styles.seatGrid}>
            {seats.map(({ seatNum, status, isUserHeld }) => (
              <button
                key={seatNum}
                type="button"
                onClick={() => handleSeatClick(seatNum, status, isUserHeld)}
                className={`seat-button ${status.toLowerCase()} ${isUserHeld ? 'user-held' : ''}`}
                title={`Seat #${seatNum} - ${status}`}
              >
                <span style={{ fontSize: '0.8rem' }}>{seatNum}</span>
                {isUserHeld && <span style={styles.youBadge}>{lang === 'bn' ? 'আপনি' : 'YOU'}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {applyModalSeat && (
        <div className="modal-backdrop" onClick={() => setApplyModalSeat(null)}>
          <div className="modal-dialog animate-slide-up" onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{t.reserveSeatTitle} #{applyModalSeat}</h3>
                <p style={styles.modalSub}>{currentClass.name}</p>
              </div>
              <button onClick={() => setApplyModalSeat(null)} style={styles.modalClose}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalDesc}>{t.reserveNotice}</p>
              <div style={styles.field}>
                <label style={styles.label}>{t.birthCertLabel}</label>
                <input
                  type="text"
                  maxLength={17}
                  value={modalStudentId}
                  onChange={e => setModalStudentId(e.target.value.replace(/\D/g, ''))}
                  placeholder="20152691234567890"
                  style={styles.modalInput}
                  autoFocus
                />
                <div style={styles.digitHint}>
                  <span>{modalStudentId.length} / 17 {t.digitsUnit}</span>
                  {modalStudentId.length === 17 && <span style={{ color: 'var(--success-dark)' }}>{t.validIdBadge}</span>}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setApplyModalSeat(null)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="button"
                  disabled={modalStudentId.length !== 17 || applying}
                  onClick={() => submitHold(modalStudentId, applyModalSeat)}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {applying ? t.holdingSeat : t.confirmHoldBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Held Seat Recovery Modal */}
      {heldSeatModalNumber && (
        <div className="modal-backdrop" onClick={() => setHeldSeatModalNumber(null)}>
          <div className="modal-dialog animate-slide-up" onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{t.heldSeatTitle} #{heldSeatModalNumber}</h3>
                <p style={styles.modalSub}>{currentClass.name}</p>
              </div>
              <button onClick={() => setHeldSeatModalNumber(null)} style={styles.modalClose}>✕</button>
            </div>

            <form onSubmit={handleVerifyHeldSeat} style={styles.modalBody}>
              <p style={styles.modalDesc}>{t.heldSeatNotice}</p>

              {heldModalError && (
                <div style={styles.modalAlert}>{heldModalError}</div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>{t.birthCertLabel}</label>
                <input
                  type="text"
                  maxLength={17}
                  value={heldModalInputId}
                  onChange={e => setHeldModalInputId(e.target.value.replace(/\D/g, ''))}
                  placeholder="20152691234567890"
                  style={styles.modalInput}
                  autoFocus
                />
                <div style={styles.digitHint}>
                  <span>{heldModalInputId.length} / 17 {t.digitsUnit}</span>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setHeldSeatModalNumber(null)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={heldModalInputId.length !== 17 || heldModalChecking}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {heldModalChecking ? t.verifying : t.verifyResumeBtn}
                </button>
              </div>
            </form>
          </div>
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
  topNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  backBtn: {
    padding: '0.45rem 0.9rem',
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  heroCard: {
    padding: '1.5rem',
    marginBottom: '1.25rem',
    background: '#ffffff',
  },
  heroContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.25rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  shiftBadgeRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '0.35rem',
  },
  classLevelBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    background: 'var(--primary-light)',
    color: 'var(--primary)',
    padding: '0.2rem 0.6rem',
    borderRadius: 'var(--radius-full)',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: '1.65rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  heroRight: {
    minWidth: 240,
  },
  heroApplyBtn: {
    padding: '0.75rem 1.25rem',
    fontSize: '0.95rem',
    width: '100%',
  },
  userHoldBanner: {
    background: 'var(--warning-light)',
    border: '1px solid var(--warning-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem 1rem',
  },
  userHoldTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--warning-dark)',
    display: 'block',
  },
  userHoldSub: {
    fontSize: '0.75rem',
    color: 'var(--slate-600)',
    marginTop: '0.15rem',
  },
  statPillsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '0.65rem',
    borderTop: '1px solid var(--slate-100)',
    paddingTop: '1rem',
  },
  statPillItem: {
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '0.6rem 0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  statPillLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
  },
  statPillVal: {
    fontSize: '1.25rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-900)',
  },
  errorAlert: {
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  alertClose: {
    background: 'none',
    border: 'none',
    color: 'var(--danger-dark)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  classroomCard: {
    padding: '1.5rem',
    background: '#ffffff',
  },
  legendRow: {
    display: 'flex',
    gap: '1.25rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--slate-100)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    fontSize: '0.8rem',
    color: 'var(--slate-600)',
    fontWeight: 600,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
  },
  gridContainer: {
    overflowX: 'auto',
    paddingBottom: '0.5rem',
  },
  seatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
    gap: '0.65rem',
    minWidth: '260px',
  },
  youBadge: {
    fontSize: '0.55rem',
    fontWeight: 800,
    lineHeight: 1,
    marginTop: '0.1rem',
    color: '#b45309',
  },
  modalHeader: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--slate-200)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--slate-50)',
  },
  modalTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    margin: 0,
  },
  modalSub: {
    fontSize: '0.8rem',
    color: 'var(--slate-500)',
    marginTop: '0.15rem',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    color: 'var(--slate-400)',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  modalDesc: {
    fontSize: '0.875rem',
    color: 'var(--slate-600)',
    lineHeight: 1.5,
  },
  modalAlert: {
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.825rem',
    fontWeight: 700,
    color: 'var(--slate-700)',
  },
  modalInput: {
    padding: '0.75rem 0.9rem',
    border: '1px solid var(--slate-300)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.95rem',
    letterSpacing: '0.5px',
    outline: 'none',
  },
  digitHint: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--slate-400)',
    fontFamily: 'var(--font-mono)',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
};
