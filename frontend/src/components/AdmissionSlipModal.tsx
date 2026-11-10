import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  studentName?: string;
  onSaveStudentName?: (name: string) => void;
  lang?: Language;
  onClose: () => void;
}

export function AdmissionSlipModal({
  hold,
  className,
  studentId,
  studentName: initialStudentName = '',
  onSaveStudentName,
  lang = 'en',
  onClose,
}: Props) {
  const t = translations[lang] || translations.en;
  const rawId = studentId || hold.studentId || '';
  const formattedId = rawId.length === 17
    ? `${rawId.slice(0, 4)}-${rawId.slice(4, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12)}`
    : rawId || '—';

  // Manage student full name locally and sync with localStorage
  const storageKey = 'studentName_' + hold.holdId;
  const [name, setName] = useState<string>(() => {
    return (
      initialStudentName ||
      localStorage.getItem(storageKey) ||
      localStorage.getItem('studentName_default') ||
      ''
    );
  });
  const [isEditingName, setIsEditingName] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    try {
      localStorage.setItem(storageKey, val);
      localStorage.setItem('studentName_default', val);
    } catch {
      // ignore storage errors
    }
    if (onSaveStudentName) {
      onSaveStudentName(val);
    }
  };

  const dateStr = hold.confirmedAt
    ? new Date(hold.confirmedAt).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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

  return createPortal(
    <div className="modal-backdrop no-print-backdrop" onClick={onClose}>
      <div
        className="modal-dialog animate-slide-up"
        style={styles.modalDialog}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable Slip Container */}
        <div className="printable-admission-slip" style={styles.outerFrame}>
          <div style={styles.innerFrame}>
            {/* Top 3-Section Header Bar (Matching Sample Slip Format) */}
            <div style={styles.topHeaderGrid}>
              {/* Left Brand Cell */}
              <div style={styles.headerLeftCell}>
                <div style={styles.logoRow}>
                  <img src="/logo.jpg" alt="Logo" style={styles.brandLogo} />
                  <div>
                    <strong style={styles.brandTitleText}>ONNOROKOM</strong>
                    <div style={styles.brandSubText}>ACADEMY</div>
                  </div>
                </div>
                <div style={styles.brandDept}>Online Admission Division</div>
              </div>

              {/* Center Title Cell */}
              <div style={styles.headerCenterCell}>
                <h1 style={styles.mainTitle}>{t.officialAdmissionSlip}</h1>
                <div style={styles.sessionLine}>{t.academicSession}</div>
              </div>

              {/* Right Confidential Cell */}
              <div style={styles.headerRightCell}>
                <strong style={styles.confidentialTitle}>CONFIDENTIAL</strong>
                <div style={styles.confidentialSub}>OFFICIAL RECORD</div>
                <div style={styles.recordRef}>{refCode}</div>
              </div>
            </div>

            {/* 2-Column Meta Information Grid */}
            <div style={styles.metaTable}>
              {/* Left Column */}
              <div style={styles.metaColLeft}>
                <div style={styles.metaRow}>
                  <span style={styles.metaField}>{t.studentNameLabel}</span>
                  <span style={styles.metaColon}>:</span>
                  <div style={styles.metaValueArea}>
                    {isEditingName ? (
                      <div style={styles.nameForm} className="no-print">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder={lang === 'bn' ? 'শিক্ষার্থীর নাম' : 'e.g. Khalid Mahmud Joy'}
                          style={styles.nameInput}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setIsEditingName(false)}
                          style={styles.saveNameBtn}
                          title="Done"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <div style={styles.nameDisplayRow}>
                        <strong style={styles.nameText}>{name || '—'}</strong>
                        <button
                          type="button"
                          onClick={() => setIsEditingName(true)}
                          style={styles.editNameBtn}
                          className="no-print"
                          title={t.editStudentNameBtn}
                        >
                          ✎
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaField}>{t.birthCertLabel}</span>
                  <span style={styles.metaColon}>:</span>
                  <strong style={styles.metaValueMono}>{formattedId}</strong>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaField}>{t.studentCategory}</span>
                  <span style={styles.metaColon}>:</span>
                  <span style={styles.metaValue}>{t.regularAdmission}</span>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaField}>{t.admissionDate}</span>
                  <span style={styles.metaColon}>:</span>
                  <span style={styles.metaValue}>{dateStr}</span>
                </div>
              </div>

              {/* Right Column */}
              <div style={styles.metaColRight}>
                <div style={styles.metaRow}>
                  <span style={styles.metaField}>{t.academicClass}</span>
                  <span style={styles.metaColon}>:</span>
                  <strong style={styles.metaValue}>{className}</strong>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaField}>{t.assignedSeat}</span>
                  <span style={styles.metaColon}>:</span>
                  <strong style={styles.seatBadge}>Seat #{hold.seatNumber || 1}</strong>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaField}>{t.holdReferenceId}</span>
                  <span style={styles.metaColon}>:</span>
                  <code style={styles.metaValueMonoSmall}>{hold.holdId.slice(0, 18)}...</code>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaField}>{t.applicationStatus}</span>
                  <span style={styles.metaColon}>:</span>
                  <span style={styles.enrolledPill}>{t.officiallyEnrolledTag}</span>
                </div>
              </div>
            </div>

            {/* Structured Particulars Table */}
            <table style={styles.particularsTable}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={{ ...styles.th, width: '45%' }}>{t.particularsCol}</th>
                  <th style={{ ...styles.th, width: '30%' }}>{t.referenceCol}</th>
                  <th style={{ ...styles.th, width: '25%', textAlign: 'right' }}>{t.statusCol}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={styles.tableRow}>
                  <td style={styles.td}>Academic Class Seat Reservation & Allocation</td>
                  <td style={styles.td}>{className} • Seat #{hold.seatNumber || 1}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    Confirmed & Locked
                  </td>
                </tr>
                <tr style={styles.tableRow}>
                  <td style={styles.td}>17-Digit Birth Registration Verification</td>
                  <td style={styles.td}>ID: {formattedId}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    Validated
                  </td>
                </tr>
                <tr style={styles.tableRow}>
                  <td style={styles.td}>Online Admission & Processing Fee</td>
                  <td style={styles.td}>Gateway Ref: {refCode}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    PAID (BDT 0.00)
                  </td>
                </tr>
                <tr style={styles.totalRow}>
                  <td style={{ ...styles.tdTotal, fontWeight: 700 }}>Total Admission Fee Paid</td>
                  <td style={styles.tdTotal}>—</td>
                  <td style={{ ...styles.tdTotal, textAlign: 'right', fontWeight: 800 }}>
                    BDT 0.00 (PAID)
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Highlighted NET Status Section (Matching Sample NET PAY Bar) */}
            <div style={styles.netStatusBar}>
              <div style={styles.netStatusLeft}>
                <div style={styles.netInfoRow}>
                  <span style={styles.netLabel}>Verification:</span>
                  <span style={styles.netVal}>17-Digit Digital Auth Code Verified</span>
                </div>
                <div style={styles.netInfoRow}>
                  <span style={styles.netLabel}>School Registry:</span>
                  <span style={styles.netVal}>Onnorokom Academy Student Records</span>
                </div>
              </div>

              <div style={styles.netStatusRight}>
                <div style={styles.netPayHeader}>{t.netStatusLabel}</div>
                <div style={styles.netPayAmount}>{t.officiallyEnrolledTag}</div>
                <div style={styles.netPayWords}>
                  {t.admittedNoticeText}
                </div>
              </div>
            </div>

            {/* Bottom Instructions, QR & Signature */}
            <div style={styles.footerGrid}>
              {/* Left: QR & Instructions */}
              <div style={styles.instructionsCol}>
                <div style={styles.qrRow}>
                  <svg width="68" height="68" viewBox="0 0 76 76" style={styles.qrSvg}>
                    <rect x="2" y="2" width="22" height="22" fill="#1e293b" rx="2" />
                    <rect x="6" y="6" width="14" height="14" fill="#ffffff" />
                    <rect x="9" y="9" width="8" height="8" fill="#1e293b" />
                    <rect x="52" y="2" width="22" height="22" fill="#1e293b" rx="2" />
                    <rect x="56" y="6" width="14" height="14" fill="#ffffff" />
                    <rect x="59" y="9" width="8" height="8" fill="#1e293b" />
                    <rect x="2" y="52" width="22" height="22" fill="#1e293b" rx="2" />
                    <rect x="6" y="56" width="14" height="14" fill="#ffffff" />
                    <rect x="9" y="59" width="8" height="8" fill="#1e293b" />
                    <rect x="28" y="4" width="6" height="6" fill="#1e293b" />
                    <rect x="38" y="10" width="6" height="6" fill="#1e293b" />
                    <rect x="32" y="22" width="6" height="6" fill="#1e293b" />
                    <rect x="4" y="32" width="6" height="6" fill="#1e293b" />
                    <rect x="16" y="38" width="6" height="6" fill="#1e293b" />
                    <rect x="28" y="34" width="8" height="8" fill="#1e293b" rx="1" />
                    <rect x="42" y="30" width="6" height="6" fill="#1e293b" />
                    <rect x="54" y="36" width="6" height="6" fill="#1e293b" />
                    <rect x="66" y="32" width="6" height="6" fill="#1e293b" />
                    <rect x="30" y="48" width="6" height="6" fill="#1e293b" />
                    <rect x="44" y="46" width="6" height="6" fill="#1e293b" />
                    <rect x="58" y="54" width="6" height="6" fill="#1e293b" />
                    <rect x="36" y="62" width="6" height="6" fill="#1e293b" />
                    <rect x="48" y="66" width="6" height="6" fill="#1e293b" />
                    <rect x="64" y="64" width="6" height="6" fill="#1e293b" />
                  </svg>
                  <div style={styles.instructionsText}>
                    <strong>Notice: </strong>
                    {t.physicalVerificationNote}
                  </div>
                </div>
              </div>

              {/* Right: Seal & Authorized Signature */}
              <div style={styles.signatureCol}>
                <div style={styles.sealBox}>
                  <div style={styles.sealCircle}>
                    <span style={styles.sealTitle}>ONNOROKOM</span>
                    <span style={styles.sealStars}>★ ★ ★</span>
                    <span style={styles.sealDept}>ACADEMY</span>
                  </div>
                </div>
                <div style={styles.sigLineWrapper}>
                  <div style={styles.sigLine} />
                  <div style={styles.sigTitle}>{t.authorizedSignature}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (Hidden when printing) */}
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
    </div>,
    document.body
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalDialog: {
    maxWidth: 780,
    width: '95%',
    background: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
    padding: '1.25rem',
    maxHeight: '94vh',
    overflowY: 'auto',
  },
  outerFrame: {
    border: '3px double #1e293b',
    padding: 6,
    background: '#ffffff',
  },
  innerFrame: {
    border: '1.5px solid #1e293b',
    background: '#ffffff',
  },
  topHeaderGrid: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 180px',
    borderBottom: '1.5px solid #1e293b',
  },
  headerLeftCell: {
    background: '#1e6bb8',
    color: '#ffffff',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    borderRight: '1.5px solid #1e293b',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.2rem',
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: 4,
    objectFit: 'cover',
    background: '#ffffff',
  },
  brandTitleText: {
    fontSize: '0.85rem',
    fontWeight: 800,
    letterSpacing: '0.04em',
    lineHeight: 1.1,
    display: 'block',
  },
  brandSubText: {
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    opacity: 0.9,
  },
  brandDept: {
    fontSize: '0.65rem',
    fontWeight: 500,
    opacity: 0.85,
    marginTop: '0.15rem',
  },
  headerCenterCell: {
    padding: '0.75rem 1rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    background: '#ffffff',
  },
  mainTitle: {
    fontSize: '1.25rem',
    fontWeight: 900,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#0f172a',
    margin: 0,
  },
  sessionLine: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#475569',
    marginTop: '0.25rem',
  },
  headerRightCell: {
    background: '#f1f5f9',
    padding: '0.75rem',
    textAlign: 'center',
    borderLeft: '1.5px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  confidentialTitle: {
    fontSize: '0.9rem',
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: '#0f172a',
    display: 'block',
  },
  confidentialSub: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#64748b',
    marginTop: '0.1rem',
  },
  recordRef: {
    fontSize: '0.65rem',
    fontFamily: 'var(--font-mono)',
    color: '#1e293b',
    marginTop: '0.2rem',
    fontWeight: 700,
  },
  metaTable: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    borderBottom: '1.5px solid #1e293b',
    fontSize: '0.8rem',
  },
  metaColLeft: {
    padding: '0.65rem 0.85rem',
    borderRight: '1.5px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  metaColRight: {
    padding: '0.65rem 0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  metaRow: {
    display: 'grid',
    gridTemplateColumns: '110px 14px 1fr',
    alignItems: 'center',
  },
  metaField: {
    color: '#334155',
    fontWeight: 600,
  },
  metaColon: {
    fontWeight: 700,
    color: '#1e293b',
  },
  metaValue: {
    color: '#0f172a',
    fontWeight: 700,
  },
  metaValueMono: {
    fontFamily: 'var(--font-mono)',
    color: '#1e6bb8',
    fontWeight: 700,
    letterSpacing: '0.03em',
  },
  metaValueMonoSmall: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.725rem',
    color: '#475569',
  },
  metaValueArea: {
    display: 'flex',
    alignItems: 'center',
  },
  nameForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    width: '100%',
  },
  nameInput: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    border: '1.5px solid var(--primary)',
    borderRadius: 4,
    outline: 'none',
    width: '100%',
    maxWidth: 200,
    background: '#ffffff',
  },
  saveNameBtn: {
    background: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    padding: '0.25rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: 700,
    borderRadius: 4,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  nameDisplayRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  nameText: {
    color: '#0f172a',
    fontWeight: 800,
    fontSize: '0.85rem',
  },
  editNameBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '0.7rem',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '0.1rem 0.3rem',
    borderRadius: 3,
  },
  seatBadge: {
    display: 'inline-block',
    background: '#ecfdf5',
    color: '#059669',
    border: '1px solid #a7f3d0',
    padding: '0.1rem 0.45rem',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 800,
    width: 'fit-content',
  },
  enrolledPill: {
    display: 'inline-block',
    color: '#059669',
    fontWeight: 800,
    fontSize: '0.725rem',
    letterSpacing: '0.02em',
  },
  particularsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
    borderBottom: '1.5px solid #1e293b',
  },
  tableHeaderRow: {
    background: '#1e6bb8',
    color: '#ffffff',
  },
  th: {
    padding: '0.45rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.775rem',
    fontWeight: 800,
    letterSpacing: '0.03em',
    borderRight: '1px solid #ffffff33',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '0.45rem 0.75rem',
    color: '#1e293b',
    borderRight: '1.5px solid #1e293b',
    fontSize: '0.775rem',
  },
  totalRow: {
    background: '#f8fafc',
    borderTop: '1.5px solid #1e293b',
  },
  tdTotal: {
    padding: '0.5rem 0.75rem',
    color: '#0f172a',
    borderRight: '1.5px solid #1e293b',
    fontSize: '0.8rem',
  },
  netStatusBar: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    borderBottom: '1.5px solid #1e293b',
    background: '#ffffff',
  },
  netStatusLeft: {
    padding: '0.65rem 0.85rem',
    borderRight: '1.5px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '0.2rem',
    fontSize: '0.75rem',
  },
  netInfoRow: {
    display: 'flex',
    gap: '0.4rem',
  },
  netLabel: {
    color: '#64748b',
    fontWeight: 600,
  },
  netVal: {
    color: '#1e293b',
    fontWeight: 700,
  },
  netStatusRight: {
    background: '#f8fafc',
    padding: '0.65rem 0.85rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  netPayHeader: {
    background: '#1e6bb8',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: 800,
    letterSpacing: '0.05em',
    padding: '0.2rem 0.5rem',
    borderRadius: 3,
    marginBottom: '0.35rem',
    textTransform: 'uppercase',
  },
  netPayAmount: {
    fontSize: '1.1rem',
    fontWeight: 900,
    color: '#059669',
    letterSpacing: '0.02em',
  },
  netPayWords: {
    fontSize: '0.7rem',
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: '0.15rem',
  },
  footerGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    padding: '0.85rem',
    alignItems: 'center',
    gap: '1rem',
  },
  instructionsCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  qrRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  qrSvg: {
    flexShrink: 0,
    border: '1px solid #cbd5e1',
    padding: 3,
    borderRadius: 4,
    background: '#ffffff',
  },
  instructionsText: {
    fontSize: '0.7rem',
    color: '#475569',
    lineHeight: 1.4,
  },
  signatureCol: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '1.25rem',
  },
  sealBox: {
    flexShrink: 0,
  },
  sealCircle: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    border: '2px dashed #1e6bb8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1e6bb8',
    transform: 'rotate(-10deg)',
  },
  sealTitle: {
    fontSize: '0.45rem',
    fontWeight: 800,
    letterSpacing: '0.5px',
  },
  sealStars: {
    fontSize: '0.45rem',
    lineHeight: 1,
    margin: '1px 0',
  },
  sealDept: {
    fontSize: '0.45rem',
    fontWeight: 800,
    letterSpacing: '0.5px',
  },
  sigLineWrapper: {
    textAlign: 'center',
    minWidth: 150,
  },
  sigLine: {
    height: 1.5,
    background: '#1e293b',
    marginBottom: '0.35rem',
  },
  sigTitle: {
    fontSize: '0.675rem',
    fontWeight: 700,
    color: '#334155',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.25rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #e2e8f0',
  },
  printBtn: {
    padding: '0.6rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  closeBtn: {
    padding: '0.6rem 1.25rem',
    fontSize: '0.875rem',
  },
};
