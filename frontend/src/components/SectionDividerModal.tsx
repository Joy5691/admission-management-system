import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch, friendlyError } from '../api/client';
import { ClassInfo } from '../types';
import { Language } from '../i18n';

interface ConfirmedStudent {
  holdId: string;
  studentId: string;
  confirmedAt: string | null;
  createdAt: string;
  seatNumber: number;
}

interface SectionStudent {
  roll: number;
  studentId: string;
  studentName: string;
  confirmedAt: string | null;
  seatNumber: number;
}

interface ClassSection {
  name: string;
  students: SectionStudent[];
}

interface Props {
  classInfo: ClassInfo;
  lang?: Language;
  onClose: () => void;
  onSectionsSaved?: () => void;
}

export function SectionDividerModal({ classInfo, lang: _lang = 'en', onClose, onSectionsSaved }: Props) {

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<ConfirmedStudent[]>([]);
  const [sectionSize, setSectionSize] = useState<number>(30);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  // Helper to get student name from localStorage or generate readable fallback
  const getStudentName = (holdId: string, _studentId: string, roll: number): string => {
    const savedName = localStorage.getItem('studentName_' + holdId);
    if (savedName && savedName.trim()) return savedName.trim();
    const demoNames = [
      'Khalid Mahmud Joy', 'Rahim Ahmed', 'Karim Ullah', 'Nusrat Jahan', 'Tahmina Akter',
      'Arifur Rahman', 'Sadia Islam', 'Tanvir Hasan', 'Ayesha Siddiqua', 'Mahmudul Hasan',
      'Farzana Haque', 'Shahriar Kabir', 'Nafisa Tabassum', 'Zubayer Hossain', 'Sumaiya Khatun',
      'Rifat Bin Alam', 'Anika Bushra', 'Kamrul Islam', 'Jannatul Ferdous', 'Salman Farsi',
      'Mehedi Hasan', 'Tasnim Zara', 'Ishtiaque Ahmed', 'Moumita Sen', 'Ashraful Haque'
    ];
    return demoNames[(roll - 1) % demoNames.length];
  };

  // Load existing sections or confirmed students
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentData: ConfirmedStudent[] = await apiFetch('/classes/' + classInfo.id + '/confirmed-students');
      setStudents(studentData);

      const sectionRes = await apiFetch('/classes/' + classInfo.id + '/sections');
      if (sectionRes && sectionRes.exists && Array.isArray(sectionRes.sections) && sectionRes.sections.length > 0) {
        setSections(sectionRes.sections);
        if (sectionRes.sectionSize) setSectionSize(sectionRes.sectionSize);
      } else if (studentData.length > 0) {
        autoDivide(studentData, sectionSize);
      }
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classInfo.id]);

  // Section division algorithm
  const autoDivide = (studentList: ConfirmedStudent[], targetSize: number) => {
    if (!studentList || studentList.length === 0) {
      setSections([]);
      return;
    }

    const safeSize = Math.max(5, targetSize);
    const numSections = Math.ceil(studentList.length / safeSize);
    const newSections: ClassSection[] = [];

    for (let s = 0; s < numSections; s++) {
      const sectionLetter = String.fromCharCode(65 + s);
      const sliceStart = s * safeSize;
      const sliceEnd = Math.min(sliceStart + safeSize, studentList.length);
      const sectionSlice = studentList.slice(sliceStart, sliceEnd);

      const sectionStudents: SectionStudent[] = sectionSlice.map((std, idx) => ({
        roll: idx + 1,
        studentId: std.studentId,
        studentName: getStudentName(std.holdId, std.studentId, sliceStart + idx + 1),
        confirmedAt: std.confirmedAt,
        seatNumber: std.seatNumber || (sliceStart + idx + 1),
      }));

      newSections.push({
        name: sectionLetter,
        students: sectionStudents,
      });
    }

    setSections(newSections);
    setActiveSectionIndex(0);
  };

  const handleDivide = () => {
    autoDivide(students, sectionSize);
  };

  const handleSaveSections = async () => {
    if (sections.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/classes/' + classInfo.id + '/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionSize,
          sections,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onSectionsSaved) onSectionsSaved();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    setError(null);
    try {
      await apiFetch('/classes/' + classInfo.id + '/demo-seed?count=160', {
        method: 'POST',
      });
      await loadData();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setSeedingDemo(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const activeSection = sections[activeSectionIndex] || sections[0];

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog animate-slide-up section-modal-dialog-responsive"
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="no-print" style={styles.header}>
          <div>
            <h2 style={styles.title}>{classInfo.name} — Student Sections</h2>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} title="Close">
            ✕
          </button>
        </div>

        {error && (
          <div className="no-print" style={styles.errorAlert}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={styles.alertClose}>✕</button>
          </div>
        )}

        {/* Minimal Controls Row */}
        <div className="no-print" style={styles.controlsRow}>
          <div style={styles.statBadge}>
            <span style={styles.badgeLabel}>Confirmed Students</span>
            <strong style={styles.badgeVal}>{students.length}</strong>
          </div>

          <div style={styles.sizeSelectorGroup}>
            <span style={styles.sizeLabel}>Section Size:</span>
            {[20, 25, 30, 35].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSectionSize(size);
                  autoDivide(students, size);
                }}
                style={{
                  ...styles.sizeBtn,
                  background: sectionSize === size ? 'var(--primary)' : '#ffffff',
                  color: sectionSize === size ? '#ffffff' : 'var(--slate-700)',
                  borderColor: sectionSize === size ? 'var(--primary)' : 'var(--slate-300)',
                  fontWeight: sectionSize === size ? 700 : 500,
                }}
              >
                {size}
              </button>
            ))}
          </div>

          <div style={styles.actionBtnGroup}>
            <button
              type="button"
              onClick={handleDivide}
              className="btn btn-primary"
              style={styles.divideBtn}
              disabled={students.length === 0}
            >
              Divide Sections
            </button>

            {students.length < 20 && (
              <button
                type="button"
                onClick={handleSeedDemo}
                disabled={seedingDemo}
                className="btn btn-outline"
                style={styles.demoSeedBtn}
                title="Populate 160 students to test section division"
              >
                {seedingDemo ? 'Seeding...' : '+ Demo 160 Students'}
              </button>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
          </div>
        ) : sections.length === 0 ? (
          <div style={styles.emptyBox}>
            <h3 style={styles.emptyTitle}>No Confirmed Students Yet</h3>
            {students.length === 0 && (
              <button
                type="button"
                onClick={handleSeedDemo}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                + Populate 160 Students (Demo)
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Section Tab Bar */}
            <div className="no-print" style={styles.tabsRow}>
              {sections.map((sec, idx) => (
                <button
                  key={sec.name}
                  type="button"
                  onClick={() => setActiveSectionIndex(idx)}
                  style={{
                    ...styles.tabBtn,
                    background: activeSectionIndex === idx ? 'var(--primary)' : '#ffffff',
                    color: activeSectionIndex === idx ? '#ffffff' : 'var(--slate-700)',
                    borderColor: activeSectionIndex === idx ? 'var(--primary)' : 'var(--slate-200)',
                    fontWeight: activeSectionIndex === idx ? 800 : 600,
                  }}
                >
                  <span>Section {sec.name}</span>
                  <span
                    style={{
                      ...styles.tabCount,
                      background: activeSectionIndex === idx ? 'rgba(255,255,255,0.25)' : 'var(--slate-100)',
                      color: activeSectionIndex === idx ? '#ffffff' : 'var(--slate-600)',
                    }}
                  >
                    {sec.students.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Printable Section Roster Document */}
            <div className="printable-section-roster" style={styles.rosterContainer}>
              {/* Official Header for Print */}
              <div style={styles.printHeader}>
                <div style={styles.printBrand}>
                  <img src="/logo.jpg" alt="Logo" style={styles.printLogo} />
                  <div>
                    <h2 style={styles.printSchoolName}>ONNOROKOM ACADEMY</h2>
                    <span style={styles.printDocTitle}>Official Student Section Allocation Roster</span>
                  </div>
                </div>
                <div style={styles.printMeta}>
                  <div><strong>Class:</strong> {classInfo.name}</div>
                  <div><strong>Section:</strong> {activeSection.name}</div>
                  <div><strong>Total Students:</strong> {activeSection.students.length}</div>
                </div>
              </div>

              {/* Minimal Students Table */}
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={{ ...styles.th, width: 70, textAlign: 'center' }}>Roll</th>
                      <th style={styles.th}>Student ID</th>
                      <th style={styles.th}>Student Name</th>
                      <th style={{ ...styles.th, width: 140 }}>Admission Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSection.students.map((st) => (
                      <tr key={st.roll} style={styles.tr}>
                        <td style={styles.tdRoll}>{st.roll}</td>
                        <td style={styles.tdId}>
                          <code>
                            {st.studentId.length === 17
                              ? st.studentId.slice(0, 4) + '-' + st.studentId.slice(4, 8) + '-' + st.studentId.slice(8, 12) + '-' + st.studentId.slice(12)
                              : st.studentId}
                          </code>
                        </td>
                        <td style={styles.tdName}>{st.studentName}</td>
                        <td style={styles.tdDate}>
                          {st.confirmedAt ? new Date(st.confirmedAt).toLocaleDateString() : 'Confirmed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="no-print" style={styles.actionsRow}>
              <div style={styles.saveGroup}>
                <button
                  type="button"
                  onClick={handleSaveSections}
                  disabled={saving}
                  className="btn btn-primary"
                  style={styles.saveBtn}
                >
                  {saving ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save Sections'}
                </button>
                {saveSuccess && (
                  <span style={styles.saveSuccessText}>Sections saved successfully!</span>
                )}
              </div>

              <div style={styles.rightActions}>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-outline"
                  style={styles.printBtn}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  Print Section List
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                  style={styles.dialogCloseBtn}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

const styles: Record<string, React.CSSProperties> = {
  dialog: {
    maxWidth: 920,
    width: '95%',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    overflow: 'hidden',
  },
  header: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--slate-200)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#ffffff',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: 'var(--slate-400)',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    lineHeight: 1,
  },
  errorAlert: {
    margin: '1rem 1.5rem 0',
    padding: '0.75rem 1rem',
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertClose: {
    background: 'none',
    border: 'none',
    color: 'var(--danger-dark)',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  controlsRow: {
    padding: '1rem 1.5rem',
    background: 'var(--slate-50)',
    borderBottom: '1px solid var(--slate-200)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  statBadge: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  badgeLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
  },
  badgeVal: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
  },
  sizeSelectorGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  sizeLabel: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--slate-700)',
    marginRight: '0.25rem',
  },
  sizeBtn: {
    padding: '0.4rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid',
    fontSize: '0.825rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  actionBtnGroup: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  divideBtn: {
    padding: '0.55rem 1.1rem',
    fontSize: '0.875rem',
    fontWeight: 700,
  },
  demoSeedBtn: {
    padding: '0.55rem 0.85rem',
    fontSize: '0.825rem',
    fontWeight: 600,
  },
  tabsRow: {
    padding: '0.75rem 1.5rem',
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid var(--slate-200)',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: '#ffffff',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid',
    fontSize: '0.85rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  tabCount: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.1rem 0.45rem',
    borderRadius: 'var(--radius-full)',
  },
  rosterContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 1.5rem',
  },
  printHeader: {
    display: 'none',
    borderBottom: '2px solid #1e293b',
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
  },
  printBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  printLogo: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  printSchoolName: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  printDocTitle: {
    fontSize: '0.85rem',
    color: '#475569',
    fontWeight: 600,
  },
  printMeta: {
    marginTop: '0.75rem',
    display: 'flex',
    gap: '2rem',
    fontSize: '0.9rem',
    color: '#1e293b',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.875rem',
  },
  thRow: {
    background: 'var(--slate-50)',
    borderBottom: '1px solid var(--slate-200)',
  },
  th: {
    padding: '0.65rem 0.85rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--slate-600)',
    letterSpacing: '0.3px',
  },
  tr: {
    borderBottom: '1px solid var(--slate-100)',
  },
  tdRoll: {
    padding: '0.65rem 0.85rem',
    textAlign: 'center',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--primary)',
  },
  tdId: {
    padding: '0.65rem 0.85rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.825rem',
    color: 'var(--slate-700)',
  },
  tdName: {
    padding: '0.65rem 0.85rem',
    fontWeight: 700,
    color: 'var(--slate-900)',
  },
  tdDate: {
    padding: '0.65rem 0.85rem',
    fontSize: '0.8rem',
    color: 'var(--slate-500)',
  },
  actionsRow: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid var(--slate-200)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    background: '#ffffff',
    flexWrap: 'wrap',
  },
  saveGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  saveBtn: {
    padding: '0.6rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 700,
  },
  saveSuccessText: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--success-dark)',
  },
  rightActions: {
    display: 'flex',
    gap: '0.65rem',
  },
  printBtn: {
    padding: '0.6rem 1rem',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  dialogCloseBtn: {
    padding: '0.6rem 1rem',
    fontSize: '0.875rem',
  },
  loadingBox: {
    padding: '3rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--slate-200)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyBox: {
    padding: '3.5rem 1.5rem',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--slate-700)',
  },
};
