"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "@/context/BookingContext";

interface ProtectedBookingButtonProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function ProtectedBookingButton({
  children,
  className,
  style,
  onClick,
}: ProtectedBookingButtonProps) {
  const router = useRouter();
  const { isBookingEnabled, setShowBookingClosedModal } = useBooking();

  const handleClick = () => {
    if (!isBookingEnabled) {
      setShowBookingClosedModal(true);
      return;
    }
    
    // If bookings are enabled, navigate to reservation
    if (onClick) {
      onClick();
    } else {
      router.push("/reservation");
    }
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={style}
      type="button"
    >
      {children}
    </button>
  );
}
