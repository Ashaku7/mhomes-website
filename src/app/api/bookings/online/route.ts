import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

/**
 * POST /api/bookings/online
 * Create online booking with CAPTCHA verification
 * Body: { fullName, email, phone, members, roomIds, checkIn, checkOut, totalGuests, bookingSource, extraExpense, captchaToken }
 */
export async function POST(request: NextRequest) {
  try {
    // Dynamic imports to avoid tree-shaking issues
    const { createOnlineBooking } =
      await import("@/lib/services/bookingService");
    const { sendBookingConfirmation } = await import("@/lib/emailService");

    const body = await request.json();
    console.log(
      "[POST /api/bookings/online] Received body:",
      JSON.stringify(body, null, 2),
    );
    const {
      fullName,
      email,
      phone,
      members,
      roomIds,
      checkIn,
      checkOut,
      totalGuests,
      bookingSource,
      extraExpense,
      captchaToken,
    } = body;

    // ── Verify reCAPTCHA token ──────────────────────────────────────────
    if (!captchaToken) {
      return NextResponse.json(
        { success: false, message: "CAPTCHA token is required." },
        { status: 400 },
      );
    }

    try {
      const captchaResponse = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        null,
        {
          params: {
            secret: process.env.RECAPTCHA_SECRET_KEY,
            response: captchaToken,
          },
        },
      );

      if (!captchaResponse.data.success) {
        return NextResponse.json(
          { success: false, message: "CAPTCHA verification failed" },
          { status: 400 },
        );
      }
    } catch (captchaErr) {
      console.error("[CAPTCHA] Verification error:", captchaErr);
      return NextResponse.json(
        { success: false, message: "CAPTCHA verification failed" },
        { status: 400 },
      );
    }

    // Validate required fields
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { success: false, message: "fullName, email, and phone are required." },
        { status: 400 },
      );
    }

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one room must be selected." },
        { status: 400 },
      );
    }

    const result = await createOnlineBooking({
      fullName,
      email,
      phone,
      members: members || [],
      roomIds,
      checkIn,
      checkOut,
      totalGuests: parseInt(totalGuests),
      bookingSource: bookingSource || "online",
      extraExpense: extraExpense || null,
    });

    // Send confirmation email (do not break booking if email fails)
    if (
      result &&
      result.bookingReference &&
      result.guest &&
      result.guest.email
    ) {
      const roomType =
        result.rooms && result.rooms[0] ? result.rooms[0].roomType : "premium";
      const roomCount = result.rooms ? result.rooms.length : roomIds.length;
      const totalAmount = result.totalAmount || 0;

      sendBookingConfirmation(
        result.guest.fullName,
        result.guest.email,
        result.bookingReference,
        result.checkIn,
        result.checkOut,
        roomType,
        roomCount,
        totalAmount,
      ).catch((err) => {
        console.error("[BOOKING] Email failed but booking succeeded:", err);
      });
    }

    return NextResponse.json(
      { success: true, data: result, message: "Booking created successfully" },
      { status: 201 },
    );
  } catch (err) {
    console.error("[BOOKING] Error:", err);
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    const status = (err as any)?.status || 500;
    return NextResponse.json({ success: false, message: errorMsg }, { status });
  }
}
