import { useEffect, useState, useCallback } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { Hold } from '../types';
import { CountdownTimer } from './CountdownTimer';

interface Props {
  holdId: string;
  studentId: string;
  onBack: () => void;
}

type Status = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

const STATUS_BADGE: Record<Status, React.CSSProperties> = {
  HELD: { background: '#f39c12', color: '#fff' },
  CONFIRMED: { background: '#27ae60', color: '#fff' },
  EXPIRED: { background: '#e74c3c', color: '#fff' },
  CANCELLED: { background: '#95a5a6', color: '#fff' },
};

const STATUS_LABEL: Record<Status, string> = {
  HELD: 'HELD',
  CONFIRMED: 'Admission Confirmed',
  EXPIRED: 'Hold Expired',
  CANCELLED: 'Cancelled',
};

export function ApplicationDetail({ holdId, studentId, onBack }: Props) {
  const [hold, setHold] = useState<Hold | null>(null);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localExpired, setLocalExpired] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchHold = useCallback(async () => {
    try {
      const data: Hold & { className?: string } = await apiFetch(`/holds/${holdId}`, {
        headers: studentId ? { 'X-Student-Id': studentId } : {},
      });
      setHold(data);
      if (data.className) setClassName(data.className);
      setError('');
      if (data.status !== 'HELD') setLocalExpired(false);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [holdId, studentId]);

  useEffect(() => {
    fetchHold();
    const id = setInterval(fetchHold, 3000);
    return () => clearInterval(id);
  }, [fetchHold]);

  const effectiveStatus: Status = (localExpired && hold?.status === 'HELD') ? 'EXPIRED' : (hold?.status as Status);
  const isTerminal = effectiveStatus === 'CONFIRMED' || effectiveStatus === 'EXPIRED' || effectiveStatus === 'CANCELLED';

  const handlePay = async () => {
    if (!hold || isTerminal) return;
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/holds/${holdId}/confirm`, { method: 'POST', headers: studentId ? { 'X-Student-Id': studentId } : {} });
      setSuccessMsg('Payment successful! Your admission is confirmed.');
      await fetchHold();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!hold || isTerminal) return;
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/holds/${holdId}`, { method: 'DELETE', headers: studentId ? { 'X-Student-Id': studentId } : {} });
      setSuccessMsg('Application cancelled.');
      onBack();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading application…</div>;

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backBtn}>← Back to Classes</button>
      <h2 style={styles.heading}>Application Detail</h2>

      {error && <div style={styles.errorBox}>{error}</div>}
      {successMsg && <div style={styles.successBox}>{successMsg}</div>}

      {hold && (
        <div style={styles.card}>
          {className && <h3 style={styles.clsName}>{className}</h3>}
          <div style={styles.row}>
            <span style={styles.fieldLabel}>Hold ID</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{hold.holdId}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.fieldLabel}>Status</span>
            <span style={{ ...styles.badge, ...STATUS_BADGE[effectiveStatus] }}>
              {STATUS_LABEL[effectiveStatus]}
            </span>
          </div>
          {(effectiveStatus === 'HELD') && hold.expiresAt && (
            <div style={styles.row}>
              <span style={styles.fieldLabel}>Time Remaining</span>
              <CountdownTimer
                expiresAt={hold.expiresAt}
                onExpired={() => setLocalExpired(true)}
              />
            </div>
          )}
          {effectiveStatus !== 'HELD' && hold.expiresAt && (
            <div style={styles.row}>
              <span style={styles.fieldLabel}>Expires At</span>
              <span>{new Date(hold.expiresAt).toLocaleString()}</span>
            </div>
          )}
          <div style={styles.actions}>
            <button
              style={{
                ...styles.payBtn,
                opacity: (isTerminal || actionLoading) ? 0.5 : 1,
                cursor: (isTerminal || actionLoading) ? 'not-allowed' : 'pointer',
              }}
              disabled={isTerminal || actionLoading}
              onClick={handlePay}
            >
              {actionLoading ? 'Processing…' : 'Pay Admission Fee'}
            </button>
            <button
              style={{
                ...styles.cancelBtn,
                opacity: (isTerminal || actionLoading) ? 0.5 : 1,
                cursor: (isTerminal || actionLoading) ? 'not-allowed' : 'pointer',
              }}
              disabled={isTerminal || actionLoading}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1.5rem', maxWidth: 600, margin: '0 auto' },
  heading: { color: '#2c3e50', marginBottom: '1.25rem' },
  loading: { padding: '2rem', textAlign: 'center', color: '#888' },
  errorBox: { padding: '1rem', background: '#fdecea', color: '#c0392b', borderRadius: 6, marginBottom: '1rem' },
  successBox: { padding: '1rem', background: '#eafaf1', color: '#1e8449', borderRadius: 6, marginBottom: '1rem' },
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  clsName: { color: '#2c3e50', margin: '0 0 1rem', fontSize: '1.2rem' },
  row: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' },
  fieldLabel: { minWidth: 130, color: '#777', fontWeight: 500 },
  badge: { padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, letterSpacing: 0.5 },
  actions: { display: 'flex', gap: '1rem', marginTop: '1.5rem' },
  payBtn: { flex: 1, padding: '0.75rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 600 },
  cancelBtn: { flex: 1, padding: '0.75rem', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 600 },
  backBtn: { background: 'none', border: 'none', color: '#2980b9', cursor: 'pointer', fontSize: '0.95rem', padding: '0 0 1rem', display: 'block' },
};
