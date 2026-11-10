import { createPortal } from 'react-dom';
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

  // Saved student ID from localStorage
  const [savedId, setSavedId] = useState<string>(() => localStorage.getItem('studentId') || '');
  const [rememberDevice, setRememberDevice] = useState<boolean>(() => localStorage.getItem('rememberStudentId') === 'true');

  // Modals
  const [applyModalSeat, setApplyModalSeat] = useState<number | null>(null);
  const [modalStudentId, setModalStudentId] = useState(studentId || savedId);
  const [heldSeatModalNumber, setHeldSeatModalNumber] = useState<number | null>(null);
  const [heldModalInputId, setHeldModalInputId] = useState(studentId || savedId);
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
    const cleanId = targetStudentId.replace(/\D/g, '').slice(0, 17);
    if (cleanId.length !== 17 || !/^\d{17}$/.test(cleanId)) {
      setError(lang === 'bn' ? 'শিক্ষার্থী জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিট হতে হবে।' : 'Student ID must be exactly 17 digits.');
      return;
    }

    if (rememberDevice) {
      localStorage.setItem('studentId', cleanId);
      localStorage.setItem('rememberStudentId', 'true');
      setSavedId(cleanId);
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

  // Auto-Assign Best Available Seat
  const handleAutoAssign = () => {
    const firstAvail = seats.find(s => s.status === 'AVAILABLE');
    if (!firstAvail) {
      setError(lang === 'bn' ? 'এই শ্রেণিতে কোনো আসন খালি নেই।' : 'No seats are currently available in this class.');
      return;
    }

    if (studentId.trim().length === 17) {
      submitHold(studentId, firstAvail.seatNum);
    } else if (savedId && savedId.length === 17) {
      submitHold(savedId, firstAvail.seatNum);
    } else {
      setApplyModalSeat(firstAvail.seatNum);
      setModalStudentId(savedId || '');
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
      setError(lang === 'bn' ? `আসন #${seatIndex} ইতিমধ্যে নিশ্চিত ও ভর্তি সম্পন্ন।` : `Seat #${seatIndex} is confirmed and already admitted.`);
      return;
    }

    if (status === 'HELD') {
      setHeldSeatModalNumber(seatIndex);
      setHeldModalInputId(studentId || savedId || '');
      setHeldModalError(null);
      return;
    }

    // Available seat
    if (studentId.trim().length === 17) {
      submitHold(studentId, seatIndex);
    } else if (savedId && savedId.length === 17) {
      submitHold(savedId, seatIndex);
    } else {
      setApplyModalSeat(seatIndex);
      setModalStudentId(savedId || '');
    }
  };

  // Recover held seat
  const handleVerifyHeldSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = heldModalInputId.replace(/\D/g, '').slice(0, 17);
    if (cleanId.length !== 17 || !/^\d{17}$/.test(cleanId)) {
      setHeldModalError(lang === 'bn' ? 'অনুগ্রহ করে সঠিক ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর দিন।' : 'Please enter a valid 17-digit Birth Registration Number.');
      return;
    }

    if (rememberDevice) {
      localStorage.setItem('studentId', cleanId);
      localStorage.setItem('rememberStudentId', 'true');
      setSavedId(cleanId);
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
        setHeldModalError(lang === 'bn' ? `আইডি ${cleanId}-এর জন্য কোনো সক্রিয় হোল্ড পাওয়া যায়নি।` : `No active reservation found for ID ${cleanId} in this class.`);
      }
    } catch (err: any) {
      setHeldModalError(friendlyError(err));
    } finally {
      setHeldModalChecking(false);
    }
  };

  // Build seat grid
  const totalSeats = currentClass.totalSeats;
  const availableSeats = currentClass.availableSeats;
  const heldSeats = currentClass.heldSeats;
  const confirmedSeats = currentClass.confirmedSeats;

  const seats = Array.from({ length: totalSeats }, (_, i) => {
    const seatNum = i + 1;
    let status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' = 'AVAILABLE';
    let isUserHeld = false;

    if (userActiveHold && (userActiveHold.seatNumber === seatNum || (!userActiveHold.seatNumber && seatNum === 1))) {
      status = 'HELD';
      isUserHeld = true;
    } else if (seatNum <= confirmedSeats) {
      status = 'CONFIRMED';
    } else if (seatNum <= confirmedSeats + heldSeats) {
      status = 'HELD';
    }

    return { seatNum, status, isUserHeld };
  });

  const formatDisplayId = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 17);
    if (clean.length <= 4) return clean;
    if (clean.length <= 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    if (clean.length <= 12) return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12)}`;
  };

  const rawApplyId = modalStudentId.replace(/\D/g, '').slice(0, 17);
  const rawHeldId = heldModalInputId.replace(/\D/g, '').slice(0, 17);

  return (
    <div style={styles.container} className="animate-fade-in seat-map-container">
      {/* 3-Step Progress Stepper */}
      <div className="admission-stepper admission-stepper-responsive">
        <div className="stepper-step active">
          <span className="stepper-bubble">1</span>
          <span>{t.step1Title}</span>
        </div>
        <div className="stepper-connector" />
        <div className="stepper-step">
          <span className="stepper-bubble">2</span>
          <span>{t.step2Title}</span>
        </div>
        <div className="stepper-connector" />
        <div className="stepper-step">
          <span className="stepper-bubble">3</span>
          <span>{t.step3Title}</span>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="card hero-card-responsive" style={styles.heroCard}>
        <div style={styles.heroTopRow} className="hero-top-row-responsive">
          <button onClick={onBack} className="btn btn-outline" style={styles.backBtn} type="button">
            {t.backToClasses}
          </button>

          <div style={styles.heroTitles} className="hero-titles-responsive">
            <span style={styles.classLevelBadge}>{t.academicClass}</span>
            <h1 style={styles.heroTitle}>{currentClass.name}</h1>
          </div>

          <div style={styles.heroActionGroup}>
            {userActiveHold ? (
              <div style={styles.userHoldBanner}>
                <span style={styles.userHoldTitle}>{t.yourSeatReserved}</span>
                <p style={styles.userHoldSub}>{t.countdownRunning}</p>
                <button
                  type="button"
                  onClick={() => onViewHold(userActiveHold.holdId)}
                  className="btn btn-success"
                  style={{ width: '100%', marginTop: '0.4rem', fontSize: '0.85rem' }}
                >
                  {t.resumePaymentNow}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAutoAssign}
                disabled={availableSeats === 0 || applying}
                className="btn btn-primary hero-apply-btn-responsive"
                style={styles.heroApplyBtn}
                title={t.autoAssignTooltip}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>{applying ? t.holdingSeat : availableSeats === 0 ? t.seatFull : t.autoAssignSeat}</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Class Stat Pills */}
        <div style={styles.statPillsRow} className="stat-pills-row-responsive">
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
          <button onClick={() => setError(null)} style={styles.alertClose}>✕</button>
        </div>
      )}

      {/* Classroom Visualization Card */}
      <div className="card classroom-card-responsive" style={styles.classroomCard}>
        {/* Modern Clean Legend with Dots */}
        <div style={styles.legendRow} className="legend-row-responsive">
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
        <div style={styles.gridContainer} className="grid-container-responsive">
          <div style={styles.seatGrid} className="seat-grid-responsive">
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
      {applyModalSeat && createPortal(
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

              {savedId && savedId.length === 17 && rawApplyId !== savedId && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setModalStudentId(savedId)}
                    className="saved-id-chip"
                  >
                    <span>{t.savedIdBadge}:</span>
                    <strong>{formatDisplayId(savedId)}</strong>
                    <span style={{ textDecoration: 'underline', marginLeft: 4 }}>{t.useSavedId}</span>
                  </button>
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>{t.birthCertLabel}</label>
                <input
                  type="text"
                  maxLength={23}
                  value={formatDisplayId(modalStudentId)}
                  onChange={e => setModalStudentId(e.target.value.replace(/\D/g, '').slice(0, 17))}
                  placeholder="2015-2691-2345-67890"
                  className="formatted-id-input"
                  style={styles.modalInput}
                  autoFocus
                />
                <div style={styles.digitHint}>
                  <span>{rawApplyId.length} / 17 {t.digitsUnit}</span>
                  {rawApplyId.length === 17 && <span style={{ color: 'var(--success-dark)', fontWeight: 700 }}>{t.validIdBadge}</span>}
                </div>
              </div>

              {/* Remember on device toggle */}
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={e => setRememberDevice(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>{t.rememberOnDevice}</span>
              </label>

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
                  disabled={rawApplyId.length !== 17 || applying}
                  onClick={() => submitHold(rawApplyId, applyModalSeat)}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {applying ? t.holdingSeat : t.confirmHoldBtn}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Held Seat Recovery Modal */}
      {heldSeatModalNumber && createPortal(
        <div className="modal-backdrop" onClick={() => setHeldSeatModalNumber(null)}>
          <div className="modal-dialog animate-slide-up" onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{t.heldSeatTitle} #{heldSeatModalNumber}</h3>
                <p style={styles.modalSub}>{currentClass.name}</p>
              </div>
              <button onClick={() => setHeldSeatModalNumber(null)} style={styles.modalClose}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalDesc}>{t.heldSeatNotice}</p>

              {savedId && savedId.length === 17 && rawHeldId !== savedId && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setHeldModalInputId(savedId)}
                    className="saved-id-chip"
                  >
                    <span>{t.savedIdBadge}:</span>
                    <strong>{formatDisplayId(savedId)}</strong>
                    <span style={{ textDecoration: 'underline', marginLeft: 4 }}>{t.useSavedId}</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyHeldSeat}>
                <div style={styles.field}>
                  <label style={styles.label}>{t.birthCertLabel}</label>
                  <input
                    type="text"
                    maxLength={23}
                    value={formatDisplayId(heldModalInputId)}
                    onChange={e => setHeldModalInputId(e.target.value.replace(/\D/g, '').slice(0, 17))}
                    placeholder="2015-2691-2345-67890"
                    className="formatted-id-input"
                    style={styles.modalInput}
                    autoFocus
                  />
                  <div style={styles.digitHint}>
                    <span>{rawHeldId.length} / 17 {t.digitsUnit}</span>
                    {rawHeldId.length === 17 && <span style={{ color: 'var(--success-dark)', fontWeight: 700 }}>{t.validIdBadge}</span>}
                  </div>
                </div>

                {heldModalError && (
                  <div style={styles.modalError}>
                    <span>{heldModalError}</span>
                  </div>
                )}

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
                    disabled={rawHeldId.length !== 17 || heldModalChecking}
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                  >
                    {heldModalChecking ? t.verifying : t.verifyResumeBtn}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '1.25rem 1rem',
  },
  heroCard: {
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  heroTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  backBtn: {
    padding: '0.45rem 0.85rem',
    fontSize: '0.825rem',
    borderRadius: 'var(--radius-md)',
  },
  heroTitles: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    flex: '1 1 auto',
    minWidth: 0,
  },
  classLevelBadge: {
    fontSize: '0.725rem',
    fontWeight: 700,
    color: 'var(--primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  heroTitle: {
    fontSize: '1.45rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  heroActionGroup: {
    flexShrink: 0,
  },
  heroApplyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.55rem',
    padding: '0.65rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(30, 107, 184, 0.3)',
  },
  userHoldBanner: {
    background: 'var(--warning-light)',
    border: '1.5px solid var(--warning-border)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-lg)',
    textAlign: 'center',
    maxWidth: 280,
  },
  userHoldTitle: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 800,
    color: 'var(--warning-dark)',
  },
  userHoldSub: {
    fontSize: '0.725rem',
    color: 'var(--slate-600)',
    margin: '2px 0 0',
  },
  statPillsRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    borderTop: '1px solid var(--slate-100)',
    paddingTop: '1rem',
  },
  statPillItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    padding: '0.35rem 0.85rem',
    borderRadius: 'var(--radius-full)',
  },
  statPillLabel: {
    fontSize: '0.725rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
  },
  statPillVal: {
    fontSize: '0.9rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-800)',
  },
  errorAlert: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.25rem',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  alertClose: {
    background: 'none',
    border: 'none',
    color: 'var(--danger-dark)',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  classroomCard: {
    padding: '1.5rem',
  },
  legendRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
    fontSize: '0.825rem',
    color: 'var(--slate-600)',
    fontWeight: 600,
  },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    display: 'inline-block',
  },
  gridContainer: {
    overflowX: 'auto',
    padding: '0.5rem 0 1rem',
  },
  seatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
    gap: '0.5rem',
    minWidth: 320,
    margin: '0 auto',
  },
  youBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    background: '#d97706',
    color: '#ffffff',
    fontSize: '0.55rem',
    fontWeight: 800,
    padding: '1px 3px',
    borderRadius: 3,
    letterSpacing: '0.2px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--slate-100)',
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
    margin: '2px 0 0',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    color: 'var(--slate-400)',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '1.25rem 1.5rem',
  },
  modalDesc: {
    fontSize: '0.825rem',
    color: 'var(--slate-600)',
    lineHeight: 1.5,
    marginBottom: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    marginBottom: '0.85rem',
  },
  label: {
    fontSize: '0.775rem',
    fontWeight: 700,
    color: 'var(--slate-700)',
  },
  modalInput: {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--slate-300)',
    outline: 'none',
  },
  digitHint: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.725rem',
    color: 'var(--slate-500)',
    fontFamily: 'var(--font-mono)',
    marginTop: 2,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.775rem',
    color: 'var(--slate-600)',
    cursor: 'pointer',
    marginBottom: '1.25rem',
    userSelect: 'none',
  },
  checkbox: {
    cursor: 'pointer',
    width: 15,
    height: 15,
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.75rem',
  },
  modalError: {
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: '0.85rem',
  },
};
