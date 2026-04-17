import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { id } = await params
    const prisma = (await import('@/lib/prisma')).default
    
    // Get available rooms for check-in (not occupied during booking dates)
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { guest: true },
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      )
    }

    const availableRooms = await prisma.room.findMany({
      where: {
        roomType: booking.roomType,
        isActive: true,
      },
      select: {
        id: true,
        roomNumber: true,
        roomType: true,
        isBedEmpty: true,
      },
    })

    return NextResponse.json({ success: true, data: availableRooms }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
