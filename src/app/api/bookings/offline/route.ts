import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { createOfflineBooking } =
      await import("@/lib/services/bookingService");
    const body = await request.json();

    console.log(
      "[POST /api/bookings/offline] Received body:",
      JSON.stringify(body, null, 2),
    );

    const result = await createOfflineBooking({
      guest: body.guest,
      members: body.members || [],
      booking: body.booking,
      payment: body.payment,
      bookingStatus: body.bookingStatus,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: "Offline booking created successfully",
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("[POST /api/bookings/offline Error]", {
      message: err.message,
      status: err.status,
      statusCode: err.statusCode,
      stack: err.stack?.split("\n").slice(0, 5),
    });
    return NextResponse.json(
      { success: false, message: err.message, errorType: err.constructor.name },
      { status: err.statusCode || err.status || 500 },
    );
  }
}
