import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/clerkAuth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const { id } = await params

    const { prisma } = await import('@/lib/prisma')
    const invoice = await prisma.invoice.findUnique({
      where: { bookingId: parseInt(id) },
      include: {
        booking: {
          include: {
            guest: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
              },
            },
            bookingRooms: {
              include: {
                room: {
                  select: {
                    id: true,
                    roomNumber: true,
                    roomType: true,
                    pricePerNight: true,
                  },
                },
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                paymentMethod: true,
                paymentStatus: true,
                transactionId: true,
                paymentDate: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Format response with all necessary details
    const formattedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: parseFloat(invoice.totalAmount.toString()),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      booking: {
        id: invoice.booking.id,
        bookingReference: invoice.booking.bookingReference,
        checkIn: invoice.booking.checkIn,
        checkOut: invoice.booking.checkOut,
        createdAt: invoice.booking.createdAt,
        totalAmount: parseFloat(invoice.booking.totalAmount.toString()),
        extraExpense: invoice.booking.extraExpense,
        guest: invoice.booking.guest,
        rooms: invoice.booking.bookingRooms.map((br) => ({
          id: br.room.id,
          roomNumber: br.room.roomNumber,
          roomType: br.room.roomType,
          pricePerNight: parseFloat(br.room.pricePerNight.toString()),
        })),
        payments: invoice.booking.payments.map((p) => ({
          id: p.id,
          amount: parseFloat(p.amount.toString()),
          paymentMethod: p.paymentMethod,
          paymentStatus: p.paymentStatus,
          transactionId: p.transactionId,
          paymentDate: p.paymentDate,
        })),
      },
    }

    return NextResponse.json({ success: true, data: formattedInvoice }, { status: 200 })
  } catch (err: any) {
    console.error('[Invoice API Error]:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status || 500 }
    )
  }
}
