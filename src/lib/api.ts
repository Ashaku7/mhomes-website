// src/lib/api.ts
// Axios API client for Next.js frontend to call API routes

import axios from "axios";

// Use relative paths for API calls (works on same domain)
// In development: http://localhost:3000/api/...
// In production: https://yourdomain.com/api/...
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// ─── Cookie Helpers ──────────────────────────────────────────────────────────

export const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
};

export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export const deleteCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

// ─── Axios Instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Attach token from cookie on every request
api.interceptors.request.use((config) => {
  const token = getCookie("MHOMES_token");
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
    const requestUrl: string = error.config?.url || "";
    const isGetMe = requestUrl.includes("/api/auth/me");
    if (error.response?.status === 401 && !isGetMe) {
      deleteCookie("MHOMES_token");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  role: "guest" | "admin" | "reception";
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
  bookingSource: "online" | "offline";
  notes?: string;
}

export interface UpdateRoomData {
  pricePerNight?: number;
  status?: "active" | "maintenance";
  description?: string;
  maxGuests?: number;
}

export interface BookingFilters {
  status?: "pending" | "confirmed" | "cancelled";
  source?: "online" | "offline";
  date?: string;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (name: string, email: string, phone: string, password: string) =>
    api.post<{ success: boolean; data: AuthResponse }>("/api/auth/register", {
      name,
      email,
      phone,
      password,
    }),

  login: (email: string, password: string) =>
    api.post<{ success: boolean; data: AuthResponse }>("/api/auth/login", {
      email,
      password,
    }),

  getMe: () => api.get<{ success: boolean; data: User }>("/api/auth/me"),
};

// ─── ROOMS ───────────────────────────────────────────────────────────────────

export const roomsApi = {
  getAvailableRooms: (checkIn: string, checkOut: string, guests: number) =>
    api.get("/api/rooms/available", {
      params: { checkIn, checkOut, guests },
    }),

  searchRooms: (
    checkIn: string,
    checkOut: string,
    roomType: string,
    roomCount: number,
  ) =>
    api.get("/api/rooms/search", {
      params: { checkIn, checkOut, roomType, roomCount },
    }),
};

// ─── BOOKINGS ────────────────────────────────────────────────────────────────

export const bookingsApi = {
  createBooking: (data: CreateBookingData) =>
    api.post("/api/bookings/online", data),

  confirmPayment: (
    bookingId: number,
    amount: number,
    paymentMethod: string,
    transactionId?: string,
  ) =>
    api.post(`/api/bookings/${bookingId}/confirm-payment`, {
      amount,
      paymentMethod,
      transactionId,
    }),
};

export default api;
