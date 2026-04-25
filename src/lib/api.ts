// src/lib/api.ts
// Axios API client for Next.js frontend to call API routes

import axios from "axios";

// Use relative paths for API calls (works on same domain)
// In development: http://localhost:3000/api/...
// In production: https://yourdomain.com/api/...
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// ─── Axios Instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

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
