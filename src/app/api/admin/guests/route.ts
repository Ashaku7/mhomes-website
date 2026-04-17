import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const prisma = (await import('@/lib/prisma')).default
    
    const guests = await prisma.guest.findMany({
      include: {
        bookings: {
          select: { id: true, checkIn: true, checkOut: true, bookingStatus: true },
          take: 5,
        },
      },
      take: 100,
    })

    return NextResponse.json({ success: true, data: guests }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
