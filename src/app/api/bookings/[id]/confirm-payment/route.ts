import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { confirmPayment } = await import('@/lib/services/bookingService')
    const body = await request.json()
    
    const result = await confirmPayment({
      bookingId: id,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      transactionId: body.transactionId,
    })
    
    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
