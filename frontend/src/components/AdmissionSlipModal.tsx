import React from 'react';
import { Language, translations } from '../i18n';

interface Props {
  hold: {
    holdId: string;
    studentId?: string;
    classId: string;
    seatNumber?: number;
    confirmedAt?: string | null;
    createdAt?: string;
  };
  className: string;
  studentId: string;
  lang?: Language;
  onClose: () => void;
}

export function AdmissionSlipModal({
  hold,
  className,
  studentId,
  lang = 'en',
  onClose,
}: Props) {
  const t = translations[lang] || translations.en;
  const rawId = studentId || hold.studentId || '';
  const formattedId = rawId.length === 17
    ? `${rawId.slice(0, 4)}-${rawId.slice(4, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12)}`
    : rawId || '—';

  const dateStr = hold.confirmedAt
    ? new Date(hold.confirmedAt).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const refCode = `OA-${new Date().getFullYear()}-${hold.holdId.slice(0, 8).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop no-print-backdrop" onClick={onClose}>
      <div
        className="modal-dialog animate-slide-up"
        style={styles.modalDialog}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable Slip Container */}
        <div className="printable-admission-slip" style={styles.slipCard}>
          {/* Header Banner */}
          <div style={styles.slipHeader}>
            <div style={styles.headerBrandRow}>
              <div style={styles.logoBadge}>
                <img src="/logo.jpg" alt="Onnorokom Logo" style={styles.logoImg} />
              </div>
              <div style={styles.brandTitles}>
                <h1 style={styles.brandTitle}>{t.brandName}</h1>
                <p style={styles.brandSub}>{lang === 'bn' ? 'অনলাইন ভর্তি ও শিক্ষা প্রশাসন বিভাগ' : 'Online Admission & Student Records Division'}</p>
                <span style={styles.sessionBadge}>{t.academicSession}</span>
              </div>
            </div>

            <div style={styles.serialBox}>
              <span style={styles.serialLabel}>Official Reference No.</span>
              <strong style={styles.serialVal}>{refCode}</strong>
              <span style={styles.dateVal}>{dateStr}</span>
            </div>
          </div>

          <div style={styles.divider} />

          {/* Title Ribbon */}
          <div style={styles.ribbon}>
            <h2 style={styles.ribbonTitle}>{t.officialAdmissionSlip}</h2>
            <span style={styles.verifiedTag}>
              <span style={styles.tagDot} />
              {lang === 'bn' ? 'ভর্তি নিশ্চিত ও সংরক্ষিত' : 'OFFICIALLY ENROLLED'}
            </span>
          </div>

          {/* Student & Allocation Details Grid */}
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.itemLabel}>{t.birthCertLabel}</span>
              <strong style={styles.itemValMono}>{formattedId}</strong>
            </div>

            <div style={styles.detailItem}>
              <span style={styles.itemLabel}>{t.academicClass}</span>
              <strong style={styles.itemVal}>{className}</strong>
            </div>

            <div style={styles.detailItem}>
              <span style={styles.itemLabel}>{t.assignedSeat}</span>
              <div style={styles.seatPill}>
                <span style={styles.seatPillNumber}>Seat #{hold.seatNumber || 1}</span>
              </div>
            </div>

            <div style={styles.detailItem}>
              <span style={styles.itemLabel}>{t.holdReferenceId}</span>
              <strong style={styles.itemValMonoSmall}>{hold.holdId}</strong>
            </div>
          </div>

          {/* Instructions Box */}
          <div style={styles.noticeBox}>
            <p style={styles.noticeText}>
              <strong>{lang === 'bn' ? 'জরুরি নির্দেশনা: ' : 'Important Instructions: '}</strong>
              {t.physicalVerificationNote}
            </p>
          </div>

          {/* Footer with Security QR & Official Seal */}
          <div style={styles.slipFooter}>
            {/* Visual Security QR */}
            <div style={styles.qrSection}>
              <svg width="76" height="76" viewBox="0 0 76 76" style={styles.qrSvg}>
                {/* 3 Position Detection Patterns */}
                <rect x="2" y="2" width="22" height="22" fill="#1e6bb8" rx="3" />
                <rect x="6" y="6" width="14" height="14" fill="#ffffff" />
                <rect x="9" y="9" width="8" height="8" fill="#1e6bb8" />

                <rect x="52" y="2" width="22" height="22" fill="#1e6bb8" rx="3" />
                <rect x="56" y="6" width="14" height="14" fill="#ffffff" />
                <rect x="59" y="9" width="8" height="8" fill="#1e6bb8" />

                <rect x="2" y="52" width="22" height="22" fill="#1e6bb8" rx="3" />
                <rect x="6" y="56" width="14" height="14" fill="#ffffff" />
                <rect x="9" y="59" width="8" height="8" fill="#1e6bb8" />

                {/* Simulated matrix cells */}
                <rect x="28" y="4" width="6" height="6" fill="#1e6bb8" />
                <rect x="38" y="10" width="6" height="6" fill="#1e6bb8" />
                <rect x="32" y="22" width="6" height="6" fill="#1e6bb8" />
                <rect x="4" y="32" width="6" height="6" fill="#1e6bb8" />
                <rect x="16" y="38" width="6" height="6" fill="#1e6bb8" />
                <rect x="28" y="34" width="8" height="8" fill="#1e6bb8" rx="1" />
                <rect x="42" y="30" width="6" height="6" fill="#1e6bb8" />
                <rect x="54" y="36" width="6" height="6" fill="#1e6bb8" />
                <rect x="66" y="32" width="6" height="6" fill="#1e6bb8" />
                <rect x="30" y="48" width="6" height="6" fill="#1e6bb8" />
                <rect x="44" y="46" width="6" height="6" fill="#1e6bb8" />
                <rect x="58" y="54" width="6" height="6" fill="#1e6bb8" />
                <rect x="36" y="62" width="6" height="6" fill="#1e6bb8" />
                <rect x="48" y="66" width="6" height="6" fill="#1e6bb8" />
                <rect x="64" y="64" width="6" height="6" fill="#1e6bb8" />
              </svg>
              <span style={styles.qrLabel}>{t.verificationQrNotice}</span>
            </div>

            {/* Official Seal & Signature */}
            <div style={styles.signatureSection}>
              <div style={styles.sealCircle}>
                <span style={styles.sealTextTop}>ONNOROKOM ACADEMY</span>
                <span style={styles.sealStar}>★ ★ ★</span>
                <span style={styles.sealTextBottom}>ADMISSIONS</span>
              </div>
              <div style={styles.signatureLine}>
                <div style={styles.lineBar} />
                <span style={styles.signatureTitle}>{t.authorizedSignature}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls (Hidden in Print) */}
        <div className="no-print" style={styles.modalActions}>
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={styles.printBtn}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            {t.printSlip}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={styles.closeBtn}
          >
            {t.closeSlip}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalDialog: {
    maxWidth: 680,
    width: '100%',
    padding: 0,
    background: '#ffffff',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
  },
  slipCard: {
    padding: '2rem',
    background: '#ffffff',
    color: 'var(--slate-900)',
    position: 'relative',
  },
  slipHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  headerBrandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1.5px solid var(--primary-border)',
    boxShadow: 'var(--shadow-sm)',
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
  brandTitles: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--primary)',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  brandSub: {
    fontSize: '0.775rem',
    color: 'var(--slate-500)',
    margin: '2px 0 4px',
    fontWeight: 600,
  },
  sessionBadge: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    fontSize: '0.7rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--primary-dark)',
    background: 'var(--primary-light)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
  },
  serialBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    padding: '0.5rem 0.85rem',
    borderRadius: 'var(--radius-md)',
  },
  serialLabel: {
    fontSize: '0.675rem',
    color: 'var(--slate-500)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  serialVal: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.925rem',
    color: 'var(--primary)',
    fontWeight: 800,
  },
  dateVal: {
    fontSize: '0.725rem',
    color: 'var(--slate-600)',
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: 'var(--slate-200)',
    margin: '1.25rem 0 1rem',
  },
  ribbon: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(30, 107, 184, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
    border: '1px solid var(--primary-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.65rem 1rem',
    marginBottom: '1.25rem',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  ribbonTitle: {
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--primary-dark)',
    margin: 0,
  },
  verifiedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.75rem',
    fontWeight: 800,
    background: 'var(--success-dark)',
    color: '#ffffff',
    padding: '0.25rem 0.65rem',
    borderRadius: 'var(--radius-full)',
    letterSpacing: '0.03em',
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#ffffff',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    background: '#ffffff',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    marginBottom: '1.25rem',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  itemLabel: {
    fontSize: '0.725rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
    letterSpacing: '0.03em',
  },
  itemVal: {
    fontSize: '0.975rem',
    color: 'var(--slate-900)',
    fontWeight: 700,
  },
  itemValMono: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.05rem',
    color: 'var(--primary)',
    fontWeight: 800,
    letterSpacing: '0.04em',
  },
  itemValMonoSmall: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.775rem',
    color: 'var(--slate-600)',
    fontWeight: 600,
    wordBreak: 'break-all',
  },
  seatPill: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--seat-conf-bg)',
    border: '1.5px solid var(--seat-conf-border)',
    color: 'var(--seat-conf-color)',
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    width: 'fit-content',
  },
  seatPillNumber: {
    fontSize: '0.95rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
  },
  noticeBox: {
    background: 'var(--slate-50)',
    borderLeft: '4px solid var(--primary)',
    padding: '0.75rem 1rem',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    marginBottom: '1.5rem',
  },
  noticeText: {
    fontSize: '0.775rem',
    lineHeight: 1.5,
    color: 'var(--slate-700)',
    margin: 0,
  },
  slipFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '1.5rem',
    borderTop: '1px dashed var(--slate-300)',
    paddingTop: '1.25rem',
    flexWrap: 'wrap',
  },
  qrSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    maxWidth: 320,
  },
  qrSvg: {
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-sm)',
    padding: 4,
    background: '#ffffff',
    flexShrink: 0,
  },
  qrLabel: {
    fontSize: '0.675rem',
    color: 'var(--slate-500)',
    lineHeight: 1.4,
  },
  signatureSection: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '1.25rem',
  },
  sealCircle: {
    width: 68,
    height: 68,
    borderRadius: '50%',
    border: '2px dashed var(--primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--primary)',
    opacity: 0.85,
    userSelect: 'none',
  },
  sealTextTop: {
    fontSize: '0.45rem',
    fontWeight: 800,
    textAlign: 'center',
    letterSpacing: '0.04em',
  },
  sealStar: {
    fontSize: '0.45rem',
    letterSpacing: '0.1em',
    margin: '1px 0',
  },
  sealTextBottom: {
    fontSize: '0.475rem',
    fontWeight: 800,
    letterSpacing: '0.05em',
  },
  signatureLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 150,
  },
  lineBar: {
    width: '100%',
    height: 1,
    background: 'var(--slate-400)',
    marginBottom: 4,
  },
  signatureTitle: {
    fontSize: '0.675rem',
    color: 'var(--slate-600)',
    fontWeight: 600,
    textAlign: 'center',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '0.9rem 1.5rem',
    background: 'var(--slate-50)',
    borderTop: '1px solid var(--slate-200)',
  },
  printBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.55rem 1.15rem',
    fontSize: '0.85rem',
  },
  closeBtn: {
    padding: '0.55rem 1rem',
    fontSize: '0.85rem',
  },
};
