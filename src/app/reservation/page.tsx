'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { roomsApi, bookingsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  CalendarDays, Users, Search, Check, ChevronRight,
  Loader2, AlertCircle, Plus, Trash2, BedDouble,
  CreditCard, Smartphone, Banknote, CheckCircle2,
  ArrowLeft, Home
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface Member {
  memberName: string
  age: string
  relation: string
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

// ─── Step Indicator ──────────────────────────────────────────────────────────

const steps = ['Search', 'Select Rooms', 'Guest Details', 'Payment']

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
  const { user, isAuthenticated } = useAuth()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 state
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '')
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '')
  const [guests, setGuests] = useState(Number(searchParams.get('guests')) || 2)
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)

  // Step 2 state
  const [selectedRooms, setSelectedRooms] = useState<RoomData[]>([])

  // Step 3 state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [idProofType, setIdProofType] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)

  // Step 4 state
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'card' | 'cash'>('UPI')
  const [transactionId, setTransactionId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [confirmationData, setConfirmationData] = useState<any>(null)

  // Pre-fill from URL if step=2 was passed
  useEffect(() => {
    if (searchParams.get('step') === '2' && checkIn && checkOut) {
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
      const res = await roomsApi.getAvailableRooms(checkIn, checkOut, guests)
      const data: AvailabilityResult = res.data.data
      if (data.totalAvailable === 0) {
        setError('No rooms available for the selected dates. Please try different dates.')
        return
      }
      setAvailability(data)
      setSelectedRooms([])
      setStep(2)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to check availability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Room selection ───────────────────────────────────────────────
  const toggleRoom = (room: RoomData) => {
    setSelectedRooms(prev =>
      prev.find(r => r.id === room.id)
        ? prev.filter(r => r.id !== room.id)
        : [...prev, room]
    )
  }

  const totalSelected = selectedRooms.reduce((sum, r) => sum + r.totalPrice, 0)

  // ── Step 3: Create booking ───────────────────────────────────────────────
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        fullName,
        phone,
        email: email || undefined,
        address: address || undefined,
        idProofType: idProofType || undefined,
        members: members.filter(m => m.memberName.trim()).map(m => ({
          memberName: m.memberName,
          age: m.age ? parseInt(m.age) : undefined,
          relation: m.relation || undefined,
        })),
        roomIds: selectedRooms.map(r => r.id),
        checkIn: availability!.checkIn,
        checkOut: availability!.checkOut,
        totalGuests: guests,
        bookingSource: isAuthenticated ? 'online' : 'offline',
        notes: '',
      }
      const res = await bookingsApi.createBooking(payload as any)
      setBookingResult(res.data.data)
      setStep(4)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 4: Confirm payment ──────────────────────────────────────────────
  const handleConfirmPayment = async () => {
    if (!bookingResult) return
    if ((paymentMethod === 'UPI' || paymentMethod === 'card') && !transactionId.trim()) {
      setError('Please enter the transaction ID.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await bookingsApi.confirmPayment(
        bookingResult.bookingId,
        bookingResult.totalAmount,
        paymentMethod,
        transactionId || undefined
      )
      setConfirmationData(res.data.data)
      setConfirmed(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Payment confirmation failed. Please contact the reception.')
    } finally {
      setLoading(false)
    }
  }

  // ── Members helpers ──────────────────────────────────────────────────────
  const addMember = () => setMembers(prev => [...prev, { memberName: '', age: '', relation: '' }])
  const removeMember = (i: number) => setMembers(prev => prev.filter((_, idx) => idx !== i))
  const updateMember = (i: number, field: keyof Member, value: string) =>
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))

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
            {isAuthenticated ? `Welcome, ${user?.name?.split(' ')[0]}` : 'Book Your Stay'}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Confirmed screen */}
        {confirmed && confirmationData ? (
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
            <p className="text-stone-400 mb-8">Your reservation has been successfully confirmed.</p>

            <Card className="bg-stone-900 border-stone-800 max-w-md mx-auto mb-8">
              <CardContent className="p-6 space-y-3 text-left">
                <Detail label="Booking ID" value={`#${confirmationData.bookingId}`} highlight />
                <Detail label="Guest" value={bookingResult?.guest.fullName || ''} />
                <Detail label="Check-in" value={bookingResult?.checkIn || ''} />
                <Detail label="Check-out" value={bookingResult?.checkOut || ''} />
                <Detail label="Nights" value={`${bookingResult?.nights}`} />
                <Detail label="Rooms" value={bookingResult?.rooms.map(r => r.roomNumber).join(', ') || ''} />
                <div className="border-t border-stone-800 pt-3">
                  <Detail label="Amount Paid" value={formatRs(confirmationData.amountPaid)} highlight />
                  <Detail label="Payment Method" value={confirmationData.paymentMethod} />
                  <Detail label="Status" value="Confirmed ✓" highlight />
                </div>
              </CardContent>
            </Card>

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

                        <div className="space-y-1.5">
                          <Label className="text-stone-400 text-sm flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Guests
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={guests}
                            onChange={e => setGuests(Number(e.target.value))}
                            className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500 max-w-xs"
                          />
                        </div>

                        {error && <ErrorBox message={error} />}

                        <Button
                          onClick={handleSearch}
                          disabled={loading}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3"
                        >
                          {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking…</>
                          ) : (
                            <><Search className="w-4 h-4 mr-2" /> Check Availability</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ─── STEP 2: SELECT ROOMS ───────────────────────────────── */}
                {step === 2 && availability && (
                  <div className="space-y-6">
                    {/* Dates summary */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-stone-400 bg-stone-900/60 rounded-xl px-5 py-3 border border-stone-800">
                      <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-amber-500" />{availability.checkIn} → {availability.checkOut}</span>
                      <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-amber-500" />{availability.guestsRequested} guest{availability.guestsRequested > 1 ? 's' : ''}</span>
                      <span className="text-amber-400 font-medium">{availability.nights} night{availability.nights > 1 ? 's' : ''}</span>
                      <button onClick={() => setStep(1)} className="ml-auto text-stone-500 hover:text-stone-300 text-xs flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3" /> Modify
                      </button>
                    </div>

                    <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                      <BedDouble className="w-5 h-5 text-amber-500" />
                      {availability.totalAvailable} rooms available — select yours
                    </h2>

                    {/* Room cards grouped by type */}
                    {Object.entries(availability.roomsByType).map(([type, group]) => (
                      <div key={type}>
                        <h3 className="text-amber-400 font-medium text-sm uppercase tracking-widest mb-3">
                          {formatRoomType(type)} — {formatRs(group.pricePerNight)}/night
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {group.rooms.map(room => {
                            const isSelected = !!selectedRooms.find(r => r.id === room.id)
                            return (
                              <motion.div
                                key={room.id}
                                whileHover={{ y: -2 }}
                                onClick={() => toggleRoom(room)}
                                className={`cursor-pointer rounded-xl border p-5 transition-all duration-200 ${isSelected
                                  ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                                  : 'border-stone-800 bg-stone-900 hover:border-stone-700'
                                  }`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <p className="font-semibold text-stone-100">Room {room.roomNumber}</p>
                                    <p className="text-xs text-stone-500 mt-0.5">{formatRoomType(type)}</p>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-stone-600'
                                    }`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </div>
                                <p className="text-stone-400 text-sm mb-3">{room.description}</p>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-stone-500 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" /> Up to {room.maxGuests}
                                  </span>
                                  <div className="text-right">
                                    <p className="text-amber-400 font-semibold">{formatRs(room.totalPrice)}</p>
                                    <p className="text-stone-600 text-xs">{formatRs(room.pricePerNight)}/night</p>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Selection summary */}
                    <div className="sticky bottom-4 mt-4">
                      <div className="bg-stone-900/95 border border-stone-700 rounded-xl px-5 py-4 backdrop-blur-sm flex items-center justify-between gap-4">
                        <div>
                          {selectedRooms.length === 0 ? (
                            <p className="text-stone-500 text-sm">Select at least one room to continue</p>
                          ) : (
                            <>
                              <p className="text-stone-300 text-sm font-medium">
                                {selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''} selected:
                                {' '}{selectedRooms.map(r => r.roomNumber).join(', ')}
                              </p>
                              <p className="text-amber-400 font-bold text-lg">{formatRs(totalSelected)}</p>
                            </>
                          )}
                        </div>
                        <Button
                          disabled={selectedRooms.length === 0}
                          onClick={() => setStep(3)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shrink-0"
                        >
                          Continue <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── STEP 3: GUEST DETAILS ──────────────────────────────── */}
                {step === 3 && (
                  <form onSubmit={handleCreateBooking} className="max-w-2xl mx-auto space-y-6">
                    <Card className="bg-stone-900 border-stone-800">
                      <CardContent className="p-6 space-y-5">
                        <h2 className="text-lg font-semibold text-stone-100">Primary Guest</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-stone-400 text-sm">Full Name <span className="text-amber-500">*</span></Label>
                            <Input required value={fullName} onChange={e => setFullName(e.target.value)}
                              placeholder="As on ID proof"
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-stone-400 text-sm">Phone <span className="text-amber-500">*</span></Label>
                            <Input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                              placeholder="10-digit mobile"
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-stone-400 text-sm">Email <span className="text-stone-600 text-xs">(optional)</span></Label>
                            <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                              placeholder="you@example.com"
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-stone-400 text-sm">Address <span className="text-stone-600 text-xs">(optional)</span></Label>
                            <Input value={address} onChange={e => setAddress(e.target.value)}
                              placeholder="City, State"
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-stone-400 text-sm">ID Proof Type <span className="text-stone-600 text-xs">(optional)</span></Label>
                            <select
                              value={idProofType}
                              onChange={e => setIdProofType(e.target.value)}
                              className="w-full rounded-md px-3 py-2 bg-stone-800 border border-stone-700 text-stone-100 focus:border-amber-500 focus:outline-none text-sm"
                            >
                              <option value="">Select ID proof</option>
                              <option value="aadhaar">Aadhaar Card</option>
                              <option value="passport">Passport</option>
                              <option value="driving_license">Driving License</option>
                              <option value="voter_id">Voter ID</option>
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Additional members */}
                    <Card className="bg-stone-900 border-stone-800">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-stone-100">Additional Members</h2>
                          <Button type="button" onClick={addMember} variant="outline"
                            className="border-stone-700 text-stone-300 hover:border-amber-500 hover:text-amber-400 text-sm">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Member
                          </Button>
                        </div>

                        {members.length === 0 ? (
                          <p className="text-stone-600 text-sm">No additional members yet.</p>
                        ) : (
                          <div className="space-y-4">
                            {members.map((m, i) => (
                              <div key={i} className="bg-stone-800/60 rounded-lg p-4 border border-stone-800">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-stone-400 text-sm font-medium">Member {i + 1}</span>
                                  <button type="button" onClick={() => removeMember(i)}
                                    className="text-stone-600 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-stone-500 text-xs">Name *</Label>
                                    <Input required value={m.memberName}
                                      onChange={e => updateMember(i, 'memberName', e.target.value)}
                                      placeholder="Full name"
                                      className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-stone-500 text-xs">Age</Label>
                                    <Input type="number" min={0} max={120} value={m.age}
                                      onChange={e => updateMember(i, 'age', e.target.value)}
                                      placeholder="Age"
                                      className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-stone-500 text-xs">Relation</Label>
                                    <Input value={m.relation}
                                      onChange={e => updateMember(i, 'relation', e.target.value)}
                                      placeholder="e.g. spouse"
                                      className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500 text-sm" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Booking info badge */}
                    <div className="bg-stone-900/60 border border-stone-800 rounded-xl px-5 py-4 text-sm">
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-stone-400">
                        <span>Rooms: <span className="text-stone-200 font-medium">{selectedRooms.map(r => r.roomNumber).join(', ')}</span></span>
                        <span>Nights: <span className="text-stone-200 font-medium">{availability?.nights}</span></span>
                        <span>Total: <span className="text-amber-400 font-bold">{formatRs(totalSelected)}</span></span>
                        <span>Source: <span className="text-stone-200">{isAuthenticated ? 'Online' : 'Offline'}</span></span>
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
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating Booking…</>
                        ) : (
                          <>Confirm Booking <ChevronRight className="w-4 h-4 ml-1" /></>
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* ─── STEP 4: PAYMENT ────────────────────────────────────── */}
                {step === 4 && bookingResult && !confirmed && (
                  <div className="max-w-xl mx-auto space-y-6">

                    {/* Booking summary */}
                    <Card className="bg-stone-900 border-stone-800">
                      <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-stone-100 mb-4">Booking Summary</h2>
                        <div className="space-y-2.5 text-sm">
                          <Detail label="Booking ID" value={`#${bookingResult.bookingId}`} highlight />
                          <Detail label="Guest" value={bookingResult.guest.fullName} />
                          <Detail label="Check-in" value={bookingResult.checkIn} />
                          <Detail label="Check-out" value={bookingResult.checkOut} />
                          <Detail label="Nights" value={`${bookingResult.nights}`} />
                          <Detail label="Guests" value={`${bookingResult.totalGuests}`} />
                          <Detail label="Rooms" value={bookingResult.rooms.map(r => `${r.roomNumber} (${formatRoomType(r.roomType)})`).join(', ')} />
                          <div className="border-t border-stone-800 pt-2.5 mt-2.5">
                            <Detail label="Total Amount" value={formatRs(bookingResult.totalAmount)} highlight />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Payment form */}
                    <Card className="bg-stone-900 border-stone-800">
                      <CardContent className="p-6 space-y-5">
                        <h2 className="text-lg font-semibold text-stone-100">Payment</h2>

                        {!isAuthenticated && (
                          <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-800/40 rounded-lg px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-amber-300">Payment confirmation requires a login. You can complete payment at the reception, or <Link href="/login" className="underline text-amber-200">login here</Link>.</p>
                          </div>
                        )}

                        {/* Payment method selector */}
                        <div className="grid grid-cols-3 gap-3">
                          {([
                            { value: 'UPI', label: 'UPI', Icon: Smartphone },
                            { value: 'card', label: 'Card', Icon: CreditCard },
                            { value: 'cash', label: 'Cash', Icon: Banknote },
                          ] as const).map(({ value, label, Icon }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setPaymentMethod(value)}
                              className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${paymentMethod === value
                                ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                : 'border-stone-800 bg-stone-800/50 text-stone-500 hover:border-stone-700'
                                }`}
                            >
                              <Icon className="w-5 h-5" />
                              <span className="text-sm font-medium">{label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Transaction ID */}
                        {(paymentMethod === 'UPI' || paymentMethod === 'card') && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-1.5"
                          >
                            <Label className="text-stone-400 text-sm">
                              Transaction ID <span className="text-amber-500">*</span>
                            </Label>
                            <Input
                              value={transactionId}
                              onChange={e => setTransactionId(e.target.value)}
                              placeholder={paymentMethod === 'UPI' ? 'UPI transaction ref' : 'Card auth / ref number'}
                              className="bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500"
                            />
                          </motion.div>
                        )}

                        {error && <ErrorBox message={error} />}

                        <Button
                          onClick={handleConfirmPayment}
                          disabled={loading || !isAuthenticated}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 disabled:opacity-50"
                        >
                          {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing…</>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Confirm Payment — {formatRs(bookingResult.totalAmount)}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
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
