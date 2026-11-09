import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, friendlyError } from '../api/client';
import { Hold } from '../types';
import { CountdownTimer } from './CountdownTimer';

import { Language } from '../i18n';

interface Props {
  holdId: string;
  studentId: string;
  lang?: Language;
  onBack: () => void;
}

type Status = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; color: string; border: string; icon: string; bannerText: string }
> = {
  HELD: {
    label: 'HELD',
    bg: 'var(--warning-light)',
    color: 'var(--warning-dark)',
    border: 'var(--warning-border)',
    icon: '',
    bannerText: 'Seat is temporarily reserved in your name. Complete payment before the countdown expires to confirm your admission.',
  },
  CONFIRMED: {
    label: 'Admission Confirmed',
    bg: 'var(--success-light)',
    color: 'var(--success-dark)',
    border: 'var(--success-border)',
    icon: '',
    bannerText: 'Payment successful! Your admission seat has been permanently locked and confirmed.',
  },
  EXPIRED: {
    label: 'Hold Expired',
    bg: 'var(--danger-light)',
    color: 'var(--danger-dark)',
    border: 'var(--danger-border)',
    icon: '',
    bannerText: 'The hold duration has elapsed. This seat has been automatically released back to the general pool.',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'var(--slate-100)',
    color: 'var(--slate-600)',
    border: 'var(--slate-300)',
    icon: '',
    bannerText: 'This application was cancelled by the student. The seat has been returned to the available seats pool.',
  },
};

export function ApplicationDetail({ holdId, studentId, lang = 'en', onBack }: Props) {
  // const t = translations[lang] || translations.en;
  const [hold, setHold] = useState<Hold | null>(null);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localExpired, setLocalExpired] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

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

  const effectiveStatus: Status =
    localExpired && hold?.status === 'HELD' ? 'EXPIRED' : ((hold?.status || 'HELD') as Status);
  const isTerminal =
    effectiveStatus === 'CONFIRMED' || effectiveStatus === 'EXPIRED' || effectiveStatus === 'CANCELLED';

  const handlePay = async () => {
    if (!hold || isTerminal) return;
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/holds/${holdId}/confirm`, {
        method: 'POST',
        headers: studentId ? { 'X-Student-Id': studentId } : {},
      });
      setSuccessMsg('Payment received! Admission confirmed.');
      await fetchHold();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!hold || isTerminal) return;
    if (!window.confirm('Are you sure you want to cancel this reservation? The seat will be released immediately.')) {
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/holds/${holdId}`, {
        method: 'DELETE',
        headers: studentId ? { 'X-Student-Id': studentId } : {},
      });
      onBack();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(holdId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.HELD;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="skeleton" style={{ height: 40, width: 200, margin: '0 auto 1.5rem' }} />
          <div className="skeleton" style={{ height: 200, width: '100%', maxWidth: 640, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Breadcrumb Nav */}
      <button onClick={onBack} style={styles.backBtn} type="button">
        {lang === 'bn' ? '← ফিরে যান' : '← Back'}
      </button>

      {/* Main Container Card */}
      <div className="card" style={styles.mainCard}>
        {/* Status Hero Banner */}
        <div style={{ ...styles.heroBanner, background: config.bg, borderColor: config.border }}>
          <div style={styles.heroHeader}>
            <div style={styles.heroStatus}>
              <span style={styles.heroIcon}>{config.icon}</span>
              <div>
                <span style={{ ...styles.heroBadge, color: config.color }}>{config.label}</span>
                <p style={styles.heroDesc}>{config.bannerText}</p>
              </div>
            </div>

            {effectiveStatus === 'HELD' && hold?.expiresAt && (
              <div style={styles.timerBox}>
                <CountdownTimer expiresAt={hold.expiresAt} onExpired={() => setLocalExpired(true)} />
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div style={styles.errorAlert}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={styles.successAlert}>
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Application Details Body */}
        {hold && (
          <div style={styles.detailsBody}>
            {className && (
              <div style={styles.classBanner}>
                <span style={styles.metaLabel}>Academic Class & Shift</span>
                <h2 style={styles.classTitle}>{className}</h2>
              </div>
            )}

            <div style={styles.infoGrid}>
              <div style={styles.infoCell}>
                <span style={styles.cellLabel}>Hold Reference ID</span>
                <div style={styles.copyRow}>
                  <code style={styles.codeText}>{hold.holdId}</code>
                  <button onClick={handleCopyId} style={styles.copyBtn} type="button">
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={styles.infoCell}>
                <span style={styles.cellLabel}>Student Identity (17-digit)</span>
                <code style={styles.codeText}>{studentId || hold.studentId || '—'}</code>
              </div>

              <div style={styles.infoCell}>
                <span style={styles.cellLabel}>Application Status</span>
                <span style={{ ...styles.statusTag, background: config.bg, color: config.color }}>
                  {config.label}
                </span>
              </div>

              <div style={styles.infoCell}>
                <span style={styles.cellLabel}>Expiration Timestamp</span>
                <span style={styles.cellVal}>
                  {hold.expiresAt ? new Date(hold.expiresAt).toLocaleString() : '—'}
                </span>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div style={styles.actionsBar}>
              <button
                className="btn btn-success"
                style={{
                  ...styles.payBtn,
                  opacity: isTerminal || actionLoading ? 0.45 : 1,
                  cursor: isTerminal || actionLoading ? 'not-allowed' : 'pointer',
                }}
                disabled={isTerminal || actionLoading}
                onClick={handlePay}
              >
                {actionLoading ? 'Processing Payment…' : 'Pay Admission Fee'}
              </button>

              <button
                className="btn btn-outline"
                style={{
                  ...styles.cancelBtn,
                  opacity: isTerminal || actionLoading ? 0.45 : 1,
                  cursor: isTerminal || actionLoading ? 'not-allowed' : 'pointer',
                }}
                disabled={isTerminal || actionLoading}
                onClick={handleCancel}
              >
                Cancel Reservation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem 1.5rem',
    maxWidth: 760,
    margin: '0 auto',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: 700,
    fontSize: '0.925rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginBottom: '1.25rem',
    padding: 0,
  },
  mainCard: {
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
  },
  heroBanner: {
    padding: '1.75rem',
    borderBottom: '1px solid transparent',
  },
  heroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap',
  },
  heroStatus: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    maxWidth: 460,
  },
  heroIcon: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  heroBadge: {
    fontSize: '1.2rem',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    display: 'block',
    marginBottom: '0.25rem',
  },
  heroDesc: {
    fontSize: '0.875rem',
    color: 'var(--slate-600)',
    lineHeight: 1.45,
  },
  timerBox: {
    marginLeft: 'auto',
  },
  detailsBody: {
    padding: '2rem',
  },
  classBanner: {
    marginBottom: '1.75rem',
    paddingBottom: '1.25rem',
    borderBottom: '1px solid var(--slate-100)',
  },
  metaLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
    fontWeight: 700,
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '0.25rem',
  },
  classTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--slate-900)',
    letterSpacing: '-0.02em',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  infoCell: {
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
  },
  cellLabel: {
    fontSize: '0.725rem',
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
    fontWeight: 700,
    letterSpacing: '0.4px',
    display: 'block',
    marginBottom: '0.4rem',
  },
  cellVal: {
    fontSize: '0.925rem',
    fontWeight: 600,
    color: 'var(--slate-800)',
  },
  codeText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--slate-800)',
    wordBreak: 'break-all',
  },
  copyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  copyBtn: {
    background: '#fff',
    border: '1px solid var(--slate-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.2rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--slate-600)',
    cursor: 'pointer',
  },
  statusTag: {
    display: 'inline-block',
    padding: '0.25rem 0.65rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  actionsBar: {
    display: 'flex',
    gap: '1rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--slate-200)',
  },
  payBtn: {
    flex: 2,
    padding: '0.85rem 1.5rem',
    fontSize: '1rem',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.85rem 1rem',
    fontSize: '0.925rem',
    color: 'var(--danger-dark)',
    borderColor: 'var(--danger-border)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.85rem 1.25rem',
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-dark)',
    borderRadius: 'var(--radius-md)',
    margin: '1.5rem 2rem 0',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.85rem 1.25rem',
    background: 'var(--success-light)',
    border: '1px solid var(--success-border)',
    color: 'var(--success-dark)',
    borderRadius: 'var(--radius-md)',
    margin: '1.5rem 2rem 0',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
};
