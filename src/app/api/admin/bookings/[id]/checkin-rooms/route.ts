import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { id } = await params
    const { getCheckInRoomOptions } = await import('@/lib/services/adminService')
    
    const result = await getCheckInRoomOptions(Number(id))

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
