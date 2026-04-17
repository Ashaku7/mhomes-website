import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { id } = await params
    const { updateBookingStatus } = await import('@/lib/services/bookingService')
    const body = await request.json()
    
    // For general booking updates (guestName, guestEmail, roomType, etc)
    const result = await updateBookingStatus(id, body.bookingStatus || 'confirmed', body.extraExpense)

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
