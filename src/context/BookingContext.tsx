"use client";

import React, { createContext, useContext, useState } from "react";

interface BookingContextType {
  isBookingEnabled: boolean;
  showBookingClosedModal: boolean;
  setShowBookingClosedModal: (show: boolean) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [showBookingClosedModal, setShowBookingClosedModal] = useState(false);

  // Set to false to block bookings, true to enable
  const isBookingEnabled = true;

  return (
    <BookingContext.Provider
      value={{
        isBookingEnabled,
        showBookingClosedModal,
        setShowBookingClosedModal,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within BookingProvider");
  }
  return context;
}
