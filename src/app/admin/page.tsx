'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SignOutButton, useUser, useAuth } from '@clerk/nextjs'
import { adminApi, bookingsApi, createAdminApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import InvoicePrintView from '@/components/InvoicePrintView'
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
  ArrowUpDown, Home, RefreshCw, IndianRupee, Pencil, X, Phone, Wifi, WifiOff, Trash2, Search, Plus, Check, Bell, Printer, ChevronDown
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
  fullName: string; phone: string; email: string; address?: string
  members?: { id: number; memberName: string }[]
}

interface BookingRoom {
  id: number
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
    bookingStatus?: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
  }
}

interface CheckInRoomOption {
  id: number
  roomNumber: string
  roomType: string
  pricePerNight: number
  maxGuests: number
  status: 'active' | 'maintenance'
  isCurrent: boolean
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

const isPaymentRefundAllowed = (checkInDate?: string, bookingStatus?: string) => {
  // Refund not allowed for these statuses
  if (bookingStatus === 'pending' || bookingStatus === 'checked_in' || bookingStatus === 'checked_out') {
    return false
  }

  if (!checkInDate) return false
  const checkIn = new Date(checkInDate)
  if (Number.isNaN(checkIn.getTime())) return false

  checkIn.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Allow refund only if check-in is at least 2 days in the future
  const twoDaysLater = new Date(today)
  twoDaysLater.setDate(twoDaysLater.getDate() + 2)

  return checkIn >= twoDaysLater
}

const isEditPaymentAllowed = (checkInDate?: string, bookingStatus?: string) => {
  if (!checkInDate || bookingStatus === 'checked_out') return false
  const checkIn = new Date(checkInDate)
  if (Number.isNaN(checkIn.getTime())) return false

  checkIn.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Allow editing only if check-in is at least 2 days in the future
  const twoDaysLater = new Date(today)
  twoDaysLater.setDate(twoDaysLater.getDate() + 2)

  return checkIn >= twoDaysLater
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
    : <span style={{fontSize: '12px', padding: '2px 8px', borderRadius: '12px', border: '1px solid #D4AF70', backgroundColor: '#FFF9E6', color: '#D4AF70', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content'}}><WifiOff className="w-3 h-3" style={{color: '#D4AF70'}} />Offline</span>
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
  const { user } = useUser()
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true)
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false)

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

  // Check-in modal state
  const [checkInModal, setCheckInModal] = useState<Booking | null>(null)
  const [checkInTotalGuests, setCheckInTotalGuests] = useState('')
  const [checkInProofType, setCheckInProofType] = useState('aadhaar')
  const [checkInAddress, setCheckInAddress] = useState('')
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [checkInError, setCheckInError] = useState<string | null>(null)
  const [checkInRoomOptions, setCheckInRoomOptions] = useState<CheckInRoomOption[]>([])
  const [checkInRoomIds, setCheckInRoomIds] = useState<number[]>([])
  const [checkInRoomsLoading, setCheckInRoomsLoading] = useState(false)

  // Check-out modal state
  const [checkOutModal, setCheckOutModal] = useState<Booking | null>(null)
  const [checkOutExpenses, setCheckOutExpenses] = useState<{ [key: string]: string }>({})
  const [checkOutOthersDescription, setCheckOutOthersDescription] = useState('')
  const [checkOutLoading, setCheckOutLoading] = useState(false)
  const [checkOutError, setCheckOutError] = useState<string | null>(null)

  // Bill modal state
  const [billModal, setBillModal] = useState<{ booking: Booking; extraExpense: string | null; finalTotal: string } | null>(null)

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
  const [refreshLoading, setRefreshLoading] = useState(false)
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
  const [editPaymentStatus, setEditPaymentStatus] = useState('paid')
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash')
  const [editPaymentTxnId, setEditPaymentTxnId] = useState('')
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editPaymentLoading, setEditPaymentLoading] = useState(false)
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null)

  // Payment cancel state
  const [cancelPaymentId, setCancelPaymentId] = useState<number | null>(null)
  const [cancelPaymentLoading, setCancelPaymentLoading] = useState(false)

  // Notification dropdown state
  const [showNotifications, setShowNotifications] = useState(false)

  // General error state
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Selected room state for dashboard
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null)

  // Prevent double submissions
  const checkInSubmitRef = useRef(false)

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    const verifyAdmin = async () => {
      setIsVerifyingAdmin(true)
      try {
        // Get Clerk session token
        const token = await getToken()
        
        if (!token) {
          setIsAdminAuthorized(false)
          setIsVerifyingAdmin(false)
          return
        }

        // Call verify-admin with Clerk token
        const res = await fetch('/api/auth/verify-admin', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        })

        if (res.status === 200) {
          setIsAdminAuthorized(true)
          return
        }

        if (res.status === 403 || res.status === 401) {
          setIsAdminAuthorized(false)
          return
        }

        setIsAdminAuthorized(false)
      } catch (error) {
        console.error('Admin verification error:', error)
        setIsAdminAuthorized(false)
      } finally {
        setIsVerifyingAdmin(false)
      }
    }

    // Only verify if user is loaded
    if (user) {
      verifyAdmin()
    }
  }, [user, getToken])

  const fetchDashboard = useCallback(async () => {
    setDashLoading(true); setDashError(null)
    try {
      // Get Clerk token for admin API calls
      const token = await getToken()
      if (!token) {
        setDashError('Authentication failed. Please log in again.')
        setDashLoading(false)
        return
      }

      // Create admin API client with Clerk token
      const authenticatedAdminApi = createAdminApi(token)
      if (!authenticatedAdminApi) {
        setDashError('Failed to create authenticated API client.')
        setDashLoading(false)
        return
      }

      // Make API calls with authentication
      const [dashRes, revenueRes, bookingsRes] = await Promise.all([
        authenticatedAdminApi.getDashboard(),
        fetch('/api/admin/payments/today-revenue', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).then(r => r.json()),
        fetch('/api/admin/bookings?limit=10', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).then(r => r.json())
      ])

      const dashData = dashRes.data.data
      dashData.todayRevenue = revenueRes.revenue || 0
      dashData.recentBookings = bookingsRes.data?.bookings || bookingsRes.data || []
      setDashboard(dashData)
    } catch (e: any) { 
      setDashError(e?.response?.data?.message || 'Failed to load dashboard.') 
    }
    finally { setDashLoading(false) }
  }, [getToken])

  const fetchBookings = useCallback(async () => {
    setBookLoading(true); setBookError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)
      if (dateFilter) {
        const year = dateFilter.getFullYear()
        const month = String(dateFilter.getMonth() + 1).padStart(2, '0')
        const day = String(dateFilter.getDate()).padStart(2, '0')
        params.append('date', `${year}-${month}-${day}`)
      }

      const res = await fetch(`/api/bookings?${params}`, {
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
        fetch(`/api/bookings?date=${today}&status=confirmed`),
        fetch(`/api/bookings?checkOutDate=${today}&status=checked_in`)
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
      const token = await getToken()
      if (!token) {
        setRoomsError('Authentication failed. Please log in again.')
        setRoomsLoading(false)
        return
      }

      const authenticatedAdminApi = createAdminApi(token)
      if (!authenticatedAdminApi) {
        setRoomsError('Failed to create authenticated API client.')
        setRoomsLoading(false)
        return
      }

      const res = await authenticatedAdminApi.getAllRooms()
      setRooms(res.data.data?.rooms || res.data.data || [])
    } catch (e: any) { setRoomsError(e?.response?.data?.message || 'Failed to load rooms.') }
    finally { setRoomsLoading(false) }
  }, [getToken])

  // ── Fetch rooms with occupancy status for dashboard ───────────────────────
  const fetchDashboardRooms = useCallback(async () => {
    setRoomsLoading(true); setRoomsError(null)
    try {
      const token = await getToken()
      if (!token) {
        setRoomsError('Authentication failed. Please log in again.')
        setRoomsLoading(false)
        return
      }

      // Create admin API client with Clerk token
      const authenticatedAdminApi = createAdminApi(token)
      if (!authenticatedAdminApi) {
        setRoomsError('Failed to create authenticated API client.')
        setRoomsLoading(false)
        return
      }

      // Fetch all rooms and all bookings (not just checked_in)
      const [roomsRes, bookingsRes] = await Promise.all([
        authenticatedAdminApi.getAllRooms(),
        fetch('/api/admin/bookings', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).then(r => r.json())
      ])

      const allRooms = roomsRes.data.data?.rooms || roomsRes.data.data || []
      const allBookings = bookingsRes.data?.bookings || bookingsRes.data || []
      
      // Get today's date at start of day
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Create a map of room IDs to their current booking
      const roomBookingMap: { [key: number]: any } = {}
      
      allBookings.forEach((booking: any) => {
        // Skip cancelled and checked_out bookings
        if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'checked_out') {
          return
        }

        const checkInDate = new Date(booking.checkIn)
        checkInDate.setHours(0, 0, 0, 0)
        const checkOutDate = new Date(booking.checkOut)
        checkOutDate.setHours(0, 0, 0, 0)

        // Room is occupied if: checkIn <= today AND checkOut > today
        const isOccupied = checkInDate <= today && checkOutDate > today

        if (isOccupied && booking.rooms) {
          booking.rooms.forEach((room: any) => {
            if (!roomBookingMap[room.id]) {
              roomBookingMap[room.id] = booking
            }
          })
        }
      })

      // Enrich rooms with booking status
      const enrichedRooms = allRooms.map((room: any) => ({
        ...room,
        status: roomBookingMap[room.id] ? 'occupied' : 'available',
        currentBooking: roomBookingMap[room.id] || null
      }))

      setRooms(enrichedRooms)
    } catch (e: any) { 
      setRoomsError(e?.response?.data?.message || 'Failed to load rooms.') 
    }
    finally { setRoomsLoading(false) }
  }, [getToken])

  useEffect(() => { if (activeTab === 'dashboard') fetchDashboard() }, [activeTab, fetchDashboard])
  useEffect(() => { if (activeTab === 'bookings') fetchBookings() }, [activeTab, fetchBookings])
  useEffect(() => { if (activeTab === 'checkinout') fetchToday() }, [activeTab, fetchToday])
  useEffect(() => { if (activeTab === 'rooms') fetchRooms() }, [activeTab, fetchRooms])
  useEffect(() => { if (activeTab === 'dashboard') fetchDashboardRooms() }, [activeTab, fetchDashboardRooms])

  // Auto-refresh dashboard every hour
  useEffect(() => {
    if (activeTab !== 'dashboard') return
    const interval = setInterval(fetchDashboardRooms, 3600000)
    return () => clearInterval(interval)
  }, [activeTab, fetchDashboardRooms])

  // ── Refresh Dashboard Handler ───────────────────────────────────────────
  // ── Fetch pending bookings (Dashboard tab) ────────────────────────────────
  const fetchPendingBookings = useCallback(async () => {
    setPendingLoading(true); setPendingError(null)
    try {
      const res = await fetch('/api/bookings/pending')
      const data = await res.json()
      setPendingBookings(data.data?.bookings || data.data || [])
    } catch (e: any) { setPendingError('Failed to load pending bookings.') }
    finally { setPendingLoading(false) }
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshLoading(true)
    try {
      await Promise.all([fetchDashboard(), fetchDashboardRooms(), fetchPendingBookings()])
    } finally {
      setRefreshLoading(false)
    }
  }, [fetchDashboard, fetchDashboardRooms, fetchPendingBookings])

  // Auto-refresh check-in/check-out tab every 60 seconds
  useEffect(() => {
    if (activeTab !== 'checkinout') return
    const interval = setInterval(fetchToday, 60000)
    return () => clearInterval(interval)
  }, [activeTab, fetchToday])

  useEffect(() => { if (activeTab === 'dashboard') fetchPendingBookings() }, [activeTab, fetchPendingBookings])

  // ── Auto-refresh pending bookings every 30 minutes ─────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingBookings()
    }, 30 * 60 * 1000) // Poll every 30 minutes
    return () => clearInterval(interval)
  }, [fetchPendingBookings])

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
      
      // Refresh all relevant data
      await Promise.all([fetchBookings(), fetchPendingBookings(), fetchDashboard()])
    } catch (e: any) {
      setPayError(e?.response?.data?.message || 'Payment confirmation failed.')
    } finally { setPayLoading(false) }
  }

  const handleStatusUpdate = async (bookingId: number, newStatus: 'checked_in' | 'checked_out') => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: newStatus }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update booking status')

      setSuccessMsg(`Booking #${bookingId} ${newStatus === 'checked_in' ? 'checked in' : 'checked out'} successfully!`)
      setTimeout(() => setSuccessMsg(null), 4000)
      
      // Refresh all relevant data
      await Promise.all([fetchBookings(), fetchPendingBookings(), fetchDashboard()])
    } catch (e: any) {
      setBookError(e?.message || 'Failed to update booking status.')
    }
  }

  const [pendingCancelError, setPendingCancelError] = useState<string | null>(null)
  const [pendingCancellingId, setPendingCancellingId] = useState<number | null>(null)

  const handleCancelPendingBooking = async (bookingId: number) => {
    // Open confirmation modal instead of using window.confirm
    setCancelId(bookingId)
  }

  const confirmCancelBooking = async () => {
    if (!cancelId) return
    try {
      setGeneralError(null)
      setPendingCancelError(null)
      setCancelLoading(true)
      setPendingCancellingId(cancelId)

      const res = await fetch(`/api/bookings/${cancelId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: 'cancelled' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to cancel booking')

      setSuccessMsg(`Booking #${cancelId} cancelled.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      setCancelId(null)
      setCancelReason('')

      setPendingBookings(prev => {
        if (!Array.isArray(prev)) return prev
        return prev.filter(b => b?.id !== cancelId)
      })

      await Promise.all([fetchPendingBookings(), fetchBookings(), fetchDashboard()])
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to cancel booking.'
      setPendingCancelError(errorMsg)
    } finally {
      setCancelLoading(false)
      setPendingCancellingId(null)
    }
  }

  // ── Check-in Modal Handler ────────────────────────────────────────────────

  const fetchCheckInRoomOptions = async (booking: Booking) => {
    setCheckInRoomsLoading(true)
    setCheckInError(null)
    try {
      console.log(`[Frontend] 🔍 Fetching room options for booking ${booking.id}`)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication failed. Please log in again.')
      }

      const authenticatedAdminApi = createAdminApi(token)
      if (!authenticatedAdminApi) {
        throw new Error('Failed to create authenticated API client.')
      }

      console.log(`[Frontend] 🚀 Calling checkInRoomOptions API...`)
      const res = await authenticatedAdminApi.getCheckInRoomOptions(booking.id)
      console.log(`[Frontend] 📦 API Response:`, res.data)

      const availableRooms: CheckInRoomOption[] = res.data?.data?.availableRooms || []
      const currentRoomIds: number[] = res.data?.data?.currentRoomIds || booking.rooms.map(r => r.id)

      console.log(`[Frontend] 📊 Available rooms: ${availableRooms.length}, Current room IDs: ${currentRoomIds.join(', ')}`)

      if (availableRooms.length === 0) {
        console.warn(`[Frontend] ⚠️ No rooms available for this date range`)
        setCheckInError('No rooms available for the selected date range. Please check with the manager.')
      }

      setCheckInRoomOptions(availableRooms)
      setCheckInRoomIds(currentRoomIds)
      setCheckInError(null)
    } catch (e: any) {
      console.error(`[Frontend] ❌ Error fetching rooms:`, e)
      setCheckInRoomOptions([])
      setCheckInRoomIds(booking.rooms.map(r => r.id))
      const errorMsg = e?.response?.data?.message || e?.message || 'Failed to load room options.'
      setCheckInError(errorMsg)
    } finally {
      setCheckInRoomsLoading(false)
    }
  }

  const handleToggleCheckInRoom = (roomId: number, requiredCount: number) => {
    setCheckInRoomIds(prev => {
      if (prev.includes(roomId)) {
        if (prev.length === 1) return prev
        return prev.filter(id => id !== roomId)
      }
      if (prev.length >= requiredCount) {
        // Allow quick swap: replace the first selected room with the newly chosen one.
        const next = [...prev]
        next.shift()
        next.push(roomId)
        return next
      }
      return [...prev, roomId]
    })
  }

  const handleCheckinCheckout = async (bookingId: number, newStatus: 'checked_in' | 'checked_out') => {
    if (newStatus === 'checked_in') {
      // For check-in, open modal to collect guest info
      const booking = bookings.length > 0 
        ? bookings.find(b => b.id === bookingId) 
        : today?.checkIns.bookings.find(b => b.id === bookingId)
      
      if (booking) {
        setCheckInModal(booking)
        setCheckInTotalGuests(booking.totalGuests?.toString() || '')
        setCheckInProofType('aadhaar')
        setCheckInAddress(booking.guest?.address || '')
        setCheckInRoomOptions([])
        setCheckInRoomIds(booking.rooms.map(r => r.id))
        setCheckInError(null)
        fetchCheckInRoomOptions(booking)
      }
    } else {
      // For check-out, open modal to collect expense info
      const booking = bookings.find(b => b.id === bookingId) || today?.checkOuts.bookings.find(b => b.id === bookingId)
      
      if (booking) {
        setCheckOutModal(booking)
        setCheckOutExpenses({})
        setCheckOutOthersDescription('')
        setCheckOutError(null)
      }
    }
  }

  const handleSubmitCheckOut = async () => {
    if (!checkOutModal) return

    setCheckOutLoading(true)
    setCheckOutError(null)

    try {
      // Validate expenses if any are selected
      const selectedExpenses = Object.keys(checkOutExpenses).filter(exp => checkOutExpenses[exp])
      
      for (const expense of selectedExpenses) {
        if (!checkOutExpenses[expense]) {
          setCheckOutError(`Please enter amount for ${expense}.`)
          setCheckOutLoading(false)
          return
        }
        const amount = parseFloat(checkOutExpenses[expense])
        if (isNaN(amount) || amount <= 0) {
          setCheckOutError(`Please enter a valid amount greater than 0 for ${expense}.`)
          setCheckOutLoading(false)
          return
        }
      }

      // Validate "others" description if selected
      if (checkOutExpenses['others'] && !checkOutOthersDescription) {
        setCheckOutError('Please enter a description for the custom expense.')
        setCheckOutLoading(false)
        return
      }

      // Build extraExpense string (WITHOUT rupee symbol for backend parsing)
      let extraExpense = ''
      if (selectedExpenses.length > 0) {
        const expenseStrings = selectedExpenses.map(exp => {
          const expenseName = exp === 'others' ? checkOutOthersDescription : exp
          const amount = checkOutExpenses[exp]
          return `${expenseName}-${amount}`  // NO rupee symbol!
        })
        extraExpense = expenseStrings.join(', ')
      } else {
        extraExpense = 'No expense'
      }

      // ✅ Use authenticated admin API for checkout (triggers invoice creation)
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication failed. Please log in again.')
      }

      const authenticatedAdminApi = createAdminApi(token)
      if (!authenticatedAdminApi) {
        throw new Error('Failed to create authenticated API client.')
      }

      console.log(`[Checkout] 🔍 Checking out booking ${checkOutModal.id}...`)
      const res = await authenticatedAdminApi.updateBookingStatus(checkOutModal.id, 'checked_out', extraExpense)
      const data = res.data

      console.log(`[Checkout] ✅ Checkout successful, booking status: ${data.data?.bookingStatus}`)

      // Fetch full booking details with payments included
      const bookingRes = await fetch(`/api/bookings/${checkOutModal.id}`)
      const bookingData = await bookingRes.json()
      let fullBooking = bookingData.data || checkOutModal

      // Fetch payments separately using multiple strategies
      let paymentsData = fullBooking.payments || []
      
      // Strategy 1: Try payments endpoint with bookingId
      if (!paymentsData || paymentsData.length === 0) {
        try {
          const paymentRes = await fetch(`/api/payments?bookingId=${checkOutModal.id}`)
          const paymentDataRes = await paymentRes.json()
          if (paymentRes.ok && paymentDataRes.data) {
            paymentsData = Array.isArray(paymentDataRes.data) ? paymentDataRes.data : [paymentDataRes.data]
            console.log('Payments from endpoint:', paymentsData)
          }
        } catch (e) {
          console.log('Strategy 1 failed:', e)
        }
      }

      // Strategy 2: Try direct API call to get booking with payments populated
      if (!paymentsData || paymentsData.length === 0) {
        try {
          const detailedRes = await fetch(`/api/bookings/${checkOutModal.id}?include=payments`)
          const detailedData = await detailedRes.json()
          if (detailedRes.ok && detailedData.data?.payments) {
            paymentsData = Array.isArray(detailedData.data.payments) ? detailedData.data.payments : [detailedData.data.payments]
            console.log('Payments from detailed booking:', paymentsData)
          }
        } catch (e) {
          console.log('Strategy 2 failed:', e)
        }
      }

      fullBooking.payments = paymentsData

      // Show bill modal instead of closing
      setBillModal({
        booking: { ...fullBooking, bookingStatus: 'checked_out' },
        extraExpense: extraExpense !== 'No expense' ? extraExpense : null,
        finalTotal: data.data.finalTotal
      })
      setCheckOutModal(null)
    } catch (e: any) {
      setCheckOutError(e?.message || 'Failed to check out guest.')
    } finally {
      setCheckOutLoading(false)
    }
  }

  const handleSubmitCheckIn = async () => {
    if (!checkInModal) return
    // Prevent double submissions
    if (checkInSubmitRef.current) return
    
    if (!checkInTotalGuests) {
      setCheckInError('Total guests is required.')
      return
    }
    if (checkInRoomIds.length !== checkInModal.rooms.length) {
      setCheckInError(`Please select exactly ${checkInModal.rooms.length} room(s).`)
      return
    }

    checkInSubmitRef.current = true
    setCheckInLoading(true)
    setCheckInError(null)

    // Set a timeout to automatically reset the loading state
    const timeoutId = setTimeout(() => {
      if (checkInSubmitRef.current) {
        checkInSubmitRef.current = false
        setCheckInLoading(false)
        setCheckInError('Request timeout. Please check your connection and try again.')
      }
    }, 30000) // 30 second timeout

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication failed. Please log in again.')
      }

      const authenticatedAdminApi = createAdminApi(token)
      if (!authenticatedAdminApi) {
        throw new Error('Failed to create authenticated API client.')
      }

      const data = await authenticatedAdminApi.checkInGuest(checkInModal.id, {
        totalGuests: parseInt(checkInTotalGuests),
        proofType: checkInProofType,
        address: checkInAddress || null,
        roomIds: checkInRoomIds,
      })

      clearTimeout(timeoutId)

      setSuccessMsg(`Booking #${checkInModal.id} checked in successfully!`)
      setTimeout(() => setSuccessMsg(null), 4000)
      setCheckInModal(null)
      setCheckInRoomOptions([])
      setCheckInRoomIds([])
      setCheckInTotalGuests('')
      setCheckInAddress('')
      
      // Refresh all relevant data
      await Promise.all([fetchToday(), fetchBookings(), fetchPendingBookings(), fetchDashboard()])
    } catch (e: any) {
      setCheckInError(e?.response?.data?.message || e?.message || 'Failed to check in guest.')
    } finally {
      clearTimeout(timeoutId)
      checkInSubmitRef.current = false
      setCheckInLoading(false)
    }
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
      const token = await getToken()
      if (!token) {
        setPaymentSearchError('Authentication failed. Please log in again.')
        setPaymentSearchLoading(false)
        return
      }
      const params = new URLSearchParams()
      if (paymentSearchRef) params.append('bookingReference', paymentSearchRef)
      if (paymentSearchName) params.append('guestName', paymentSearchName)
      if (paymentSearchPhone) params.append('phone', paymentSearchPhone)
      const res = await fetch(
        `/api/admin/payments/search?${params}`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
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
      const token = await getToken()
      if (!token) {
        setEditPaymentError('Authentication failed. Please log in again.')
        setEditPaymentLoading(false)
        return
      }
      const res = await fetch(`/api/admin/payments/${editPaymentId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',  // Always change to 'paid' when confirming
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
      const token = await getToken()
      if (!token) {
        setPaymentSearchError('Authentication failed. Please log in again.')
        setCancelPaymentLoading(false)
        return
      }
      const res = await fetch(`/api/admin/payments/${cancelPaymentId}/cancel`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to refund payment')
      setSuccessMsg('Payment refunded! Booking cancelled and rooms freed.')
      setTimeout(() => setSuccessMsg(null), 4000)
      setCancelPaymentId(null)
      handleSearchPayments() // Refresh results
    } catch (e: any) {
      setPaymentSearchError(e?.message || 'Failed to refund payment.')
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
      const res = await fetch(`/api/rooms/search-simple?${params}`, {
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
    setBookingTotalGuests('')
    setBookingNotes('')
    setBookingPaymentMethod('cash')
    setBookingPaymentTxnId('')
    setBookingPaymentDate(new Date().toISOString().split('T')[0])
    setBookingStatus('confirmed')
    setBookingError(null)

    setShowBookingModal(true)
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
      const res = await fetch('/api/bookings/offline', {
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
      
      // Refresh data to show new booking
      await Promise.all([fetchBookings(), fetchPendingBookings(), fetchToday(), fetchDashboard()])
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
      const token = await getToken()
      if (!token) {
        setRoomsError('Authentication failed. Please log in again.')
        setEditLoading(false)
        return
      }

      const authenticatedAdminApi = createAdminApi(token)
      if (!authenticatedAdminApi) {
        setRoomsError('Failed to create authenticated API client.')
        setEditLoading(false)
        return
      }

      await authenticatedAdminApi.updateRoom(id, editForm)
      setEditingRoom(null)
      fetchRooms()
    } catch (e: any) { setRoomsError(e?.response?.data?.message || 'Failed to update room.') }
    finally { setEditLoading(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (isVerifyingAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F0F2F5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <img src="/MHOMES-logo.png" alt="MHOMES" style={{ height: '48px' }} />
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#6B3F2A' }} />
        <p style={{
          color: '#718096',
          fontFamily: 'var(--font-body)',
          fontSize: '14px'
        }}>
          Verifying access...
        </p>
      </div>
    )
  }

  if (!isAdminAuthorized) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F0F2F5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <img src="/MHOMES-logo.png" alt="MHOMES" style={{ height: '48px' }} />
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          color: '#1A202C',
          fontSize: '24px'
        }}>
          Access Denied
        </h2>
        <p style={{ color: '#718096', fontFamily: 'var(--font-body)' }}>
          Your account is not authorized to access this panel.
          Please contact the administrator.
        </p>
        <SignOutButton>
          <button style={{
            backgroundColor: '#6B3F2A',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'var(--font-label)',
            letterSpacing: '0.1em'
          }}>
            Sign Out
          </button>
        </SignOutButton>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#F5EAE0', minHeight: '100vh' }}>
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          
          nav { display: none !important; }
          .no-print { display: none !important; }
          
          /* Force bill to fit on one page - fully expanded */
          #bill-content {
            display: block !important;
            visibility: visible !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            position: relative !important;
            top: -1.2in !important;
            margin: 0 !important;
            padding: 0.05in 0.45in 0.1in 0.45in !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
            box-sizing: border-box !important;
          }
          
          #bill-content > * {
            page-break-inside: avoid !important;
            display: block !important;
            visibility: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #bill-content > * + * {
            margin-top: 8px !important;
          }
          
          #bill-content .flex {
            display: flex !important;
            width: 100% !important;
            margin: 0 !important;
          }
          
          #bill-content .justify-between {
            justify-content: space-between !important;
          }
          
          #bill-content span {
            display: inline !important;
            color: black !important;
            font-size: 13px !important;
          }
          
          #bill-content .border-b-2 {
            border-bottom: 1px solid #000 !important;
            padding-bottom: 6px !important;
            margin-bottom: 6px !important;
          }
          
          #bill-content .border-b {
            border-bottom: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #bill-content .border-y {
            border: none !important;
            border-bottom: 1px solid #000 !important;
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          
          #bill-content h2 {
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 20px !important;
            font-weight: bold !important;
            text-align: center !important;
          }
          
          #bill-content h3 {
            color: black !important;
            margin: 4px 0 0 0 !important;
            padding: 0 !important;
            font-size: 13px !important;
            font-weight: bold !important;
            text-align: center !important;
          }
          
          #bill-content .text-center { 
            text-align: center !important; 
          }
          
          #bill-content .text-xl { font-size: 16px !important; }
          #bill-content .text-lg { font-size: 14px !important; }
          #bill-content .text-sm { font-size: 13px !important; }
          #bill-content .text-xs { font-size: 11px !important; }
          
          #bill-content .font-bold { font-weight: bold !important; }
          #bill-content .font-medium { font-weight: 600 !important; }
          
          #bill-content .text-gray-900 { color: black !important; }
          #bill-content .text-gray-600 { color: #333 !important; }
          #bill-content .text-green-700 { color: black !important; }
          #bill-content .text-amber-700 { color: black !important; }
          
          #bill-content .bg-gray-100 { 
            background: #f0f0f0 !important; 
            padding: 5px 6px !important;
          }
          
          #bill-content .rounded { border-radius: 0 !important; }
          
          /* Expanded spacing */
          #bill-content .space-y-1 > * + * { margin-top: 4px !important; }
          #bill-content .space-y-2 > * + * { margin-top: 6px !important; }
          #bill-content .space-y-4 > * + * { margin-top: 8px !important; }
          
          #bill-content .pb-3 { padding-bottom: 4px !important; }
          #bill-content .pb-2 { padding-bottom: 3px !important; }
          #bill-content .pt-2 { padding-top: 3px !important; }
          #bill-content .py-3 { padding-top: 3px !important; padding-bottom: 3px !important; }
          #bill-content .p-3 { padding: 3px !important; }
          #bill-content .mb-2 { margin-bottom: 3px !important; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SIDEBAR - Fixed on left with logo and navigation */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      <aside style={{ 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        width: '260px', 
        height: '100vh', 
        backgroundColor: '#E8D7C3', 
        borderRight: '1px solid #D4C5B9',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '24px',
        overflow: 'auto'
      }}>
        {/* Logo */}
        <div style={{ paddingLeft: '0px', marginLeft: '-24px', marginBottom: '2px', minHeight: '100px', display: 'flex', alignItems: 'flex-start' }}>
          <img
            src="/MHOMES-logo.png"
            alt="Serenity Resort"
            style={{
              height: '150px',
              width: '250px',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, paddingRight: '12px' }}>
          {TAB_CONFIG.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                backgroundColor: activeTab === id ? '#D4AF70' : 'transparent',
                color: activeTab === id ? '#3E3E3E' : '#8B7355',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === id ? 600 : 500,
                transition: 'all 0.2s ease',
                borderRadius: 0,
                marginBottom: '4px'
              }}
              onMouseEnter={(e) => { 
                if (activeTab !== id) {
                  e.currentTarget.style.backgroundColor = '#F0E8DC';
                  e.currentTarget.style.color = '#3E3E3E';
                }
              }}
              onMouseLeave={(e) => { 
                if (activeTab !== id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#8B7355';
                }
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Sign Out Button at Bottom */}
        <div style={{ padding: '20px', borderTop: '1px solid #D4C5B9' }}>
          <SignOutButton>
            <button style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: '1px solid #8B7355',
              color: '#8B7355',
              padding: '10px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.05em',
              transition: 'all 0.2s ease'
            }}>
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Notification Dropdown - Fixed positioned outside navbar */}
      {showNotifications && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowNotifications(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 45
            }}
          />
          {/* Dropdown */}
          <div style={{
            position: 'fixed',
            top: '64px',
            right: '32px',
            width: '380px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1px solid #D4C5B9',
            borderRadius: '8px',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '480px'
          }}>
            {/* Fixed Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #D4C5B9',
              fontSize: '14px',
              fontWeight: 600,
              color: '#3E3E3E',
              flexShrink: 0,
              backgroundColor: '#FFFBF7',
              borderRadius: '8px 8px 0 0'
            }}>
              New Reservations ({pendingBookings.length})
            </div>
            {/* Scrollable items */}
            <div style={{
              overflowY: 'auto',
              flex: 1,
              minHeight: 0
            }}>
              {pendingBookings.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#718096',
                  fontSize: '14px'
                }}>
                  No new reservations
                </div>
              ) : (
                Array.isArray(pendingBookings) && pendingBookings.map((booking, idx) => {
                  if (!booking || !booking?.id) return null
                  return (
                    <div key={booking?.id} style={{
                      padding: '16px',
                      borderBottom: idx < pendingBookings.length - 1 
                        ? '1px solid #E2E8F0' : 'none'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1A202C'
                        }}>
                          {booking?.guest?.fullName || 'Guest'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>
                          {booking?.guest?.phone || 'N/A'}
                        </div>
                      </div>
                      <div style={{
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px'
                      }}>
                        <span style={{ color: '#C9A84C', fontWeight: 600 }}>
                          {booking?.bookingReference || 'N/A'}
                        </span>
                        <span style={{ color: '#C9A84C', fontWeight: 600 }}>
                          ₹{(booking?.totalAmount || 0)?.toLocaleString?.('en-IN') || '0'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            try {
                              if (booking?.payments?.[0]) {
                                setEditPaymentId(booking.payments[0]?.id)
                                setEditPaymentStatus(booking.payments[0]?.paymentStatus)
                                setEditPaymentMethod(booking.payments[0]?.paymentMethod)
                                setEditPaymentTxnId(booking.payments[0]?.transactionId || '')
                                setEditPaymentDate(
                                  booking.payments[0]?.paymentDate 
                                    ? booking.payments[0].paymentDate.split('T')[0] 
                                    : new Date().toISOString().split('T')[0]
                                )
                                setShowNotifications(false)
                              }
                            } catch (e) {
                              console.error('Error opening payment dialog:', e)
                              setGeneralError('Failed to open payment editor.')
                            }
                          }}
                        style={{
                          flex: 1,
                          backgroundColor: '#D4AF70',
                          color: '#3E3E3E',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C9A24A'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF70'}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => {
                          try {
                            handleCancelPendingBooking(booking?.id)
                          } catch (e) {
                            console.error('Error cancelling booking:', e)
                            setGeneralError('Failed to cancel booking.')
                          }
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#FFFFFF',
                          color: '#A89B8B',
                          border: '1px solid #D4C5B9',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5EAE0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                    )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* General Error Alert */}
      {generalError && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#FFF5F5',
          border: '1px solid #FED7D7',
          borderRadius: '8px',
          padding: '16px 20px',
          color: '#742A2A',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 100,
          maxWidth: '600px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {generalError}
        </div>
      )}

      {/* Content area with padding to account for fixed sidebar */}
      <main style={{ marginLeft: '260px', padding: '32px', backgroundColor: '#FFFBF7', minHeight: '100vh' }}>
        {/* Header with Bell Icon */}
        <div style={{position: 'fixed', top: 0, left: '260px', right: 0, height: '64px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #D4C5B9', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '32px', zIndex: 20, gap: '16px'}}>
          {/* Bell Icon with Badge */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{position: 'relative', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Bell className="w-6 h-6" style={{color: '#D4AF70'}} />
            {pendingBookings.length > 0 && (
              <span style={{position: 'absolute', top: '0px', right: '0px', backgroundColor: '#D4AF70', color: '#FFFFFF', fontSize: '11px', fontWeight: 600, width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFFFFF'}}>
                {pendingBookings.length}
              </span>
            )}
          </button>
        </div>

        {/* Add padding-top to account for fixed header */}
        <div style={{paddingTop: '64px'}}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

          {/* Success toast notification */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-100/90 border border-amber-300 text-amber-800 text-sm px-6 py-3 rounded-xl shadow-xl flex items-center gap-2"
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
              {activeTab === 'dashboard' && dashboard && (
                <div>
                  {/* Dashboard Title with Refresh Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#3E3E3E', letterSpacing: '-0.5px', margin: 0 }}>Dashboard</h1>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#C9A84C',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: refreshLoading ? 'not-allowed' : 'pointer',
                        opacity: refreshLoading ? 0.7 : 1,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e: any) => {
                        if (!refreshLoading) e.currentTarget.style.backgroundColor = '#B8942B'
                      }}
                      onMouseLeave={(e: any) => {
                        if (!refreshLoading) e.currentTarget.style.backgroundColor = '#C9A84C'
                      }}
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshLoading ? 'animate-spin' : ''}`} />
                      {refreshLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>

                  {/* Room Availability Grid */}
                  <div style={{ position: 'relative', marginBottom: '32px' }}>
                    {roomsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D4AF70' }} />
                      </div>
                    ) : roomsError ? (
                      <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '32px' }}>
                        <AlertCircle className="w-5 h-5" style={{ color: '#DC2626' }} />
                        <span style={{ color: '#991B1B' }}>{roomsError}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '24px' }}>
                        {/* Room Grid - Left Side */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
                            {(rooms || []).map((room: any) => {
                              const isOccupied = room.status === 'occupied'
                              const statusColor = isOccupied ? '#DC2626' : '#16A34A'
                              const statusText = isOccupied ? 'Occupied' : 'Available'
                              const isSelected = selectedRoom?.id === room.id
                              
                              return (
                                <button
                                  key={room.id}
                                  onClick={() => setSelectedRoom(room)}
                                  style={{
                                    background: '#FFFBF7',
                                    border: isSelected ? '2px solid #D4AF70' : '1px solid rgba(212, 197, 185, 0.5)',
                                    borderRadius: '16px',
                                    padding: '24px 16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '16px',
                                    position: 'relative',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: isSelected ? '0 12px 24px rgba(139, 115, 85, 0.18)' : '0 4px 12px rgba(139, 115, 85, 0.06)',
                                    backdropFilter: 'blur(4px)',
                                    WebkitBackdropFilter: 'blur(4px)',
                                  } as React.CSSProperties}
                                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.currentTarget.style.boxShadow = '0 16px 32px rgba(139, 115, 85, 0.15)'
                                    e.currentTarget.style.transform = 'translateY(-4px)'
                                    if (!isSelected) e.currentTarget.style.borderColor = '#D4AF70'
                                  }}
                                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.currentTarget.style.transform = 'translateY(0)'
                                    if (!isSelected) {
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 115, 85, 0.06)'
                                      e.currentTarget.style.borderColor = 'rgba(212, 197, 185, 0.5)'
                                    }
                                  }}
                                >
                                  <div style={{ fontSize: '36px', fontWeight: '800', color: '#3E3E3E', letterSpacing: '-1px' }}>{room.roomNumber}</div>
                                  <div style={{ position: 'absolute', top: '12px', right: '12px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}40` }}></div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                                    <div style={{ fontSize: '12px', color: '#A89B8B', textAlign: 'center', fontWeight: '500', lineHeight: '1.4' }}>{room.roomType}</div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: statusColor, backgroundColor: 'rgba(212, 197, 185, 0.1)', padding: '4px 10px', borderRadius: '8px', textAlign: 'center' }}>{statusText}</div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Room Details Panel - Right Side */}
                        {selectedRoom && (
                          <div style={{
                            width: '280px',
                            flexShrink: 0,
                            position: 'sticky',
                            top: '100px',
                            height: 'fit-content',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: '1px solid rgba(212, 197, 185, 0.4)',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 12px 40px rgba(139, 115, 85, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                          } as React.CSSProperties}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '8px' }}>
                              <div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#3E3E3E', lineHeight: '1.3' }}>
                                  Room {selectedRoom.roomNumber}
                                </div>
                                <div style={{ fontSize: '12px', color: '#A89B8B', fontWeight: '500', marginTop: '2px' }}>
                                  {selectedRoom.roomType}
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedRoom(null)}
                                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#A89B8B', padding: 0, lineHeight: 1 }}
                              >
                                ×
                              </button>
                            </div>

                            {/* Status */}
                            <div style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(212, 197, 185, 0.3)', marginBottom: '12px' }}>
                              <div style={{ fontSize: '11px', color: '#A89B8B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Status</div>
                              <div style={{ fontSize: '14px', color: '#3E3E3E', fontWeight: '600' }}>
                                {selectedRoom.status === 'occupied' ? 'Occupied' : 'Available'}
                              </div>
                            </div>

                            {/* Guest Info */}
                            {selectedRoom.currentBooking ? (
                              <>
                                <div style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(212, 197, 185, 0.3)', marginBottom: '12px' }}>
                                  <div style={{ fontSize: '11px', color: '#A89B8B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Guest</div>
                                  <div style={{ fontSize: '13px', color: '#3E3E3E', fontWeight: '500' }}>
                                    {selectedRoom.currentBooking.guest?.fullName || 'N/A'}
                                  </div>
                                </div>

                                <div style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(212, 197, 185, 0.3)', marginBottom: '12px' }}>
                                  <div style={{ fontSize: '11px', color: '#A89B8B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Check-in</div>
                                  <div style={{ fontSize: '13px', color: '#3E3E3E' }}>
                                    {selectedRoom.currentBooking.checkIn ? new Date(selectedRoom.currentBooking.checkIn).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }) : 'N/A'}
                                  </div>
                                </div>

                                <div style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(212, 197, 185, 0.3)', marginBottom: '12px' }}>
                                  <div style={{ fontSize: '11px', color: '#A89B8B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Check-out</div>
                                  <div style={{ fontSize: '13px', color: '#3E3E3E' }}>
                                    {selectedRoom.currentBooking.checkOut ? new Date(selectedRoom.currentBooking.checkOut).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }) : 'N/A'}
                                  </div>
                                </div>

                                {selectedRoom.currentBooking.totalGuests && (
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#A89B8B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Guests</div>
                                    <div style={{ fontSize: '13px', color: '#3E3E3E' }}>
                                      {selectedRoom.currentBooking.totalGuests}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div style={{ fontSize: '12px', color: '#A89B8B', fontStyle: 'italic' }}>
                                No guest currently booked
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recent Bookings */}
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#3E3E3E', marginBottom: '16px' }}>Recent Bookings</h2>
                    
                    <div className="overflow-x-auto">
                      {((dashboard as any).recentBookings || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#A89B8B' }}>
                          <p>No pending reservations at the moment</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow style={{ backgroundColor: '#D4C5B9' }}>
                              <TableHead style={{ color: '#3E3E3E' }}>Booking Ref</TableHead>
                              <TableHead style={{ color: '#3E3E3E' }}>Guest Name</TableHead>
                              <TableHead style={{ color: '#3E3E3E' }}>Phone</TableHead>
                              <TableHead style={{ color: '#3E3E3E' }}>Check-in</TableHead>
                              <TableHead style={{ color: '#3E3E3E' }}>Check-out</TableHead>
                              <TableHead style={{ color: '#3E3E3E' }}>Amount</TableHead>
                              <TableHead style={{ color: '#3E3E3E' }}>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {((dashboard as any).recentBookings || []).slice(0, 10).map((booking: any, idx: number) => {
                              const getStatusBadge = (status: string) => {
                                const statusStyles: Record<string, {bg: string, color: string}> = {
                                  pending: { bg: '#F5EAE0', color: '#A89B8B' },
                                  confirmed: { bg: '#FFF9E6', color: '#C9A84C' },
                                  checked_in: { bg: '#F0EAE3', color: '#8B7355' },
                                  checked_out: { bg: '#FFFBF7', color: '#A89B8B' },
                                  cancelled: { bg: '#F8E8E8', color: '#9B6B5F' }
                                }
                                const style = statusStyles[status] || { bg: '#FFFBF7', color: '#A89B8B' }
                                return {
                                  backgroundColor: style.bg,
                                  color: style.color,
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500' as const,
                                  display: 'inline-block' as const
                                }
                              }

                              return (
                                <TableRow key={booking.id} style={{ backgroundColor: '#FFFFFF', transition: 'background-color 0.2s', borderBottom: '1px solid #E8D7C3' }}>
                                  <TableCell style={{ color: '#3E3E3E', fontWeight: '500' }}>{booking.bookingReference}</TableCell>
                                  <TableCell style={{ color: '#3E3E3E' }}>{booking.guest.fullName}</TableCell>
                                  <TableCell style={{ color: '#A89B8B' }}>{booking.guest.phone}</TableCell>
                                  <TableCell style={{ color: '#A89B8B' }}>{fmtDate(booking.checkIn)}</TableCell>
                                  <TableCell style={{ color: '#A89B8B' }}>{fmtDate(booking.checkOut)}</TableCell>
                                  <TableCell style={{ color: '#3E3E3E', fontWeight: '600' }}>₹{booking.totalAmount.toLocaleString('en-IN')}</TableCell>
                                  <TableCell>
                                    <span style={getStatusBadge(booking.bookingStatus)}>
                                      {booking.bookingStatus.replace('_', ' ')}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB: PAYMENTS ─────────────────────────────────── */}
              {activeTab === 'payments' && (
                <div>
                  {/* Header with Title */}
                  <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#3E3E3E', marginBottom: '32px', letterSpacing: '-0.5px' }}>Payments</h1>

                  {/* Search Section with old form layout, new styling */}
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', borderRadius: '8px', marginBottom: '24px', padding: '24px', boxShadow: '0 4px 12px rgba(139, 115, 85, 0.08)' }}>
                    <h3 style={{ color: '#3E3E3E', fontWeight: 600, fontSize: '14px', marginBottom: '16px' }}>Search Payments</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <Label style={{ fontSize: '12px', color: '#A89B8B', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Booking Reference</Label>
                        <Input
                          placeholder="e.g., MH-2026-0001"
                          value={paymentSearchRef}
                          onChange={e => setPaymentSearchRef(e.target.value)}
                          style={{ backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px' }}
                          onFocus={(e) => e.target.style.borderColor = '#8B7355'}
                          onBlur={(e) => e.target.style.borderColor = '#D4C5B9'}
                        />
                      </div>
                      <div>
                        <Label style={{ fontSize: '12px', color: '#A89B8B', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Guest Name</Label>
                        <Input
                          placeholder="Guest name"
                          value={paymentSearchName}
                          onChange={e => setPaymentSearchName(e.target.value)}
                          style={{ backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px' }}
                          onFocus={(e) => e.target.style.borderColor = '#8B7355'}
                          onBlur={(e) => e.target.style.borderColor = '#D4C5B9'}
                        />
                      </div>
                      <div>
                        <Label style={{ fontSize: '12px', color: '#A89B8B', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Phone</Label>
                        <Input
                          placeholder="Phone number"
                          value={paymentSearchPhone}
                          onChange={e => setPaymentSearchPhone(e.target.value)}
                          style={{ backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px' }}
                          onFocus={(e) => e.target.style.borderColor = '#8B7355'}
                          onBlur={(e) => e.target.style.borderColor = '#D4C5B9'}
                        />
                      </div>
                    </div>
                    {paymentSearchError && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '12px', borderRadius: '6px', backgroundColor: '#F8E8E8', border: '1px solid #E8C5BD' }}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#9B6B5F' }} />
                        <p style={{ color: '#9B6B5F', fontSize: '12px' }}>{paymentSearchError}</p>
                      </div>
                    )}
                    <Button
                      onClick={handleSearchPayments}
                      disabled={paymentSearchLoading}
                      style={{ backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '36px', display: 'flex', gap: '8px', padding: '0 20px', fontWeight: 500, border: 'none' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C9A24A'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF70'}
                    >
                      {paymentSearchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Search className="w-4 h-4" />
                      Search
                    </Button>
                  </div>

                  {/* Table - Main Results */}
                  {paymentSearchResults.length > 0 && (
                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #D4C5B9', backgroundColor: '#FFFFFF' }}>
                      <table style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #D4C5B9', backgroundColor: '#D4C5B9' }}>
                            <th style={{ padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600 }}>Guest Name</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600 }}>Transaction ID</th>
                            <th style={{ padding: '14px 16px', textAlign: 'right', color: '#3E3E3E', fontWeight: 600 }}>Amount</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600 }}>Method</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', color: '#3E3E3E', fontWeight: 600 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentSearchResults.map((p, idx) => {
                            const refundAllowed = isRefundAllowed(p.booking?.checkIn)
                            return (
                              <tr key={p.id} style={{ borderBottom: '1px solid #E8D7C3', backgroundColor: '#FFFFFF' }}>
                                <td style={{ padding: '12px 16px', color: '#3E3E3E', fontWeight: 500 }}>{p.paymentDate ? fmtDate(p.paymentDate) : '-'}</td>
                                <td style={{ padding: '12px 16px', color: '#3E3E3E', fontWeight: 500 }}>{p.booking?.guest?.fullName || '-'}</td>
                                <td style={{ padding: '12px 16px', color: '#A89B8B', fontSize: '12px' }}>{p.transactionId || '-'}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3E3E3E', fontWeight: 600 }}>{fmt(p.amount)}</td>
                                <td style={{ padding: '12px 16px', color: '#3E3E3E', textTransform: 'capitalize' }}>{p.paymentMethod || '-'}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <StatusBadge status={p.paymentStatus} />
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                    {p.paymentStatus === 'paid' && isPaymentRefundAllowed(p.booking?.checkIn, p.booking?.bookingStatus) ? (
                                      <Button
                                        onClick={() => setCancelPaymentId(p.id)}
                                        size="sm"
                                        variant="ghost"
                                        style={{ color: '#8B7355', height: '28px', padding: '0 8px' }}
                                        title="Refund this payment"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: '#A89B8B' }}>—</span>
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
                    <div style={{ textAlign: 'center', paddingTop: '48px', paddingBottom: '48px', color: '#A89B8B', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px dashed #D4C5B9' }}>
                      {paymentSearchRef || paymentSearchName || paymentSearchPhone
                        ? 'No transactions found.'
                        : 'Use the search bar above to find transactions.'}
                    </div>
                  )}

                  {paymentSearchLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '48px', paddingBottom: '48px' }}>
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#D4AF70' }} />
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: BOOKINGS ───────────────────────────────────── */}
              {activeTab === 'bookings' && (
                <div>
                  {/* Header with Title */}
                  <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#3E3E3E', marginBottom: '32px', letterSpacing: '-0.5px' }}>Bookings</h1>

                  {/* Filter Bar */}
                  <div style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', borderRadius: '8px', marginBottom: '24px', padding: '20px', boxShadow: '0 4px 12px rgba(139, 115, 85, 0.08)'}}>
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="min-w-0 flex-1">
                        <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '8px', display: 'block', fontWeight: 500}}>Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px'}}>
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
                        <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '8px', display: 'block', fontWeight: 500}}>Source</Label>
                        <Select value={sourceFilter} onValueChange={setSourceFilter}>
                          <SelectTrigger style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px'}}>
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
                        <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '8px', display: 'block', fontWeight: 500}}>Check-in Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              style={{width: '100%', justifyContent: 'flex-start', textAlign: 'left', fontWeight: 400, backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px'}}
                            >
                              {dateFilter ? fmtDate(dateFilter.toISOString()) : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start" style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9'}}>
                            <Calendar
                              mode="single"
                              selected={dateFilter}
                              onSelect={setDateFilter}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => { setDateFilter(undefined); setStatusFilter('all'); setSourceFilter('all') }}
                          variant="outline"
                          size="sm"
                          style={{border: '1px solid #D4C5B9', color: '#8B7355', fontSize: '12px', height: '36px', backgroundColor: '#FFFFFF'}}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5EAE0'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={fetchBookings}
                          style={{backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '36px', fontWeight: 500, border: 'none'}}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C9A24A'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF70'}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Filter
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Bookings Table */}
                  {bookLoading ? <Spinner /> : bookError ? <ErrBox msg={bookError} /> : bookings.length === 0 ? (
                    <div style={{backgroundColor: '#FFFFFF', border: '1px dashed #D4C5B9', borderRadius: '8px', padding: '48px 32px', textAlign: 'center'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '16px'}}>
                        <div style={{width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F5EAE0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <BookOpen className="w-7 h-7" style={{color: '#A89B8B'}} />
                        </div>
                      </div>
                      <h3 style={{color: '#3E3E3E', fontWeight: 600, marginBottom: '8px'}}>No Bookings Found</h3>
                      <p style={{color: '#A89B8B', fontSize: '14px', maxWidth: '448px', marginLeft: 'auto', marginRight: 'auto'}}>
                        Try adjusting your filters or check back later.
                      </p>
                    </div>
                  ) : (
                    <div style={{overflowX: 'auto', borderRadius: '8px', border: '1px solid #D4C5B9', backgroundColor: '#FFFFFF'}}>
                      <table style={{width: '100%', fontSize: '13px'}}>
                        <thead style={{backgroundColor: '#D4C5B9', borderBottom: '1px solid #D4C5B9'}}>
                          <tr>
                            <th style={{padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600}}>Booking Ref</th>
                            <th style={{padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600}}>Guest Name</th>
                            <th style={{padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600}}>Phone</th>
                            <th style={{padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600}}>Check-in</th>
                            <th style={{padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600}}>Check-out</th>
                            <th style={{padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600}}>Rooms</th>
                            <th style={{padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600}}>Amount</th>
                            <th style={{padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600}}>Status</th>
                            <th style={{padding: '14px 16px', textAlign: 'left', color: '#3E3E3E', fontWeight: 600}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((b: any, idx) => {
                            return (
                              <tr key={b.id} style={{borderBottom: '1px solid #E8D7C3', backgroundColor: '#FFFFFF'}}>
                                <td style={{padding: '12px 16px', color: '#3E3E3E', fontWeight: 500}}>{b.bookingReference}</td>
                                <td style={{padding: '12px 16px', color: '#3E3E3E'}}>{b.guest.fullName}</td>
                                <td style={{padding: '12px 16px', color: '#A89B8B', fontSize: '12px'}}>{b.guest.phone}</td>
                                <td style={{padding: '12px 16px', color: '#3E3E3E'}}>{fmtDate(b.checkIn)}</td>
                                <td style={{padding: '12px 16px', color: '#3E3E3E'}}>{fmtDate(b.checkOut)}</td>
                                <td style={{padding: '12px 16px', color: '#3E3E3E'}}>{b.rooms.map((r: any) => r.roomNumber).join(', ')}</td>
                                <td style={{padding: '12px 16px', color: '#3E3E3E', fontWeight: 600}}>{fmt(b.totalAmount)}</td>
                                <td style={{padding: '12px 16px'}}>
                                  <StatusBadge status={b.bookingStatus} />
                                </td>
                                <td style={{padding: '12px 16px', textAlign: 'center'}}>
                                  <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                    {b.bookingStatus === 'confirmed' && (
                                      <Button
                                        onClick={() => handleCheckinCheckout(b.id, 'checked_in')}
                                        size="sm"
                                        style={{backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '28px', padding: '0 12px', fontWeight: 500, border: 'none'}}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C9A24A'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF70'}
                                      >
                                        Check-in
                                      </Button>
                                    )}
                                    {b.bookingStatus === 'checked_in' && (
                                      <Button
                                        onClick={() => handleCheckinCheckout(b.id, 'checked_out')}
                                        size="sm"
                                        style={{backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '28px', padding: '0 12px', fontWeight: 500, border: 'none'}}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C9A24A'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF70'}
                                      >
                                        Check-out
                                      </Button>
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
                </div>
              )}

              {/* ─── TAB: ROOMS ──────────────────────────────────────── */}
              {activeTab === 'rooms' && (
                <div>
                  {/* Header with Title */}
                  <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#3E3E3E', marginBottom: '32px', letterSpacing: '-0.5px' }}>Rooms</h1>

                  {/* ─── SEARCH FORM ──────────────────────────────────────────── */}
                  <div style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', borderRadius: '8px', marginBottom: '24px', padding: '20px', boxShadow: '0 4px 12px rgba(139, 115, 85, 0.08)'}}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <Label style={{color: '#A89B8B', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 500}}>Check-in Date</Label>
                        <Input type="date" value={searchCheckIn} onChange={e => setSearchCheckIn(e.target.value)}
                          style={{fontSize: '12px', height: '36px', backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', borderRadius: '6px'}} 
                          onFocus={(e) => e.target.style.borderColor = '#8B7355'}
                          onBlur={(e) => e.target.style.borderColor = '#D4C5B9'}
                        />
                      </div>
                      <div>
                        <Label style={{color: '#A89B8B', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 500}}>Check-out Date</Label>
                        <Input type="date" value={searchCheckOut} onChange={e => setSearchCheckOut(e.target.value)}
                          style={{fontSize: '12px', height: '36px', backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', borderRadius: '6px'}}
                          onFocus={(e) => e.target.style.borderColor = '#8B7355'}
                          onBlur={(e) => e.target.style.borderColor = '#D4C5B9'}
                        />
                      </div>
                      <div>
                        <Label style={{color: '#A89B8B', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 500}}>Room Type (Optional)</Label>
                        <select value={searchRoomType} onChange={e => setSearchRoomType(e.target.value)}
                          style={{width: '100%', fontSize: '12px', height: '36px', padding: '0 8px', borderRadius: '6px', backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E'}}
                          onFocus={(e) => e.target.style.borderColor = '#8B7355'}
                          onBlur={(e) => e.target.style.borderColor = '#D4C5B9'}>
                          <option value="">Any Type</option>
                          <option value="premium">Premium</option>
                          <option value="premium_plus">Premium Plus</option>
                        </select>
                      </div>
                      <Button onClick={handleSearchRooms} disabled={searchLoading}
                        style={{backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '36px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, border: 'none'}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C9A24A'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF70'}>
                        {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Search Rooms
                      </Button>
                    </div>
                  </div>

                  {/* ─── SEARCH RESULTS ───────────────────────────────────────── */}
                  {searchLoading && <Spinner />}
                  {searchError && <ErrBox msg={searchError} />}
                  {!searchLoading && !searchError && searchResults.length === 0 && searchCheckIn && (
                    <div style={{textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', backgroundColor: '#FFFFFF', border: '1px dashed #D4C5B9', borderRadius: '8px'}}>
                      <p style={{color: '#A89B8B'}}>No rooms available for selected dates</p>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div style={{marginBottom: '24px'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
                        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#3E3E3E'}}>Available Rooms</h3>
                        <span style={{fontSize: '12px', color: '#A89B8B'}}>{searchResults.length} room{searchResults.length !== 1 ? 's' : ''} found</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {searchResults.map(room => (
                          <div key={room.id} style={{cursor: 'pointer', transition: 'all 0.2s ease', backgroundColor: selectedRoomIds.has(room.id) ? '#FFFBF0' : '#FFFFFF', border: selectedRoomIds.has(room.id) ? '2px solid #D4AF70' : '1px solid #D4C5B9', borderRadius: '8px', padding: '16px'}}
                            onClick={() => handleToggleRoom(room.id)}>
                            <div style={{display: 'flex', gap: '12px'}}>
                              <Checkbox checked={selectedRoomIds.has(room.id)}
                                onClick={(e) => e.stopPropagation()}
                                style={{marginTop: '4px'}} />
                              <div style={{flex: 1}}>
                                <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px'}}>
                                  <div>
                                    <p style={{fontSize: '18px', fontWeight: 700, color: '#3E3E3E'}}>{room.roomNumber}</p>
                                    <p style={{fontSize: '12px', color: '#A89B8B'}}>{room.roomType.charAt(0).toUpperCase() + room.roomType.slice(1)}</p>
                                  </div>
                                  <span style={{fontSize: '14px', fontWeight: 600, color: '#C9A84C'}}>{fmt(room.pricePerNight)}/night</span>
                                </div>
                                <p style={{fontSize: '12px', color: '#A89B8B', marginBottom: '8px'}}>{room.description}</p>
                                <p style={{fontSize: '12px', color: '#A89B8B'}}>Max {room.maxGuests} guest{room.maxGuests !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedRoomIds.size > 0 && (
                        <Button onClick={handleOpenBookingModal}
                          style={{width: '100%', backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '14px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 500, border: 'none'}}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C9A24A'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4AF70'}>
                          <CheckCircle2 className="w-4 h-4" />
                          Book Selected Rooms ({selectedRoomIds.size})
                        </Button>
                      )}
                    </div>
                  )}

                  {/* ─── OFFLINE BOOKING MODAL ────────────────────────────────── */}
                  <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                    <DialogContent style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', maxWidth: '52rem', maxHeight: '90vh', overflowY: 'auto', borderRadius: '8px'}}>
                      <DialogHeader>
                        <DialogTitle style={{color: '#3E3E3E', fontSize: '16px', fontWeight: 600}}>Create Offline Booking</DialogTitle>
                      </DialogHeader>

                      {bookingError && (
                        <div className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-red-400 text-xs">{bookingError}</p>
                        </div>
                      )}

                      <div className="space-y-6">
                        {/* SECTION A: GUEST DETAILS */}
                        <div style={{borderBottom: '1px solid #D4C5B9', paddingBottom: '24px'}}>
                          <h4 style={{fontSize: '14px', fontWeight: 600, color: '#3E3E3E', marginBottom: '16px'}}>Guest Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Full Name *</Label>
                              <Input 
                                type="text" 
                                placeholder="Guest name" 
                                value={bookingGuestName}
                                onChange={e => setBookingGuestName(e.target.value)}
                                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              />
                            </div>
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Phone *</Label>
                              <Input 
                                type="tel" 
                                placeholder="10-digit phone" 
                                value={bookingGuestPhone}
                                onChange={e => setBookingGuestPhone(e.target.value)}
                                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              />
                            </div>
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Email *</Label>
                              <Input 
                                type="email" 
                                placeholder="Guest email" 
                                value={bookingGuestEmail}
                                onChange={e => setBookingGuestEmail(e.target.value)}
                                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              />
                            </div>
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>ID Proof Type</Label>
                              <select 
                                value={bookingGuestProof} 
                                onChange={e => setBookingGuestProof(e.target.value)}
                                style={{width: '100%', fontSize: '12px', height: '36px', padding: '0 8px', borderRadius: '4px', backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', outline: 'none'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              >
                                <option value="aadhar">Aadhaar</option>
                                <option value="passport">Passport</option>
                                <option value="driving_license">Driving License</option>
                                <option value="pan">PAN Card</option>
                              </select>
                            </div>
                            <div style={{gridColumn: 'span 2'}}>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Address</Label>
                              <textarea 
                                placeholder="Optional" 
                                value={bookingGuestAddress} 
                                onChange={e => setBookingGuestAddress(e.target.value)} 
                                rows={2}
                                style={{width: '100%', fontSize: '12px', padding: '8px', borderRadius: '4px', backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', outline: 'none', fontFamily: 'inherit', resize: 'none'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              />
                            </div>
                          </div>
                        </div>

                        {/* SECTION B: BOOKING DETAILS */}
                        <div style={{borderBottom: '1px solid #D4C5B9', paddingBottom: '24px'}}>
                          <h4 style={{fontSize: '14px', fontWeight: 600, color: '#3E3E3E', marginBottom: '16px'}}>Booking Details</h4>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Check-in Date</Label>
                              <div style={{backgroundColor: '#F5EAE0', border: '1px solid #D4C5B9', borderRadius: '4px', padding: '8px', fontSize: '12px', color: '#3E3E3E'}}>
                                {searchCheckIn}
                              </div>
                            </div>
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Check-out Date</Label>
                              <div style={{backgroundColor: '#F5EAE0', border: '1px solid #D4C5B9', borderRadius: '4px', padding: '8px', fontSize: '12px', color: '#3E3E3E'}}>
                                {searchCheckOut}
                              </div>
                            </div>
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Selected Rooms</Label>
                              <div style={{backgroundColor: '#FFF9E6', border: '1px solid #D4C5B9', borderRadius: '4px', padding: '8px', fontSize: '12px', color: '#D4AF70', fontWeight: 500}}>
                                {Array.from(selectedRoomIds).map(id => searchResults.find(r => r.id === id)?.roomNumber).join(', ')}
                              </div>
                            </div>
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Total Guests *</Label>
                              <Input 
                                type="number" 
                                placeholder="Number of guests" 
                                value={bookingTotalGuests}
                                onChange={e => setBookingTotalGuests(e.target.value)}
                                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              />
                            </div>
                            <div style={{gridColumn: 'span 2'}}>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Total Amount</Label>
                              <div style={{backgroundColor: '#FFF9E6', border: '1px solid #D4C5B9', borderRadius: '4px', padding: '12px', fontSize: '12px', color: '#3E3E3E'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                                  <span>Subtotal:</span>
                                  <span>{fmt(calculateTotalAmount())}</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                                  <span>Tax (5% GST):</span>
                                  <span>{fmt(Math.round(calculateTotalAmount() * 0.05))}</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #D4C5B9', fontWeight: 700, color: '#D4AF70'}}>
                                  <span>Total:</span>
                                  <span>{fmt(Math.round(calculateTotalAmount() * 1.05))}</span>
                                </div>
                              </div>
                            </div>
                            <div style={{gridColumn: 'span 2'}}>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Notes</Label>
                              <textarea 
                                placeholder="Optional" 
                                value={bookingNotes} 
                                onChange={e => setBookingNotes(e.target.value)} 
                                rows={2}
                                style={{width: '100%', fontSize: '12px', padding: '8px', borderRadius: '4px', backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', outline: 'none', fontFamily: 'inherit', resize: 'none'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              />
                            </div>
                          </div>
                        </div>

                        {/* SECTION D: PAYMENT */}
                        <div style={{borderBottom: '1px solid #D4C5B9', paddingBottom: '24px'}}>
                          <h4 style={{fontSize: '14px', fontWeight: 600, color: '#3E3E3E', marginBottom: '16px'}}>Payment Information</h4>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Payment Method</Label>
                              <select 
                                value={bookingPaymentMethod} 
                                onChange={e => setBookingPaymentMethod(e.target.value)}
                                style={{width: '100%', fontSize: '12px', height: '36px', padding: '0 8px', borderRadius: '4px', backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', outline: 'none'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="gateway">Payment Gateway</option>
                              </select>
                            </div>
                            <div>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Transaction ID</Label>
                              <Input 
                                type="text" 
                                placeholder="Optional" 
                                value={bookingPaymentTxnId}
                                onChange={e => setBookingPaymentTxnId(e.target.value)}
                                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              />
                            </div>
                            <div style={{gridColumn: 'span 2'}}>
                              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Payment Date</Label>
                              <Input 
                                type="date" 
                                value={bookingPaymentDate}
                                onChange={e => setBookingPaymentDate(e.target.value)}
                                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                              />
                            </div>
                          </div>
                        </div>

                        {/* SECTION E: BOOKING STATUS */}
                        <div>
                          <h4 style={{fontSize: '14px', fontWeight: 600, color: '#3E3E3E', marginBottom: '16px'}}>Booking Status</h4>
                          <RadioGroup value={bookingStatus} onValueChange={setBookingStatus}>
                            <div className="flex items-center gap-2 mb-3">
                              <RadioGroupItem value="confirmed" id="status-confirmed" />
                              <Label htmlFor="status-confirmed" style={{fontSize: '12px', color: '#3E3E3E', fontWeight: 'normal', cursor: 'pointer'}}>
                                Confirmed
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="checked_in" id="status-checked" />
                              <Label htmlFor="status-checked" style={{fontSize: '12px', color: '#3E3E3E', fontWeight: 'normal', cursor: 'pointer'}}>
                                Checked In
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>

                      <DialogFooter style={{display: 'flex', gap: '8px', paddingTop: '24px', marginTop: '24px', borderTop: '1px solid #D4C5B9'}}>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowBookingModal(false)}
                          style={{flex: 1, border: '1px solid #D4C5B9', color: '#A89B8B', fontSize: '12px', height: '36px', backgroundColor: '#FFFFFF', borderRadius: '4px'}}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleSubmitOfflineBooking} 
                          disabled={offlineBookingLoading}
                          style={{flex: 1, backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', border: 'none', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
                          onMouseEnter={(e) => !offlineBookingLoading && (e.currentTarget.style.backgroundColor = '#C9A24A')}
                          onMouseLeave={(e) => !offlineBookingLoading && (e.currentTarget.style.backgroundColor = '#D4AF70')}
                        >
                          {offlineBookingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
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
                  {/* Header with Title */}
                  <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#3E3E3E', marginBottom: '12px', letterSpacing: '-0.5px' }}>
                    Today — {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </h1>
                  <div style={{ marginBottom: '32px' }}>
                    <Button variant="outline" size="sm" onClick={fetchToday} style={{border: '1px solid #D4C5B9', color: '#8B7355', fontSize: '12px', background: '#FFFFFF'}}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5EAE0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                    </Button>
                  </div>
                  {todayLoading ? <Spinner /> : todayError ? <ErrBox msg={todayError} /> : today && (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '32px'}}>
                      {/* TODAY'S CHECK-INS */}
                      <div style={{border: '1px solid #D4C5B9', borderRadius: '8px', backgroundColor: '#FFFFFF', padding: '20px', boxShadow: '0 4px 12px rgba(139, 115, 85, 0.08)'}}>
                        <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#D4AF70', fontWeight: 600, marginBottom: '16px', fontSize: '14px'}}>
                          <LogIn className="w-4 h-4" />
                          Today's Check-ins
                          <span style={{marginLeft: '8px', backgroundColor: '#FFF9E6', color: '#C9A84C', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500}}>
                            {today.checkIns.total}
                          </span>
                        </h3>
                        {today.checkIns.bookings.length === 0 ? (
                          <div style={{color: '#A89B8B', fontSize: '14px', paddingTop: '32px', paddingBottom: '32px', textAlign: 'center'}}>No check-ins scheduled for today</div>
                        ) : (
                          <div style={{overflowX: 'auto'}}>
                            <table style={{width: '100%', fontSize: '12px'}}>
                              <thead>
                                <tr style={{borderBottom: '1px solid #D4C5B9'}}>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Booking Ref</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Guest Name</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Phone</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Room(s)</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Guests</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Amount</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Payment Status</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {today.checkIns.bookings.map((b, idx) => (
                                  <tr key={b.id} style={{borderBottom: '1px solid #E8D7C3', backgroundColor: '#FFFFFF', transition: 'background-color 0.2s'}}>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#3E3E3E', fontWeight: 600}}>{b.bookingReference}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#3E3E3E'}}>{b.guest.fullName}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#A89B8B'}}>{b.guest.phone}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#3E3E3E'}}>{b.rooms.map(r => r.roomNumber).join(', ')}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#3E3E3E'}}>{b.totalGuests}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', fontWeight: 600, color: '#3E3E3E'}}>{fmt(b.totalAmount)}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px'}}>
                                      <span style={{backgroundColor: b.payments?.[0]?.paymentStatus === 'paid' ? '#F0FFF4' : '#FEF3C7', color: b.payments?.[0]?.paymentStatus === 'paid' ? '#38A169' : '#D69E2E', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, border: b.payments?.[0]?.paymentStatus === 'paid' ? '1px solid #C6F6D5' : '1px solid #FCD34D'}}>
                                        {b.payments?.[0]?.paymentStatus || 'yet_to_pay'}
                                      </span>
                                    </td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px'}}>
                                      <Button size="sm" variant="outline" onClick={() => handleCheckinCheckout(b.id, 'checked_in')} 
                                        disabled={bookingLoading === b.id} style={{border: 'none', color: '#3E3E3E', backgroundColor: '#D4AF70', height: '28px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500, borderRadius: '4px', cursor: 'pointer'}}
                                        onMouseEnter={(e) => {
                                          if (bookingLoading !== b.id) {
                                            e.currentTarget.style.backgroundColor = '#C9A24A';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (bookingLoading !== b.id) {
                                            e.currentTarget.style.backgroundColor = '#D4AF70';
                                          }
                                        }}>
                                        {bookingLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                                        Check-in
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* TODAY'S CHECK-OUTS */}
                      <div style={{border: '1px solid #D4C5B9', borderRadius: '8px', backgroundColor: '#FFFFFF', padding: '20px', boxShadow: '0 4px 12px rgba(139, 115, 85, 0.08)'}}>
                        <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#D4AF70', fontWeight: 600, marginBottom: '16px', fontSize: '14px'}}>
                          <LogOut className="w-4 h-4" />
                          Today's Check-outs
                          <span style={{marginLeft: '8px', backgroundColor: '#FFF9E6', color: '#C9A84C', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500}}>
                            {today.checkOuts.total}
                          </span>
                        </h3>
                        {today.checkOuts.bookings.length === 0 ? (
                          <div style={{color: '#A89B8B', fontSize: '14px', paddingTop: '32px', paddingBottom: '32px', textAlign: 'center'}}>No check-outs scheduled for today</div>
                        ) : (
                          <div style={{overflowX: 'auto'}}>
                            <table style={{width: '100%', fontSize: '12px'}}>
                              <thead>
                                <tr style={{borderBottom: '1px solid #D4C5B9'}}>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Booking Ref</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Guest Name</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Phone</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Room(s)</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Check-in Date</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Amount</th>
                                  <th style={{height: '40px', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '12px', color: '#3E3E3E'}}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {today.checkOuts.bookings.map((b, idx) => (
                                  <tr key={b.id} style={{borderBottom: '1px solid #E8D7C3', backgroundColor: '#FFFFFF', transition: 'background-color 0.2s'}}>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#3E3E3E', fontWeight: 600}}>{b.bookingReference}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#3E3E3E'}}>{b.guest.fullName}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#A89B8B'}}>{b.guest.phone}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#3E3E3E'}}>{b.rooms.map(r => r.roomNumber).join(', ')}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#A89B8B'}}>{fmtDate(b.checkIn)}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', fontWeight: 600, color: '#3E3E3E'}}>{fmt(b.totalAmount)}</td>
                                    <td style={{height: '48px', padding: '0 12px', verticalAlign: 'middle', fontSize: '12px'}}>
                                      <Button size="sm" variant="outline" onClick={() => handleCheckinCheckout(b.id, 'checked_out')} 
                                        disabled={bookingLoading === b.id} style={{border: 'none', color: '#3E3E3E', backgroundColor: '#D4AF70', height: '28px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500, borderRadius: '4px', cursor: 'pointer'}}
                                        onMouseEnter={(e) => {
                                          if (bookingLoading !== b.id) {
                                            e.currentTarget.style.backgroundColor = '#C9A24A';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (bookingLoading !== b.id) {
                                            e.currentTarget.style.backgroundColor = '#D4AF70';
                                          }
                                        }}>
                                        {bookingLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                                        Check-out
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* EDIT PAYMENT DIALOG */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <Dialog open={editPaymentId !== null} onOpenChange={(open) => !open && setEditPaymentId(null)}>
        <DialogContent style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', maxWidth: '28rem', borderRadius: '8px'}}>
          <DialogHeader>
            <DialogTitle style={{color: '#3E3E3E', fontSize: '16px', fontWeight: 600}}>Edit Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Payment Method</Label>
              <select 
                value={editPaymentMethod} 
                onChange={(e) => setEditPaymentMethod(e.target.value)} 
                style={{width: '100%', fontSize: '12px', height: '36px', padding: '0 8px', borderRadius: '4px', backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', outline: 'none'}}
                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="gateway">Payment Gateway</option>
              </select>
            </div>

            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Transaction ID</Label>
              <Input
                type="text"
                placeholder="Transaction ID"
                value={editPaymentTxnId}
                onChange={e => setEditPaymentTxnId(e.target.value)}
                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
              />
            </div>

            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Payment Date</Label>
              <Input
                type="date"
                value={editPaymentDate}
                onChange={e => setEditPaymentDate(e.target.value)}
                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
              />
            </div>

            {editPaymentError && (
              <div className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{editPaymentError}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSavePayment}
                disabled={editPaymentLoading}
                style={{flex: 1, backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', border: 'none', fontWeight: 500, cursor: 'pointer'}}
                onMouseEnter={(e) => !editPaymentLoading && (e.currentTarget.style.backgroundColor = '#C9A24A')}
                onMouseLeave={(e) => !editPaymentLoading && (e.currentTarget.style.backgroundColor = '#D4AF70')}
              >
                {editPaymentLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Save Changes
              </Button>
              <Button
                onClick={() => setEditPaymentId(null)}
                variant="outline"
                style={{flex: 1, border: '1px solid #D4C5B9', color: '#A89B8B', fontSize: '12px', height: '36px', backgroundColor: '#FFFFFF', borderRadius: '4px'}}
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
        <DialogContent style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', maxWidth: '28rem', borderRadius: '8px'}}>
          <DialogHeader>
            <DialogTitle style={{color: '#3E3E3E', fontSize: '16px', fontWeight: 600}}>Refund Payment</DialogTitle>
          </DialogHeader>
          <p style={{color: '#A89B8B', fontSize: '14px'}}>
            Are you sure? This will:
            <br />• Mark the payment as refunded
            <br />• Cancel the booking
            <br />• Free up the assigned rooms
          </p>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleCancelPayment}
              disabled={cancelPaymentLoading}
              style={{flex: 1, backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', border: 'none', fontWeight: 500, cursor: 'pointer'}}
              onMouseEnter={(e) => !cancelPaymentLoading && (e.currentTarget.style.backgroundColor = '#C9A24A')}
              onMouseLeave={(e) => !cancelPaymentLoading && (e.currentTarget.style.backgroundColor = '#D4AF70')}
            >
              {cancelPaymentLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Confirm Refund
            </Button>
            <Button
              onClick={() => setCancelPaymentId(null)}
              variant="outline"
              style={{flex: 1, border: '1px solid #D4C5B9', color: '#A89B8B', fontSize: '12px', height: '36px', backgroundColor: '#FFFFFF', borderRadius: '4px'}}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CANCEL BOOKING CONFIRMATION DIALOG */}
      <Dialog open={cancelId !== null} onOpenChange={(open) => !open && setCancelId(null)}>
        <DialogContent style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', borderRadius: '8px', maxWidth: '400px'}}>
          <DialogHeader>
            <DialogTitle style={{color: '#6B3F2A', fontSize: '16px', fontWeight: 600}}>Cancel Booking?</DialogTitle>
            <DialogDescription style={{color: '#A89B8B', fontSize: '13px', marginTop: '8px'}}>
              Are you sure you want to cancel booking #{cancelId}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {pendingCancelError && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{pendingCancelError}</p>
            </div>
          )}

          <DialogFooter style={{display: 'flex', gap: '8px', paddingTop: '16px', marginTop: '16px', borderTop: '1px solid #D4C5B9'}}>
            <Button
              onClick={() => setCancelId(null)}
              variant="outline"
              style={{flex: 1, border: '1px solid #D4C5B9', color: '#A89B8B', fontSize: '12px', height: '36px', backgroundColor: '#FFFFFF', borderRadius: '4px'}}
            >
              Keep Booking
            </Button>
            <Button
              onClick={confirmCancelBooking}
              disabled={cancelLoading}
              style={{flex: 1, backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '12px', height: '36px', borderRadius: '4px', border: 'none', fontWeight: 500, cursor: 'pointer'}}
              onMouseEnter={(e) => !cancelLoading && (e.currentTarget.style.backgroundColor = '#B91C1C')}
              onMouseLeave={(e) => !cancelLoading && (e.currentTarget.style.backgroundColor = '#DC2626')}
            >
              {cancelLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Check-In Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={checkInModal !== null} onOpenChange={(open) => !open && setCheckInModal(null)}>
        <DialogContent style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', maxWidth: '28rem', borderRadius: '8px'}}>
          <DialogHeader>
            <DialogTitle style={{color: '#3E3E3E', fontSize: '16px', fontWeight: 600}}>
              Check-in Guest — {checkInModal?.bookingReference}
            </DialogTitle>
          </DialogHeader>

          {checkInError && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{checkInError}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Guest Name</Label>
              <Input
                disabled
                value={checkInModal?.guest?.fullName || ''}
                style={{backgroundColor: '#F5EAE0', border: '1px solid #D4C5B9', color: '#A89B8B', fontSize: '12px', height: '36px', borderRadius: '4px', paddingLeft: '8px'}}
              />
            </div>

            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Total Guests *</Label>
              <Input
                type="number"
                min="1"
                value={checkInTotalGuests}
                onChange={e => setCheckInTotalGuests(e.target.value)}
                placeholder="e.g., 3"
                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
              />
            </div>

            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>ID Proof Type *</Label>
              <Select value={checkInProofType} onValueChange={setCheckInProofType}>
                <SelectTrigger style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px'}}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9'}}>
                  <SelectItem value="aadhaar">Aadhaar</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="driving_license">Driving License</SelectItem>
                  <SelectItem value="voter_id">Voter ID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Room Selection</Label>
              {checkInRoomsLoading ? (
                <div style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', borderRadius: '4px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#A89B8B', fontSize: '12px'}}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading available rooms...
                </div>
              ) : checkInRoomOptions.length === 0 ? (
                <div style={{backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '4px', padding: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div style={{fontSize: '12px', color: '#92400E'}}>
                    <p style={{margin: 0, fontWeight: 500}}>No additional rooms available</p>
                    <p style={{margin: '4px 0 0 0', fontSize: '11px'}}>Current room assignment will be kept</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-stone-500">
                    Select {checkInModal?.rooms.length || 0} room(s). Keep current room(s) selected or choose replacement room(s).
                  </p>
                  <div style={{maxHeight: '176px', overflowY: 'auto', border: '1px solid #D4C5B9', borderRadius: '4px', padding: '8px', backgroundColor: '#FFFFFF'}}>
                    {checkInRoomOptions.map(room => {
                      const checked = checkInRoomIds.includes(room.id)
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => handleToggleCheckInRoom(room.id, checkInModal?.rooms.length || 1)}
                          style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', borderRadius: '4px', padding: '8px', border: '1px solid', borderColor: checked ? '#D4AF70' : '#D4C5B9', backgroundColor: checked ? '#FFF9E6' : '#FFFFFF', transition: 'all 0.2s', cursor: 'pointer'}}
                          onMouseEnter={(e) => !checked && (e.currentTarget.style.borderColor = '#D4C5B9')}
                          onMouseLeave={(e) => !checked && (e.currentTarget.style.borderColor = '#D4C5B9')}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              style={{display: 'inline-flex', height: '16px', width: '16px', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', border: '1px solid', borderColor: checked ? '#D4AF70' : '#D4C5B9', backgroundColor: checked ? '#D4AF70' : '#FFFFFF', color: checked ? '#FFFFFF' : 'transparent'}}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                            <div>
                              <p style={{fontSize: '12px', color: '#3E3E3E', fontWeight: 500}}>
                                Room {room.roomNumber}
                                {room.isCurrent ? <span style={{fontSize: '10px', color: '#A89B8B', marginLeft: '4px'}}>(Current)</span> : null}
                              </p>
                              <p style={{fontSize: '10px', color: '#A89B8B'}}>{roomType(room.roomType)} - {fmt(room.pricePerNight)}/night</p>
                            </div>
                          </div>
                          <span style={{fontSize: '10px', color: '#A89B8B'}}>Max {room.maxGuests}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p style={{fontSize: '11px', color: '#A89B8B'}}>
                    Selected {checkInRoomIds.length}/{checkInModal?.rooms.length || 0}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Address (Optional)</Label>
              <Input
                value={checkInAddress}
                onChange={e => setCheckInAddress(e.target.value)}
                placeholder="Guest address"
                style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              onClick={() => setCheckInModal(null)}
              disabled={checkInLoading}
              variant="outline"
              style={{flex: 1, border: '1px solid #D4C5B9', color: '#A89B8B', fontSize: '12px', height: '36px', backgroundColor: '#FFFFFF', borderRadius: '4px'}}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCheckIn}
              disabled={checkInLoading}
              style={{flex: 1, backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', border: 'none', fontWeight: 500, cursor: 'pointer'}}
              onMouseEnter={(e) => !checkInLoading && (e.currentTarget.style.backgroundColor = '#C9A24A')}
              onMouseLeave={(e) => !checkInLoading && (e.currentTarget.style.backgroundColor = '#D4AF70')}
            >
              {checkInLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Check-in Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Check-Out Dialog with Extra Expense ───────────────────────────── */}
      <Dialog open={checkOutModal !== null} onOpenChange={(open) => !open && setCheckOutModal(null)}>
        <DialogContent style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', maxWidth: '28rem', borderRadius: '8px'}}>
          <DialogHeader>
            <DialogTitle style={{color: '#3E3E3E', fontSize: '16px', fontWeight: 600}}>
              Check-out Guest — {checkOutModal?.bookingReference}
            </DialogTitle>
          </DialogHeader>

          {checkOutError && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{checkOutError}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '4px', display: 'block'}}>Guest Name</Label>
              <Input
                disabled
                value={checkOutModal?.guest?.fullName || ''}
                style={{backgroundColor: '#F5EAE0', border: '1px solid #D4C5B9', color: '#A89B8B', fontSize: '12px', height: '36px', borderRadius: '4px', paddingLeft: '8px'}}
              />
            </div>

            <div>
              <Label style={{fontSize: '12px', color: '#A89B8B', marginBottom: '12px', display: 'block'}}>Extra Expenses</Label>
              <div className="space-y-3">
                {/* Expense Options with Checkboxes */}
                {['travel', 'food', 'damage', 'others'].map((expense) => (
                  <div key={expense} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCheckOutExpenses(prev => {
                          const newExpenses = { ...prev };
                          if (expense in newExpenses) {
                            delete newExpenses[expense];
                          } else {
                            newExpenses[expense] = '';
                          }
                          return newExpenses;
                        });
                      }}
                      style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', borderRadius: '4px', padding: '8px 12px', border: '1px solid', borderColor: expense in checkOutExpenses ? '#D4AF70' : '#D4C5B9', backgroundColor: expense in checkOutExpenses ? '#FFF9E6' : '#FFFFFF', transition: 'all 0.2s', cursor: 'pointer'}}
                      onMouseEnter={(e) => !(expense in checkOutExpenses) && (e.currentTarget.style.borderColor = '#D4C5B9')}
                      onMouseLeave={(e) => !(expense in checkOutExpenses) && (e.currentTarget.style.borderColor = '#D4C5B9')}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          style={{display: 'inline-flex', height: '16px', width: '16px', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', border: '1px solid', borderColor: expense in checkOutExpenses ? '#D4AF70' : '#D4C5B9', backgroundColor: expense in checkOutExpenses ? '#D4AF70' : '#FFFFFF', color: expense in checkOutExpenses ? '#FFFFFF' : 'transparent'}}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span style={{fontSize: '12px', color: '#3E3E3E', fontWeight: 500, textTransform: 'capitalize'}}>{expense}</span>
                      </div>
                    </button>

                    {/* Show input fields for selected expenses */}
                    {expense in checkOutExpenses && (
                      <div className="ml-6 space-y-2">
                        {expense === 'others' && (
                          <Input
                            type="text"
                            placeholder="Describe the expense"
                            value={checkOutOthersDescription}
                            onChange={e => setCheckOutOthersDescription(e.target.value)}
                            style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px'}}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <span style={{fontSize: '12px', color: '#A89B8B'}}>₹</span>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="Amount"
                            value={checkOutExpenses[expense]}
                            onChange={e => setCheckOutExpenses(prev => ({ ...prev, [expense]: e.target.value }))}
                            style={{backgroundColor: '#FFFFFF', border: '1px solid #D4C5B9', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', outline: 'none', paddingLeft: '8px', flex: 1}}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#D4AF70'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#D4C5B9'}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Show total expenses */}
              {Object.keys(checkOutExpenses).filter(exp => checkOutExpenses[exp]).length > 0 && (
                <div style={{marginTop: '16px', padding: '12px', backgroundColor: '#FFF9E6', borderRadius: '4px', border: '1px solid #D4C5B9'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontSize: '12px', color: '#A89B8B'}}>Total Expenses</span>
                    <span style={{fontSize: '12px', fontWeight: 600, color: '#D4AF70'}}>
                      ₹{Object.keys(checkOutExpenses)
                        .filter(exp => checkOutExpenses[exp])
                        .reduce((sum, exp) => sum + (parseFloat(checkOutExpenses[exp]) || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              onClick={() => setCheckOutModal(null)}
              disabled={checkOutLoading}
              variant="outline"
              style={{flex: 1, border: '1px solid #D4C5B9', color: '#A89B8B', fontSize: '12px', height: '36px', backgroundColor: '#FFFFFF', borderRadius: '4px'}}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCheckOut}
              disabled={checkOutLoading}
              style={{flex: 1, backgroundColor: '#D4AF70', color: '#3E3E3E', fontSize: '12px', height: '36px', borderRadius: '4px', border: 'none', fontWeight: 500, cursor: 'pointer'}}
              onMouseEnter={(e) => !checkOutLoading && (e.currentTarget.style.backgroundColor = '#C9A24A')}
              onMouseLeave={(e) => !checkOutLoading && (e.currentTarget.style.backgroundColor = '#D4AF70')}
            >
              {checkOutLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Check-out Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bill Modal ───────────────────────────────────────────────── */}
      <Dialog open={billModal !== null} onOpenChange={(open) => {
        if (!open) {
          setBillModal(null)
          // Refresh bookings data when modal closes so check-out button is no longer available
          if (activeTab === 'bookings') {
            fetchBookings()
          } else if (activeTab === 'checkinout') {
            fetchToday()
          }
        }
      }}>
        <DialogContent className="bg-white border-gray-300" style={{ padding: '0px', maxHeight: '95vh', maxWidth: '800px', width: '100%', margin: 'auto' }}>
          <DialogHeader>
            <DialogTitle>Invoice - {billModal?.booking?.bookingReference || 'Loading...'}</DialogTitle>
            <DialogDescription>Guest invoice for {billModal?.booking?.guest?.fullName || 'Guest'}</DialogDescription>
          </DialogHeader>
          {billModal && (
            <InvoicePrintView bookingId={billModal.booking.id} />
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
