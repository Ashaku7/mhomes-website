import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking ID" },
        { status: 400 },
      );
    }

    const prisma = (await import("@/lib/prisma")).default;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        bookingRooms: {
          include: {
            room: true,
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: booking.id,
          bookingReference: booking.bookingReference,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalGuests: booking.totalGuests,
          bookingStatus: booking.bookingStatus,
          bookingSource: booking.bookingSource,
          totalAmount: booking.totalAmount,
          extraExpense: booking.extraExpense,
          createdAt: booking.createdAt,
          guest: booking.guest,
          rooms: booking.bookingRooms.map((br) => ({
            id: br.room.id,
            roomNumber: br.room.roomNumber,
            roomType: br.room.roomType,
            maxGuests: br.room.maxGuests,
            pricePerNight: parseFloat(String(br.room.pricePerNight)),
          })),
          payments: booking.payments,
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[GET /api/bookings/[id]] Error:", {
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack?.split("\n").slice(0, 3),
    });
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.statusCode || 500 },
    );
  }
}
