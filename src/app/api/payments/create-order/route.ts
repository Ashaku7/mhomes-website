import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount } = await request.json();

    // Validate input
    if (!bookingId || !amount) {
      return NextResponse.json(
        { success: false, message: "bookingId and amount are required" },
        { status: 400 }
      );
    }

    // Fetch booking to verify it exists and is in correct status
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(String(bookingId)) },
      include: { guest: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.bookingStatus !== "payment_pending") {
      return NextResponse.json(
        { success: false, message: "Booking is not in payment_pending status" },
        { status: 400 }
      );
    }

    // Create Razorpay order
    // Amount must be in paise (multiply by 100)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `booking_${bookingId}_${Date.now()}`,
      notes: {
        bookingId: bookingId,
        bookingReference: booking.bookingReference,
        guestEmail: booking.guest.email,
        guestPhone: booking.guest.phone,
      },
    });

    // Update booking with Razorpay order ID and expiry time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(String(bookingId)) },
      data: {
        razorpayOrderId: razorpayOrder.id,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: razorpayOrder.id,
          amount: amount,
          currency: "INR",
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          bookingReference: booking.bookingReference,
          expiresAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[create-order error]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
