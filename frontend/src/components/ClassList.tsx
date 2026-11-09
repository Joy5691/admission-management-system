import { useEffect, useState, useCallback } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { ClassInfo } from '../types';

interface Props {
  studentId: string;
  onApplied: (holdId: string) => void;
}

export function ClassList({ studentId, onApplied }: Props) {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<Record<string, string>>({});

  const fetchClasses = useCallback(async () => {
    try {
      const data = await apiFetch('/classes');
      setClasses(data || []);
      setError('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    const id = setInterval(fetchClasses, 4000);
    return () => clearInterval(id);
  }, [fetchClasses]);

  const handleApply = async (cls: ClassInfo) => {
    if (!studentId) return;
    setApplying(cls.id);
    setApplyError(prev => ({ ...prev, [cls.id]: '' }));
    try {
      const hold = await apiFetch(`/classes/${cls.id}/holds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': studentId,
        },
      });
      onApplied(hold.holdId);
    } catch (err) {
      setApplyError(prev => ({ ...prev, [cls.id]: friendlyError(err) }));
    } finally {
      setApplying(null);
    }
  };

  if (loading) return <div style={styles.loading}>Loading classes…</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Available Classes</h2>
      {error && <div style={styles.errorBox}>{error}</div>}
      {!error && classes.length === 0 && (
        <div style={styles.empty}>No classes available at this time.</div>
      )}
      <div style={styles.grid}>
        {classes.map(cls => (
          <div key={cls.id} style={styles.card}>
            <h3 style={styles.className}>{cls.name}</h3>
            <div style={styles.seatInfo}>
              <SeatRow label="Total Seats" value={cls.totalSeats} />
              <SeatRow label="Held" value={cls.heldSeats} color="#f39c12" />
              <SeatRow label="Confirmed" value={cls.confirmedSeats} color="#27ae60" />
              <SeatRow label="Available" value={cls.availableSeats} color={cls.availableSeats > 0 ? '#2980b9' : '#e74c3c'} />
            </div>
            {applyError[cls.id] && <div style={styles.applyError}>{applyError[cls.id]}</div>}
            <button
              style={{
                ...styles.applyBtn,
                opacity: (!studentId || cls.availableSeats === 0 || applying === cls.id) ? 0.5 : 1,
                cursor: (!studentId || cls.availableSeats === 0 || applying === cls.id) ? 'not-allowed' : 'pointer',
              }}
              disabled={!studentId || cls.availableSeats === 0 || applying === cls.id}
              onClick={() => handleApply(cls)}
            >
              {applying === cls.id ? 'Applying…' : cls.availableSeats === 0 ? 'No Seats' : 'Apply'}
            </button>
            {!studentId && (
              <p style={styles.hint}>Enter your Student ID above to apply.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SeatRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || '#333' }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1.5rem' },
  heading: { marginBottom: '1rem', color: '#2c3e50' },
  loading: { padding: '2rem', textAlign: 'center', color: '#888' },
  empty: { padding: '2rem', textAlign: 'center', color: '#888', background: '#f9f9f9', borderRadius: 8 },
  errorBox: { padding: '1rem', background: '#fdecea', color: '#c0392b', borderRadius: 6, marginBottom: '1rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  className: { margin: '0 0 0.75rem', color: '#2c3e50', fontSize: '1.1rem' },
  seatInfo: { marginBottom: '1rem' },
  applyBtn: {
    width: '100%',
    padding: '0.6rem',
    background: '#2980b9',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'background 0.2s',
  },
  applyError: { color: '#c0392b', fontSize: '0.85rem', marginBottom: '0.5rem', background: '#fdecea', padding: '0.4rem 0.6rem', borderRadius: 4 },
  hint: { fontSize: '0.78rem', color: '#999', marginTop: '0.5rem', textAlign: 'center' },
};
