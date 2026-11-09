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
      setError('Student ID must be exactly 17 digits.');
      onStudentIdChange('');
    } else {
      setError('');
      localStorage.removeItem(STUDENT_ID_KEY);
      onStudentIdChange('');
    }
  };

  return (
    <div style={styles.bar}>
      <label style={styles.label}>
        <strong>Student ID:</strong>
      </label>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        maxLength={17}
        placeholder="Enter 17-digit Student ID"
        style={{ ...styles.input, borderColor: error ? '#e74c3c' : '#ccc' }}
      />
      {error && <span style={styles.error}>{error}</span>}
      {studentId && <span style={styles.valid}>✓ ID set</span>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1.5rem',
    background: '#2c3e50',
    color: '#fff',
    flexWrap: 'wrap',
  },
  label: {
    whiteSpace: 'nowrap',
    color: '#ecf0f1',
  },
  input: {
    padding: '0.4rem 0.75rem',
    fontSize: '1rem',
    borderRadius: 4,
    border: '2px solid #ccc',
    minWidth: 220,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  error: {
    color: '#f1948a',
    fontSize: '0.85rem',
  },
  valid: {
    color: '#2ecc71',
    fontSize: '0.9rem',
  },
};
