import { useEffect, useState } from 'react';

interface Props {
  expiresAt: string;
  onExpired?: () => void;
}

export function CountdownTimer({ expiresAt, onExpired }: Props) {
  const getSecondsLeft = () => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  };

  const [seconds, setSeconds] = useState(getSecondsLeft);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    setSeconds(getSecondsLeft());
    setFired(false);
  }, [expiresAt]);

  useEffect(() => {
    if (seconds <= 0) {
      if (!fired) {
        setFired(true);
        onExpired?.();
      }
      return;
    }
    const id = setTimeout(() => setSeconds(getSecondsLeft()), 1000);
    return () => clearTimeout(id);
  }, [seconds, fired, expiresAt, onExpired]);

  if (seconds <= 0) return <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>Expired</span>;

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const color = seconds < 60 ? '#e74c3c' : seconds < 180 ? '#f39c12' : '#27ae60';

  return (
    <span style={{ color, fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}
