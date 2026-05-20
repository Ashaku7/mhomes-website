import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    // Validate input
    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId is required" },
        { status: 400 }
      );
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(String(bookingId)) },
      include: { bookingRooms: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if booking is still in payment_pending status
    if (booking.bookingStatus !== "payment_pending") {
      return NextResponse.json(
        {
          success: false,
          message: "Booking is not in payment_pending status - cannot expire",
        },
        { status: 400 }
      );
    }

    // Mark booking as expired and release room locks
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(String(bookingId)) },
      data: {
        bookingStatus: "expired",
        expiresAt: null, // Clear expiry timer
        razorpayOrderId: null, // Clear order ID
      },
    });

    // Free the rooms by setting them back to active
    if (booking.bookingRooms && booking.bookingRooms.length > 0) {
      const roomIds = booking.bookingRooms.map((br) => br.roomId);
      await prisma.room.updateMany({
        where: { id: { in: roomIds } },
        data: { status: "active" },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          bookingId: updatedBooking.id,
          bookingReference: updatedBooking.bookingReference,
          bookingStatus: updatedBooking.bookingStatus,
          message: "Payment expired - booking cancelled",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[expire error]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to expire payment" },
      { status: 500 }
    );
  }
}
