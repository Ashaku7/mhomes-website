import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // ─── Security: Verify Cron Secret ──────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      console.error("Unauthorized cron attempt - invalid authorization header");
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // ─── Find Expired Payment Pending Bookings ────────────────────────────
    const now = new Date();
    console.log(`[Cron] Starting cleanup at ${now.toISOString()}`);

    const expiredBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: "payment_pending",
        expiresAt: {
          lt: now, // expiresAt is in the past
        },
      },
      include: {
        bookingRooms: {
          include: {
            room: true,
          },
        },
      },
    });

    console.log(`[Cron] Found ${expiredBookings.length} expired bookings`);

    if (expiredBookings.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No expired bookings to clean up",
          cleanedUp: 0,
        },
        { status: 200 }
      );
    }

    // ─── Update Bookings and Release Room Locks ────────────────────────────
    let successCount = 0;
    const failedBookingIds: number[] = [];

    for (const booking of expiredBookings) {
      try {
        // Update booking status to expired
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            bookingStatus: "expired",
            expiresAt: null,
            razorpayOrderId: null,
          },
        });

        // For each room in the booking, release the lock
        // (The room status goes back to "active" - no special "locked" status, 
        // just the absence of this booking means it's available)
        for (const bookingRoom of booking.bookingRooms) {
          // Room is implicitly available when booking is expired
          // No need to update room table as the lock mechanism is booking-based
        }

        successCount++;
        console.log(
          `[Cron] Successfully expired booking ID: ${booking.id} (ref: ${booking.bookingReference})`
        );
      } catch (err) {
        failedBookingIds.push(booking.id);
        console.error(`[Cron] Error expiring booking ID ${booking.id}:`, err);
      }
    }

    // ─── Return Results ───────────────────────────────────────────────────
    const summary = {
      success: true,
      message: `Cleanup completed. ${successCount} booking(s) expired, ${failedBookingIds.length} failed.`,
      cleanedUp: successCount,
      failed: failedBookingIds.length,
      failedBookingIds: failedBookingIds.length > 0 ? failedBookingIds : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Cron] Cleanup completed:`, summary);

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error("[Cron] Unexpected error in cleanup endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error during cleanup",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
