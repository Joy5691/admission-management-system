import React, { useState } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { ClassInfo } from '../types';

export function CreateClass() {
  const [name, setName] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
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
    const seats = parseInt(totalSeats);
    if (!totalSeats || isNaN(seats) || seats < 1) {
      setSeatsError('Total seats must be a positive number.');
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
        body: JSON.stringify({ name: name.trim(), totalSeats: parseInt(totalSeats) }),
      });
      setCreated(cls);
      setName('');
      setTotalSeats('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Admin: Create Class</h2>
      <form onSubmit={handleSubmit} style={styles.form} noValidate>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Class Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Grade 10 Science"
            style={{ ...styles.input, borderColor: nameError ? '#e74c3c' : '#ccc' }}
          />
          {nameError && <span style={styles.fieldError}>{nameError}</span>}
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Total Seats</label>
          <input
            type="number"
            value={totalSeats}
            onChange={e => setTotalSeats(e.target.value)}
            placeholder="e.g. 30"
            min={1}
            style={{ ...styles.input, borderColor: seatsError ? '#e74c3c' : '#ccc', maxWidth: 150 }}
          />
          {seatsError && <span style={styles.fieldError}>{seatsError}</span>}
        </div>
        {error && <div style={styles.errorBox}>{error}</div>}
        {created && (
          <div style={styles.successBox}>
            <strong>Class created successfully!</strong>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              <div>Name: <strong>{created.name}</strong></div>
              <div>Total Seats: <strong>{created.totalSeats}</strong></div>
              <div>Class ID: <code style={{ fontSize: '0.85rem' }}>{created.id}</code></div>
            </div>
          </div>
        )}
        <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Creating…' : 'Create Class'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1.5rem', maxWidth: 500 },
  heading: { color: '#2c3e50', marginBottom: '1.5rem' },
  form: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.25rem' },
  label: { fontWeight: 600, color: '#444', fontSize: '0.95rem' },
  input: { padding: '0.55rem 0.75rem', fontSize: '1rem', borderRadius: 5, border: '2px solid #ccc', outline: 'none' },
  fieldError: { color: '#e74c3c', fontSize: '0.82rem' },
  errorBox: { padding: '0.75rem 1rem', background: '#fdecea', color: '#c0392b', borderRadius: 6, marginBottom: '1rem' },
  successBox: { padding: '0.75rem 1rem', background: '#eafaf1', color: '#1e8449', borderRadius: 6, marginBottom: '1rem' },
  submitBtn: { width: '100%', padding: '0.75rem', background: '#8e44ad', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 700, cursor: 'pointer' },
};
