import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    // If auth succeeds, verify admin status
    return NextResponse.json({ 
      success: true, 
      data: { 
        authenticated: true, 
        email: auth.email,
        adminUserId: auth.adminUserId 
      } 
    }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
