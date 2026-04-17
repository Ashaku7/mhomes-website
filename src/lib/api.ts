// src/lib/api.ts
// Axios API client for Next.js frontend to call API routes

import axios from 'axios';

// Use relative paths for API calls (works on same domain)
// In development: http://localhost:3000/api/...
// In production: https://yourdomain.com/api/...
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// ─── Cookie Helpers ──────────────────────────────────────────────────────────

export const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
};

export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

// ─── Axios Instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach token from cookie on every request
api.interceptors.request.use((config) => {
  const token = getCookie('mhomes_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and redirect to login.
// EXCEPTION: getMe() (/api/auth/me) returning 401 just means "not logged in" — never redirect for it.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl: string = error.config?.url || '';
    const isGetMe = requestUrl.includes('/api/auth/me');
    if (error.response?.status === 401 && !isGetMe) {
      deleteCookie('mhomes_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'guest' | 'admin' | 'reception';
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface AvailableRoomsParams {
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface CreateBookingData {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  idProofType?: string;
  members?: { memberName: string; age?: number; relation?: string }[];
  roomIds: number[];
  checkIn: string;
  checkOut: string;
  totalGuests: number;
  bookingSource: 'online' | 'offline';
  notes?: string;
}

export interface UpdateRoomData {
  pricePerNight?: number;
  status?: 'active' | 'maintenance';
  description?: string;
  maxGuests?: number;
}

export interface BookingFilters {
  status?: 'pending' | 'confirmed' | 'cancelled';
  source?: 'online' | 'offline';
  date?: string;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (name: string, email: string, phone: string, password: string) =>
    api.post<{ success: boolean; data: AuthResponse }>('/api/auth/register', {
      name, email, phone, password,
    }),

  login: (email: string, password: string) =>
    api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', {
      email, password,
    }),

  getMe: () =>
    api.get<{ success: boolean; data: User }>('/api/auth/me'),
};

// ─── ROOMS ───────────────────────────────────────────────────────────────────

export const roomsApi = {
  getAvailableRooms: (checkIn: string, checkOut: string, guests: number) =>
    api.get('/api/rooms/available', {
      params: { checkIn, checkOut, guests },
    }),

  searchRooms: (checkIn: string, checkOut: string, roomType: string, roomCount: number) =>
    api.get('/api/rooms/search', {
      params: { checkIn, checkOut, roomType, roomCount },
    }),
};

// ─── BOOKINGS ────────────────────────────────────────────────────────────────

export const bookingsApi = {
  createBooking: (data: CreateBookingData) =>
    api.post('/api/bookings/online', data),

  confirmPayment: (
    bookingId: number,
    amount: number,
    paymentMethod: string,
    transactionId?: string
  ) =>
    api.post(`/api/bookings/${bookingId}/confirm-payment`, {
      amount, paymentMethod, transactionId,
    }),
};

// ─── ADMIN API ───────────────────────────────────────────────────────────────
// Helper function to make admin API calls with Clerk token

export const createAdminApi = (clerkToken: string | null) => {
  if (!clerkToken) {
    return null;
  }

  // Create a dedicated axios instance for admin routes with Clerk token
  const adminInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clerkToken}`
    },
    timeout: 10000,
  });

  return {
    getDashboard: () =>
      adminInstance.get('/api/admin/dashboard'),

    getAllBookings: (filters?: BookingFilters) =>
      adminInstance.get('/api/admin/bookings', { params: filters }),

    getBookingById: (id: number) =>
      adminInstance.get(`/api/admin/bookings/${id}`),

    updateBookingStatus: (id: number, bookingStatus: string, extraExpense?: string) =>
      adminInstance.patch(`/api/admin/bookings/${id}`, { bookingStatus, extraExpense }),

    cancelBooking: (id: number, reason?: string) =>
      adminInstance.patch(`/api/admin/bookings/${id}/cancel`, { reason }),

    getAllRooms: () =>
      adminInstance.get('/api/admin/rooms'),

    updateRoom: (id: number, data: UpdateRoomData) =>
      adminInstance.patch(`/api/admin/rooms/${id}`, data),

    getTodayActivity: () =>
      adminInstance.get('/api/admin/bookings/today'),

    searchPayments: (filters?: any) =>
      adminInstance.get('/api/admin/payments/search', { params: filters }),

    getTodayRevenue: () =>
      adminInstance.get('/api/admin/payments/today-revenue'),

    updatePayment: (id: number, data: any) =>
      adminInstance.patch(`/api/admin/payments/${id}`, data),

    cancelPayment: (id: number, reason?: string) =>
      adminInstance.patch(`/api/admin/payments/${id}/cancel`, { reason }),

    createWalkinBooking: (data: any) =>
      adminInstance.post('/api/admin/bookings/walkin', data),

    getCheckInRoomOptions: (bookingId: number) =>
      adminInstance.get(`/api/admin/bookings/${bookingId}/checkin-rooms`),

    checkInGuest: (bookingId: number, data: any) =>
      adminInstance.patch(`/api/admin/bookings/${bookingId}/checkin`, data),

    confirmPaymentByAdmin: (bookingId: number, data: any) =>
      adminInstance.patch(`/api/admin/bookings/${bookingId}/confirm-payment`, data),

    createInvoice: (bookingId: number, totalAmount: number) =>
      adminInstance.post('/api/admin/invoices', { bookingId, totalAmount }),

    getInvoiceByBookingId: (bookingId: number) =>
      adminInstance.get(`/api/admin/invoices/${bookingId}`),

    getInvoiceByNumber: (invoiceNumber: string) =>
      adminInstance.get(`/api/admin/invoices/number/${invoiceNumber}`),
  };
};

// Legacy adminApi - kept for backward compatibility
// DEPRECATED: Use createAdminApi(clerkToken) instead for protected routes
export const adminApi = {
  getDashboard: () =>
    api.get('/api/admin/dashboard'),

  getAllBookings: (filters?: BookingFilters) =>
    api.get('/api/admin/bookings', { params: filters }),

  getBookingById: (id: number) =>
    api.get(`/api/admin/bookings/${id}`),

  updateBookingStatus: (id: number, bookingStatus: string) =>
    api.patch(`/api/admin/bookings/${id}`, { bookingStatus }),

  cancelBooking: (id: number, reason?: string) =>
    api.patch(`/api/admin/bookings/${id}/cancel`, { reason }),

  getAllRooms: () =>
    api.get('/api/admin/rooms'),

  updateRoom: (id: number, data: UpdateRoomData) =>
    api.patch(`/api/admin/rooms/${id}`, data),

  getTodayActivity: () =>
    api.get('/api/admin/bookings/today'),
};

export default api;
