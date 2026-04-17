import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchAvailableRooms } = await import('@/lib/services/bookingService')
    const searchParams = request.nextUrl.searchParams
    
    const checkIn = searchParams.get('checkIn')
    const checkOut = searchParams.get('checkOut')
    const roomType = searchParams.get('roomType')
    const roomCount = searchParams.get('roomCount')
    
    console.log('[GET /api/rooms/search] Received query params:', {
      checkIn,
      checkOut,
      roomType,
      roomCount,
      urlString: request.nextUrl.toString(),
    })
    
    const result = await searchAvailableRooms({
      checkIn,
      checkOut,
      roomType,
      roomCount,
    })
    
    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/rooms/search Error]', {
      message: err.message,
      status: err.status,
      statusCode: err.statusCode,
      stack: err.stack?.split('\n').slice(0, 5) || 'No stack',
    })
    
    const statusCode = err.statusCode || err.status || 500
    return NextResponse.json(
      { success: false, message: err.message || 'Unknown error',  debug: err.constructor.name },
      { status: statusCode }
    )
  }
}
