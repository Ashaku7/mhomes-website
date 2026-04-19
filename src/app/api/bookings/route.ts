import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { getBookings } = await import("@/lib/services/bookingService");
    const searchParams = request.nextUrl.searchParams;

    const result = await getBookings({
      status: searchParams.get("status") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      date: searchParams.get("date") ?? undefined,
      checkOutDate: searchParams.get("checkOutDate") ?? undefined,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 },
    );
  }
}
