import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Clean up expired bookings
async function cleanExpiredBookings() {
  try {
    // Find all payment_pending bookings where timer has expired
    const expiredBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: "payment_pending",
        expiresAt: {
          lt: new Date()
        }
      },
      include: {
        bookingRooms: true
      }
    })

    for (const booking of expiredBookings) {
      // Update booking status to expired
      await prisma.booking.update({
        where: { id: booking.id },
        data: { bookingStatus: "expired" }
      })

      // Release room locks - set rooms back to active
      const roomIds = booking.bookingRooms.map(br => br.roomId)
      if (roomIds.length > 0) {
        await prisma.room.updateMany({
          where: { id: { in: roomIds } },
          data: { status: "active" }
        })
      }
    }

    return expiredBookings.length
  } catch (err) {
    console.error("[cleanExpiredBookings Error]", err)
    return 0
  }
}

export async function GET(request: NextRequest) {
  try {
    // Clean up expired bookings first
    await cleanExpiredBookings()

    const { getAvailableRooms } = await import("@/lib/services/bookingService");
    const searchParams = request.nextUrl.searchParams;

    const result = await getAvailableRooms({
      checkIn: searchParams.get("checkIn") ?? "",
      checkOut: searchParams.get("checkOut") ?? "",
      guests: searchParams.get("guests") ?? undefined,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 },
    );
  }
}
