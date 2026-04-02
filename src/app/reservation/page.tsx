'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { roomsApi, bookingsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  CalendarDays, Users, Search, Check, ChevronRight,
  Loader2, AlertCircle, Plus, Trash2, BedDouble,
  CheckCircle2, ArrowLeft, Home, PhoneCall
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface RoomData {
  id: number
  roomNumber: string
  maxGuests: number
  pricePerNight: number
  totalPrice: number
  description: string
}

interface RoomsByType {
  [type: string]: {
    rooms: RoomData[]
    count: number
    pricePerNight: number
  }
}

interface AvailabilityResult {
  checkIn: string
  checkOut: string
  nights: number
  guestsRequested: number
  totalAvailable: number
  roomsByType: RoomsByType
}

interface BookingResult {
  bookingId: number
  bookingStatus: string
  checkIn: string
  checkOut: string
  nights: number
  totalGuests: number
  totalAmount: number
  guest: { id: number; fullName: string; phone: string }
  rooms: { id: number; roomNumber: string; roomType: string; pricePerNight: number }[]
  message: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatRs = (amount: number) =>
  '₹' + amount.toLocaleString('en-IN')

const formatRoomType = (type: string) => {
  const map: Record<string, string> = {
    premium: 'Premium',
    premium_plus: 'Premium Plus',
  }
  return map[type] || type
}

// Helper to group rooms by type and show quantity
const getRoomSummary = (rooms: AssignedRoom[] | undefined): string => {
  if (!rooms || rooms.length === 0) return ''
  const grouped: { [key: string]: number } = {}
  rooms.forEach(room => {
    grouped[room.roomType] = (grouped[room.roomType] || 0) + 1
  })
  return Object.entries(grouped)
    .map(([type, count]) => `${count} ${formatRoomType(type)}${count > 1 ? 's' : ''}`)
    .join(', ')
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

const steps = ['Search', 'Select Rooms', 'Guest Details']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => {
        const num = i + 1
        const done = num < current
        const active = num === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${done
                ? 'bg-amber-500 border-amber-500 text-white'
                : active
                  ? 'bg-transparent border-amber-500 text-amber-400'
                  : 'bg-transparent border-stone-700 text-stone-600'
                }`}>
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span className={`text-xs mt-1.5 hidden sm:block ${active ? 'text-amber-400' : done ? 'text-amber-500/70' : 'text-stone-600'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-10 sm:w-16 mb-4 mx-1 transition-all duration-300 ${done ? 'bg-amber-500' : 'bg-stone-800'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReservationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 state
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '')
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '')
  const [roomType, setRoomType] = useState<'premium' | 'premium_plus'>((searchParams.get('roomType') as 'premium' | 'premium_plus') || 'premium')
  const [roomCount, setRoomCount] = useState(Number(searchParams.get('roomCount')) || 1)
  
  // Step 2 state - search result from the new API
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)

  // Step 3 state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)

  // Auto-trigger search if query params present on load
  useEffect(() => {
    if (searchParams.get('checkIn') && searchParams.get('checkOut') && searchParams.get('roomType') && searchParams.get('roomCount')) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Step 1: Search ───────────────────────────────────────────────────────
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
        setError(result.message || 'No rooms available for the selected dates.')
        return
      }

      setSearchResult(result)
      setStep(2)
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to search rooms. Please try again.'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Create booking ───────────────────────────────────────────────
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (!searchResult?.assignedRooms) {
        throw new Error('No rooms selected')
      }

      const payload = {
        fullName,
        phone,
        email,
        members: [],
        roomIds: searchResult.assignedRooms.map(r => r.id),
        checkIn: searchResult.checkIn,
        checkOut: searchResult.checkOut,
        totalGuests: searchResult.assignedRooms.length,
        bookingSource: 'online' as const,
        notes: '',
      }
      const res = await bookingsApi.createBooking(payload as any)
      setBookingResult(res.data.data)
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to create booking. Please try again.'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">

      {/* Header */}
      <div className="border-b border-stone-800 bg-stone-900/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/mhomes-logo.png" alt="MHomes" width={40} height={40} className="object-contain" />
            <span className="text-amber-100 font-light tracking-widest text-lg hidden sm:block" style={{ fontFamily: 'Playfair Display, serif' }}>
              mhomes
            </span>
          </Link>
          <span className="text-stone-400 text-sm">
            Book Your Stay
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* ── Request Sent confirmation screen ── */}
        {bookingResult ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <h1 className="text-3xl font-light text-amber-100 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Booking Confirmed!
            </h1>
            <p className="text-stone-400 mb-2">Your reservation has been confirmed successfully.</p>

            <Card className="bg-stone-900 border-stone-800 max-w-md mx-auto my-8">
              <CardContent className="p-6 space-y-3 text-left">
                <Detail label="Booking ID" value={`#${bookingResult.bookingId}`} highlight />
                <Detail label="Guest" value={bookingResult.guest.fullName} />
                <Detail label="Check-in" value={bookingResult.checkIn} />
                <Detail label="Check-out" value={bookingResult.checkOut} />
                <Detail label="Nights" value={`${bookingResult.nights}`} />
                <Detail label="Rooms" value={bookingResult.rooms.map(r => r.roomNumber).join(', ')} />
                <div className="border-t border-stone-800 pt-3">
                  <Detail label="Total Amount" value={formatRs(bookingResult.totalAmount)} highlight />
                  <Detail label="Status" value="Confirmed" />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2 text-stone-400 text-sm mb-6">
              <PhoneCall className="w-4 h-4 text-amber-500" />
              Your booking is confirmed! Our team will contact you shortly with further details.
            </div>

            <Link href="/">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8">
                <Home className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Page heading */}
            <div className="text-center mb-2">
              <h1 className="text-3xl font-light text-amber-100" style={{ fontFamily: 'Playfair Display, serif' }}>
                Reserve Your Stay
              </h1>
              <p className="text-stone-500 text-sm mt-1">Experience luxury at MHomes Resort</p>
            </div>

            <div className="mt-8">
              <StepIndicator current={step} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >

                {/* ─── STEP 1: SEARCH ─────────────────────────────────────── */}
                {step === 1 && (
                  <Card className="bg-stone-900 border-stone-800 max-w-2xl mx-auto">
                    <CardContent className="p-8">
                      <h2 className="text-lg font-semibold text-stone-100 mb-6 flex items-center gap-2">
                        <Search className="w-5 h-5 text-amber-500" /> Check Availability
                      </h2>

                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-stone-400 text-sm flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5" /> Check-in
                            </Label>
                            <Input
                              type="date"
                              min={today}
                              value={checkIn}
                              onChange={e => setCheckIn(e.target.value)}
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-stone-400 text-sm flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5" /> Check-out
                            </Label>
                            <Input
                              type="date"
                              min={checkIn || today}
                              value={checkOut}
                              onChange={e => setCheckOut(e.target.value)}
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-stone-400 text-sm">Room Type</Label>
                            <select
                              value={roomType}
                              onChange={e => setRoomType(e.target.value as 'premium' | 'premium_plus')}
                              className="rounded-lg px-3 sm:px-4 py-2 sm:py-3 bg-stone-800 border border-stone-700 text-stone-100 focus:border-amber-500 focus:outline-none transition-all cursor-pointer w-full"
                            >
                              <option value="premium">Premium (₹5,500/night)</option>
                              <option value="premium_plus">Premium Plus (₹6,500/night)</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-stone-400 text-sm flex items-center gap-1.5">
                              <BedDouble className="w-3.5 h-3.5" /> Number of Rooms
                            </Label>
                            <select
                              value={roomCount}
                              onChange={e => setRoomCount(Number(e.target.value))}
                              className="rounded-lg px-3 sm:px-4 py-2 sm:py-3 bg-stone-800 border border-stone-700 text-stone-100 focus:border-amber-500 focus:outline-none transition-all cursor-pointer w-full"
                            >
                              <option value={1}>1 Room</option>
                              <option value={2}>2 Rooms</option>
                              <option value={3}>3 Rooms</option>
                              <option value={4}>4 Rooms</option>
                              <option value={5}>5 Rooms</option>
                              <option value={6}>6 Rooms</option>
                            </select>
                          </div>
                        </div>

                        {error && <ErrorBox message={error} />}

                        <Button
                          onClick={handleSearch}
                          disabled={loading}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3"
                        >
                          {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching…</>
                          ) : (
                            <><Search className="w-4 h-4 mr-2" /> Check Availability</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ─── STEP 2: RESULTS DISPLAY ────────────────────────────── */}
                {step === 2 && searchResult && (
                  <div className="space-y-6">
                    {/* Dates summary */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-stone-400 bg-stone-900/60 rounded-xl px-5 py-3 border border-stone-800">
                      <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-amber-500" />{searchResult.checkIn} → {searchResult.checkOut}</span>
                      <span className="text-amber-400 font-medium">{searchResult.nights} night{searchResult.nights !== 1 ? 's' : ''}</span>
                      <button onClick={() => setStep(1)} className="ml-auto text-stone-500 hover:text-stone-300 text-xs flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3" /> Change Search
                      </button>
                    </div>

                    {/* Substitution warning */}
                    {searchResult.substitution && searchResult.substitutionMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 rounded-lg bg-yellow-950/60 border border-yellow-800/60 px-4 py-3"
                      >
                        <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                        <p className="text-yellow-300 text-sm">{searchResult.substitutionMessage}</p>
                      </motion.div>
                    )}

                    {/* Assigned rooms display */}
                    <div>
                      <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2 mb-4">
                        <BedDouble className="w-5 h-5 text-amber-500" />
                        Selected Rooms
                      </h2>
                      {searchResult.assignedRooms && searchResult.assignedRooms.length > 0 ? (
                        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
                          <div className="space-y-3">
                            {(() => {
                              const grouped: { [key: string]: number } = {}
                              searchResult.assignedRooms?.forEach(room => {
                                grouped[room.roomType] = (grouped[room.roomType] || 0) + 1
                              })
                              return Object.entries(grouped).map(([type, count]) => (
                                <motion.div
                                  key={type}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-center justify-between p-3 bg-stone-800/50 rounded-lg border border-stone-700/50"
                                >
                                  <div>
                                    <p className="font-medium text-stone-100">{formatRoomType(type)}</p>
                                    <p className="text-xs text-stone-500">Qty: {count}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-amber-400 font-semibold">₹{searchResult.assignedRooms?.filter(r => r.roomType === type)[0]?.pricePerNight || 0}/night</p>
                                  </div>
                                </motion.div>
                              ))
                            })()}
                          </div>
                        </div>
                      ) : (
                        <p className="text-stone-500 text-sm">No rooms assigned</p>
                      )}
                    </div>

                    {/* Pricing summary */}
                    <div className="bg-stone-900/60 border border-stone-800 rounded-xl px-5 py-4 text-sm">
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-stone-400">
                        <span>Nights: <span className="text-stone-200 font-medium">{searchResult.nights}</span></span>
                        <span>Per Night: <span className="text-stone-200 font-medium">{formatRs(searchResult.totalPerNight || 0)}</span></span>
                        <span>Total: <span className="text-amber-400 font-bold text-base">{formatRs(searchResult.totalAmount || 0)}</span></span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setStep(1)}
                        className="flex-1 border-stone-700 text-stone-400 hover:border-stone-600">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Change Search
                      </Button>
                      <Button type="button" onClick={() => setStep(3)}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold">
                        Accept & Continue <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ─── STEP 3: GUEST DETAILS ──────────────────────────────── */}
                {step === 3 && searchResult && (
                  <form onSubmit={handleCreateBooking} className="max-w-2xl mx-auto space-y-6">
                    <Card className="bg-stone-900 border-stone-800">
                      <CardContent className="p-6 space-y-5">
                        <h2 className="text-lg font-semibold text-stone-100">Your Details</h2>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-stone-400 text-sm">Full Name <span className="text-amber-500">*</span></Label>
                            <Input required value={fullName} onChange={e => setFullName(e.target.value)}
                              placeholder="Your full name"
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-stone-400 text-sm">Phone <span className="text-amber-500">*</span></Label>
                            <Input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                              placeholder="10-digit mobile number"
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-stone-400 text-sm">Email <span className="text-amber-500">*</span></Label>
                            <Input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                              placeholder="your@email.com"
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Booking info badge */}
                    <div className="bg-stone-900/60 border border-stone-800 rounded-xl px-5 py-4 text-sm">
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-stone-400">
                        <span>Rooms: <span className="text-stone-200 font-medium">{getRoomSummary(searchResult.assignedRooms)}</span></span>
                        <span>Nights: <span className="text-stone-200 font-medium">{searchResult.nights}</span></span>
                        <span>Total: <span className="text-amber-400 font-bold">{formatRs(searchResult.totalAmount || 0)}</span></span>
                      </div>
                    </div>

                    {error && <ErrorBox message={error} />}

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setStep(2)}
                        className="border-stone-700 text-stone-400 hover:border-stone-600">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button type="submit" disabled={loading}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold">
                        {loading ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</>
                        ) : (
                          <>Submit Booking <ChevronRight className="w-4 h-4 ml-1" /></>
                        )}
                      </Button>
                    </div>
                  </form>
                )}


              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Small helper components ─────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-lg bg-red-950/60 border border-red-800/60 px-4 py-3"
    >
      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <p className="text-red-300 text-sm">{message}</p>
    </motion.div>
  )
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-500">{label}</span>
      <span className={highlight ? 'text-amber-400 font-semibold' : 'text-stone-300'}>{value}</span>
    </div>
  )
}
