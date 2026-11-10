import { useEffect, useState } from 'react';

interface Props {
  expiresAt: string;
  onExpired?: () => void;
  onSecondsChange?: (sec: number) => void;
}

export function CountdownTimer({ expiresAt, onExpired, onSecondsChange }: Props) {
  const getSecondsLeft = () => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  };

  const [seconds, setSeconds] = useState(getSecondsLeft);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const sec = getSecondsLeft();
    setSeconds(sec);
    onSecondsChange?.(sec);
    setFired(false);
  }, [expiresAt]);

  useEffect(() => {
    onSecondsChange?.(seconds);
    if (seconds <= 0) {
      if (!fired) {
        setFired(true);
        onExpired?.();
      }
      return;
    }
    const id = setTimeout(() => {
      const nextSec = getSecondsLeft();
      setSeconds(nextSec);
      onSecondsChange?.(nextSec);
    }, 1000);
    return () => clearTimeout(id);
  }, [seconds, fired, expiresAt, onExpired, onSecondsChange]);

  if (seconds <= 0) {
    return (
      <div style={styles.expiredWrapper}>
        <span style={styles.expiredDot} />
        <span style={styles.expiredText}>Expired</span>
      </div>
    );
  }

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const isUrgent = seconds < 60;
  const isWarning = seconds < 180 && !isUrgent;

  const color = isUrgent
    ? 'var(--danger)'
    : isWarning
    ? 'var(--warning-dark)'
    : 'var(--success-dark)';

  const bg = isUrgent
    ? 'var(--danger-light)'
    : isWarning
    ? 'var(--warning-light)'
    : 'var(--success-light)';

  const border = isUrgent
    ? 'var(--danger-border)'
    : isWarning
    ? 'var(--warning-border)'
    : 'var(--success-border)';

  return (
    <div style={{ ...styles.timerContainer, background: bg, borderColor: border }}>
      <span style={{ ...styles.dot, background: color }} />
      <span style={{ ...styles.digits, color }}>
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
      <span style={{ ...styles.label, color }}>remaining</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  timerContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.85rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid transparent',
    transition: 'all 0.3s ease',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
  },
  digits: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.15rem',
    fontWeight: 700,
    letterSpacing: '1px',
    lineHeight: 1,
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  expiredWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
  },
  expiredDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--danger)',
  },
  expiredText: {
    color: 'var(--danger-dark)',
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
};
