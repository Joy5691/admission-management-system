import React, { useState, useEffect } from 'react';

const STUDENT_ID_KEY = 'studentId';

interface Props {
  studentId: string;
  onStudentIdChange: (id: string) => void;
}

export function StudentIdBar({ studentId, onStudentIdChange }: Props) {
  const [input, setInput] = useState(studentId);
  const [error, setError] = useState('');

  useEffect(() => {
    setInput(studentId);
  }, [studentId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 17);
    setInput(val);
    if (val.length === 17) {
      setError('');
      localStorage.setItem(STUDENT_ID_KEY, val);
      onStudentIdChange(val);
    } else if (val.length > 0) {
      setError('Must be exactly 17 digits');
      onStudentIdChange('');
    } else {
      setError('');
      localStorage.removeItem(STUDENT_ID_KEY);
      onStudentIdChange('');
    }
  };

  const handleClear = () => {
    setInput('');
    setError('');
    localStorage.removeItem(STUDENT_ID_KEY);
    onStudentIdChange('');
  };

  const isComplete = input.length === 17;

  return (
    <div style={styles.container}>
      <div style={styles.inputWrapper}>
        <span style={styles.icon}>🪪</span>
        <input
          type="text"
          value={input}
          onChange={handleChange}
          maxLength={17}
          placeholder="Enter 17-digit Student ID"
          style={{
            ...styles.input,
            borderColor: error ? 'var(--danger)' : isComplete ? 'var(--success)' : 'var(--slate-600)',
          }}
        />
        {input.length > 0 && (
          <button
            onClick={handleClear}
            style={styles.clearBtn}
            title="Clear Student ID"
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      <div style={styles.meta}>
        <span
          style={{
            ...styles.counter,
            color: isComplete ? 'var(--success)' : error ? 'var(--danger)' : 'var(--slate-400)',
          }}
        >
          {input.length}/17
        </span>

        {isComplete && (
          <span style={styles.verifiedBadge}>
            <span style={styles.pulseDot} />
            Verified
          </span>
        )}
      </div>

      {error && <span style={styles.errorText}>{error}</span>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: '0.75rem',
    fontSize: '0.95rem',
    pointerEvents: 'none',
    opacity: 0.8,
  },
  input: {
    padding: '0.5rem 2rem 0.5rem 2.25rem',
    fontSize: '0.9rem',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--slate-600)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    minWidth: 230,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '1px',
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  clearBtn: {
    position: 'absolute',
    right: '0.65rem',
    background: 'none',
    border: 'none',
    color: 'var(--slate-400)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    padding: '0.2rem',
    borderRadius: 'var(--radius-full)',
    lineHeight: 1,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  counter: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    padding: '0.2rem 0.55rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 700,
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 6px #10b981',
  },
  errorText: {
    color: '#fb7185',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
};
