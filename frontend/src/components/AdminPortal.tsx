import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { ClassInfo } from '../types';
import { SectionDividerModal } from './SectionDividerModal';

const CLASS_OPTIONS = [
  'Playgroup',
  'Nursery',
  'KG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
  'Custom...',
];

const SHIFT_OPTIONS = [
  'Morning Shift',
  'Day Shift',
  'Evening Shift',
];

interface AdminPortalProps {
  onViewClassSeatMap?: (classId: string) => void;
  onLogout: () => void;
}

export function AdminPortal({ onLogout }: AdminPortalProps) {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSectionClass, setSelectedSectionClass] = useState<ClassInfo | null>(null);

  // Seat edit state
  const [editingSeats, setEditingSeats] = useState<Record<string, number>>({});
  const [savingClassId, setSavingClassId] = useState<string | null>(null);
  const [seatSaveFeedback, setSeatSaveFeedback] = useState<{ classId: string; success: boolean; msg: string } | null>(null);

  // Form State
  const [selectedClassLevel, setSelectedClassLevel] = useState('Class 6');
  const [customClassName, setCustomClassName] = useState('');
  const [selectedShift, setSelectedShift] = useState('Morning Shift');
  const [totalSeats, setTotalSeats] = useState(120);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calculated Class Name
  const finalClassName = useMemo(() => {
    if (selectedClassLevel === 'Custom...') {
      return customClassName ? customClassName + ' - ' + selectedShift : selectedShift;
    }
    return selectedClassLevel + ' - ' + selectedShift;
  }, [selectedClassLevel, customClassName, selectedShift]);

  // Fetch classes
  const loadClasses = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await apiFetch('/classes');
      setClasses(data);
    } catch {
      // ignore poll errors
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses(true);
    const interval = setInterval(() => loadClasses(false), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalClassName.trim()) {
      setFeedback({ type: 'error', message: 'Class name cannot be empty.' });
      return;
    }
    if (totalSeats <= 0) {
      setFeedback({ type: 'error', message: 'Seats must be greater than 0.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await apiFetch('/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: finalClassName, totalSeats }),
      });
      setFeedback({
        type: 'success',
        message: 'Successfully created "' + created.name + '" with ' + created.totalSeats + ' seats!',
      });
      loadClasses(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: friendlyError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSeat = (classId: string, currentTotal: number, confirmedCount: number, delta: number) => {
    setEditingSeats((prev) => {
      const current = prev[classId] ?? currentTotal;
      const next = Math.max(confirmedCount, current + delta);
      return { ...prev, [classId]: next };
    });
  };

  const handleSeatInputChange = (classId: string, confirmedCount: number, val: number) => {
    setEditingSeats((prev) => ({
      ...prev,
      [classId]: Math.max(confirmedCount, val || 0),
    }));
  };

  const handleSaveSeats = async (cls: ClassInfo) => {
    const targetSeats = editingSeats[cls.id] ?? cls.totalSeats;
    if (targetSeats === cls.totalSeats) return;
    if (targetSeats < cls.confirmedSeats) {
      setSeatSaveFeedback({ classId: cls.id, success: false, msg: 'Min ' + cls.confirmedSeats + ' seats' });
      return;
    }

    setSavingClassId(cls.id);
    setSeatSaveFeedback(null);
    try {
      const updated = await apiFetch('/classes/' + cls.id + '/seats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalSeats: targetSeats }),
      });
      setClasses((prev) =>
        prev.map((c) =>
          c.id === cls.id
            ? { ...c, totalSeats: updated.totalSeats, availableSeats: updated.availableSeats }
            : c
        )
      );
      setEditingSeats((prev) => {
        const next = { ...prev };
        delete next[cls.id];
        return next;
      });
      setSeatSaveFeedback({ classId: cls.id, success: true, msg: 'Saved!' });
      setTimeout(() => setSeatSaveFeedback(null), 2500);
    } catch (err: any) {
      setSeatSaveFeedback({ classId: cls.id, success: false, msg: friendlyError(err) });
    } finally {
      setSavingClassId(null);
    }
  };

  // Global Metrics
  const totalCapacity = classes.reduce((sum, c) => sum + c.totalSeats, 0);
  const totalHeld = classes.reduce((sum, c) => sum + c.heldSeats, 0);
  const totalConfirmed = classes.reduce((sum, c) => sum + c.confirmedSeats, 0);
  const totalAvailable = classes.reduce((sum, c) => sum + c.availableSeats, 0);

  return (
    <div style={styles.container} className="animate-fade-in admin-container-responsive">
      {/* Top Header */}
      <div style={styles.topHeader} className="admin-header-responsive">
        <div>
          <h1 style={styles.title}>Admin Admission & Shift Management</h1>
        </div>

        <button onClick={onLogout} className="btn btn-outline" style={styles.logoutBtn} type="button">
          Exit Admin Mode
        </button>
      </div>

      {/* Compact Global Stat Metrics Overview */}
      <div className="card admin-overview-card" style={styles.overviewCard}>
        <div style={styles.metricsRow} className="admin-metrics-row-responsive">
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>Total Classes</span>
            <span style={styles.metricVal}>{classes.length}</span>
          </div>
          <div style={styles.metricDivider} className="metric-divider" />
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>Total Capacity</span>
            <span style={styles.metricVal}>{totalCapacity}</span>
          </div>
          <div style={styles.metricDivider} className="metric-divider" />
          <div style={styles.metricItem}>
            <span style={{ ...styles.metricLabel, color: 'var(--primary)' }}>Available Seats</span>
            <span style={{ ...styles.metricVal, color: 'var(--primary)' }}>{totalAvailable}</span>
          </div>
          <div style={styles.metricDivider} className="metric-divider" />
          <div style={styles.metricItem}>
            <span style={{ ...styles.metricLabel, color: 'var(--warning-dark)' }}>Held</span>
            <span style={{ ...styles.metricVal, color: 'var(--warning-dark)' }}>{totalHeld}</span>
          </div>
          <div style={styles.metricDivider} className="metric-divider" />
          <div style={styles.metricItem}>
            <span style={{ ...styles.metricLabel, color: 'var(--success-dark)' }}>Confirmed</span>
            <span style={{ ...styles.metricVal, color: 'var(--success-dark)' }}>{totalConfirmed}</span>
          </div>
        </div>

        {/* Global Occupancy Bar */}
        <div style={styles.globalProgressWrapper}>
          <div style={styles.globalProgressBar}>
            <div
              style={{
                width: (totalCapacity > 0 ? (totalConfirmed / totalCapacity) * 100 : 0) + '%',
                background: 'var(--success-dark)',
              }}
            />
            <div
              style={{
                width: (totalCapacity > 0 ? (totalHeld / totalCapacity) * 100 : 0) + '%',
                background: 'var(--warning)',
              }}
            />
          </div>
          <div style={styles.globalProgressLabels}>
            <span>{totalCapacity > 0 ? Math.round(((totalConfirmed + totalHeld) / totalCapacity) * 100) : 0}% School Occupancy</span>
            <span>{totalConfirmed} of {totalCapacity} Seats Filled</span>
          </div>
        </div>
      </div>

      {/* Main Split: Form on Left, Live Shift Roster on Right */}
      <div style={styles.mainGrid} className="admin-main-grid-responsive">
        {/* Left Column: Create Class & Shift Form */}
        <div className="card admin-form-card-responsive" style={styles.cardSection}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Create Class & Shift</h2>
          </div>

          {feedback && (
            <div
              style={{
                ...styles.feedbackAlert,
                background: feedback.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                borderColor: feedback.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)',
                color: feedback.type === 'success' ? 'var(--success-dark)' : 'var(--danger-dark)',
              }}
            >
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: feedback.type === 'success' ? 'var(--success-dark)' : 'var(--danger-dark)', marginRight: 8 }} />
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleCreate} style={styles.form}>
            {/* Class Dropdown */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Select Class Level
                <span style={styles.required}>*</span>
              </label>
              <select
                value={selectedClassLevel}
                onChange={(e) => setSelectedClassLevel(e.target.value)}
                style={styles.select} className="admin-select-responsive"
              >
                {CLASS_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            {selectedClassLevel === 'Custom...' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Custom Class Name</label>
                <input
                  type="text"
                  value={customClassName}
                  onChange={(e) => setCustomClassName(e.target.value)}
                  placeholder="e.g. Higher Secondary Science"
                  style={styles.input} className="admin-input-responsive"
                />
              </div>
            )}

            {/* Shift Dropdown */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Select Shift
                <span style={styles.required}>*</span>
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                style={styles.select}
              >
                {SHIFT_OPTIONS.map((sh) => (
                  <option key={sh} value={sh}>{sh}</option>
                ))}
              </select>
            </div>

            {/* Name Preview */}
            <div style={styles.previewBox}>
              <span style={styles.previewLabel}>Generated Class & Shift Name:</span>
              <strong style={styles.previewName}>{finalClassName}</strong>
            </div>

            {/* Total Seats Input & Presets */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Total Seat Capacity
                <span style={styles.required}>*</span>
              </label>
              <div style={styles.seatInputWrapper}>
                <input
                  type="number"
                  min="1"
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(Math.max(1, parseInt(e.target.value) || 1))}
                  style={styles.input}
                  required
                />
                <span style={styles.seatUnit}>Seats</span>
              </div>

              {/* Quick Stepper Pills */}
              <div style={styles.stepperRow}>
                {[30, 50, 60, 100, 120].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTotalSeats(count)}
                    style={{
                      ...styles.stepperPill,
                      borderColor: totalSeats === count ? 'var(--primary)' : 'var(--slate-200)',
                      background: totalSeats === count ? 'var(--primary-light)' : '#ffffff',
                      color: totalSeats === count ? 'var(--primary)' : 'var(--slate-600)',
                      fontWeight: totalSeats === count ? 700 : 500,
                    }}
                  >
                    {count} seats
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={styles.submitBtn}
            >
              {submitting ? 'Creating Class...' : 'Create Class & Open Admission'}
            </button>
          </form>
        </div>

        {/* Right Column: Live Shift Roster */}
        <div className="card admin-roster-card-responsive" style={styles.cardSection}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Live Class & Shift Roster</h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
              Loading live shifts...
            </div>
          ) : classes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
              No classes created yet. Use the form on the left to add your first class!
            </div>
          ) : (
            <div style={styles.classList}>
              {classes.map((cls) => {
                const occupancy = cls.totalSeats > 0 ? Math.round(((cls.confirmedSeats + cls.heldSeats) / cls.totalSeats) * 100) : 0;
                const currentSeats = editingSeats[cls.id] ?? cls.totalSeats;
                const isModified = currentSeats !== cls.totalSeats;
                const isSavingThis = savingClassId === cls.id;
                const feedbackForThis = seatSaveFeedback?.classId === cls.id ? seatSaveFeedback : null;

                return (
                  <div key={cls.id} style={styles.classItem}>
                    <div style={styles.classItemHeader}>
                      <div>
                        <strong style={styles.className}>{cls.name}</strong>
                        <div style={styles.seatPillsRow}>
                          <span style={styles.availPill}>{cls.availableSeats} Available</span>
                          <span style={styles.heldPill}>{cls.heldSeats} Held</span>
                          <span style={styles.confPill}>{cls.confirmedSeats} Confirmed</span>
                          <span style={styles.totalPill}>Total: {cls.totalSeats}</span>
                        </div>
                      </div>

                      <div style={styles.actionsCluster} className="class-actions-cluster-responsive">
                        <button
                          type="button"
                          onClick={() => setSelectedSectionClass(cls)}
                          className="btn btn-primary"
                          style={styles.divideSectionsBtn}
                        >
                          Divide Sections
                        </button>

                        {/* Increase Seat + and Save Control */}
                        <div style={styles.seatAdjustBox} className="seat-adjust-box-responsive">
                          <button
                            type="button"
                            onClick={() => handleAdjustSeat(cls.id, cls.totalSeats, cls.confirmedSeats, -1)}
                            disabled={currentSeats <= cls.confirmedSeats || isSavingThis}
                            style={styles.stepperMiniBtn}
                            title="Decrease seat (-1)"
                          >
                            –
                          </button>
                          <input
                            type="number"
                            min={cls.confirmedSeats}
                            value={currentSeats}
                            onChange={(e) => handleSeatInputChange(cls.id, cls.confirmedSeats, parseInt(e.target.value) || 0)}
                            style={styles.stepperNumberInput}
                            title="Total capacity"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustSeat(cls.id, cls.totalSeats, cls.confirmedSeats, +1)}
                            disabled={isSavingThis}
                            style={styles.stepperMiniBtn}
                            title="Increase seat (+1)"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustSeat(cls.id, cls.totalSeats, cls.confirmedSeats, +10)}
                            disabled={isSavingThis}
                            style={{ ...styles.stepperMiniBtn, width: 'auto', padding: '0 5px', fontSize: '0.72rem', fontWeight: 700 }}
                            title="Increase seat (+10)"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSeats(cls)}
                            disabled={isSavingThis || !isModified}
                            className="btn btn-primary"
                            style={{
                              ...styles.saveSeatsBtn,
                              background: isModified ? 'var(--primary)' : 'var(--slate-200)',
                              color: isModified ? '#ffffff' : 'var(--slate-500)',
                              borderColor: isModified ? 'var(--primary)' : 'var(--slate-300)',
                              cursor: isModified ? 'pointer' : 'default',
                            }}
                          >
                            {isSavingThis ? '...' : 'Save'}
                          </button>
                        </div>

                        {feedbackForThis && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: feedbackForThis.success ? 'var(--success-dark)' : 'var(--danger-dark)',
                              marginLeft: 4,
                            }}
                          >
                            {feedbackForThis.msg}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={styles.progressBar}>
                      <div
                        style={{
                          width: ((cls.confirmedSeats / cls.totalSeats) * 100) + '%',
                          background: 'var(--success-dark)',
                        }}
                      />
                      <div
                        style={{
                          width: ((cls.heldSeats / cls.totalSeats) * 100) + '%',
                          background: 'var(--warning)',
                        }}
                      />
                    </div>
                    <div style={styles.occupancyText}>
                      <span>{occupancy}% Occupied</span>
                      <span>{cls.availableSeats === 0 ? 'FULL' : 'OPEN'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {selectedSectionClass && (
        <SectionDividerModal
          classInfo={selectedSectionClass}
          onClose={() => setSelectedSectionClass(null)}
          onSectionsSaved={() => loadClasses(false)}
        />
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
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    letterSpacing: '-0.02em',
    marginBottom: '0.4rem',
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    color: 'var(--slate-600)',
  },
  overviewCard: {
    padding: '0.85rem 1.25rem',
    marginBottom: '1.75rem',
    background: '#ffffff',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  metricsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    flex: '1 1 auto',
  },
  metricDivider: {
    width: 1,
    height: 32,
    background: 'var(--slate-200)',
  },
  metricLabel: {
    fontSize: '0.675rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
    letterSpacing: '0.5px',
  },
  metricVal: {
    fontSize: '1.35rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-900)',
    lineHeight: 1.1,
  },
  globalProgressWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  globalProgressBar: {
    height: 5,
    borderRadius: 'var(--radius-full)',
    background: 'var(--slate-100)',
    display: 'flex',
    overflow: 'hidden',
  },
  globalProgressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--slate-500)',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 450px) 1fr',
    gap: '1.75rem',
    alignItems: 'start',
  },
  cardSection: {
    padding: '1.75rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid var(--slate-100)',
    paddingBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    margin: 0,
  },
  feedbackAlert: {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: '1px solid transparent',
    marginBottom: '1.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--slate-700)',
  },
  required: {
    color: 'var(--danger)',
    marginLeft: '0.25rem',
  },
  select: {
    padding: '0.75rem 0.9rem',
    border: '1px solid var(--slate-300)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.925rem',
    fontFamily: 'inherit',
    background: '#ffffff',
    outline: 'none',
  },
  input: {
    padding: '0.75rem 0.9rem',
    border: '1px solid var(--slate-300)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.925rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  previewBox: {
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  previewLabel: {
    fontSize: '0.725rem',
    color: 'var(--slate-500)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  previewName: {
    fontSize: '1rem',
    color: 'var(--primary-dark)',
  },
  seatInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  seatUnit: {
    position: 'absolute',
    right: '1rem',
    fontSize: '0.85rem',
    color: 'var(--slate-400)',
    fontWeight: 600,
  },
  stepperRow: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
    marginTop: '0.35rem',
  },
  stepperPill: {
    padding: '0.25rem 0.6rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--slate-200)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitBtn: {
    marginTop: '0.5rem',
    padding: '0.9rem 1.5rem',
    fontSize: '1rem',
  },
  classList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '620px',
    overflowY: 'auto',
    paddingRight: '0.35rem',
  },
  classItem: {
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem 1.25rem',
  },
  classItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
  },
  className: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--slate-900)',
    display: 'block',
    marginBottom: '0.35rem',
  },
  seatPillsRow: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  availPill: {
    fontSize: '0.725rem',
    fontWeight: 700,
    background: 'var(--success-light)',
    color: 'var(--success-dark)',
    padding: '0.15rem 0.5rem',
    borderRadius: 'var(--radius-full)',
  },
  heldPill: {
    fontSize: '0.725rem',
    fontWeight: 700,
    background: 'var(--warning-light)',
    color: 'var(--warning-dark)',
    padding: '0.15rem 0.5rem',
    borderRadius: 'var(--radius-full)',
  },
  confPill: {
    fontSize: '0.725rem',
    fontWeight: 700,
    background: 'var(--primary-light)',
    color: 'var(--primary)',
    padding: '0.15rem 0.5rem',
    borderRadius: 'var(--radius-full)',
  },
  totalPill: {
    fontSize: '0.725rem',
    fontWeight: 600,
    background: '#ffffff',
    color: 'var(--slate-600)',
    padding: '0.15rem 0.5rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--slate-200)',
  },
  actionsCluster: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  divideSectionsBtn: {
    padding: '0.45rem 0.85rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    borderRadius: 'var(--radius-sm)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  seatAdjustBox: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#ffffff',
    border: '1px solid var(--slate-300)',
    borderRadius: 'var(--radius-md)',
    padding: '2px',
    gap: '3px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  stepperMiniBtn: {
    width: 26,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--slate-100)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--slate-700)',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.15s ease',
  },
  stepperNumberInput: {
    width: 48,
    height: 28,
    textAlign: 'center',
    border: 'none',
    background: 'transparent',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: 'var(--slate-900)',
    outline: 'none',
    padding: 0,
  },
  saveSeatsBtn: {
    padding: '0.3rem 0.65rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: 6,
    borderRadius: 'var(--radius-full)',
    background: 'var(--slate-200)',
    display: 'flex',
    overflow: 'hidden',
    marginBottom: '0.4rem',
  },
  occupancyText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.725rem',
    color: 'var(--slate-500)',
    fontWeight: 600,
  },
};
