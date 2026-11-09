import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { ApplicationDetail } from '../components/ApplicationDetail';
import { CountdownTimer } from '../components/CountdownTimer';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Frontend Application Flow & Timer Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CountdownTimer displays remaining time and flips to Expired when time runs out', () => {
    vi.useFakeTimers();
    const now = new Date('2026-11-01T12:00:00Z').getTime();
    vi.setSystemTime(now);

    const onExpired = vi.fn();
    const expiresAt = new Date(now + 2000).toISOString();

    render(<CountdownTimer expiresAt={expiresAt} onExpired={onExpired} />);
    expect(screen.getByText('00:02')).toBeDefined();

    // Advance system time past expiry and fire intervals
    act(() => {
      vi.setSystemTime(now + 3000);
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Expired')).toBeDefined();
    expect(onExpired).toHaveBeenCalled();
  });

  it('ApplicationDetail disables Pay Admission Fee button when hold is EXPIRED', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        holdId: 'h-12345',
        classId: 'c-67890',
        status: 'EXPIRED',
        expiresAt: new Date(Date.now() - 5000).toISOString(),
      }),
    });

    render(
      <ApplicationDetail
        holdId="h-12345"
        studentId="20152691234567890"
        onBack={() => {}}
      />
    );

    // Wait for the hold details to load
    expect(await screen.findByText('Hold Expired')).toBeDefined();

    // Pay button must be disabled
    const payBtn = screen.getByRole('button', { name: /Pay Admission Fee/i }) as HTMLButtonElement;
    expect(payBtn.disabled).toBe(true);
  });

  it('ApplicationDetail displays an error alert when the server returns an error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: { code: 'HOLD_NOT_FOUND', message: 'Hold not found on server.' },
      }),
    });

    render(
      <ApplicationDetail
        holdId="h-invalid"
        studentId="20152691234567890"
        onBack={() => {}}
      />
    );

    // Assert that the human-readable error alert is shown in the UI
    expect(await screen.findByText('Hold not found on server.')).toBeDefined();
  });
});
