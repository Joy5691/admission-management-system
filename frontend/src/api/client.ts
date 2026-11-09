const getBaseUrl = () => (window as any).BACKEND_URL || 'http://localhost:8080';

export async function apiFetch(path: string, options?: RequestInit) {
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, options);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const code = body?.error?.code || 'UNKNOWN_ERROR';
      const message = body?.error?.message || `HTTP ${res.status}`;
      throw { code, message, status: res.status };
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (err: any) {
    if (err && err.code && err.status) throw err; // already our ApiError
    throw { code: 'NETWORK_ERROR', message: 'Cannot reach server. Please check your connection.', status: 0 };
  }
}

export function friendlyError(err: any): string {
  const code = err?.code || 'UNKNOWN_ERROR';
  switch (code) {
    case 'NO_SEATS':
      return 'No available seats in this class.';
    case 'ALREADY_APPLIED':
      return 'You already have an active application for this class.';
    case 'HOLD_EXPIRED':
      return 'Your hold has expired. Please apply again.';
    case 'INVALID_STUDENT_ID':
      return 'Student ID must be exactly 17 digits.';
    case 'NETWORK_ERROR':
      return 'Cannot reach server. Please check your connection.';
    default:
      return err?.message || 'An unexpected error occurred.';
  }
}
