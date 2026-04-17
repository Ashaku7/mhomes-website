import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { id } = await params
    const prisma = (await import('@/lib/prisma')).default
    
    const guest = await prisma.guest.findUnique({
      where: { id: Number(id) },
      include: {
        bookings: {
          include: {
            payments: true,
          },
        },
      },
    })

    if (!guest) {
      return NextResponse.json(
        { success: false, message: 'Guest not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: guest }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
