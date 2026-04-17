import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function GET(request: NextRequest, { params }: { params: { invoiceNumber: string } }) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { getInvoiceByNumber } = await import('@/lib/services/invoiceService')
    const result = await getInvoiceByNumber(params.invoiceNumber)

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
