'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import ReCAPTCHA from 'react-google-recaptcha'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { roomsApi, bookingsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  CalendarDays, Users, Search, Check, ChevronRight, ChevronDown,
  Loader2, AlertCircle, ArrowLeft, Home, PhoneCall, Wifi, Wind,
  Droplets, Bell, UtensilsCrossed, Eye, Wine, Sofa, MapPin, Phone, Mail
} from 'lucide-react'

// ─── Constants 
const BUTTON_BROWN = '#6B3F2A'
const BUTTON_HOVER = '#4A2A1A'
const BRAND_GOLD = '#C9A84C'
const BG_LIGHT = '#FAFAF8'
const CARD_LIGHT = '#ffffff'
const BORDER_LIGHT = '#E8E4DC'

const ROOM_AMENITIES = {
  premium: [
    { icon: Wind, label: 'AC' },
    { icon: Wifi, label: 'WiFi' },
    { icon: Eye, label: 'TV' },
    { icon: Droplets, label: 'Hot Water' },
    { icon: Bell, label: 'Room Service' },
    { icon: Eye, label: 'Balcony' },
  ],
  premium_plus: [
    { icon: Wind, label: 'AC' },
    { icon: Wifi, label: 'WiFi' },
    { icon: Eye, label: 'TV' },
    { icon: Droplets, label: 'Hot Water' },
    { icon: Bell, label: 'Room Service' },
    { icon: Eye, label: 'Balcony' },
    { icon: Wine, label: 'Jacuzzi' },
    { icon: UtensilsCrossed, label: 'Mini Bar' },
    { icon: Sofa, label: 'Living Area' },
    { icon: Bell, label: 'Premium Toiletries' },
    { icon: MapPin, label: 'Sea View' },
  ],
}

const ROOM_INFO: Record<string, { sqft: number; beds: string; image: string; price: number }> = {
  premium: { sqft: 320, beds: '1 King Bed', image: '/premium.jpg', price: 5500 },
  premium_plus: { sqft: 480, beds: '2 King Beds', image: '/premium-plus.jpg', price: 6500 },
}

// ─── Types 
interface AssignedRoom {
  id: number
  roomNumber: string
  roomType: string
  pricePerNight: number
}

interface SearchResult {
  available: boolean
  substitution: boolean
  substitutionMessage: string | null
  message?: string
  assignedRooms?: AssignedRoom[]
  checkIn?: string
  checkOut?: string
  nights?: number
  totalPerNight?: number
  totalAmount?: number
}

interface BookingResult {
  bookingId: number
  bookingReference: string
  bookingStatus: string
  checkIn: string
  checkOut: string
  nights: number
  totalGuests: number
  totalAmount: number
  guest: { id: number; fullName: string; phone: string; email: string }
  rooms: { id: number; roomNumber: string; roomType: string; pricePerNight: number }[]
  message: string
}

// ─── Helpers 
const formatRs = (amount: number) => '₹' + amount.toLocaleString('en-IN')
const formatRoomType = (type: string) =>
  ({ premium: 'Premium', premium_plus: 'Premium Plus' }[type] || type || 'Room')

const formatRoomSummaryLine = (summary: { type: string; count: number }[]) =>
  summary
    .map(({ type, count }) => {
      const label = formatRoomType(type)
      const roomsWord = count === 1 ? 'room' : 'rooms'
      return `${label} × ${count} ${roomsWord}`
    })
    .join(', ')
const formatDate = (dateStr: string) => new Date(dateStr + 'T00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

const getRoomSummary = (rooms: AssignedRoom[] | undefined): { type: string; count: number; price: number }[] => {
  if (!rooms) return []
  const grouped: { [key: string]: { count: number; price: number } } = {}
  rooms.forEach(room => {
    if (!grouped[room.roomType]) grouped[room.roomType] = { count: 0, price: 0 }
    grouped[room.roomType].count += 1
    grouped[room.roomType].price = room.pricePerNight
  })
  return Object.entries(grouped).map(([type, { count, price }]) => ({ type, count, price }))
}

const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required'
  const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return !reg.test(email) ? 'Please enter a valid email address' : null
}

const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: '+91', label: '🇮🇳 +91 India' },
  { code: '+1', label: '🇺🇸 +1 USA' },
  { code: '+44', label: '🇬🇧 +44 UK' },
  { code: '+971', label: '🇦🇪 +971 UAE' },
  { code: '+65', label: '🇸🇬 +65 Singapore' },
  { code: '+61', label: '🇦🇺 +61 Australia' },
  { code: '+1', label: '🇨🇦 +1 Canada' },
  { code: '+49', label: '🇩🇪 +49 Germany' },
  { code: '+33', label: '🇫🇷 +33 France' },
  { code: '+81', label: '🇯🇵 +81 Japan' },
  { code: '+64', label: '🇳🇿 +64 New Zealand' },
  { code: '+34', label: '🇪🇸 +34 Spain' },
  { code: '+39', label: '🇮🇹 +39 Italy' },
  { code: '+31', label: '🇳🇱 +31 Netherlands' },
  { code: '+55', label: '🇧🇷 +55 Brazil' },
  { code: '+52', label: '🇲🇽 +52 Mexico' },
  { code: '+82', label: '🇰🇷 +82 South Korea' },
  { code: '+86', label: '🇨🇳 +86 China' },
  { code: '+7', label: '🇷🇺 +7 Russia' },
  { code: '+27', label: '🇿🇦 +27 South Africa' },
]

const validatePhone = (countryCode: string, phoneNumber: string): string | null => {
  if (!phoneNumber) return 'Phone number is required'
  const digits = phoneNumber.replace(/\D/g, '')
  if (countryCode === '+91') {
    return digits.length !== 10 ? 'Phone number must be exactly 10 digits for India' : null
  }
  return digits.length < 7 ? 'Phone number must be at least 7 digits' : null
}

// ─── Date Range Picker ───

const rdpCardStyles = `
  .rdp-card {
    --rdp-accent-color: #C9A84C;
    --rdp-background-color: #FDF8EE;
    margin: 0;
    padding: 12px;
  }
  .rdp-card .rdp-day_selected {
    background-color: #6B3F2A !important;
    color: white !important;
    border-radius: 4px;
  }
  .rdp-card .rdp-day_range_middle {
    background-color: #FDF8EE !important;
    color: #1A1A1A !important;
    border-radius: 0 !important;
  }
  .rdp-card .rdp-day_range_start,
  .rdp-card .rdp-day_range_end {
    background-color: #6B3F2A !important;
    color: white !important;
    border-radius: 4px !important;
  }
  .rdp-card .rdp-day:hover:not([disabled]) {
    background-color: #FDF8EE;
    border-radius: 4px;
  }
  .rdp-card .rdp-caption_label {
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px;
    color: #6B3F2A;
    font-weight: 400;
  }
  .rdp-card .rdp-nav_button:hover {
    background-color: #FDF8EE;
  }
  .rdp-card .rdp-head_cell {
    font-size: 11px;
    font-weight: 500;
    color: #999;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .rdp-card .rdp-day {
    font-size: 13px;
    border-radius: 4px;
    transition: background 0.15s;
  }
`

function fmtDisplay(d: Date | undefined): string {
  if (!d) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toISO(d: Date | undefined): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function ReservationDatePicker(
  { checkIn, checkOut, onChangeCheckIn, onChangeCheckOut }: {
    checkIn: string, checkOut: string,
    onChangeCheckIn: (v: string) => void, onChangeCheckOut: (v: string) => void
  }
) {
  const [open, setOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const range: DateRange | undefined =
    checkIn || checkOut
      ? { from: checkIn ? new Date(checkIn + 'T00:00') : undefined, to: checkOut ? new Date(checkOut + 'T00:00') : undefined }
      : undefined

  const handleSelect = (r: DateRange | undefined) => {
    onChangeCheckIn(r?.from ? toISO(r.from) : '')
    onChangeCheckOut(r?.to ? toISO(r.to) : '')
    if (r?.from && r?.to) setOpen(false)
  }

  const updatePopoverPos = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spacing = 6
    const minEdgeGap = 8
    const estimatedPopoverWidth = 320
    const estimatedPopoverHeight = 360

    let left = rect.left
    if (left + estimatedPopoverWidth > window.innerWidth - minEdgeGap) {
      left = window.innerWidth - estimatedPopoverWidth - minEdgeGap
    }
    left = Math.max(minEdgeGap, left)

    const canOpenBelow = rect.bottom + spacing + estimatedPopoverHeight <= window.innerHeight - minEdgeGap
    const top = canOpenBelow
      ? rect.bottom + spacing
      : Math.max(minEdgeGap, rect.top - estimatedPopoverHeight - spacing)

    setPopoverPos({ top, left })
  }

  const handleOpen = () => {
    updatePopoverPos()
    setOpen(v => !v)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || portalRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Keep calendar aligned to trigger while scrolling/resizing
  useEffect(() => {
    if (!open) return
    const onViewportChange = () => updatePopoverPos()
    window.addEventListener('scroll', onViewportChange, { passive: true, capture: true })
    window.addEventListener('resize', onViewportChange)
    return () => {
      window.removeEventListener('scroll', onViewportChange, true)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [open])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const btnStyle = (hasVal: boolean): React.CSSProperties => ({
    backgroundColor: '#f5f5f5',
    borderColor: BORDER_LIGHT,
    color: hasVal ? '#111' : '#999',
    fontFamily: 'inherit'
  })

  const popoverEl = (
    <div
      ref={portalRef}
      style={{
        position: 'fixed',
        top: popoverPos.top,
        left: popoverPos.left,
        zIndex: 99999,
        background: 'white',
        border: '1px solid #E8E4DC',
        borderRadius: '4px',
        boxShadow: '0 8px 32px rgba(107,63,42,0.12)',
      }}
    >
      <DayPicker
        mode="range"
        numberOfMonths={1}
        selected={range}
        onSelect={handleSelect}
        disabled={[{ before: today }]}
        className="rdp-card"
      />
    </div>
  )

  return (
    <>
      <style>{rdpCardStyles}</style>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Check-in */}
        <div ref={triggerRef}>
          <Label className="text-gray-700 text-sm flex items-center gap-1.5 mb-2">
            <CalendarDays className="w-3.5 h-3.5" /> Check-in
          </Label>
          <button
            type="button"
            onClick={handleOpen}
            className="w-full text-left px-3 py-2 rounded-md border text-sm focus:outline-none transition-all"
            style={btnStyle(!!checkIn)}
          >
            {checkIn ? fmtDisplay(new Date(checkIn + 'T00:00')) : 'Select date'}
          </button>
        </div>

        {/* Check-out */}
        <div>
          <Label className="text-gray-700 text-sm flex items-center gap-1.5 mb-2">
            <CalendarDays className="w-3.5 h-3.5" /> Check-out
          </Label>
          <button
            type="button"
            onClick={handleOpen}
            className="w-full text-left px-3 py-2 rounded-md border text-sm focus:outline-none transition-all"
            style={btnStyle(!!checkOut)}
          >
            {checkOut ? fmtDisplay(new Date(checkOut + 'T00:00')) : 'Select date'}
          </button>
        </div>
      </div>
      {open && mounted && createPortal(popoverEl, document.body)}
    </>
  )
}

// Custom select matching the date picker card style
function ReservationSelect({
  label, icon, value, onChange, options
}: {
  label: string
  icon?: React.ReactNode
  value: string | number
  onChange: (v: string) => void
  options: { value: string | number; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 0 })
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPopoverPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || portalRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScroll = () => setOpen(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open])

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label ?? String(value)

  const portalEl = (
    <div
      ref={portalRef}
      style={{
        position: 'absolute',
        top: popoverPos.top,
        left: popoverPos.left,
        width: popoverPos.width,
        zIndex: 99999,
        background: 'white',
        border: '1px solid #E8E4DC',
        borderRadius: '4px',
        boxShadow: '0 8px 32px rgba(107,63,42,0.12)',
        overflow: 'hidden',
      }}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(String(opt.value)); setOpen(false) }}
          className="w-full text-left px-4 py-2.5 text-sm"
          style={{
            fontFamily: 'inherit',
            color: String(opt.value) === String(value) ? BUTTON_BROWN : '#1A1A1A',
            background: String(opt.value) === String(value) ? '#FDF8EE' : 'white',
            fontWeight: String(opt.value) === String(value) ? 500 : 400,
            borderBottom: '1px solid #F0ECE4',
            cursor: 'pointer',
            display: 'block',
          }}
          onMouseEnter={e => { if (String(opt.value) !== String(value)) (e.currentTarget as HTMLElement).style.background = '#FDF8EE' }}
          onMouseLeave={e => { if (String(opt.value) !== String(value)) (e.currentTarget as HTMLElement).style.background = 'white' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )

  return (
    <div ref={triggerRef}>
      <Label className="text-gray-700 text-sm mb-2 flex items-center gap-1.5">
        {icon}{label}
      </Label>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full text-left px-3 py-2 rounded-md border text-sm focus:outline-none transition-all"
        style={{ backgroundColor: '#f5f5f5', borderColor: BORDER_LIGHT, color: '#111', fontFamily: 'inherit', cursor: 'pointer' }}
      >
        {selectedLabel}
      </button>
      {open && mounted && createPortal(portalEl, document.body)}
    </div>
  )
}

// ─── Step Indicator 
function StepIndicator({ current }: { current: number }) {
  const steps = ['Search', 'Select Rooms', 'Guest Details']
  return (
    <div className="flex items-center justify-center gap-0 mb-12">
      {steps.map((label, i) => {
        const num = i + 1
        const done = num < current
        const active = num === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all"
                style={{
                  backgroundColor: done ? BUTTON_BROWN : 'transparent',
                  borderColor: active ? BUTTON_BROWN : BORDER_LIGHT,
                  color: done ? 'white' : active ? BUTTON_BROWN : '#999',
                }}
              >
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span className="text-xs mt-1.5 hidden sm:block" style={{ color: active || done ? BUTTON_BROWN : '#999' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="h-px w-10 sm:w-16 mb-4 mx-1" style={{ backgroundColor: done ? BUTTON_BROWN : BORDER_LIGHT }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component 
export default function ReservationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  // Step 1
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '')
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '')
  const [roomType, setRoomType] = useState<'premium' | 'premium_plus'>(
    (searchParams.get('roomType') as 'premium' | 'premium_plus') || 'premium'
  )
  const [roomCount, setRoomCount] = useState(Number(searchParams.get('roomCount')) || 1)

  // Step 2
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)

  // Step 3
  const [fullName, setFullName] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})

  // Step 4
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)

  useEffect(() => {
    if (checkIn && checkOut) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async () => {
    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates.')
      return
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError('Check-out must be after check-in.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await roomsApi.searchRooms(checkIn, checkOut, roomType, roomCount)
      const result: SearchResult = res.data.data
      if (!result.available) {
        setError(result.message || 'No rooms available.')
        return
      }
      setSearchResult(result)
      setStep(2)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to search rooms.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: { [key: string]: string } = {}
    if (!fullName.trim()) errors.fullName = 'Full name is required'
    const phoneErr = validatePhone(countryCode, phoneNumber)
    if (phoneErr) errors.phone = phoneErr
    const emailErr = validateEmail(email)
    if (emailErr) errors.email = emailErr

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setError('Please fix validation errors below.')
      return
    }

    // ── Verify reCAPTCHA ────────────────────────────────────────────────────
    const captchaToken = recaptchaRef.current?.getValue()
    if (!captchaToken) {
      setError('Please complete the CAPTCHA')
      return
    }

    setError(null)
    setValidationErrors({})
    setLoading(true)
    try {
      if (!searchResult?.assignedRooms) throw new Error('No rooms selected')
      const combinedPhone = `${countryCode}${phoneNumber}`
      const payload = {
        fullName,
        phone: combinedPhone,
        email,
        members: [],
        roomIds: searchResult.assignedRooms.map(r => r.id),
        checkIn: searchResult.checkIn,
        checkOut: searchResult.checkOut,
        totalGuests: searchResult.assignedRooms.length,
        bookingSource: 'online' as const,
        notes: '',
        captchaToken,
      }
      const res = await bookingsApi.createBooking(payload as any)
      setBookingResult(res.data.data)
      setStep(4)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Booking failed.'
      setError(msg)
      // Optional: Stay on step 3 to show error, or go back to step 1
      // For now, we'll keep user on step 3 to see the error and try again
    } finally {
      setLoading(false)
      // Reset reCAPTCHA
      recaptchaRef.current?.reset()
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const roomSummary = getRoomSummary(searchResult?.assignedRooms)

  return (
    <div style={{ backgroundColor: BG_LIGHT }} className="min-h-screen text-gray-900">
      {/* Header */}
      <div className="border-b sticky top-0 z-40 backdrop-blur-sm" style={{ borderColor: BORDER_LIGHT, backgroundColor: CARD_LIGHT }}>
        <div className="max-w-7xl mx-auto px-4 py-0 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-0 whitespace-nowrap leading-none">
            <Image src="/MHOMES-logo.png" alt="MHOMES" width={160} height={160} className="block h-22 w-auto" />
            <span style={{ fontFamily: 'Cormorant Garamond, serif', color: BUTTON_BROWN }} className="font-light tracking-widest text-lg hidden sm:block -ml-10 -mt-4 leading-none">
              MHOMES
            </span>
          </Link>
          <span className="text-gray-600 text-sm">Book Your Stay</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* ─── STEP 4: SUCCESS ──────────────────────────────────────────────── */}
        {step === 4 && bookingResult ? (
          <SuccessPage booking={bookingResult} />
        ) : (
          <>
            <div className="text-center mb-4">
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', color: BUTTON_BROWN }} className="text-4xl font-light mb-1">
                Reserve Your Stay
              </h1>
              <p className="text-gray-600 text-sm">Experience luxury at MHOMES Resort</p>
            </div>

            <div className="mt-10">
              <StepIndicator current={step} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                {/* STEP 1: SEARCH */}
                {step === 1 && (
                  <Card className="max-w-2xl mx-auto border" style={{ backgroundColor: CARD_LIGHT, borderColor: BORDER_LIGHT }}>
                    <CardContent className="p-8">
                      <h2 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: BUTTON_BROWN }}>
                        <Search className="w-5 h-5" /> Check Availability
                      </h2>

                      <div className="space-y-5">
                        <ReservationDatePicker
                          checkIn={checkIn}
                          checkOut={checkOut}
                          onChangeCheckIn={setCheckIn}
                          onChangeCheckOut={setCheckOut}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <ReservationSelect
                            label="Room Type"
                            value={roomType}
                            onChange={v => setRoomType(v as 'premium' | 'premium_plus')}
                            options={[
                              { value: 'premium', label: 'Premium (₹5,500/night)' },
                              { value: 'premium_plus', label: 'Premium Plus (₹6,500/night)' },
                            ]}
                          />
                          <ReservationSelect
                            label="Rooms"
                            icon={<Users className="w-3.5 h-3.5" />}
                            value={roomCount}
                            onChange={v => setRoomCount(Number(v))}
                            options={[1,2,3,4,5,6].map(i => ({ value: i, label: `${i} Room${i > 1 ? 's' : ''}` }))}
                          />
                        </div>

                        {error && <ErrorBox message={error} />}

                        <Button onClick={handleSearch} disabled={loading} style={{ backgroundColor: BUTTON_BROWN }} className="w-full text-white font-semibold py-3 hover:opacity-90">
                          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching…</> : <><Search className="w-4 h-4 mr-2" /> Check Availability</>}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* STEP 2: SELECT ROOMS */}
                {step === 2 && searchResult && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-4 text-sm rounded-xl px-5 py-3 border" style={{ backgroundColor: `${CARD_LIGHT}99`, borderColor: BORDER_LIGHT }}>
                      <span className="text-gray-600 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4" style={{ color: BUTTON_BROWN }} />
                        {formatDate(searchResult.checkIn!)} → {formatDate(searchResult.checkOut!)}
                      </span>
                      <span style={{ color: BUTTON_BROWN }} className="font-medium">{searchResult.nights} night{searchResult.nights !== 1 ? 's' : ''}</span>
                      <button onClick={() => setStep(1)} className="ml-auto text-gray-600 hover:text-gray-900 text-xs flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3" /> Change Search
                      </button>
                    </div>

                    {searchResult.substitution && searchResult.substitutionMessage && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 rounded-lg bg-yellow-100 border border-yellow-300 px-4 py-3">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                        <p className="text-yellow-800 text-sm">{searchResult.substitutionMessage}</p>
                      </motion.div>
                    )}

                    {/* Room Cards */}
                    <div className="space-y-4">
                      {roomSummary.map(({ type, count, price }) => (
                        <motion.div key={type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          <Card className="border" style={{ backgroundColor: CARD_LIGHT, borderColor: BORDER_LIGHT }}>
                            <CardContent className="p-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                                {/* Image Only */}
                                <div className="md:col-span-1">
                                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border" style={{ borderColor: BORDER_LIGHT }}>
                                    <Image src={ROOM_INFO[type as keyof typeof ROOM_INFO].image} alt={type} fill className="object-cover" />
                                  </div>
                                </div>

                                {/* Details & Amenities */}
                                <div className="md:col-span-1 space-y-4 flex flex-col">
                                  {/* Room Type & Count - Single Line */}
                                  <div>
                                    <h3 style={{ fontFamily: 'Cormorant Garamond, serif', color: BUTTON_BROWN }} className="text-2xl font-light">
                                      {formatRoomType(type)}
                                      <span className="text-gray-600 text-lg font-light">
                                        {' '}x {count} {count === 1 ? 'room' : 'rooms'}
                                      </span>
                                    </h3>
                                  </div>

                                  {/* Specs */}
                                  <div className="space-y-2 text-sm">
                                    <div className="text-gray-700">• {ROOM_INFO[type as keyof typeof ROOM_INFO].sqft} sq ft</div>
                                    <div className="flex items-center gap-2 text-gray-700"><Users className="w-3.5 h-3.5" style={{ color: BUTTON_BROWN }} /> Max 2 guests</div>
                                    <div className="text-gray-700">• {ROOM_INFO[type as keyof typeof ROOM_INFO].beds}</div>
                                  </div>

                                  {/* Amenities List - Simple 3 columns */}
                                  <div>
                                    <p className="text-xs font-medium mb-3" style={{ color: BUTTON_BROWN }}>
                                      {ROOM_AMENITIES[type as keyof typeof ROOM_AMENITIES].length} Amenities
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                      {ROOM_AMENITIES[type as keyof typeof ROOM_AMENITIES].map(({ label }, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                          <Check className="w-4 h-4" style={{ color: BUTTON_BROWN, flexShrink: 0 }} />
                                          <span className="text-gray-700">{label}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Pricing & Button at Bottom */}
                                  <div className="mt-auto pt-4 border-t space-y-4" style={{ borderColor: BORDER_LIGHT }}>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-gray-600 text-xs mb-1">Per Night / Per Room</p>
                                        <p style={{ color: BUTTON_BROWN }} className="text-xl font-light">
                                          ₹{price.toLocaleString('en-IN')}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600 text-xs mb-1">Total ({count} {count === 1 ? 'room' : 'rooms'}, {searchResult.nights} night{searchResult.nights !== 1 ? 's' : ''})</p>
                                        <p className="text-gray-900 text-xl font-light">₹{(price * count * (searchResult.nights || 1)).toLocaleString('en-IN')}</p>
                                      </div>
                                    </div>
                                    <Button onClick={() => setStep(3)} style={{ backgroundColor: BUTTON_BROWN }} className="w-full text-white font-semibold py-3 hover:opacity-90">
                                      Reserve Now <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3: GUEST DETAILS */}
                {step === 3 && searchResult && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form (60%) */}
                    <div className="lg:col-span-2">
                      <form onSubmit={handleCreateBooking} className="space-y-6">
                        <Card className="border" style={{ backgroundColor: CARD_LIGHT, borderColor: BORDER_LIGHT }}>
                          <CardContent className="p-8">
                            <h2 style={{ color: BUTTON_BROWN }} className="text-lg font-medium mb-6">
                              Your Details
                            </h2>

                            <div className="space-y-5">
                              <div>
                                <Label className="text-gray-700 text-sm mb-2 block">
                                  Full Name <span style={{ color: BUTTON_BROWN }}>*</span>
                                </Label>
                                <Input
                                  required
                                  value={fullName}
                                  onChange={e => {
                                    setFullName(e.target.value)
                                    setValidationErrors(prev => ({ ...prev, fullName: '' }))
                                  }}
                                  placeholder="Your full name"
                                  style={{ backgroundColor: '#f5f5f5', borderColor: validationErrors.fullName ? '#dc2626' : BORDER_LIGHT }}
                                  className="text-gray-900 focus:outline-none"
                                />
                                {validationErrors.fullName && <p className="text-red-400 text-xs mt-1">{validationErrors.fullName}</p>}
                              </div>

                              <div>
                                <Label className="text-gray-700 text-sm mb-2 block">
                                  Phone <span style={{ color: BUTTON_BROWN }}>*</span>
                                </Label>
                                <div className="grid grid-cols-10 gap-2">
                                  <select
                                    required
                                    value={countryCode}
                                    onChange={e => {
                                      setCountryCode(e.target.value)
                                      setValidationErrors(prev => ({ ...prev, phone: '' }))
                                    }}
                                    className={`col-span-3 h-9 px-2 text-gray-900 focus:outline-none border rounded-md ${
                                      validationErrors.phone ? 'border-red-600' : 'border-[#E8E4DC]'
                                    } focus:border-[#6B3F2A]`}
                                    style={{
                                      backgroundColor: '#f5f5f5',
                                      borderRadius: '4px',
                                      fontFamily: 'var(--font-body)',
                                    }}
                                  >
                                    {COUNTRY_OPTIONS.map(opt => (
                                      <option key={`${opt.label}-${opt.code}`} value={opt.code}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                  <Input
                                    required
                                    type="tel"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={phoneNumber}
                                    onChange={e => {
                                      const digitsOnly = e.target.value.replace(/\D/g, '')
                                      setPhoneNumber(digitsOnly)
                                      setValidationErrors(prev => ({ ...prev, phone: '' }))
                                    }}
                                    placeholder={countryCode === '+91' ? '10-digit mobile number' : 'Phone number'}
                                    maxLength={20}
                                    style={{
                                      backgroundColor: '#f5f5f5',
                                      borderRadius: '4px',
                                      fontFamily: 'var(--font-body)',
                                    }}
                                    className={`col-span-7 text-gray-900 focus:outline-none focus-visible:ring-0 ${
                                      validationErrors.phone ? 'border-red-600' : 'border-[#E8E4DC]'
                                    } focus:border-[#6B3F2A]`}
                                  />
                                </div>
                                {validationErrors.phone && <p className="text-red-400 text-xs mt-1">{validationErrors.phone}</p>}
                              </div>

                              <div>
                                <Label className="text-gray-700 text-sm mb-2 block">
                                  Email <span style={{ color: BUTTON_BROWN }}>*</span>
                                </Label>
                                <Input
                                  required
                                  type="email"
                                  value={email}
                                  onChange={e => {
                                    setEmail(e.target.value)
                                    setValidationErrors(prev => ({ ...prev, email: '' }))
                                  }}
                                  placeholder="your@email.com"
                                  maxLength={100}
                                  style={{ backgroundColor: '#f5f5f5', borderColor: validationErrors.email ? '#dc2626' : BORDER_LIGHT }}
                                  className="text-gray-900 focus:outline-none"
                                />
                                {validationErrors.email && <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {error && (
                          <BookingErrorBox 
                            message={error}
                            onRetry={() => {
                              setError(null)
                              setStep(1)
                            }}
                          />
                        )}

                        {/* reCAPTCHA */}
                        <div className="flex justify-center">
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          style={{ backgroundColor: BUTTON_BROWN }}
                          className="w-full text-white font-semibold py-3 hover:opacity-90"
                        >
                          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</> : <>Reserve Now <ChevronRight className="w-4 h-4 ml-1" /></>}
                        </Button>
                      </form>
                    </div>

                    {/* Sticky Summary (40%) */}
                    <div className="lg:col-span-1">
                      <div className="sticky top-24 rounded-lg border p-6 space-y-5" style={{ backgroundColor: CARD_LIGHT, borderColor: BORDER_LIGHT }}>
                        <h3 style={{ color: BUTTON_BROWN }} className="font-medium text-sm">
                          Booking Summary
                        </h3>

                        {/* Rooms */}
                        <div className="space-y-3">
                          {roomSummary.map(({ type, count, price }) => (
                            <div key={type} className="flex items-start gap-3">
                              <div className="relative w-12 h-12 rounded flex-shrink-0 overflow-hidden border" style={{ borderColor: BORDER_LIGHT }}>
                                <Image src={ROOM_INFO[type as keyof typeof ROOM_INFO].image} alt={type} fill className="object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{formatRoomType(type)}</p>
                                <p className="text-xs text-gray-600">x {count} room{count > 1 ? 's' : ''}</p>
                                <p style={{ color: BRAND_GOLD }} className="text-xs font-medium mt-1">
                                  ₹{price.toLocaleString('en-IN')}/night
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ borderColor: BORDER_LIGHT }} className="border-t pt-4 space-y-2 text-sm">
                          <div className="flex justify-between text-gray-700 gap-4">
                            <span className="text-gray-600 shrink-0">Check-in</span>
                            <span className="text-gray-900 text-right">{formatDate(searchResult.checkIn!)}</span>
                          </div>
                          <div className="flex justify-between text-gray-700 gap-4">
                            <span className="text-gray-600 shrink-0">Check-out</span>
                            <span className="text-gray-900 text-right">{formatDate(searchResult.checkOut!)}</span>
                          </div>
                          <div className="flex justify-between text-gray-700 gap-4">
                            <span className="text-gray-600 shrink-0">Nights</span>
                            <span className="text-gray-900 text-right">{searchResult.nights}</span>
                          </div>
                        </div>

                        <div style={{ borderColor: BORDER_LIGHT }} className="border-t pt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-gray-900">{formatRs(searchResult.totalAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tax (5% GST)</span>
                            <span className="text-gray-900">{formatRs(Math.round((searchResult.totalAmount || 0) * 0.05))}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t" style={{ borderColor: BORDER_LIGHT }}>
                            <span className="text-gray-600">Total</span>
                            <span style={{ color: BRAND_GOLD }} className="text-lg font-semibold">
                              {formatRs(Math.round((searchResult.totalAmount || 0) * 1.05))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SUCCESS PAGE
// ═════════════════════════════════════════════════════════════════════════════

function SuccessPage({ booking }: { booking: BookingResult }) {
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [showCard, setShowCard] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setShowCheckmark(true), 1500)
    const timer2 = setTimeout(() => setShowCard(true), 2000)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const roomSummary = getRoomSummary(
    (booking.rooms || []).map((r) => {
      const raw = r as {
        id: number
        roomNumber: string
        roomType?: string
        room_type?: string
        pricePerNight?: number
        price_per_night?: number
      }
      return {
        id: raw.id,
        roomNumber: raw.roomNumber,
        roomType: raw.roomType ?? raw.room_type ?? '',
        pricePerNight: raw.pricePerNight ?? raw.price_per_night ?? 0,
      }
    })
  )
  const roomSummaryLine = formatRoomSummaryLine(roomSummary)

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      {/* Animated circle & checkmark */}
      <motion.div className="flex justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <motion.circle
            cx="60"
            cy="60"
            r="55"
            stroke={BRAND_GOLD}
            strokeWidth="2"
            fill="none"
            initial={{ strokeDasharray: '345.575 345.575', strokeDashoffset: '345.575' }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
          {showCheckmark && (
            <motion.path
              d="M 40 60 L 55 75 L 80 45"
              stroke={BRAND_GOLD}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </svg>
      </motion.div>

      {showCard && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
          <div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', color: BRAND_GOLD }} className="text-4xl font-light mb-2">
              Reservation Received!
            </h1>
          </div>

          <Card className="border" style={{ backgroundColor: `${CARD_LIGHT}80`, borderColor: BORDER_LIGHT }}>
            <CardContent className="p-8">
              <div className="space-y-4 text-left">
                {roomSummary.map(({ type, count }) => (
                  <div key={type || count} className="flex items-center justify-between gap-4">
                    <span className="text-gray-600">Room</span>
                    <span className="text-gray-900 font-medium text-right">
                      {formatRoomType(type)} × {count} {count === 1 ? 'room' : 'rooms'}
                    </span>
                  </div>
                ))}

                <div style={{ borderColor: BORDER_LIGHT }} className="border-t"></div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Booking Reference</span>
                  <span style={{ color: BRAND_GOLD }} className="font-medium">
                    {booking.bookingReference}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Check-in</span>
                  <span className="text-gray-900">{formatDate(booking.checkIn)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Check-out</span>
                  <span className="text-gray-900">{formatDate(booking.checkOut)}</span>
                </div>

                <div style={{ borderColor: BORDER_LIGHT }} className="border-t"></div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Advance Amount</span>
                  <span style={{ color: BRAND_GOLD }} className="text-lg font-semibold">
                    {formatRs(booking.totalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm pt-4">
            <PhoneCall className="w-4 h-4" style={{ color: BRAND_GOLD }} />
            Our team will contact you shortly with further details.
          </div>

          <Link href="/">
            <Button style={{ backgroundColor: BUTTON_BROWN }} className="w-full text-white font-semibold py-3 hover:opacity-90">
              <Home className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  )
}

// ─── Helper Components 
function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-lg bg-red-100 border border-red-300 px-4 py-3">
      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
      <p className="text-red-800 text-sm">{message}</p>
    </motion.div>
  )
}

function BookingErrorBox({ 
  message, 
  onRetry 
}: { 
  message: string
  onRetry: () => void 
}) {
  // Determine error type and provide helpful guidance
  const isRoomBlocked = message.includes('not available') || message.includes('conflicting')
  const isMaintenanceIssue = message.includes('maintenance')
  const isRoomNotFound = message.includes('do not exist')

  let title = 'Booking Failed'
  let explanation = ''

  if (isRoomBlocked) {
    title = 'Rooms No Longer Available'
    explanation = 'Unfortunately, one or more of your selected rooms have been booked by another guest while you were completing your details. This happens when availability is high.'
  } else if (isMaintenanceIssue) {
    title = 'Rooms Under Maintenance'
    explanation = 'One or more of your selected rooms are currently under maintenance and cannot be booked.'
  } else if (isRoomNotFound) {
    title = 'Room Not Found'
    explanation = 'One or more of your selected rooms could not be found in our system.'
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="rounded-lg bg-red-50 border border-red-300 px-5 py-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 text-sm">{title}</h4>
          <p className="text-red-800 text-sm mt-1">{message}</p>
          {explanation && (
            <p className="text-red-700 text-xs mt-2">{explanation}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
