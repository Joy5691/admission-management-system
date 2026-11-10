import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { Hold } from '../types';
import { CountdownTimer } from './CountdownTimer';
import { AdmissionSlipModal } from './AdmissionSlipModal';
import { Language, translations } from '../i18n';

interface Props {
  holdId: string;
  studentId: string;
  lang?: Language;
  onBack: () => void;
}

type Status = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
type PaymentChannel = 'bkash' | 'nagad' | 'rocket' | 'card';

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; color: string; border: string; bannerText: string }
> = {
  HELD: {
    label: 'HELD',
    bg: 'var(--warning-light)',
    color: 'var(--warning-dark)',
    border: 'var(--warning-border)',
    bannerText: 'Seat is temporarily reserved in your name. Complete payment before the countdown expires to confirm your admission.',
  },
  CONFIRMED: {
    label: 'Admission Confirmed',
    bg: 'var(--success-light)',
    color: 'var(--success-dark)',
    border: 'var(--success-border)',
    bannerText: 'Payment successful! Your admission seat has been permanently locked and confirmed.',
  },
  EXPIRED: {
    label: 'Hold Expired',
    bg: 'var(--danger-light)',
    color: 'var(--danger-dark)',
    border: 'var(--danger-border)',
    bannerText: 'The hold duration has elapsed. This seat has been automatically released back to the general pool.',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'var(--slate-100)',
    color: 'var(--slate-600)',
    border: 'var(--slate-300)',
    bannerText: 'This application was cancelled by the student. The seat has been returned to the available seats pool.',
  },
};

function playWarningChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Graceful fallback
  }
}

export function ApplicationDetail({ holdId, studentId, lang = 'en', onBack }: Props) {
  const t = translations[lang] || translations.en;
  const [hold, setHold] = useState<Hold | null>(null);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localExpired, setLocalExpired] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // New Features: MFS Channel, Expiry Chime, Admission Slip Modal
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel>('bkash');
  const [showSlip, setShowSlip] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const chimePlayedRef = useRef(false);

  // Student Full Name State
  const studentNameKey = 'studentName_' + holdId;
  const [studentName, setStudentName] = useState<string>(() => {
    return localStorage.getItem('studentName_' + holdId) || localStorage.getItem('studentName_default') || '';
  });
  const [studentNameInput, setStudentNameInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameSavedFeedback, setNameSavedFeedback] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(studentNameKey) || localStorage.getItem('studentName_default') || '';
    if (saved) {
      setStudentName(saved);
      setStudentNameInput(saved);
    }
  }, [studentNameKey]);

  const handleSaveStudentName = (nameToSave?: string) => {
    const val = (nameToSave !== undefined ? nameToSave : studentNameInput).trim();
    if (!val) return;
    setStudentName(val);
    setStudentNameInput(val);
    setIsEditingName(false);
    localStorage.setItem(studentNameKey, val);
    localStorage.setItem('studentName_default', val);
    setNameSavedFeedback(true);
    setTimeout(() => setNameSavedFeedback(false), 2500);
  };

  const fetchHold = useCallback(async () => {
    try {
      const data: Hold & { className?: string } = await apiFetch(`/holds/${holdId}`, {
        headers: studentId ? { 'X-Student-Id': studentId } : {},
      });
      setHold(data);
      if (data.className) setClassName(data.className);
      setError('');
      if (data.status !== 'HELD') setLocalExpired(false);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [holdId, studentId]);

  useEffect(() => {
    fetchHold();
    const id = setInterval(fetchHold, 3000);
    return () => clearInterval(id);
  }, [fetchHold]);

  const effectiveStatus: Status =
    localExpired && hold?.status === 'HELD' ? 'EXPIRED' : ((hold?.status || 'HELD') as Status);
  const isTerminal =
    effectiveStatus === 'CONFIRMED' || effectiveStatus === 'EXPIRED' || effectiveStatus === 'CANCELLED';

  // Check for 2-minute urgent warning
  const handleSecondsChange = (sec: number) => {
    setRemainingSec(sec);
    if (sec > 0 && sec <= 120 && !chimePlayedRef.current && effectiveStatus === 'HELD') {
      chimePlayedRef.current = true;
      playWarningChime();
    }
  };

  const handlePay = async () => {
    if (!hold || isTerminal) return;
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/holds/${holdId}/confirm`, {
        method: 'POST',
        headers: studentId ? { 'X-Student-Id': studentId } : {},
      });
      setSuccessMsg(lang === 'bn' ? 'পেমেন্ট সফল! আপনার ভর্তি নিশ্চিত করা হয়েছে।' : 'Payment received! Admission confirmed.');
      await fetchHold();
      setShowSlip(true); // Automatically open the official admission slip upon confirmation!
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!hold || isTerminal) return;
    const confirmMsg = lang === 'bn'
      ? 'আপনি কি নিশ্চিত যে এই আবেদনটি বাতিল করতে চান? আসনটি তাৎক্ষণিকভাবে উন্মুক্ত হয়ে যাবে।'
      : 'Are you sure you want to cancel this reservation? The seat will be released immediately.';
    if (!window.confirm(confirmMsg)) {
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/holds/${holdId}`, {
        method: 'DELETE',
        headers: studentId ? { 'X-Student-Id': studentId } : {},
      });
      onBack();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(holdId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.HELD;

  const rawStudentId = studentId || hold?.studentId || '';
  const formattedStudentId = rawStudentId.length === 17
    ? `${rawStudentId.slice(0, 4)}-${rawStudentId.slice(4, 8)}-${rawStudentId.slice(8, 12)}-${rawStudentId.slice(12)}`
    : rawStudentId || '—';

  const isUrgentTwoMin = remainingSec !== null && remainingSec > 0 && remainingSec <= 120 && effectiveStatus === 'HELD';

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="skeleton" style={{ height: 40, width: 200, margin: '0 auto 1.5rem' }} />
          <div className="skeleton" style={{ height: 200, width: '100%', maxWidth: 640, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* 3-Step Progress Stepper */}
      <div className="admission-stepper">
        <div className="stepper-step completed">
          <span className="stepper-bubble">✓</span>
          <span>{t.step1Title}</span>
        </div>
        <div className="stepper-connector completed" />
        <div className={`stepper-step ${effectiveStatus === 'HELD' ? 'active' : 'completed'}`}>
          <span className="stepper-bubble">{effectiveStatus === 'HELD' ? '2' : '✓'}</span>
          <span>{t.step2Title}</span>
        </div>
        <div className={`stepper-connector ${effectiveStatus === 'CONFIRMED' ? 'completed' : ''}`} />
        <div className={`stepper-step ${effectiveStatus === 'CONFIRMED' ? 'active completed' : ''}`}>
          <span className="stepper-bubble">3</span>
          <span>{t.step3Title}</span>
        </div>
      </div>

      {/* Top Breadcrumb Nav */}
      <div style={styles.topNavRow}>
        <button onClick={onBack} style={styles.backBtn} type="button">
          {lang === 'bn' ? '← ফিরে যান' : '← Back'}
        </button>

        {effectiveStatus === 'CONFIRMED' && (
          <button
            type="button"
            onClick={() => setShowSlip(true)}
            className="btn btn-primary"
            style={styles.headerSlipBtn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>{t.downloadSlipBtn}</span>
          </button>
        )}
      </div>

      {/* 2-Minute Urgent Warning Alert */}
      {isUrgentTwoMin && (
        <div className="urgent-expiry-box" style={styles.urgentWarningAlert}>
          <span style={styles.urgentDot} />
          <span>{t.twoMinWarning}</span>
        </div>
      )}

      {/* Main Container Card */}
      <div className="card" style={styles.mainCard}>
        {/* Status Hero Banner */}
        <div style={{ ...styles.heroBanner, background: config.bg, borderColor: config.border }}>
          <div style={styles.heroHeader}>
            <div style={styles.heroStatus}>
              <div>
                <span style={{ ...styles.heroBadge, color: config.color }}>{config.label}</span>
                <p style={styles.heroDesc}>{config.bannerText}</p>
              </div>
            </div>

            {effectiveStatus === 'HELD' && hold?.expiresAt && (
              <div style={styles.timerBox}>
                <CountdownTimer
                  expiresAt={hold.expiresAt}
                  onExpired={() => setLocalExpired(true)}
                  onSecondsChange={handleSecondsChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div style={styles.errorAlert}>
            <span style={styles.alertDotDanger} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={styles.successAlert}>
            <span style={styles.alertDotSuccess} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Application Details Body */}
        {hold && (
          <div style={styles.detailsBody}>
            {className && (
              <div style={styles.classBanner}>
                <span style={styles.metaLabel}>{t.academicClass}</span>
                <h2 style={styles.classTitle}>{className}</h2>
              </div>
            )}

            <div style={styles.infoGrid}>
              <div style={styles.infoCell}>
                <span style={styles.cellLabel}>{t.holdReferenceId}</span>
                <div style={styles.copyRow}>
                  <code style={styles.codeText}>{hold.holdId}</code>
                  <button onClick={handleCopyId} style={styles.copyBtn} type="button">
                    {copied ? (lang === 'bn' ? 'কপি হয়েছে' : '✓ Copied') : (lang === 'bn' ? 'কপি' : 'Copy')}
                  </button>
                </div>
              </div>

              <div style={styles.infoCell}>
                <span style={styles.cellLabel}>{t.studentIdentity}</span>
                <code style={styles.codeTextMono}>{formattedStudentId}</code>
              </div>

              <div style={styles.infoCell}>
                <span style={styles.cellLabel}>{t.applicationStatus}</span>
                <span style={{ ...styles.statusTag, color: config.color }}>
                  {effectiveStatus}
                </span>
              </div>

              <div style={styles.infoCell}>
                <span style={styles.cellLabel}>{t.assignedSeat}</span>
                <div style={styles.seatPill}>
                  <span style={styles.seatVal}>Seat #{hold.seatNumber || 1}</span>
                </div>
              </div>

              {hold.expiresAt && effectiveStatus === 'HELD' && (
                <div style={styles.infoCell}>
                  <span style={styles.cellLabel}>{t.expirationTimestamp}</span>
                  <span style={styles.dateText}>
                    {new Date(hold.expiresAt).toLocaleTimeString()} ({new Date(hold.expiresAt).toLocaleDateString()})
                  </span>
                </div>
              )}
            </div>

            {/* If Confirmed: Student Full Name Entry */}
            {effectiveStatus === 'CONFIRMED' && (
              <div style={styles.nameEntryCard}>
                <div style={styles.nameEntryHeader}>
                  <div>
                    <h3 style={styles.nameEntryTitle}>{t.studentNameLabel}</h3>
                    <p style={styles.nameEntrySub}>
                      {lang === 'bn'
                        ? 'ভর্তি রশিদ ও স্কুল রেজিস্ট্রেশন রেকর্ডের জন্য শিক্ষার্থীর নাম প্রদান করুন।'
                        : 'Provide the student full name for the official admission confirmation slip.'}
                    </p>
                  </div>
                  {studentName && !isEditingName && (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentNameInput(studentName);
                        setIsEditingName(true);
                      }}
                      className="btn btn-outline"
                      style={styles.editNameBtnSmall}
                    >
                      ✎ {t.editStudentNameBtn}
                    </button>
                  )}
                </div>

                {(!studentName || isEditingName) ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveStudentName();
                    }}
                    style={styles.nameFormRow}
                  >
                    <input
                      type="text"
                      value={studentNameInput}
                      onChange={(e) => setStudentNameInput(e.target.value)}
                      placeholder={t.enterStudentNamePrompt}
                      style={styles.studentNameInput}
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!studentNameInput.trim()}
                      className="btn btn-primary"
                      style={styles.saveNameBtnMain}
                    >
                      {t.saveStudentNameBtn}
                    </button>
                    {isEditingName && studentName && (
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="btn btn-outline"
                        style={styles.cancelNameBtn}
                      >
                        {t.cancelBtn}
                      </button>
                    )}
                  </form>
                ) : (
                  <div style={styles.savedNameDisplay}>
                    <span style={styles.savedNamePrefix}>{lang === 'bn' ? 'শিক্ষার্থীর নাম: ' : 'Admitted Student: '}</span>
                    <strong style={styles.savedNameText}>{studentName}</strong>
                    {nameSavedFeedback && (
                      <span style={styles.savedPillBadge}>✓ {t.nameSavedSuccess}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* If Confirmed: Official Slip Trigger */}
            {effectiveStatus === 'CONFIRMED' && (
              <div style={styles.confirmedActionCard}>
                <div style={styles.confirmedInfo}>
                  <h3 style={styles.confirmedTitle}>
                    {lang === 'bn' ? 'ভর্তি সফলভাবে নিশ্চিত হয়েছে!' : 'Admission Successfully Confirmed!'}
                  </h3>
                  <p style={styles.confirmedDesc}>
                    {lang === 'bn'
                      ? 'বিদ্যালয়ে সশরীরে উপস্থিত হওয়ার জন্য আপনার অফিসিয়াল ভর্তি রশিদটি ডাউনলোড অথবা প্রিন্ট করে সংরক্ষণ করুন।'
                      : 'Download or print your official admission confirmation slip with verification QR code for physical verification.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSlip(true)}
                  className="btn btn-primary"
                  style={styles.bigSlipBtn}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  <span>{t.downloadSlipBtn}</span>
                </button>
              </div>
            )}

            {/* Payment Section (for HELD status) */}
            {effectiveStatus === 'HELD' && (
              <div style={styles.paymentSection}>
                <div style={styles.paymentHeader}>
                  <h3 style={styles.paymentTitle}>{t.selectMfsChannel}</h3>
                  <span style={styles.paymentSubNotice}>{t.simulatedPaymentNotice}</span>
                </div>

                {/* MFS Selector Tabs */}
                <div style={styles.mfsTabsRow}>
                  <button
                    type="button"
                    onClick={() => setSelectedChannel('bkash')}
                    style={{
                      ...styles.mfsTab,
                      background: selectedChannel === 'bkash' ? '#e2136e' : '#ffffff',
                      color: selectedChannel === 'bkash' ? '#ffffff' : '#e2136e',
                      borderColor: '#e2136e',
                    }}
                  >
                    <strong>bKash</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('nagad')}
                    style={{
                      ...styles.mfsTab,
                      background: selectedChannel === 'nagad' ? '#e63c24' : '#ffffff',
                      color: selectedChannel === 'nagad' ? '#ffffff' : '#e63c24',
                      borderColor: '#e63c24',
                    }}
                  >
                    <strong>Nagad</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('rocket')}
                    style={{
                      ...styles.mfsTab,
                      background: selectedChannel === 'rocket' ? '#8c3494' : '#ffffff',
                      color: selectedChannel === 'rocket' ? '#ffffff' : '#8c3494',
                      borderColor: '#8c3494',
                    }}
                  >
                    <strong>Rocket</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('card')}
                    style={{
                      ...styles.mfsTab,
                      background: selectedChannel === 'card' ? 'var(--primary)' : '#ffffff',
                      color: selectedChannel === 'card' ? '#ffffff' : 'var(--primary)',
                      borderColor: 'var(--primary)',
                    }}
                  >
                    <strong>Card / NetBanking</strong>
                  </button>
                </div>

                {/* Simulated Payment Instructions */}
                <div style={styles.mfsDetailsCard}>
                  <div style={styles.mfsRow}>
                    <span style={styles.mfsLabel}>Merchant Account:</span>
                    <strong style={styles.mfsValMono}>01700-000000 (Onnorokom Academy)</strong>
                  </div>
                  <div style={styles.mfsRow}>
                    <span style={styles.mfsLabel}>Reference ID:</span>
                    <strong style={styles.mfsValMono}>Seat #{hold.seatNumber || 1} ({className})</strong>
                  </div>
                  <div style={styles.mfsRow}>
                    <span style={styles.mfsLabel}>Counter No:</span>
                    <strong style={styles.mfsValMono}>1</strong>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="btn btn-outline"
                    style={styles.cancelBtn}
                    type="button"
                  >
                    {actionLoading ? t.cancelling : t.cancelReservation}
                  </button>
                  <button
                    onClick={handlePay}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{
                      ...styles.payBtn,
                      background: selectedChannel === 'bkash' ? '#e2136e' : selectedChannel === 'nagad' ? '#e63c24' : selectedChannel === 'rocket' ? '#8c3494' : 'var(--primary)',
                      borderColor: 'transparent',
                    }}
                    type="button"
                  >
                    {actionLoading ? (
                      t.processingPayment
                    ) : (
                      <>
                        <span>{t.payWithMfs} {selectedChannel.toUpperCase()} →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admission Slip Modal */}
      {showSlip && hold && (
        <AdmissionSlipModal
          hold={hold}
          className={className}
          studentId={studentId}
          studentName={studentName}
          onSaveStudentName={handleSaveStudentName}
          lang={lang}
          onClose={() => setShowSlip(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 820,
    margin: '0 auto',
    padding: '1.25rem 1rem',
  },
  topNavRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: 700,
    fontSize: '0.875rem',
    cursor: 'pointer',
    padding: '0.25rem 0',
  },
  headerSlipBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.45rem 0.95rem',
    fontSize: '0.8rem',
  },
  urgentWarningAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    background: 'var(--danger-light)',
    border: '1.5px solid var(--danger)',
    color: 'var(--danger-dark)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1rem',
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--danger)',
    flexShrink: 0,
  },
  mainCard: {
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
  },
  heroBanner: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid transparent',
  },
  heroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  heroStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  heroBadge: {
    display: 'block',
    fontSize: '1.15rem',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    marginBottom: '0.2rem',
  },
  heroDesc: {
    fontSize: '0.825rem',
    color: 'var(--slate-600)',
    margin: 0,
    maxWidth: 520,
    lineHeight: 1.45,
  },
  timerBox: {
    flexShrink: 0,
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--danger-light)',
    color: 'var(--danger-dark)',
    padding: '0.75rem 1.5rem',
    borderBottom: '1px solid var(--danger-border)',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  alertDotDanger: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--danger-dark)',
    flexShrink: 0,
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--success-light)',
    color: 'var(--success-dark)',
    padding: '0.75rem 1.5rem',
    borderBottom: '1px solid var(--success-border)',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  alertDotSuccess: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--success-dark)',
    flexShrink: 0,
  },
  detailsBody: {
    padding: '1.5rem',
  },
  classBanner: {
    borderBottom: '1px solid var(--slate-100)',
    paddingBottom: '1rem',
    marginBottom: '1.25rem',
  },
  metaLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
    letterSpacing: '0.5px',
  },
  classTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    margin: '0.2rem 0 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  infoCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  cellLabel: {
    fontSize: '0.725rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
    letterSpacing: '0.4px',
  },
  copyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  codeText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.825rem',
    background: 'var(--slate-100)',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--slate-800)',
  },
  codeTextMono: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--primary)',
    letterSpacing: '0.04em',
  },
  copyBtn: {
    background: 'var(--slate-200)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: 'var(--slate-700)',
  },
  statusTag: {
    fontWeight: 800,
    fontSize: '0.9rem',
    fontFamily: 'var(--font-mono)',
  },
  seatPill: {
    background: 'var(--seat-avail-bg)',
    border: '1px solid var(--seat-avail-border)',
    padding: '0.25rem 0.65rem',
    borderRadius: 'var(--radius-sm)',
    width: 'fit-content',
  },
  seatVal: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 800,
    fontSize: '0.9rem',
    color: 'var(--primary)',
  },
  dateText: {
    fontSize: '0.825rem',
    color: 'var(--slate-700)',
  },
  confirmedActionCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(30, 107, 184, 0.08) 100%)',
    border: '1.5px solid var(--success-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    marginTop: '1.5rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  confirmedInfo: {
    flex: '1 1 300px',
  },
  confirmedTitle: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: 'var(--success-dark)',
    margin: '0 0 0.35rem',
  },
  confirmedDesc: {
    fontSize: '0.825rem',
    color: 'var(--slate-700)',
    margin: 0,
    lineHeight: 1.45,
  },
  bigSlipBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.55rem',
    padding: '0.75rem 1.35rem',
    fontSize: '0.925rem',
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    background: 'var(--success-dark)',
  },
  paymentSection: {
    borderTop: '1px solid var(--slate-100)',
    paddingTop: '1.5rem',
    marginTop: '1rem',
  },
  paymentHeader: {
    marginBottom: '1rem',
  },
  paymentTitle: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    margin: '0 0 0.2rem',
  },
  paymentSubNotice: {
    fontSize: '0.775rem',
    color: 'var(--slate-500)',
  },
  mfsTabsRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  mfsTab: {
    padding: '0.55rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid',
    cursor: 'pointer',
    fontSize: '0.85rem',
    transition: 'all 0.15s ease',
  },
  mfsDetailsCard: {
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '0.85rem 1rem',
    marginBottom: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  mfsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
  },
  mfsLabel: {
    color: 'var(--slate-500)',
    fontWeight: 600,
  },
  mfsValMono: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-800)',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  cancelBtn: {
    flex: '1 1 160px',
    padding: '0.75rem',
    fontSize: '0.85rem',
  },
  payBtn: {
    flex: '2 1 240px',
    padding: '0.75rem',
    fontSize: '0.925rem',
    fontWeight: 700,
    color: '#ffffff',
  },
};
