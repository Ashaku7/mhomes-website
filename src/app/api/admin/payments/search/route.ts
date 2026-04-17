import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { searchPayments } = await import('@/lib/services/adminService')
    const searchParams = request.nextUrl.searchParams
    
    const result = await searchPayments({
      bookingReference: searchParams.get('bookingReference'),
      guestName: searchParams.get('guestName'),
      phone: searchParams.get('phone'),
    })

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
