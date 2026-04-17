import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { getAllBookings } = await import('@/lib/services/adminService')
    const searchParams = request.nextUrl.searchParams
    
    const result = await getAllBookings({
      status: searchParams.get('status'),
      source: searchParams.get('source'),
      date: searchParams.get('date'),
    })

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
