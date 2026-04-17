import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { id } = await params
    const { cancelPayment } = await import('@/lib/services/adminService')
    
    const result = await cancelPayment(id)

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    console.error('Cancel payment error:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to cancel payment' },
      { status: err.status || 500 }
    )
  }
}
