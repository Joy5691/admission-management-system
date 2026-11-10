export interface ClassInfo {
  id: string;
  name: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

export interface Hold {
  holdId: string;
  classId: string;
  studentId?: string;
  status: 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  seatNumber?: number;
  createdAt?: string;
  confirmedAt?: string | null;
}

export interface MyHold extends Hold {
  className: string;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}
