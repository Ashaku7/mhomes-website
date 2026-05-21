"use client";

import React, { ReactNode } from "react";
import { useBooking } from "@/context/BookingContext";
import { BookingsClosedModal } from "@/components/BookingsClosedModal";

export function RootLayoutClient({ children }: { children: ReactNode }) {
  const { showBookingClosedModal, setShowBookingClosedModal } = useBooking();

  return (
    <>
      {children}
      <BookingsClosedModal
        open={showBookingClosedModal}
        onClose={() => setShowBookingClosedModal(false)}
      />
    </>
  );
}
