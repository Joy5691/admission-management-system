import { useEffect, useState, useCallback } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { MyHold } from '../types';

interface Props {
  studentId: string;
  onViewHold: (holdId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  HELD: '#f39c12',
  CONFIRMED: '#27ae60',
  EXPIRED: '#e74c3c',
  CANCELLED: '#95a5a6',
};

export function MyApplications({ studentId, onViewHold }: Props) {
  const [holds, setHolds] = useState<MyHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHolds = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch('/me/holds', {
        headers: { 'X-Student-Id': studentId },
      });
      setHolds(data || []);
      setError('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    setLoading(true);
    fetchHolds();
    const id = setInterval(fetchHolds, 4000);
    return () => clearInterval(id);
  }, [fetchHolds]);

  if (!studentId) {
    return (
      <div style={styles.container}>
        <div style={styles.warn}>Please enter your Student ID to view your applications.</div>
      </div>
    );
  }

  if (loading) return <div style={styles.loading}>Loading applications…</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>My Applications</h2>
      {error && <div style={styles.errorBox}>{error}</div>}
      {!error && holds.length === 0 && (
        <div style={styles.empty}>No applications yet. Apply for a class to get started!</div>
      )}
      {holds.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Class</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Expires At</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {holds.map(h => (
              <tr
                key={h.holdId}
                style={styles.tr}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <td style={styles.td}>{h.className}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: STATUS_COLORS[h.status] || '#888', color: '#fff' }}>
                    {h.status}
                  </span>
                </td>
                <td style={styles.td}>{h.expiresAt ? new Date(h.expiresAt).toLocaleString() : '—'}</td>
                <td style={styles.td}>
                  <button style={styles.viewBtn} onClick={() => onViewHold(h.holdId)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1.5rem' },
  heading: { color: '#2c3e50', marginBottom: '1rem' },
  loading: { padding: '2rem', textAlign: 'center', color: '#888' },
  empty: { padding: '2rem', textAlign: 'center', color: '#888', background: '#f9f9f9', borderRadius: 8 },
  errorBox: { padding: '1rem', background: '#fdecea', color: '#c0392b', borderRadius: 6, marginBottom: '1rem' },
  warn: { padding: '1rem', background: '#fff9e6', color: '#856404', borderRadius: 6 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' },
  thead: { background: '#2c3e50', color: '#fff' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', color: '#ecf0f1', fontWeight: 600 },
  tr: { borderBottom: '1px solid #f0f0f0', background: '#fff', transition: 'background 0.15s', cursor: 'default' },
  td: { padding: '0.75rem 1rem' },
  badge: { padding: '0.25rem 0.65rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 },
  viewBtn: { padding: '0.3rem 0.9rem', background: '#2980b9', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 },
};
