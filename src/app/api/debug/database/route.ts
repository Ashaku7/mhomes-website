import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const roomsCount = await prisma.room.count()
    const roomsData = await prisma.room.findMany({ take: 100 })
    const bookingsCount = await prisma.booking.count()
    
    return NextResponse.json(
      {
        success: true,
        data: {
          totalRooms: roomsCount,
          totalBookings: bookingsCount,
          rooms: roomsData,
        }
      },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
