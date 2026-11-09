import React, { useState } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { ClassInfo } from '../types';

interface Props {
  onClassCreated?: () => void;
}

const PRESET_CLASSES = [
  'Class 6 - Morning Shift',
  'Class 6 - Day Shift',
  'Class 7 - Morning Shift',
  'Class 7 - Day Shift',
  'Class 8 - Morning Shift',
  'Class 8 - Day Shift',
];

const SEAT_PRESETS = [30, 60, 100, 120, 150];

export function CreateClass({ onClassCreated }: Props) {
  const [name, setName] = useState('');
  const [totalSeats, setTotalSeats] = useState('120');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [seatsError, setSeatsError] = useState('');
  const [created, setCreated] = useState<ClassInfo | null>(null);

  const validate = () => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Class name is required.');
      valid = false;
    } else {
      setNameError('');
    }
    const seats = parseInt(totalSeats, 10);
    if (!totalSeats || isNaN(seats) || seats < 1) {
      setSeatsError('Total seats must be greater than 0.');
      valid = false;
    } else {
      setSeatsError('');
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    setCreated(null);
    try {
      const cls: ClassInfo = await apiFetch('/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), totalSeats: parseInt(totalSeats, 10) }),
      });
      setCreated(cls);
      setName('');
      setTotalSeats('120');
      onClassCreated?.();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const parsedSeats = parseInt(totalSeats, 10) || 0;
  const isMorning = name.toLowerCase().includes('morning');
  const isDay = name.toLowerCase().includes('day');

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div style={styles.adminBadge}>
          <span>⚙️</span>
          <span>School Administration Console</span>
        </div>
        <h1 style={styles.title}>Provision Academic Class</h1>
        <p style={styles.subtitle}>
          In this system, each academic shift constitutes its own distinct class with an isolated seat quota.
        </p>
      </div>

      <div style={styles.layout}>
        {/* Creation Form */}
        <div className="card" style={styles.formCard}>
          <form onSubmit={handleSubmit} noValidate>
            {/* Class Name Input */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Class & Shift Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Class 6 - Morning Shift"
                style={{ ...styles.input, borderColor: nameError ? 'var(--danger)' : 'var(--slate-300)' }}
              />
              {nameError && <span style={styles.fieldError}>{nameError}</span>}

              {/* Preset Shortcuts */}
              <div style={styles.presetsRow}>
                <span style={styles.presetLabel}>Quick Presets:</span>
                <div style={styles.presetChips}>
                  {PRESET_CLASSES.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setName(p);
                        setNameError('');
                      }}
                      style={styles.presetBtn}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Seats Input */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Total Seat Capacity <span style={styles.required}>*</span>
              </label>
              <div style={styles.seatsRow}>
                <input
                  type="number"
                  value={totalSeats}
                  onChange={e => setTotalSeats(e.target.value)}
                  placeholder="120"
                  min={1}
                  style={{
                    ...styles.input,
                    ...styles.seatsInput,
                    borderColor: seatsError ? 'var(--danger)' : 'var(--slate-300)',
                  }}
                />
                <div style={styles.seatPills}>
                  {SEAT_PRESETS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setTotalSeats(String(s));
                        setSeatsError('');
                      }}
                      style={{
                        ...styles.seatPillBtn,
                        background: totalSeats === String(s) ? 'var(--primary-light)' : '#fff',
                        borderColor: totalSeats === String(s) ? 'var(--primary)' : 'var(--slate-200)',
                        color: totalSeats === String(s) ? 'var(--primary)' : 'var(--slate-700)',
                      }}
                    >
                      {s} seats
                    </button>
                  ))}
                </div>
              </div>
              {seatsError && <span style={styles.fieldError}>{seatsError}</span>}
            </div>

            {/* Error Message */}
            {error && (
              <div style={styles.errorAlert}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {created && (
              <div style={styles.successAlert}>
                <span style={{ fontSize: '1.25rem' }}>🎉</span>
                <div>
                  <strong>Class provisioned successfully!</strong>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                    Created <strong>{created.name}</strong> with <strong>{created.totalSeats} seats</strong>.
                    <br />
                    Class ID: <code style={styles.createdCode}>{created.id}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating Class…' : '+ Provision Class'}
            </button>
          </form>
        </div>

        {/* Live Preview Card */}
        <div style={styles.previewCol}>
          <div style={styles.previewHeader}>
            <span style={styles.previewBadge}>👁️ Live Student View Preview</span>
          </div>
          <div className="card" style={styles.previewCard}>
            <span
              style={{
                ...styles.previewShift,
                background: isMorning ? 'var(--warning-light)' : isDay ? '#e0f2fe' : 'var(--primary-light)',
                color: isMorning ? 'var(--warning-dark)' : isDay ? '#0369a1' : 'var(--primary)',
              }}
            >
              {isMorning ? '☀️ Morning Shift' : isDay ? '🌤️ Day Shift' : '🏫 Academic Class'}
            </span>
            <h3 style={styles.previewTitle}>{name || 'Class 6 - Morning Shift'}</h3>

            <div style={styles.previewKpis}>
              <div style={styles.kpiItem}>
                <span style={styles.kpiLbl}>Total</span>
                <span style={styles.kpiNum}>{parsedSeats || 120}</span>
              </div>
              <div style={styles.kpiItem}>
                <span style={styles.kpiLbl}>Available</span>
                <span style={{ ...styles.kpiNum, color: 'var(--primary)' }}>{parsedSeats || 120}</span>
              </div>
              <div style={styles.kpiItem}>
                <span style={styles.kpiLbl}>Held</span>
                <span style={{ ...styles.kpiNum, color: 'var(--warning-dark)' }}>0</span>
              </div>
              <div style={styles.kpiItem}>
                <span style={styles.kpiLbl}>Confirmed</span>
                <span style={{ ...styles.kpiNum, color: 'var(--success-dark)' }}>0</span>
              </div>
            </div>

            <div style={styles.previewBtn}>Apply for Seat →</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem 1.5rem',
    maxWidth: 1040,
    margin: '0 auto',
  },
  header: {
    marginBottom: '2rem',
  },
  adminBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'var(--slate-100)',
    color: 'var(--slate-700)',
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.775rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem',
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
  layout: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '2rem',
    alignItems: 'start',
  },
  formCard: {
    padding: '2rem',
    background: '#fff',
  },
  fieldGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--slate-800)',
    marginBottom: '0.5rem',
  },
  required: {
    color: 'var(--danger)',
  },
  input: {
    width: '100%',
    padding: '0.7rem 0.9rem',
    fontSize: '0.95rem',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--slate-300)',
    background: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  },
  seatsRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  seatsInput: {
    maxWidth: 130,
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
  },
  seatPills: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  seatPillBtn: {
    padding: '0.45rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  presetsRow: {
    marginTop: '0.75rem',
  },
  presetLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--slate-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    display: 'block',
    marginBottom: '0.4rem',
  },
  presetChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  presetBtn: {
    background: 'var(--slate-100)',
    border: '1px solid var(--slate-200)',
    padding: '0.3rem 0.65rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.775rem',
    fontWeight: 600,
    color: 'var(--slate-700)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  fieldError: {
    color: 'var(--danger)',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginTop: '0.35rem',
    display: 'block',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.85rem 1rem',
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.25rem',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  successAlert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '1rem',
    background: 'var(--success-light)',
    border: '1px solid var(--success-border)',
    color: 'var(--success-dark)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.25rem',
    fontSize: '0.9rem',
  },
  createdCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    background: 'rgba(255,255,255,0.8)',
    padding: '0.1rem 0.35rem',
    borderRadius: 3,
  },
  submitBtn: {
    width: '100%',
    padding: '0.85rem',
    fontSize: '1rem',
    marginTop: '0.5rem',
  },
  previewCol: {
    position: 'sticky',
    top: '2rem',
  },
  previewHeader: {
    marginBottom: '0.75rem',
  },
  previewBadge: {
    fontSize: '0.775rem',
    fontWeight: 700,
    color: 'var(--slate-500)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  previewCard: {
    padding: '1.5rem',
    background: '#fff',
    border: '1.5px dashed var(--slate-300)',
  },
  previewShift: {
    display: 'inline-block',
    fontSize: '0.725rem',
    fontWeight: 700,
    padding: '0.2rem 0.55rem',
    borderRadius: 'var(--radius-full)',
    marginBottom: '0.5rem',
  },
  previewTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--slate-900)',
    marginBottom: '1.25rem',
  },
  previewKpis: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
    background: 'var(--slate-50)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.25rem',
    textAlign: 'center',
  },
  kpiItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  kpiLbl: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--slate-400)',
    textTransform: 'uppercase',
  },
  kpiNum: {
    fontSize: '1.1rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--slate-800)',
  },
  previewBtn: {
    background: 'var(--primary-gradient)',
    color: '#fff',
    textAlign: 'center',
    padding: '0.65rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: '0.9rem',
    opacity: 0.9,
  },
};
