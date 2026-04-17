import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { createInvoice } = await import('@/lib/services/invoiceService')
    const body = await request.json()
    
    const result = await createInvoice(body.bookingId)

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
