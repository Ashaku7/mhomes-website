import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      bookingId,
    } = await request.json();

    // Validate input
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "razorpayOrderId, razorpayPaymentId, razorpaySignature, and bookingId are required",
        },
        { status: 400 }
      );
    }

    // Verify payment signature
    const signatureData = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(signatureData)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      // Signature mismatch - potential fraud attempt
      console.error("[verify] Signature mismatch for payment", {
        bookingId,
        razorpayOrderId,
        expectedSignature,
        providedSignature: razorpaySignature,
      });

      // Mark booking as expired and release room lock
      await prisma.booking.update({
        where: { id: parseInt(String(bookingId)) },
        data: { bookingStatus: "expired" },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Payment verification failed - invalid signature",
        },
        { status: 400 }
      );
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(String(bookingId)) },
      include: {
        guest: true,
        bookingRooms: { include: { room: true } },
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    // Update booking and payment records in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update booking status to confirmed
      const updatedBooking = await tx.booking.update({
        where: { id: parseInt(String(bookingId)) },
        data: {
          bookingStatus: "confirmed",
          expiresAt: null, // Clear expiry timer
        },
      });

      // Update or create payment record with transaction ID
      const paymentRecord = await tx.payment.findFirst({
        where: { bookingId: parseInt(String(bookingId)) },
      });

      if (paymentRecord) {
        // Update existing payment record
        await tx.payment.update({
          where: { id: paymentRecord.id },
          data: {
            transactionId: razorpayPaymentId,
            paymentStatus: "paid",
            paymentDate: new Date(),
          },
        });
      } else {
        // Create new payment record (shouldn't happen but just in case)
        await tx.payment.create({
          data: {
            bookingId: parseInt(String(bookingId)),
            amount: booking.totalAmount,
            paymentMethod: "gateway",
            paymentStatus: "paid",
            transactionId: razorpayPaymentId,
            paymentDate: new Date(),
          },
        });
      }

      return updatedBooking;
    });

    // Fetch updated booking with all details for response
    const finalBooking = await prisma.booking.findUnique({
      where: { id: parseInt(String(bookingId)) },
      include: {
        guest: true,
        bookingRooms: { include: { room: true } },
        payments: true,
      },
    });

    // Send confirmation email after payment is verified
    if (finalBooking && finalBooking.bookingReference && finalBooking.guest && finalBooking.guest.email) {
      try {
        const { sendBookingConfirmation } = await import("@/lib/emailService");
        const roomType =
          finalBooking.bookingRooms && finalBooking.bookingRooms[0]
            ? finalBooking.bookingRooms[0].room.roomType
            : "premium";
        const roomCount = finalBooking.bookingRooms ? finalBooking.bookingRooms.length : 1;
        const totalAmount = Number(finalBooking.totalAmount) || 0;
        const couponDiscountAmount = Number(finalBooking.couponDiscount) || 0;
        const originalAmount = totalAmount + couponDiscountAmount;
        const couponCode = finalBooking.couponCode || undefined;
        const discountPercentage = couponDiscountAmount > 0 ? ((couponDiscountAmount / originalAmount) * 100) : undefined;

        console.log("[PAYMENT VERIFY] Sending confirmation email to:", finalBooking.guest.email);
        await sendBookingConfirmation(
          finalBooking.guest.fullName,
          finalBooking.guest.email,
          finalBooking.bookingReference,
          String(finalBooking.checkIn),
          String(finalBooking.checkOut),
          roomType,
          roomCount,
          totalAmount,
          originalAmount,
          couponCode,
          couponDiscountAmount,
          undefined,
          discountPercentage,
        );
      } catch (emailErr) {
        console.error("[PAYMENT VERIFY] Error sending confirmation email:", emailErr);
        // Don't break payment verification if email fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          bookingId: finalBooking?.id,
          bookingReference: finalBooking?.bookingReference,
          bookingStatus: finalBooking?.bookingStatus,
          totalAmount: finalBooking?.totalAmount,
          razorpayOrderId,
          razorpayPaymentId,
          message: "Payment verified and booking confirmed",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[verify error]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}
