'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InvoiceData {
  invoiceNumber: string
  bookingDate: string
  bookingReference: string
  guestName: string
  guestPhone: string
  guestEmail: string
  roomType: string
  checkIn: string
  checkOut: string
  nights: number
  totalGuests: number
  roomCount: number
  roomPrice: number
  roomAmount: number
  extraExpenses: Array<{
    label: string
    amount: number
  }>
  extraChargesTotal: number
  totalAmount: number
  paymentMethod: string
  transactionId: string | null
}

interface InvoicePrintViewProps {
  bookingId: number
}

const InvoicePrintView = ({ bookingId }: InvoicePrintViewProps) => {
  const { getToken } = useAuth()
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get fresh token from Clerk
        const freshToken = await getToken()
        if (!freshToken) {
          setError('Authentication required to view invoice')
          return
        }

        // Prepare auth header
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshToken}`
        }

        // Fetch booking details from admin endpoint
        const bookingRes = await fetch(`/api/admin/bookings/${bookingId}`, { headers })
        if (!bookingRes.ok) {
          const errorData = await bookingRes.json().catch(() => ({}))
          throw new Error(errorData?.message || 'Failed to fetch booking')
        }
        const bookingData = await bookingRes.json()
        const booking = bookingData.data

        // Fetch invoice details
        let invoice = null
        try {
          const invoiceRes = await fetch(`/api/admin/invoices/${bookingId}`, { headers })
          if (invoiceRes.ok) {
            const invoiceResData = await invoiceRes.json()
            invoice = invoiceResData.data
          }
        } catch (e) {
          console.error('Could not fetch invoice from admin endpoint:', e)
        }

        // Fetch payment details from booking data
        let paymentMethod = '—'
        let transactionId: string | null = null
        
        if (booking?.payments && booking.payments.length > 0) {
          // Get the first paid payment or any payment
          const payment = booking.payments.find((p: any) => p?.paymentStatus === 'paid') || booking.payments[0]
          if (payment) {
            paymentMethod = payment.paymentMethod || 'Cash'
            transactionId = payment.transactionId || null
          }
        }

        // Parse extra expenses
        const extraExpenses: Array<{ label: string; amount: number }> = []
        let extraChargesTotal = 0

        console.log('[Invoice] booking.extraExpense value:', booking.extraExpense)

        if (booking.extraExpense && booking.extraExpense !== 'No expense') {
          const expenseStrings = booking.extraExpense.split(',').map((exp: string) => exp.trim())
          console.log('[Invoice] expense strings after split:', expenseStrings)
          expenseStrings.forEach((exp: string) => {
            const parts = exp.split('-')
            if (parts.length === 2) {
              const label = parts[0].trim()
              const amount = parseFloat(parts[1])
              if (!isNaN(amount) && amount > 0) {
                extraExpenses.push({ label, amount })
                extraChargesTotal += amount
              }
            }
          })
        }
        
        console.log('[Invoice] Parsed extraExpenses:', extraExpenses)
        console.log('[Invoice] extraChargesTotal:', extraChargesTotal)

        // Calculate room amount
        const roomCount = booking.rooms?.length || 0
        const roomPrice = booking.rooms?.[0]?.pricePerNight || 0

        // Calculate nights
        const checkInDate = new Date(booking.checkIn)
        const checkOutDate = new Date(booking.checkOut)
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

        // Room amount = price per night × number of nights × number of rooms
        const roomAmount = roomPrice * nights * roomCount

        // If no invoice in database, create temporary one with correct total (room + extras)
        if (!invoice) {
          // Generate a temporary invoice number for display
          const today = new Date()
          const day = today.getDate().toString().padStart(2, '0')
          const month = (today.getMonth() + 1).toString().padStart(2, '0')
          const year = today.getFullYear().toString().slice(-2)
          invoice = {
            invoiceNumber: `INV-${day}${month}${year}-000`,
            totalAmount: roomAmount + extraChargesTotal
          }
        }

        // Format dates
        const checkInFormatted = new Date(booking.checkIn).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        const checkOutFormatted = new Date(booking.checkOut).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        
        // Invoice date: use invoice createdAt if available, otherwise booking createdAt
        let invoiceDateFormatted = 'N/A'
        try {
          console.log('[Invoice] invoice?.createdAt:', invoice?.createdAt)
          console.log('[Invoice] booking.createdAt:', booking.createdAt)
          const dateToFormat = invoice?.createdAt ? new Date(invoice.createdAt) : new Date(booking.createdAt)
          console.log('[Invoice] dateToFormat object:', dateToFormat)
          console.log('[Invoice] isValid?:', dateToFormat.toString() !== 'Invalid Date')
          
          invoiceDateFormatted = dateToFormat.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
          console.log('[Invoice] invoiceDateFormatted:', invoiceDateFormatted)
        } catch (e) {
          console.error('Date formatting error:', e)
          invoiceDateFormatted = 'N/A'
        }

        // Determine room type label
        const roomTypeLabel = booking.rooms?.[0]?.roomType === 'premium_plus' ? 'Premium Plus' : 'Premium'

        // Use invoice totalAmount from database (already includes room + extra charges)
        // If no invoice yet, calculate from booking data
        const totalAmount = invoice?.totalAmount || (roomAmount + extraChargesTotal)

        setInvoiceData({
          invoiceNumber: invoice?.invoiceNumber || 'INV-PENDING',
          bookingDate: invoiceDateFormatted,
          bookingReference: booking.bookingReference,
          guestName: booking.guest?.fullName || 'N/A',
          guestPhone: booking.guest?.phone || 'N/A',
          guestEmail: booking.guest?.email || 'N/A',
          roomType: roomTypeLabel,
          checkIn: checkInFormatted,
          checkOut: checkOutFormatted,
          nights,
          totalGuests: booking.totalGuests,
          roomCount,
          roomPrice,
          roomAmount,
          extraExpenses,
          extraChargesTotal,
          totalAmount: parseFloat(totalAmount.toString()),
          paymentMethod: paymentMethod === 'Cash' ? 'Cash' : paymentMethod,
          transactionId
        })
        
        // Debug log to see final state
        console.log('[Invoice] Final invoice data being set:', {
          invoiceNumber: invoice?.invoiceNumber || 'INV-PENDING',
          bookingDate: invoiceDateFormatted,
          extraExpenses,
          extraChargesTotal,
          totalAmount: parseFloat(totalAmount.toString())
        })
      } catch (err: any) {
        console.error('Error fetching invoice data:', err)
        setError(err?.message || 'Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoiceData()
  }, [bookingId, getToken])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        <span className="ml-2 text-gray-600">Loading invoice...</span>
      </div>
    )
  }

  if (error || !invoiceData) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error || 'Failed to load invoice'}
      </div>
    )
  }

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtPayment = `${invoiceData.paymentMethod}${invoiceData.transactionId ? ` | Transaction ID: ${invoiceData.transactionId}` : ' | —'}`

  // Debug: Log current state at render time
  console.log('[Invoice] Current invoiceData state:', {
    invoiceNumber: invoiceData.invoiceNumber,
    bookingDate: invoiceData.bookingDate,
    extraExpenses: invoiceData.extraExpenses,
    extraChargesTotal: invoiceData.extraChargesTotal,
    totalAmount: invoiceData.totalAmount
  })

  return (
    <div className="space-y-4">
      {/* Print Button */}
      <div className="flex justify-end">
        <Button
          onClick={handlePrint}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Invoice
        </Button>
      </div>

      {/* Invoice Print Area */}
      <div
        id="invoice-print-area"
        style={{
          backgroundColor: '#FAFAFA',
          padding: '80px 48px 180px 48px',
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          lineHeight: '1.25',
          color: '#1A1A1A',
          pageBreakInside: 'avoid'
        }}
      >
        {/* ═══ HEADER SECTION ═══ */}
        <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #C9A84C', paddingBottom: '6px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', fontStyle: 'italic', color: '#6B2D1F', margin: '0 0 2px 0' }}>Guest Invoice</h1>
          <p style={{ fontSize: '9px', color: '#8B6914', margin: '0', fontWeight: 500 }}>Thank you for choosing MHomes Resort — A Sanctuary of Luxury</p>
        </div>

        {/* ═══ INVOICE DETAILS GRID ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '10px', fontSize: '11px' }}>
          {/* Left Column */}
          <div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 600, marginBottom: '1px', textTransform: 'uppercase' }}>INVOICE NUMBER</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1A1A1A' }}>{invoiceData.invoiceNumber}</div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 600, marginBottom: '1px', textTransform: 'uppercase' }}>INVOICE DATE</div>
              <div style={{ fontSize: '10px', color: '#1A1A1A' }}>{invoiceData.bookingDate}</div>
            </div>
            <div>
              <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 600, marginBottom: '1px', textTransform: 'uppercase' }}>BOOKING REFERENCE</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B2D1F' }}>{invoiceData.bookingReference}</div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 600, marginBottom: '1px', textTransform: 'uppercase' }}>GUEST NAME</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#1A1A1A' }}>{invoiceData.guestName}</div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 600, marginBottom: '1px', textTransform: 'uppercase' }}>PHONE</div>
              <div style={{ fontSize: '10px', color: '#1A1A1A' }}>{invoiceData.guestPhone}</div>
            </div>
            <div>
              <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 600, marginBottom: '1px', textTransform: 'uppercase' }}>EMAIL</div>
              <div style={{ fontSize: '10px', color: '#1A1A1A' }}>{invoiceData.guestEmail}</div>
            </div>
          </div>
        </div>

        {/* ═══ STAY DETAILS BAR ═══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          marginBottom: '12px',
          padding: '10px 12px',
          backgroundColor: '#F0E6C8',
          borderRadius: '3px',
          border: '1px solid #C9A84C',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 700, marginBottom: '2px' }}>ROOM TYPE</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#6B2D1F' }}>{invoiceData.roomType}</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 700, marginBottom: '2px' }}>CHECK-IN</div>
            <div style={{ fontSize: '10px', color: '#1A1A1A' }}>{invoiceData.checkIn}</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 700, marginBottom: '2px' }}>CHECK-OUT</div>
            <div style={{ fontSize: '10px', color: '#1A1A1A' }}>{invoiceData.checkOut}</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 700, marginBottom: '2px' }}>ROOMS</div>
            <div style={{ fontSize: '10px', color: '#1A1A1A' }}>{invoiceData.roomCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', color: '#8B6914', fontWeight: 700, marginBottom: '2px' }}>GUESTS</div>
            <div style={{ fontSize: '10px', color: '#1A1A1A' }}>{invoiceData.totalGuests}</div>
          </div>
        </div>

        {/* ═══ CHARGES TABLE ═══ */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '12px',
          pageBreakInside: 'avoid'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#6B2D1F', color: '#FFFFFF' }}>
              <th style={{
                padding: '8px 10px',
                textAlign: 'left',
                fontSize: '10px',
                fontWeight: 700,
                borderRight: '1px solid #4A1F15',
                width: '40%'
              }}>DESCRIPTION</th>
              <th style={{
                padding: '8px 10px',
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: 700,
                borderRight: '1px solid #4A1F15',
                width: '15%'
              }}>QTY</th>
              <th style={{
                padding: '8px 10px',
                textAlign: 'right',
                fontSize: '10px',
                fontWeight: 700,
                borderRight: '1px solid #4A1F15',
                width: '22%'
              }}>RATE</th>
              <th style={{
                padding: '8px 10px',
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: 700,
                borderRight: '1px solid #4A1F15',
                width: '12%'
              }}>GST</th>
              <th style={{
                padding: '8px 10px',
                textAlign: 'right',
                fontSize: '10px',
                fontWeight: 700,
                width: '11%'
              }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {/* Room Accommodation Row */}
            <tr style={{
              backgroundColor: '#F0E6C8',
              borderBottom: '1px solid #D4C5A0'
            }}>
              <td style={{ padding: '8px 10px', fontSize: '10px', color: '#1A1A1A', fontWeight: 500 }}>
                {invoiceData.roomType} Accommodation
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '10px', color: '#1A1A1A', fontWeight: 500 }}>
                {invoiceData.roomCount} Room{invoiceData.roomCount !== 1 ? 's' : ''}
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '10px', color: '#1A1A1A', fontWeight: 500 }}>
                {fmt(invoiceData.roomPrice)}
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '10px', color: '#6B2D1F', fontWeight: 700 }}>
                5%
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '10px', color: '#6B2D1F', fontWeight: 700 }}>
                {fmt(Math.round(invoiceData.roomAmount * 1.05))}
              </td>
            </tr>

            {/* Extra Expense Rows */}
            {invoiceData.extraExpenses.map((expense, idx) => (
              <tr
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#FAFAFA' : '#F0E6C8',
                  borderBottom: '1px solid #D4C5A0'
                }}
              >
                <td style={{ padding: '8px 10px', fontSize: '10px', color: '#1A1A1A', fontWeight: 500 }}>
                  {expense.label.charAt(0).toUpperCase() + expense.label.slice(1)}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '10px', color: '#1A1A1A' }}>
                  -
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '10px', color: '#1A1A1A', fontWeight: 500 }}>
                  {fmt(expense.amount)}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '10px', color: '#1A1A1A' }}>
                  -
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '10px', color: '#6B2D1F', fontWeight: 700 }}>
                  {fmt(expense.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ═══ TOTALS SECTION ═══ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <table style={{
            width: '50%',
            borderCollapse: 'collapse',
            pageBreakInside: 'avoid'
          }}>
            <tbody>
              {/* Advance Paid */}
              <tr style={{ borderBottom: '1px solid #D4C5A0' }}>
                <td style={{
                  padding: '6px 12px',
                  fontSize: '10px',
                  fontWeight: 500,
                  color: '#1A1A1A',
                  textAlign: 'left'
                }}>
                  Advance Paid
                </td>
                <td style={{
                  padding: '6px 12px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#1A1A1A',
                  textAlign: 'right'
                }}>
                  {fmt(Math.round(invoiceData.roomAmount * 1.05))}
                </td>
              </tr>

              {/* Extra Charges Summary */}
              {invoiceData.extraChargesTotal > 0 && (
                <tr style={{ borderBottom: '1px solid #D4C5A0' }}>
                  <td style={{
                    padding: '6px 12px',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: '#1A1A1A',
                    textAlign: 'left'
                  }}>
                    Extra Charges
                  </td>
                  <td style={{
                    padding: '6px 12px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#1A1A1A',
                    textAlign: 'right'
                  }}>
                    {fmt(invoiceData.extraChargesTotal)}
                  </td>
                </tr>
              )}

              {/* Total Amount */}
              <tr style={{ backgroundColor: '#6B2D1F', color: '#FFFFFF', borderTop: '2px solid #C9A84C' }}>
                <td style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textAlign: 'left',
                  textTransform: 'uppercase'
                }}>
                  TOTAL AMOUNT
                </td>
                <td style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#C9A84C',
                  textAlign: 'right'
                }}>
                  {fmt(invoiceData.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ═══ PAYMENT METHOD ═══ */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            fontSize: '9px',
            color: '#8B6914',
            fontWeight: 700,
            marginBottom: '3px',
            textTransform: 'uppercase'
          }}>
            PAYMENT METHOD (ADVANCE)
          </div>
          <div style={{
            fontSize: '10px',
            color: '#1A1A1A'
          }}>
            {fmtPayment}
          </div>
        </div>

        {/* ═══ FOOTER SECTION ═══ */}
        <div style={{
          borderTop: '2px solid #C9A84C',
          paddingTop: '8px',
          marginTop: '8px',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#6B2D1F',
            fontStyle: 'italic',
            margin: '0 0 4px 0'
          }}>
            "We hope your stay was a moment crafted to perfection."
          </p>
          <p style={{
            fontSize: '9px',
            color: '#8B6914',
            margin: '0'
          }}>
            For any queries, contact us at: karikklayer@mhomes.co.in | +91-6706555346
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-area,
          #invoice-print-area * {
            visibility: visible;
          }
          #invoice-print-area {
            position: static;
            width: 210mm;
            padding: 80px 48px 180px 48px;
            font-size: 11px;
            lineHeight: '1.25';
            margin: 0;
            box-shadow: none;
            page-break-after: always;
          }
          @page {
            size: A4;
            margin: 0;
          }
          button,
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default InvoicePrintView
