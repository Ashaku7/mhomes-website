import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchRoomsSimple } = await import('@/lib/services/bookingService')
    const searchParams = request.nextUrl.searchParams
    
    const result = await searchRoomsSimple({
      checkIn: searchParams.get('checkIn'),
      checkOut: searchParams.get('checkOut'),
      roomType: searchParams.get('roomType'),
    })
    
    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
