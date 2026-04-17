import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log('[PATCH /api/bookings/[id]/status] id:', id)
    const { updateBookingStatus } = await import('@/lib/services/bookingService')
    const body = await request.json()
    console.log('[PATCH /api/bookings/[id]/status] body:', body)
    
    const result = await updateBookingStatus({
      bookingId: id,
      bookingStatus: body.bookingStatus,
      extraExpense: body.extraExpense,
    })
    
    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    console.error('[PATCH /api/bookings/[id]/status] Error:', {
      message: err.message,
      statusCode: err.statusCode,
      status: err.status,
      stack: err.stack?.split('\n').slice(0, 3)
    })
    return NextResponse.json(
      { success: false, message: err.message, errorType: err.constructor.name },
      { status: err.statusCode || err.status || 500 }
    )
  }
}
