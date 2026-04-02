'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { adminApi, bookingsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  LayoutDashboard, CreditCard, BookOpen, BedDouble, Clock,
  Loader2, AlertCircle, TrendingUp, Users, CheckCircle2, XCircle, LogOut, LogIn,
  ArrowUpDown, Home, RefreshCw, IndianRupee, Pencil, X, Phone, Wifi, WifiOff, Trash2, Search, Plus, Check
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardData {
  bookings: { total: number; pending: number; confirmed: number; cancelled: number }
  today: { checkIns: number; checkOuts: number }
  revenue: { total: string }
  rooms: { total: number; active: number; maintenance: number }
}

interface BookingGuest {
  fullName: string; phone: string; email: string
  members?: { id: number; memberName: string }[]
}

interface BookingRoom {
  roomNumber: string; roomType: string; pricePerNight: number
}

interface Booking {
  id: number
  bookingReference: string
  bookingStatus: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
  bookingSource: 'online' | 'offline'
  checkIn: string; checkOut: string
  totalGuests: number; totalAmount: number
  notes?: string; createdAt: string
  nights?: number
  guest: BookingGuest
  rooms: BookingRoom[]
  payments: Payment[]
}

interface TodayData {
  date: string
  checkIns: { total: number; bookings: Booking[] }
  checkOuts: { total: number; bookings: Booking[] }
}

interface Room {
  id: number; roomNumber: string; roomType: string
  maxGuests: number; pricePerNight: number
  status: 'active' | 'maintenance'; description: string
}

interface PendingBooking {
  id: number
  bookingReference: string
  checkIn: string
  checkOut: string
  totalAmount: number
  createdAt: string
  guest: BookingGuest
}

interface PendingNotification {
  id: number
  bookingId: number
  booking: PendingBooking
  timestamp: number
}

interface Payment {
  id: number
  bookingId: number
  amount: number
  paymentMethod: 'UPI' | 'card' | 'cash' | 'gateway'
  paymentStatus: 'yet_to_pay' | 'paid' | 'refunded'
  transactionId?: string
  paymentDate?: string
  createdAt: string
  booking?: {
    bookingReference: string
    guest: BookingGuest
    checkIn?: string
    checkOut?: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const roomType = (t: string) => t === 'premium_plus' ? 'Premium Plus' : 'Premium'

const isRefundAllowed = (checkInDate?: string) => {
  if (!checkInDate) return false
  const checkIn = new Date(checkInDate)
  if (Number.isNaN(checkIn.getTime())) return false

  const threshold = new Date(checkIn)
  threshold.setHours(0, 0, 0, 0)
  threshold.setDate(threshold.getDate() - 1)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return today < threshold
}

const TAB_CONFIG = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'payments', label: 'Payments', Icon: CreditCard },
  { id: 'bookings', label: 'Bookings', Icon: BookOpen },
  { id: 'rooms', label: 'Rooms', Icon: BedDouble },
  { id: 'checkinout', label: 'Today Check-in / Check-out', Icon: Clock },
]

// ─── Status & Source Badges ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    checked_in: 'bg-green-500/15 text-green-400 border-green-500/30',
    checked_out: 'bg-stone-500/15 text-stone-400 border-stone-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
    active: 'bg-green-500/15 text-green-400 border-green-500/30',
    maintenance: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${map[status] || 'bg-stone-700 text-stone-400 border-stone-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  return source === 'online'
    ? <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30 flex items-center gap-1 w-fit"><Wifi className="w-3 h-3" />Online</span>
    : <span className="text-xs px-2 py-0.5 rounded-full border bg-stone-700/50 text-stone-400 border-stone-600 flex items-center gap-1 w-fit"><WifiOff className="w-3 h-3" />Offline</span>
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon: LucideIcon }) {
  return (
    <Card className="bg-stone-900 border-stone-800">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-stone-500 text-xs mb-0.5">{label}</p>
          <p className="text-stone-100 text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Spinner() {
  return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-amber-500" /></div>
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 max-w-lg">
      <AlertCircle className="w-4 h-4 shrink-0" />{msg}
    </div>
  )
}

function TodayCard({ booking: b }: { booking: Booking }) {
  return (
    <Card className="bg-stone-900 border-stone-800">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-amber-400">#{b.id}</span>
          <StatusBadge status={b.bookingStatus} />
        </div>
        <p className="text-stone-200 font-medium text-sm">{b.guest.fullName}</p>
        <p className="text-stone-500 text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{b.guest.phone}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-400 text-xs">Rooms: <span className="text-stone-200">{b.rooms.map(r => r.roomNumber).join(', ')}</span></span>
          <span className="text-stone-500 text-xs"><Users className="w-3 h-3 inline mr-0.5" />{b.totalGuests}</span>
        </div>
        <p className="text-amber-400 font-semibold text-sm">{fmt(b.totalAmount)}</p>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')

  // Dashboard state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashLoading, setDashLoading] = useState(false)
  const [dashError, setDashError] = useState<string | null>(null)

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookLoading, setBookLoading] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined)

  // Payment modal state
  const [payModal, setPayModal] = useState<Booking | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [payTxn, setPayTxn] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Cancel booking state
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  // Today state
  const [today, setToday] = useState<TodayData | null>(null)
  const [todayLoading, setTodayLoading] = useState(false)
  const [todayError, setTodayError] = useState<string | null>(null)

  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [roomsError, setRoomsError] = useState<string | null>(null)
  const [editingRoom, setEditingRoom] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Room>>({})
  const [editLoading, setEditLoading] = useState(false)

  // Room search & offline booking state
  const [searchCheckIn, setSearchCheckIn] = useState('')
  const [searchCheckOut, setSearchCheckOut] = useState('')
  const [searchRoomType, setSearchRoomType] = useState('all')
  const [searchResults, setSearchResults] = useState<Room[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<number>>(new Set())
  const [showBookingModal, setShowBookingModal] = useState(false)

  // Offline booking form state
  const [bookingGuestName, setBookingGuestName] = useState('')
  const [bookingGuestPhone, setBookingGuestPhone] = useState('')
  const [bookingGuestEmail, setBookingGuestEmail] = useState('')
  const [bookingGuestAddress, setBookingGuestAddress] = useState('')
  const [bookingGuestProof, setBookingGuestProof] = useState('')

  const [bookingMembers, setBookingMembers] = useState<Array<{ memberName: string; age?: number; relation?: string }>>([])

  const [bookingTotalGuests, setBookingTotalGuests] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')

  const [bookingPaymentMethod, setBookingPaymentMethod] = useState('cash')
  const [bookingPaymentTxnId, setBookingPaymentTxnId] = useState('')
  const [bookingPaymentDate, setBookingPaymentDate] = useState(new Date().toISOString().split('T')[0])

  const [bookingStatus, setBookingStatus] = useState('confirmed')

  const [bookingLoading, setBookingLoading] = useState<number | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [offlineBookingLoading, setOfflineBookingLoading] = useState(false)

  // Pending bookings state
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError, setPendingError] = useState<string | null>(null)
  const [confirmingBookingId, setConfirmingBookingId] = useState<number | null>(null)

  // Payments search & management state
  const [paymentSearchRef, setPaymentSearchRef] = useState('')
  const [paymentSearchName, setPaymentSearchName] = useState('')
  const [paymentSearchPhone, setPaymentSearchPhone] = useState('')
  const [paymentSearchResults, setPaymentSearchResults] = useState<Payment[]>([])
  const [paymentSearchLoading, setPaymentSearchLoading] = useState(false)
  const [paymentSearchError, setPaymentSearchError] = useState<string | null>(null)

  // Payment edit dialog state
  const [editPaymentId, setEditPaymentId] = useState<number | null>(null)
  const [editPaymentStatus, setEditPaymentStatus] = useState('yet_to_pay')
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash')
  const [editPaymentTxnId, setEditPaymentTxnId] = useState('')
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editPaymentLoading, setEditPaymentLoading] = useState(false)
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null)

  // Payment cancel state
  const [cancelPaymentId, setCancelPaymentId] = useState<number | null>(null)
  const [cancelPaymentLoading, setCancelPaymentLoading] = useState(false)

  // Pending booking confirmation dialog state
  const [confirmingBooking, setConfirmingBooking] = useState<Booking | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [confirmPaymentMethod, setConfirmPaymentMethod] = useState('cash')
  const [confirmPaymentTxnId, setConfirmPaymentTxnId] = useState('')
  const [confirmPaymentDate, setConfirmPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [confirmPaymentLoading, setConfirmPaymentLoading] = useState(false)
  const [confirmPaymentError, setConfirmPaymentError] = useState<string | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setDashLoading(true); setDashError(null)
    try {
      const res = await adminApi.getDashboard()
      setDashboard(res.data.data)
    } catch (e: any) { setDashError(e?.response?.data?.message || 'Failed to load dashboard.') }
    finally { setDashLoading(false) }
  }, [])

  const fetchBookings = useCallback(async () => {
    setBookLoading(true); setBookError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)
      if (dateFilter) params.append('date', dateFilter.toISOString().split('T')[0])

      const res = await fetch(`http://localhost:5000/api/bookings?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load bookings')
      setBookings(data.data?.bookings || data.data || [])
    } catch (e: any) { setBookError(e?.response?.data?.message || e?.message || 'Failed to load bookings.') }
    finally { setBookLoading(false) }
  }, [statusFilter, sourceFilter, dateFilter])

  const fetchToday = useCallback(async () => {
    setTodayLoading(true); setTodayError(null)
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const [checkinsRes, checkoutsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/bookings?date=${today}&status=confirmed`),
        fetch(`http://localhost:5000/api/bookings?checkOutDate=${today}&status=checked_in`)
      ])
      const checkinsData = await checkinsRes.json()
      const checkoutsData = await checkoutsRes.json()
      setToday({
        date: today,
        checkIns: { total: checkinsData.data.length, bookings: checkinsData.data },
        checkOuts: { total: checkoutsData.data.length, bookings: checkoutsData.data }
      })
    } catch (e: any) { setTodayError(e?.message || 'Failed to load today\'s activity.') }
    finally { setTodayLoading(false) }
  }, [])

  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true); setRoomsError(null)
    try {
      const res = await adminApi.getAllRooms()
      setRooms(res.data.data?.rooms || res.data.data || [])
    } catch (e: any) { setRoomsError(e?.response?.data?.message || 'Failed to load rooms.') }
    finally { setRoomsLoading(false) }
  }, [])

  useEffect(() => { if (activeTab === 'dashboard') fetchDashboard() }, [activeTab, fetchDashboard])
  useEffect(() => { if (activeTab === 'bookings') fetchBookings() }, [activeTab, fetchBookings])
  useEffect(() => { if (activeTab === 'checkinout') fetchToday() }, [activeTab, fetchToday])
  useEffect(() => { if (activeTab === 'rooms') fetchRooms() }, [activeTab, fetchRooms])

  // Auto-refresh check-in/check-out tab every 60 seconds
  useEffect(() => {
    if (activeTab !== 'checkinout') return
    const interval = setInterval(fetchToday, 60000)
    return () => clearInterval(interval)
  }, [activeTab, fetchToday])

  // ── Fetch pending bookings (Dashboard tab) ────────────────────────────────
  const fetchPendingBookings = useCallback(async () => {
    setPendingLoading(true); setPendingError(null)
    try {
      const res = await fetch('http://localhost:5000/api/bookings/pending')
      const data = await res.json()
      setPendingBookings(data.data?.bookings || data.data || [])
    } catch (e: any) { setPendingError('Failed to load pending bookings.') }
    finally { setPendingLoading(false) }
  }, [])

  useEffect(() => { if (activeTab === 'dashboard') fetchPendingBookings() }, [activeTab, fetchPendingBookings])

  // ── Payment & Booking Handlers ─────────────────────────────────────────────

  const handleConfirmPayment = async () => {
    if (!payModal) return
    setPayLoading(true); setPayError(null)
    try {
      await bookingsApi.confirmPayment(
        payModal.id,
        Number(payAmount),
        payMethod,
        payTxn || undefined
      )
      setPayModal(null)
      setSuccessMsg(`Booking #${payModal.id} confirmed!`)
      setTimeout(() => setSuccessMsg(null), 4000)
      fetchBookings()
    } catch (e: any) {
      setPayError(e?.response?.data?.message || 'Payment confirmation failed.')
    } finally { setPayLoading(false) }
  }

  const handleStatusUpdate = async (bookingId: number, newStatus: 'checked_in' | 'checked_out') => {
    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: newStatus }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update booking status')

      setSuccessMsg(`Booking #${bookingId} ${newStatus === 'checked_in' ? 'checked in' : 'checked out'} successfully!`)
      setTimeout(() => setSuccessMsg(null), 4000)
      fetchBookings() // Refresh the table
    } catch (e: any) {
      setBookError(e?.message || 'Failed to update booking status.')
    }
  }

  const [pendingCancelError, setPendingCancelError] = useState<string | null>(null)
  const [pendingCancellingId, setPendingCancellingId] = useState<number | null>(null)

  const handleCancelPendingBooking = async (bookingId: number) => {
    const confirmed = window.confirm('Are you sure you want to cancel this reservation?')
    if (!confirmed) return

    setPendingCancelError(null)
    setPendingCancellingId(bookingId)

    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: 'cancelled' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to cancel booking')

      setSuccessMsg(`Booking #${bookingId} cancelled.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      setPendingBookings(prev => prev.filter(b => b.id !== bookingId))
      fetchPendingBookings()
    } catch (e: any) {
      setPendingCancelError(e?.message || 'Failed to cancel booking.')
    } finally {
      setPendingCancellingId(null)
    }
  }

  const handleCheckinCheckout = async (bookingId: number, newStatus: 'checked_in' | 'checked_out') => {
    setBookingLoading(bookingId)
    setBookingError(null)

    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: newStatus }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || `Failed to update booking status`)

      const statusLabel = newStatus === 'checked_in' ? 'checked in' : 'checked out'
      setSuccessMsg(`Booking #${bookingId} ${statusLabel}.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      
      // Refresh the today's activity to update the tables
      fetchToday()
    } catch (e: any) {
      setBookingError(e?.message || `Failed to update booking status.`)
    } finally {
      setBookingLoading(null)
    }
  }

  const handleConfirmPendingPayment = async (bookingId: number) => {
    const booking = pendingBookings.find(b => b.id === bookingId)
    if (booking) {
      setConfirmingBooking(booking)
      setShowPaymentForm(false)
      setConfirmPaymentMethod('cash')
      setConfirmPaymentTxnId('')
      setConfirmPaymentDate(new Date().toISOString().split('T')[0])
      setConfirmPaymentError(null)
    }
  }

  const handleSubmitPaymentConfirmation = async () => {
    if (!confirmingBooking || !confirmingBooking.payments?.[0]) return

    setConfirmPaymentLoading(true)
    setConfirmPaymentError(null)
    try {
      const paymentId = confirmingBooking.payments[0].id
      const res = await fetch(`http://localhost:5000/api/admin/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paymentMethod: confirmPaymentMethod,
          transactionId: confirmPaymentTxnId || null,
          paymentDate: confirmPaymentDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to confirm payment')

      setSuccessMsg(`Payment confirmed! Booking #${confirmingBooking.bookingReference} is now confirmed.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      setConfirmingBooking(null)
      setShowPaymentForm(false)
      fetchPendingBookings()
    } catch (e: any) {
      setConfirmPaymentError(e?.message || 'Failed to confirm payment.')
    } finally { setConfirmPaymentLoading(false) }
  }

  // ── Payment Handlers ───────────────────────────────────────────────────────

  const handleSearchPayments = async () => {
    if (!paymentSearchRef && !paymentSearchName && !paymentSearchPhone) {
      setPaymentSearchError('Enter at least one search criteria.')
      return
    }
    setPaymentSearchLoading(true)
    setPaymentSearchError(null)
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/payments/search?${paymentSearchRef ? `bookingReference=${paymentSearchRef}&` : ''
        }${paymentSearchName ? `guestName=${paymentSearchName}&` : ''}${paymentSearchPhone ? `phone=${paymentSearchPhone}` : ''
        }`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Search failed')
      setPaymentSearchResults(data.data?.payments || data.data || [])
    } catch (e: any) {
      setPaymentSearchError(e?.message || 'Failed to search payments.')
    } finally { setPaymentSearchLoading(false) }
  }

  const handleEditPayment = (payment: Payment) => {
    setEditPaymentId(payment.id)
    setEditPaymentStatus(payment.paymentStatus)
    setEditPaymentMethod(payment.paymentMethod || 'cash')
    setEditPaymentTxnId(payment.transactionId || '')
    setEditPaymentDate(payment.paymentDate ? payment.paymentDate.split('T')[0] : '')
    setEditPaymentError(null)
  }

  const handleSavePayment = async () => {
    if (!editPaymentId) return
    setEditPaymentLoading(true)
    setEditPaymentError(null)
    try {
      const res = await fetch(`http://localhost:5000/api/admin/payments/${editPaymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editPaymentStatus,
          paymentMethod: editPaymentMethod,
          transactionId: editPaymentTxnId || null,
          paymentDate: editPaymentDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update payment')
      setSuccessMsg('Payment updated successfully!')
      setTimeout(() => setSuccessMsg(null), 4000)
      setEditPaymentId(null)
      handleSearchPayments() // Refresh results
    } catch (e: any) {
      setEditPaymentError(e?.message || 'Failed to update payment.')
    } finally { setEditPaymentLoading(false) }
  }

  const handleCancelPayment = async () => {
    if (!cancelPaymentId) return
    setCancelPaymentLoading(true)
    try {
      const res = await fetch(`http://localhost:5000/api/admin/payments/${cancelPaymentId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to cancel payment')
      setSuccessMsg('Payment cancelled and booking refunded!')
      setTimeout(() => setSuccessMsg(null), 4000)
      setCancelPaymentId(null)
      handleSearchPayments() // Refresh results
    } catch (e: any) {
      setPaymentSearchError(e?.message || 'Failed to cancel payment.')
    } finally { setCancelPaymentLoading(false) }
  }

  // ── Room Search & Offline Booking Handlers ─────────────────────────────────

  const handleSearchRooms = async () => {
    if (!searchCheckIn || !searchCheckOut) {
      setSearchError('Check-in and Check-out dates are required.')
      return
    }

    const ciDate = new Date(searchCheckIn)
    const coDate = new Date(searchCheckOut)
    if (coDate <= ciDate) {
      setSearchError('Check-out date must be after check-in date.')
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    try {
      const params = new URLSearchParams({
        checkIn: searchCheckIn,
        checkOut: searchCheckOut,
        ...(searchRoomType !== 'all' && { roomType: searchRoomType }),
      })
      const res = await fetch(`http://localhost:5000/api/rooms/search-simple?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Search failed')
      setSearchResults(data.data?.rooms || data.data || [])
      setSelectedRoomIds(new Set())
    } catch (e: any) {
      setSearchError(e?.message || 'Failed to search rooms.')
    } finally { setSearchLoading(false) }
  }

  const handleToggleRoom = (roomId: number) => {
    const updated = new Set(selectedRoomIds)
    if (updated.has(roomId)) {
      updated.delete(roomId)
    } else {
      updated.add(roomId)
    }
    setSelectedRoomIds(updated)
  }

  const handleOpenBookingModal = () => {
    if (selectedRoomIds.size === 0) return

    // Reset booking form
    setBookingGuestName('')
    setBookingGuestPhone('')
    setBookingGuestEmail('')
    setBookingGuestAddress('')
    setBookingGuestProof('')
    setBookingMembers([])
    setBookingTotalGuests('')
    setBookingNotes('')
    setBookingPaymentMethod('cash')
    setBookingPaymentTxnId('')
    setBookingPaymentDate(new Date().toISOString().split('T')[0])
    setBookingStatus('confirmed')
    setBookingError(null)

    setShowBookingModal(true)
  }

  const handleAddMember = () => {
    setBookingMembers([...bookingMembers, { memberName: '', age: undefined, relation: '' }])
  }

  const handleRemoveMember = (index: number) => {
    setBookingMembers(bookingMembers.filter((_, i) => i !== index))
  }

  const handleUpdateMember = (index: number, field: string, value: any) => {
    const updated = [...bookingMembers]
    updated[index] = { ...updated[index], [field]: value }
    setBookingMembers(updated)
  }

  const calculateTotalAmount = () => {
    const ciDate = new Date(searchCheckIn)
    const coDate = new Date(searchCheckOut)
    const nights = Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24))

    const total = Array.from(selectedRoomIds).reduce((sum, roomId) => {
      const room = searchResults.find(r => r.id === roomId)
      return sum + (room ? room.pricePerNight * nights : 0)
    }, 0)
    return total
  }

  const handleSubmitOfflineBooking = async () => {
    if (!bookingGuestName || !bookingGuestPhone || !bookingGuestEmail) {
      setBookingError('Guest name, phone, and email are required.')
      return
    }
    if (!bookingTotalGuests || parseInt(bookingTotalGuests) < 1) {
      setBookingError('Total guests must be at least 1.')
      return
    }

    setOfflineBookingLoading(true)
    setBookingError(null)
    try {
      const roomIds = Array.from(selectedRoomIds)
      const res = await fetch('http://localhost:5000/api/bookings/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest: {
            fullName: bookingGuestName,
            phone: bookingGuestPhone,
            email: bookingGuestEmail,
            address: bookingGuestAddress || null,
            idProofType: bookingGuestProof || null,
          },
          members: bookingMembers.filter(m => m.memberName),
          booking: {
            checkIn: searchCheckIn,
            checkOut: searchCheckOut,
            totalGuests: parseInt(bookingTotalGuests),
            totalAmount: calculateTotalAmount(),
            notes: bookingNotes || null,
            roomIds,
          },
          payment: {
            amount: calculateTotalAmount(),
            paymentMethod: bookingPaymentMethod,
            transactionId: bookingPaymentTxnId || null,
            paymentDate: bookingPaymentDate,
          },
          bookingStatus,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create booking')

      setSuccessMsg(`Offline booking created! Reference: ${data.data?.bookingReference}`)
      setTimeout(() => setSuccessMsg(null), 5000)

      setShowBookingModal(false)
      setSelectedRoomIds(new Set())
      setSearchResults([])
      setSearchCheckIn('')
      setSearchCheckOut('')
    } catch (e: any) {
      setBookingError(e?.message || 'Failed to create offline booking.')
    } finally { setOfflineBookingLoading(false) }
  }

  // ── Room Handlers ──────────────────────────────────────────────────────────

  const startEdit = (room: Room) => {
    setEditingRoom(room.id)
    setEditForm({ pricePerNight: room.pricePerNight, status: room.status, maxGuests: room.maxGuests, description: room.description })
  }

  const handleSaveRoom = async (id: number) => {
    setEditLoading(true)
    try {
      await adminApi.updateRoom(id, editForm)
      setEditingRoom(null)
      fetchRooms()
    } catch (e: any) { setRoomsError(e?.response?.data?.message || 'Failed to update room.') }
    finally { setEditLoading(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* NAVBAR - Fixed at top with navigation tabs */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-stone-800 bg-stone-900/80 backdrop-blur-md">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          {/* Header row with branding & logout */}
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xs font-bold uppercase tracking-widest text-stone-100">MHomes</h1>
                <p className="text-xs text-stone-500 leading-none">Admin Panel</p>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Logout button */}
            <Button variant="ghost" size="sm" className="text-stone-400 hover:text-stone-200 gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Logout</span>
            </Button>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0 scroll-smooth -mx-4 px-4">
            {TAB_CONFIG.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 border ${activeTab === id
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'text-stone-400 hover:text-stone-300 border-transparent hover:bg-stone-800/50'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content area with padding to account for fixed navbar */}
      <main className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Success toast notification */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-900/90 border border-green-700 text-green-300 text-sm px-6 py-3 rounded-xl shadow-xl flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab content area with animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >

              {/* ─── TAB: DASHBOARD ──────────────────────────────────── */}
              {activeTab === 'dashboard' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-stone-100">Pending Bookings</h2>
                      <p className="text-xs text-stone-500 mt-1">Awaiting payment confirmation</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchPendingBookings} className="border-stone-700 text-stone-500 hover:border-stone-600 text-xs h-7">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {pendingLoading ? <Spinner /> : pendingError ? <ErrBox msg={pendingError} /> : pendingBookings.length === 0 ? (
                    <Card className="bg-stone-900/50 border border-dashed border-stone-700 rounded-2xl">
                      <CardContent className="p-12 text-center">
                        <div className="flex justify-center mb-4">
                          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-7 h-7 text-green-400" />
                          </div>
                        </div>
                        <h3 className="text-stone-200 font-semibold mb-2">All Caught Up!</h3>
                        <p className="text-stone-500 text-sm max-w-md mx-auto">
                          No pending bookings at the moment.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {pendingBookings.map(b => (
                        <Card key={b.id} className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 overflow-hidden">
                          <CardContent className="p-0">
                            <div className="p-5 sm:p-6">
                              {/* Header */}
                              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                <div>
                                  <p className="text-2xl font-bold text-blue-300">{b.guest.fullName}</p>
                                  <p className="text-xs text-blue-400 mt-1">Booking Ref: <span className="font-mono font-bold">{b.bookingReference}</span></p>
                                </div>
                                <div className="text-right">
                                  <p className="text-amber-400 font-bold text-2xl">{fmt(b.totalAmount)}</p>
                                  <p className="text-xs text-stone-500 mt-0.5">Total Amount</p>
                                </div>
                              </div>

                              {/* Contact & Dates Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 pb-5 border-b border-blue-700/30">
                                <div>
                                  <p className="text-stone-500 text-xs uppercase tracking-widest font-medium mb-1">Phone</p>
                                  <p className="text-blue-100 font-mono text-sm">{b.guest.phone}</p>
                                </div>
                                <div>
                                  <p className="text-stone-500 text-xs uppercase tracking-widest font-medium mb-1">Email</p>
                                  <p className="text-blue-100 text-sm break-all">{b.guest.email || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-stone-500 text-xs uppercase tracking-widest font-medium mb-1">Check-in</p>
                                  <p className="text-blue-100 text-sm">{fmtDate(b.checkIn)}</p>
                                </div>
                                <div>
                                  <p className="text-stone-500 text-xs uppercase tracking-widest font-medium mb-1">Check-out</p>
                                  <p className="text-blue-100 text-sm">{fmtDate(b.checkOut)}</p>
                                </div>
                                <div>
                                  <p className="text-stone-500 text-xs uppercase tracking-widest font-medium mb-1">Created</p>
                                  <p className="text-blue-400 text-sm">{fmtDate(b.createdAt)}</p>
                                </div>
                                <div>
                                  <p className="text-stone-500 text-xs uppercase tracking-widest font-medium mb-1\">Status</p>
                                  <StatusBadge status={b.bookingStatus} />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  onClick={() => handleConfirmPendingPayment(b.id)}
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Confirm Booking
                                </Button>
                                <Button
                                  onClick={() => handleCancelPendingBooking(b.id)}
                                  size="sm"
                                  variant="outline"
                                  disabled={pendingCancellingId === b.id}
                                  className="border-rose-700 text-rose-400 hover:border-rose-600 text-xs"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Cancel Booking
                                </Button>
                              </div>
                              {pendingCancelError && pendingCancellingId === null && (
                                <p className="text-xs text-rose-300 mt-2">{pendingCancelError}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: PAYMENTS (Placeholder) ─────────────────────── */}
              {activeTab === 'payments' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-stone-100">Payment Management</h2>
                  </div>

                  {/* Search Section */}
                  <Card className="bg-stone-900 border border-stone-800 rounded-xl mb-6">
                    <CardContent className="p-5">
                      <h3 className="text-stone-200 font-semibold text-sm mb-4">Search Payments</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        <div>
                          <Label className="text-xs text-stone-400 mb-1 block">Booking Reference</Label>
                          <Input
                            placeholder="e.g., MH-2026-0001"
                            value={paymentSearchRef}
                            onChange={e => setPaymentSearchRef(e.target.value)}
                            className="bg-stone-950 border-stone-700 text-stone-100 text-xs h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-stone-400 mb-1 block">Guest Name</Label>
                          <Input
                            placeholder="Guest name"
                            value={paymentSearchName}
                            onChange={e => setPaymentSearchName(e.target.value)}
                            className="bg-stone-950 border-stone-700 text-stone-100 text-xs h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-stone-400 mb-1 block">Phone</Label>
                          <Input
                            placeholder="Phone number"
                            value={paymentSearchPhone}
                            onChange={e => setPaymentSearchPhone(e.target.value)}
                            className="bg-stone-950 border-stone-700 text-stone-100 text-xs h-9"
                          />
                        </div>
                      </div>
                      {paymentSearchError && (
                        <div className="flex gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-red-400 text-xs">{paymentSearchError}</p>
                        </div>
                      )}
                      <Button
                        onClick={handleSearchPayments}
                        disabled={paymentSearchLoading}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs h-9 gap-2"
                      >
                        {paymentSearchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <Search className="w-4 h-4" />
                        Search
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Results Table */}
                  {paymentSearchResults.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-stone-800">
                      <table className="w-full text-xs">
                        <thead className="bg-stone-900/50 border-b border-stone-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-stone-400 font-semibold">Booking Ref</th>
                            <th className="px-4 py-3 text-left text-stone-400 font-semibold">Guest</th>
                            <th className="px-4 py-3 text-left text-stone-400 font-semibold">Phone</th>
                            <th className="px-4 py-3 text-right text-stone-400 font-semibold">Amount</th>
                            <th className="px-4 py-3 text-left text-stone-400 font-semibold">Method</th>
                            <th className="px-4 py-3 text-left text-stone-400 font-semibold">Status</th>
                            <th className="px-4 py-3 text-left text-stone-400 font-semibold">Txn ID</th>
                            <th className="px-4 py-3 text-left text-stone-400 font-semibold">Date</th>
                            <th className="px-4 py-3 text-center text-stone-400 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentSearchResults.map(p => {
                            const refundAllowed = isRefundAllowed(p.booking?.checkIn)

                            return (
                              <tr key={p.id} className="border-b border-stone-800 hover:bg-stone-900/30">
                                <td className="px-4 py-3 text-stone-200 font-medium">{p.booking?.bookingReference || '-'}</td>
                                <td className="px-4 py-3 text-stone-300">{p.booking?.guest?.fullName || '-'}</td>
                                <td className="px-4 py-3 text-stone-400">{p.booking?.guest?.phone || '-'}</td>
                                <td className="px-4 py-3 text-right text-amber-400 font-semibold">{fmt(p.amount)}</td>
                                <td className="px-4 py-3 text-stone-300 capitalize">{p.paymentMethod || '-'}</td>
                                <td className="px-4 py-3">
                                  <StatusBadge status={p.paymentStatus} />
                                </td>
                                <td className="px-4 py-3 text-stone-500">{p.transactionId || '-'}</td>
                                <td className="px-4 py-3 text-stone-500">{p.paymentDate ? fmtDate(p.paymentDate) : '-'}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex gap-2 justify-center items-center">
                                    <Button
                                      onClick={() => handleEditPayment(p)}
                                      size="sm"
                                      variant="ghost"
                                      className="text-stone-400 hover:text-amber-400 h-7 px-2"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    {refundAllowed && p.paymentStatus !== 'refunded' ? (
                                      <Button
                                        onClick={() => setCancelPaymentId(p.id)}
                                        size="sm"
                                        variant="ghost"
                                        className="text-stone-400 hover:text-red-400 h-7 px-2"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-stone-400">Refund unavailable</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {paymentSearchResults.length === 0 && !paymentSearchLoading && (
                    <div className="text-center py-12 text-stone-600">
                      {paymentSearchRef || paymentSearchName || paymentSearchPhone
                        ? 'No payments found.'
                        : 'Use the search form above to find payments.'}
                    </div>
                  )}

                  {paymentSearchLoading && (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: BOOKINGS ───────────────────────────────────── */}
              {activeTab === 'bookings' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-stone-100">Bookings Management</h2>
                  </div>

                  {/* Filter Bar */}
                  <Card className="bg-stone-900 border border-stone-800 rounded-xl mb-6">
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-0 flex-1">
                          <Label className="text-xs text-stone-400 mb-2 block">Status</Label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-stone-950 border-stone-700 text-stone-100 text-sm h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="checked_in">Checked In</SelectItem>
                              <SelectItem value="checked_out">Checked Out</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="min-w-0 flex-1">
                          <Label className="text-xs text-stone-400 mb-2 block">Source</Label>
                          <Select value={sourceFilter} onValueChange={setSourceFilter}>
                            <SelectTrigger className="bg-stone-950 border-stone-700 text-stone-100 text-sm h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Sources</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="offline">Offline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="min-w-0 flex-1">
                          <Label className="text-xs text-stone-400 mb-2 block">Check-in Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-stone-950 border-stone-700 text-stone-100 text-sm h-9"
                              >
                                {dateFilter ? fmtDate(dateFilter.toISOString()) : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-stone-900 border-stone-700" align="start">
                              <Calendar
                                mode="single"
                                selected={dateFilter}
                                onSelect={setDateFilter}
                                initialFocus
                                className="bg-stone-900 text-stone-100"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => { setDateFilter(undefined); setStatusFilter('all'); setSourceFilter('all') }}
                            variant="outline"
                            size="sm"
                            className="border-stone-700 text-stone-500 hover:border-stone-600 text-xs h-9"
                          >
                            Clear
                          </Button>
                          <Button
                            onClick={fetchBookings}
                            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs h-9"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Filter
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bookings Table */}
                  {bookLoading ? <Spinner /> : bookError ? <ErrBox msg={bookError} /> : bookings.length === 0 ? (
                    <Card className="bg-stone-900/50 border border-dashed border-stone-700 rounded-2xl">
                      <CardContent className="p-12 text-center">
                        <div className="flex justify-center mb-4">
                          <div className="w-14 h-14 rounded-full bg-stone-800 flex items-center justify-center">
                            <BookOpen className="w-7 h-7 text-stone-500" />
                          </div>
                        </div>
                        <h3 className="text-stone-200 font-semibold mb-2">No Bookings Found</h3>
                        <p className="text-stone-500 text-sm max-w-md mx-auto">
                          Try adjusting your filters or check back later.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-stone-800">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-stone-800 hover:bg-stone-900/50">
                            <TableHead className="text-stone-400 font-semibold">Booking Ref</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Guest Name</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Phone</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Check-in</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Check-out</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Rooms</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Guests</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Amount</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Source</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Payment Status</TableHead>
                            <TableHead className="text-stone-400 font-semibold">Booking Status</TableHead>
                            <TableHead className="text-stone-400 font-semibold text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookings.map(b => (
                            <TableRow key={b.id} className="border-stone-800 hover:bg-stone-900/30">
                              <TableCell className="text-stone-200 font-medium">{b.bookingReference}</TableCell>
                              <TableCell className="text-stone-300">{b.guest.fullName}</TableCell>
                              <TableCell className="text-stone-400">{b.guest.phone}</TableCell>
                              <TableCell className="text-stone-300">{fmtDate(b.checkIn)}</TableCell>
                              <TableCell className="text-stone-300">{fmtDate(b.checkOut)}</TableCell>
                              <TableCell className="text-stone-300">{b.rooms.map(r => r.roomNumber).join(', ')}</TableCell>
                              <TableCell className="text-stone-400">{b.totalGuests}</TableCell>
                              <TableCell className="text-amber-400 font-semibold">{fmt(b.totalAmount)}</TableCell>
                              <TableCell>
                                <SourceBadge source={b.bookingSource} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={b.payments?.[0]?.paymentStatus || 'yet_to_pay'} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={b.bookingStatus} />
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex gap-2 justify-center">
                                  {b.bookingStatus === 'confirmed' && (
                                    <Button
                                      onClick={() => handleStatusUpdate(b.id, 'checked_in')}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
                                    >
                                      Check-in
                                    </Button>
                                  )}
                                  {b.bookingStatus === 'checked_in' && (
                                    <Button
                                      onClick={() => handleStatusUpdate(b.id, 'checked_out')}
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-3"
                                    >
                                      Check-out
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: ROOMS ──────────────────────────────────────── */}
              {activeTab === 'rooms' && (
                <div>
                  <h2 className="text-lg font-semibold text-stone-100 mb-6">Room Search & Offline Booking</h2>

                  {/* ─── SEARCH FORM ──────────────────────────────────────────── */}
                  <Card className="bg-stone-900 border-stone-800 mb-6">
                    <CardContent className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                          <Label className="text-stone-500 text-xs mb-2 block">Check-in Date</Label>
                          <Input type="date" value={searchCheckIn} onChange={e => setSearchCheckIn(e.target.value)}
                            className="text-sm h-9 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                        </div>
                        <div>
                          <Label className="text-stone-500 text-xs mb-2 block">Check-out Date</Label>
                          <Input type="date" value={searchCheckOut} onChange={e => setSearchCheckOut(e.target.value)}
                            className="text-sm h-9 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                        </div>
                        <div>
                          <Label className="text-stone-500 text-xs mb-2 block">Room Type (Optional)</Label>
                          <select value={searchRoomType} onChange={e => setSearchRoomType(e.target.value)}
                            className="w-full text-sm h-9 px-2 rounded bg-stone-800 border border-stone-700 text-stone-100 focus:border-amber-500 focus:outline-none">
                            <option value="">Any Type</option>
                            <option value="premium">Premium</option>
                            <option value="premium_plus">Premium Plus</option>
                          </select>
                        </div>
                        <Button onClick={handleSearchRooms} disabled={searchLoading}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm h-9">
                          {searchLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                          Search Rooms
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ─── SEARCH RESULTS ───────────────────────────────────────── */}
                  {searchLoading && <Spinner />}
                  {searchError && <ErrBox msg={searchError} />}
                  {!searchLoading && !searchError && searchResults.length === 0 && searchCheckIn && (
                    <div className="text-center py-8">
                      <p className="text-stone-400">No rooms available for selected dates</p>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-stone-100">Available Rooms</h3>
                        <span className="text-xs text-stone-500">{searchResults.length} room{searchResults.length !== 1 ? 's' : ''} found</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {searchResults.map(room => (
                          <Card key={room.id} className={`cursor-pointer transition-all ${selectedRoomIds.has(room.id) ? 'bg-amber-900 border-amber-600' : 'bg-stone-900 border-stone-800 hover:border-stone-700'}`}
                            onClick={() => handleToggleRoom(room.id)}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox checked={selectedRoomIds.has(room.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1" />
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="text-lg font-bold text-stone-100">{room.roomNumber}</p>
                                      <p className="text-xs text-stone-500">{room.roomType.charAt(0).toUpperCase() + room.roomType.slice(1)}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-amber-400">{fmt(room.pricePerNight)}/night</span>
                                  </div>
                                  <p className="text-xs text-stone-400 mb-2">{room.description}</p>
                                  <p className="text-xs text-stone-500">Max {room.maxGuests} guest{room.maxGuests !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {selectedRoomIds.size > 0 && (
                        <Button onClick={handleOpenBookingModal}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm h-9">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Book Selected Rooms ({selectedRoomIds.size})
                        </Button>
                      )}
                    </div>
                  )}

                  {/* ─── OFFLINE BOOKING MODAL ────────────────────────────────── */}
                  <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                    <DialogContent className="max-w-2xl bg-stone-900 border-stone-800 max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-stone-100">Create Offline Booking</DialogTitle>
                      </DialogHeader>

                      {bookingError && (
                        <div className="p-3 bg-red-950 border border-red-800 rounded text-red-300 text-sm">
                          {bookingError}
                        </div>
                      )}

                      <div className="space-y-6">
                        {/* SECTION A: GUEST DETAILS */}
                        <div className="border-b border-stone-800 pb-4">
                          <h4 className="text-sm font-semibold text-stone-100 mb-4">Guest Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">Full Name *</Label>
                              <Input type="text" placeholder="Guest name" value={bookingGuestName}
                                onChange={e => setBookingGuestName(e.target.value)}
                                className="text-sm h-9 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                            </div>
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">Phone *</Label>
                              <Input type="tel" placeholder="10-digit phone" value={bookingGuestPhone}
                                onChange={e => setBookingGuestPhone(e.target.value)}
                                className="text-sm h-9 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                            </div>
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">Email *</Label>
                              <Input type="email" placeholder="Guest email" value={bookingGuestEmail}
                                onChange={e => setBookingGuestEmail(e.target.value)}
                                className="text-sm h-9 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                            </div>
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">ID Proof Type</Label>
                              <select value={bookingGuestProof} onChange={e => setBookingGuestProof(e.target.value)}
                                className="w-full text-sm h-9 px-2 rounded bg-stone-800 border border-stone-700 text-stone-100 focus:border-amber-500 focus:outline-none">
                                <option value="aadhar">Aadhaar</option>
                                <option value="passport">Passport</option>
                                <option value="driving_license">Driving License</option>
                                <option value="pan">PAN Card</option>
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-stone-500 text-xs mb-1 block">Address</Label>
                              <textarea placeholder="Optional" value={bookingGuestAddress} onChange={e => setBookingGuestAddress(e.target.value)} rows={2}
                                className="w-full text-sm px-2 py-1.5 rounded bg-stone-800 border border-stone-700 text-stone-100 focus:border-amber-500 focus:outline-none resize-none" />
                            </div>
                          </div>
                        </div>

                        {/* SECTION B: MEMBERS LIST */}
                        <div className="border-b border-stone-800 pb-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-stone-100">Additional Members</h4>
                            <Button size="sm" onClick={handleAddMember} variant="outline"
                              className="border-stone-700 text-stone-400 hover:border-amber-500 hover:text-amber-400 text-xs h-7">
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add Member
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {bookingMembers.map((member, idx) => (
                              <div key={idx} className="flex gap-2 items-end">
                                <Input type="text" placeholder="Member name" value={member.memberName}
                                  onChange={e => handleUpdateMember(idx, 'memberName', e.target.value)}
                                  className="flex-1 text-sm h-8 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                                <Input type="number" placeholder="Age" value={member.age || ''}
                                  onChange={e => handleUpdateMember(idx, 'age', e.target.value ? Number(e.target.value) : null)}
                                  className="w-16 text-sm h-8 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                                <Input type="text" placeholder="Relation" value={member.relation || ''}
                                  onChange={e => handleUpdateMember(idx, 'relation', e.target.value)}
                                  className="w-24 text-sm h-8 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                                <Button size="sm" onClick={() => handleRemoveMember(idx)} variant="ghost"
                                  className="text-red-400 hover:text-red-500 hover:bg-red-950 h-8 w-8 p-0">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SECTION C: BOOKING DETAILS */}
                        <div className="border-b border-stone-800 pb-4">
                          <h4 className="text-sm font-semibold text-stone-100 mb-4">Booking Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">Check-in Date</Label>
                              <p className="text-sm text-stone-100 bg-stone-800 border border-stone-700 rounded px-2 py-1.5">{searchCheckIn}</p>
                            </div>
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">Check-out Date</Label>
                              <p className="text-sm text-stone-100 bg-stone-800 border border-stone-700 rounded px-2 py-1.5">{searchCheckOut}</p>
                            </div>
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">Selected Rooms</Label>
                              <p className="text-sm text-amber-400 bg-stone-800 border border-stone-700 rounded px-2 py-1.5">
                                {Array.from(selectedRoomIds).map(id => searchResults.find(r => r.id === id)?.roomNumber).join(', ')}
                              </p>
                            </div>
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">Total Guests *</Label>
                              <Input type="number" placeholder="Number of guests" value={bookingTotalGuests}
                                onChange={e => setBookingTotalGuests(e.target.value)}
                                className="text-sm h-9 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-stone-500 text-xs mb-1 block">Total Amount</Label>
                              <p className="text-lg font-bold text-amber-400">{fmt(calculateTotalAmount())}</p>
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-stone-500 text-xs mb-1 block">Notes</Label>
                              <textarea placeholder="Optional" value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} rows={2}
                                className="w-full text-sm px-2 py-1.5 rounded bg-stone-800 border border-stone-700 text-stone-100 focus:border-amber-500 focus:outline-none resize-none" />
                            </div>
                          </div>
                        </div>

                        {/* SECTION D: PAYMENT */}
                        <div className="border-b border-stone-800 pb-4">
                          <h4 className="text-sm font-semibold text-stone-100 mb-4">Payment Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">Payment Method</Label>
                              <select value={bookingPaymentMethod} onChange={e => setBookingPaymentMethod(e.target.value)}
                                className="w-full text-sm h-9 px-2 rounded bg-stone-800 border border-stone-700 text-stone-100 focus:border-amber-500 focus:outline-none">
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="gateway">Payment Gateway</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-stone-500 text-xs mb-1 block">Transaction ID</Label>
                              <Input type="text" placeholder="Optional" value={bookingPaymentTxnId}
                                onChange={e => setBookingPaymentTxnId(e.target.value)}
                                className="text-sm h-9 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-stone-500 text-xs mb-1 block">Payment Date</Label>
                              <Input type="date" value={bookingPaymentDate}
                                onChange={e => setBookingPaymentDate(e.target.value)}
                                className="text-sm h-9 bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500" />
                            </div>
                          </div>
                        </div>

                        {/* SECTION E: BOOKING STATUS */}
                        <div>
                          <h4 className="text-sm font-semibold text-stone-100 mb-4">Booking Status</h4>
                          <RadioGroup value={bookingStatus} onValueChange={setBookingStatus}>
                            <div className="flex items-center space-x-2 mb-2">
                              <RadioGroupItem value="confirmed" id="status-confirmed" />
                              <Label htmlFor="status-confirmed" className="text-stone-300 text-sm font-normal cursor-pointer">Confirmed</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="checked_in" id="status-checked" />
                              <Label htmlFor="status-checked" className="text-stone-300 text-sm font-normal cursor-pointer">Checked In</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>

                      <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowBookingModal(false)}
                          className="border-stone-700 text-stone-400">Cancel</Button>
                        <Button type="button" onClick={handleSubmitOfflineBooking} disabled={offlineBookingLoading}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                          {offlineBookingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                          Create Booking
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* ─── TAB: TODAY CHECK-IN / CHECK-OUT ──────────────────── */}
              {activeTab === 'checkinout' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-stone-100">
                      Today — {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </h2>
                    <Button variant="outline" size="sm" onClick={fetchToday} className="border-stone-700 text-stone-500 hover:border-stone-600 text-xs">
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                    </Button>
                  </div>
                  {todayLoading ? <Spinner /> : todayError ? <ErrBox msg={todayError} /> : today && (
                    <div className="grid grid-cols-1 gap-8">
                      {/* TODAY'S CHECK-INS */}
                      <div className="border border-stone-800 rounded-lg bg-stone-900/40 p-5">
                        <h3 className="flex items-center gap-2 text-blue-400 font-semibold mb-4">
                          <LogIn className="w-4 h-4" />
                          Today's Check-ins
                          <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-300">{today.checkIns.total}</Badge>
                        </h3>
                        {today.checkIns.bookings.length === 0 ? (
                          <div className="text-stone-600 text-sm py-8 text-center">No check-ins scheduled for today</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <tr className="border-b border-stone-800 hover:bg-stone-800/50">
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Booking Ref</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Guest Name</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Phone</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Room(s)</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Guests</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Amount</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Payment Status</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Action</th>
                                </tr>
                              </TableHeader>
                              <TableBody>
                                {today.checkIns.bookings.map(b => (
                                  <tr key={b.id} className="border-b border-stone-800 hover:bg-stone-800/30 transition-colors">
                                    <td className="h-12 px-3 align-middle text-xs text-amber-400 font-semibold">{b.bookingReference}</td>
                                    <td className="h-12 px-3 align-middle text-xs text-stone-200">{b.guest.fullName}</td>
                                    <td className="h-12 px-3 align-middle text-xs text-stone-400">{b.guest.phone}</td>
                                    <td className="h-12 px-3 align-middle text-xs text-stone-300">{b.rooms.map(r => r.roomNumber).join(', ')}</td>
                                    <td className="h-12 px-3 align-middle text-xs text-stone-400">{b.totalGuests}</td>
                                    <td className="h-12 px-3 align-middle text-xs font-semibold text-green-400">{fmt(b.totalAmount)}</td>
                                    <td className="h-12 px-3 align-middle text-xs">
                                      <Badge variant="outline" className={b.payments?.[0]?.paymentStatus === 'paid' ? 'bg-green-500/15 text-green-400 border-green-600' : 'bg-amber-500/15 text-amber-400 border-amber-600'}>
                                        {b.payments?.[0]?.paymentStatus || 'yet_to_pay'}
                                      </Badge>
                                    </td>
                                    <td className="h-12 px-3 align-middle text-xs">
                                      <Button size="sm" variant="outline" onClick={() => handleCheckinCheckout(b.id, 'checked_in')} 
                                        disabled={bookingLoading === b.id} className="border-green-700 text-green-400 hover:bg-green-900/20 h-7 text-xs">
                                        {bookingLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3 mr-1" />}
                                        Check-in
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>

                      {/* TODAY'S CHECK-OUTS */}
                      <div className="border border-stone-800 rounded-lg bg-stone-900/40 p-5">
                        <h3 className="flex items-center gap-2 text-purple-400 font-semibold mb-4">
                          <LogOut className="w-4 h-4" />
                          Today's Check-outs
                          <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-300">{today.checkOuts.total}</Badge>
                        </h3>
                        {today.checkOuts.bookings.length === 0 ? (
                          <div className="text-stone-600 text-sm py-8 text-center">No check-outs scheduled for today</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <tr className="border-b border-stone-800 hover:bg-stone-800/50">
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Booking Ref</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Guest Name</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Phone</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Room(s)</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Check-in Date</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Amount</th>
                                  <th className="h-10 px-3 text-left align-middle font-medium text-xs text-stone-400">Action</th>
                                </tr>
                              </TableHeader>
                              <TableBody>
                                {today.checkOuts.bookings.map(b => (
                                  <tr key={b.id} className="border-b border-stone-800 hover:bg-stone-800/30 transition-colors">
                                    <td className="h-12 px-3 align-middle text-xs text-amber-400 font-semibold">{b.bookingReference}</td>
                                    <td className="h-12 px-3 align-middle text-xs text-stone-200">{b.guest.fullName}</td>
                                    <td className="h-12 px-3 align-middle text-xs text-stone-400">{b.guest.phone}</td>
                                    <td className="h-12 px-3 align-middle text-xs text-stone-300">{b.rooms.map(r => r.roomNumber).join(', ')}</td>
                                    <td className="h-12 px-3 align-middle text-xs text-stone-400">{fmtDate(b.checkIn)}</td>
                                    <td className="h-12 px-3 align-middle text-xs font-semibold text-green-400">{fmt(b.totalAmount)}</td>
                                    <td className="h-12 px-3 align-middle text-xs">
                                      <Button size="sm" variant="outline" onClick={() => handleCheckinCheckout(b.id, 'checked_out')} 
                                        disabled={bookingLoading === b.id} className="border-purple-700 text-purple-400 hover:bg-purple-900/20 h-7 text-xs">
                                        {bookingLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3 mr-1" />}
                                        Check-out
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* EDIT PAYMENT DIALOG */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <Dialog open={editPaymentId !== null} onOpenChange={(open) => !open && setEditPaymentId(null)}>
        <DialogContent className="bg-stone-900 border border-stone-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-stone-100">Edit Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-stone-400 mb-1 block">Payment Status</Label>
              <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                <SelectTrigger className="bg-stone-950 border-stone-700 text-stone-100 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950 border-stone-800">
                  <SelectItem value="yet_to_pay">Yet to Pay</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-stone-400 mb-1 block">Payment Method</Label>
              <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                <SelectTrigger className="bg-stone-950 border-stone-700 text-stone-100 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950 border-stone-800">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="gateway">Gateway</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-stone-400 mb-1 block">Transaction ID</Label>
              <Input
                placeholder="Transaction ID"
                value={editPaymentTxnId}
                onChange={e => setEditPaymentTxnId(e.target.value)}
                className="bg-stone-950 border-stone-700 text-stone-100 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs text-stone-400 mb-1 block">Payment Date</Label>
              <Input
                type="date"
                value={editPaymentDate}
                onChange={e => setEditPaymentDate(e.target.value)}
                className="bg-stone-950 border-stone-700 text-stone-100 text-xs h-9"
              />
            </div>

            {editPaymentError && (
              <div className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{editPaymentError}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSavePayment}
                disabled={editPaymentLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs h-9"
              >
                {editPaymentLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Save
              </Button>
              <Button
                onClick={() => setEditPaymentId(null)}
                variant="outline"
                className="flex-1 border-stone-700 text-stone-400 text-xs h-9"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* CANCEL PAYMENT CONFIRMATION DIALOG */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <Dialog open={cancelPaymentId !== null} onOpenChange={(open) => !open && setCancelPaymentId(null)}>
        <DialogContent className="bg-stone-900 border border-stone-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Cancel Payment & Refund</DialogTitle>
          </DialogHeader>
          <p className="text-stone-300 text-sm">
            Are you sure? This will mark the payment as refunded and cancel the booking.
          </p>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleCancelPayment}
              disabled={cancelPaymentLoading}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs h-9"
            >
              {cancelPaymentLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Confirm Refund
            </Button>
            <Button
              onClick={() => setCancelPaymentId(null)}
              variant="outline"
              className="flex-1 border-stone-700 text-stone-400 text-xs h-9"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* BOOKING CONFIRMATION DIALOG (with payment form) */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <Dialog open={confirmingBooking !== null} onOpenChange={(open) => !open && setConfirmingBooking(null)}>
        <DialogContent className="bg-stone-900 border border-stone-800 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              {!showPaymentForm ? 'Confirm Booking' : 'Payment Details'}
            </DialogTitle>
          </DialogHeader>

          {confirmingBooking && !showPaymentForm && (
            <div className="space-y-4">
              {/* Booking Details */}
              <div className="bg-stone-950 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-stone-400 text-sm">Booking Reference</span>
                  <span className="text-stone-100 font-mono font-semibold">{confirmingBooking.bookingReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400 text-sm">Guest Name</span>
                  <span className="text-stone-100 font-semibold">{confirmingBooking.guest.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400 text-sm">Phone</span>
                  <span className="text-stone-100">{confirmingBooking.guest.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400 text-sm">Email</span>
                  <span className="text-stone-100 text-sm break-all">{confirmingBooking.guest.email || '-'}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-700">
                  <span className="text-stone-400 text-sm font-semibold">Total Amount</span>
                  <span className="text-amber-400 font-bold text-lg">{fmt(confirmingBooking.totalAmount)}</span>
                </div>
              </div>

              <p className="text-stone-400 text-xs text-center">Click "Confirm Booking" to proceed with payment.</p>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowPaymentForm(true)}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs h-9"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Booking
                </Button>
                <Button
                  onClick={() => setConfirmingBooking(null)}
                  variant="outline"
                  className="flex-1 border-stone-700 text-stone-400 text-xs h-9"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {confirmingBooking && showPaymentForm && (
            <div className="space-y-4">
              {/* Payment Form */}
              <div>
                <Label className="text-xs text-stone-400 mb-1 block">Payment Method *</Label>
                <Select value={confirmPaymentMethod} onValueChange={setConfirmPaymentMethod}>
                  <SelectTrigger className="bg-stone-950 border-stone-700 text-stone-100 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-950 border-stone-800">
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gateway">Gateway</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-stone-400 mb-1 block">Transaction ID (Optional)</Label>
                <Input
                  placeholder="Not required for cash payments"
                  value={confirmPaymentTxnId}
                  onChange={e => setConfirmPaymentTxnId(e.target.value)}
                  className="bg-stone-950 border-stone-700 text-stone-100 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs text-stone-400 mb-1 block">Payment Date (Default: Today)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="w-full bg-stone-950 border border-stone-700 rounded-md px-3 py-2 text-stone-100 text-xs h-9 flex items-center justify-between cursor-pointer hover:bg-stone-900 transition-colors">
                      {confirmPaymentDate ? fmtDate(confirmPaymentDate + 'T00:00:00Z') : 'Select date'}
                      <Clock className="w-4 h-4" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-stone-950 border-stone-800" align="start">
                    <Calendar
                      mode="single"
                      selected={confirmPaymentDate ? new Date(confirmPaymentDate + 'T00:00:00Z') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const dateStr = date.toISOString().split('T')[0]
                          setConfirmPaymentDate(dateStr)
                        }
                      }}
                      disabled={(date) => date > new Date()}
                      className="bg-stone-950"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {confirmPaymentError && (
                <div className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-xs">{confirmPaymentError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSubmitPaymentConfirmation}
                  disabled={confirmPaymentLoading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs h-9"
                >
                  {confirmPaymentLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                  Submit & Confirm
                </Button>
                <Button
                  onClick={() => setShowPaymentForm(false)}
                  disabled={confirmPaymentLoading}
                  variant="outline"
                  className="flex-1 border-stone-700 text-stone-400 text-xs h-9"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
