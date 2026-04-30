'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { KeyboardEvent } from 'react'
import { motion, useScroll, useTransform, useMotionTemplate, useMotionValue } from 'framer-motion'
import Image from 'next/image'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import Link from 'next/link'
import {
  Menu,
  X,
  Star,
  MapPin,
  Phone,
  Mail,
  Wifi,
  Car,
  ChevronDown,
  Users,
  CalendarDays,
  ArrowRight,
  Quote,
  Award,
  Shield,
  Bath,
  Sparkles,
  Loader2,
  Activity,
  Building,
  Smartphone,
  Home as HomeIcon,
  BookOpen,
  ImageIcon,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// ═════════════════════════════════════════════════════════════════════════════
// DATE RANGE PICKER COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

const rdpStyles = `
  .rdp-luxury {
    --rdp-accent-color: #C9A84C;
    --rdp-background-color: #FDF8EE;
    margin: 0;
    padding: 12px;
  }
  .rdp-luxury .rdp-day_selected {
    background-color: #6B3F2A !important;
    color: white !important;
    border-radius: 4px;
  }
  .rdp-luxury .rdp-day_range_middle {
    background-color: #FDF8EE !important;
    color: #1A1A1A !important;
    border-radius: 0 !important;
  }
  .rdp-luxury .rdp-day_range_start,
  .rdp-luxury .rdp-day_range_end {
    background-color: #6B3F2A !important;
    color: white !important;
    border-radius: 4px !important;
  }
  .rdp-luxury .rdp-day:hover:not([disabled]) {
    background-color: #FDF8EE;
    border-radius: 4px;
  }
  .rdp-luxury .rdp-caption_label {
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px;
    color: #6B3F2A;
    font-weight: 400;
  }
  .rdp-luxury .rdp-nav_button:hover {
    background-color: #FDF8EE;
  }
  .rdp-luxury .rdp-head_cell {
    font-size: 11px;
    font-weight: 500;
    color: #999;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .rdp-luxury .rdp-day {
    font-size: 13px;
    border-radius: 4px;
    transition: background 0.15s;
  }
`

function formatDisplayDate(d: Date | undefined): string {
  if (!d) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ')
}

function toISODate(d: Date | undefined): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const gallerySlides = [
  {
    key: 'Pickle-Ball Courts',
    image: '/pickleball.jpg',
    title: 'Pickle-Ball Courts',
    description: 'Experience the thrill of pickle-ball on our state-of-the-art courts, designed for both casual play and competitive matches.'
  },
  {
    key: 'RainDance Water Park',
    image: '/waterfall.jpg',
    title: 'RainDance Water Park',
    description: 'Dive into fun at RainDance Water Park, featuring exhilarating water showers for all ages.'
  },
  {
    key: 'woyage-daycations',
    image: '/entrance.jpg',
    title: 'WOYAGE - DAYCATIONS',
    description: 'Indulge in a day of luxury and relaxation at our beautiful resort.'
  },
  {
    key: 'fountain-show',
    image: '/fountain.png',
    title: 'FOUNTAIN - NIGHT SHOW',
    description: 'Watch water, lights, and music come alive in a dazzling fountain spectacle every evening.'
  },
  {
    key: 'aquarium-lounge',
    image: '/aquarium.png',
    title: 'AQUARIUM - MARINE LOUNGE',
    description: 'Step into an immersive underwater world where vibrant marine life turns every moment into wonder.'
  }
]

interface HeroDatePickerProps {
  checkIn: string | null
  checkOut: string | null
  onChangeCheckIn: (v: string | null) => void
  onChangeCheckOut: (v: string | null) => void
  labelStyle?: React.CSSProperties
  inputStyle?: React.CSSProperties
}

function HeroDateRangePicker({
  checkIn,
  checkOut,
  onChangeCheckIn,
  onChangeCheckOut,
  labelStyle,
  inputStyle
}: HeroDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const range: DateRange | undefined =
    checkIn || checkOut
      ? {
        from: checkIn ? new Date(checkIn + 'T00:00') : undefined,
        to: checkOut ? new Date(checkOut + 'T00:00') : undefined
      }
      : undefined

  const handleSelect = (r: DateRange | undefined) => {
    onChangeCheckIn(r?.from ? toISODate(r.from) : null)
    onChangeCheckOut(r?.to ? toISODate(r.to) : null)
    if (r?.from && r?.to) setOpen(false)
  }

  const updatePopoverPos = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spacing = 8
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

  // Close on outside click (checks both trigger and portal)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        triggerRef.current?.contains(t) ||
        portalRef.current?.contains(t)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

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

  const defaultLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-label)',
    fontSize: '10px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '8px',
    fontWeight: 500
  }

  const defaultInputStyle: React.CSSProperties = {
    background: 'transparent',
    color: 'white',
    fontFamily: 'var(--font-body)',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 0
  }

  const popover = (
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
        disabled={{ before: today }}
        className="rdp-luxury"
      />
    </div>
  )

  return (
    <>
      <style>{rdpStyles}</style>
      <div ref={triggerRef} className="col-span-2 grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Check-in display */}
        <div className="flex flex-col">
          <label style={{ ...defaultLabelStyle, ...labelStyle }}>CHECK-IN</label>
          <button
            type="button"
            onClick={handleOpen}
            className="px-3 sm:px-4 py-2 sm:py-3 text-sm focus:outline-none transition-all text-left"
            style={{ ...defaultInputStyle, ...inputStyle, cursor: 'pointer', minWidth: 0 }}
          >
            {checkIn
              ? formatDisplayDate(new Date(checkIn + 'T00:00'))
              : <span style={{ color: 'rgba(255,255,255,0.45)' }}>Select date</span>}
          </button>
        </div>

        {/* Check-out display */}
        <div className="flex flex-col">
          <label style={{ ...defaultLabelStyle, ...labelStyle }}>CHECK-OUT</label>
          <button
            type="button"
            onClick={handleOpen}
            className="px-3 sm:px-4 py-2 sm:py-3 text-sm focus:outline-none transition-all text-left"
            style={{ ...defaultInputStyle, ...inputStyle, cursor: 'pointer', minWidth: 0 }}
          >
            {checkOut
              ? formatDisplayDate(new Date(checkOut + 'T00:00'))
              : <span style={{ color: 'rgba(255,255,255,0.45)' }}>Select date</span>}
          </button>
        </div>
      </div>
      {open && mounted && createPortal(popover, document.body)}
    </>
  )
}

// Custom select for the hero bar — matches date picker style
function HeroSelect({
  label, value, onChange, options
}: {
  label: string
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

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label ?? String(value)

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-label)',
    fontSize: '10px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '8px',
    fontWeight: 500,
    display: 'block'
  }

  const portalContent = (
    <div
      ref={portalRef}
      style={{
        position: 'absolute',
        top: popoverPos.top,
        left: popoverPos.left,
        minWidth: popoverPos.width,
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
          className="w-full text-left px-4 py-2.5 text-sm transition-colors"
          style={{
            fontFamily: 'var(--font-body)',
            color: String(opt.value) === String(value) ? '#6B3F2A' : '#1A1A1A',
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
    <div className="flex flex-col" ref={triggerRef}>
      <label style={labelStyle}>{label}</label>
      <button
        type="button"
        onClick={handleOpen}
        className="px-3 sm:px-4 py-2 sm:py-3 text-sm text-left focus:outline-none transition-all"
        style={{
          background: 'transparent',
          color: 'white',
          fontFamily: 'var(--font-body)',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 0,
          cursor: 'pointer',
        }}
      >
        {selectedLabel}
      </button>
      {open && mounted && createPortal(portalContent, document.body)}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTACT FORM COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

function ContactFormComponent() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message. Please try again.')
      }

      setSuccessMessage(data.message || 'Your message has been sent successfully!')
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        subject: '',
        message: '',
      })

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to send. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div whileHover={{ y: -3 }}>
          <label className="luxury-text text-sm font-semibold mb-3 block text-primary">First Name</label>
          <Input
            placeholder="John"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            disabled={loading}
            required
            className="rounded-lg border-2 border-primary/20 focus:border-primary/50 transition-all"
          />
        </motion.div>
        <motion.div whileHover={{ y: -3 }}>
          <label className="luxury-text text-sm font-semibold mb-3 block text-primary">Last Name</label>
          <Input
            placeholder="Doe"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            disabled={loading}
            required
            className="rounded-lg border-2 border-primary/20 focus:border-primary/50 transition-all"
          />
        </motion.div>
      </div>
      <motion.div whileHover={{ y: -3 }}>
        <label className="luxury-text text-sm font-semibold mb-3 block text-primary">Email</label>
        <Input
          type="email"
          placeholder="john@example.com"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          disabled={loading}
          required
          className="rounded-lg border-2 border-primary/20 focus:border-primary/50 transition-all"
        />
      </motion.div>
      <motion.div whileHover={{ y: -3 }}>
        <label className="luxury-text text-sm font-semibold mb-3 block text-primary">Subject</label>
        <Input
          placeholder="Inquiry about reservation"
          name="subject"
          value={formData.subject}
          onChange={handleInputChange}
          disabled={loading}
          required
          className="rounded-lg border-2 border-primary/20 focus:border-primary/50 transition-all"
        />
      </motion.div>
      <motion.div whileHover={{ y: -3 }}>
        <label className="luxury-text text-sm font-semibold mb-3 block text-primary">Message</label>
        <Textarea
          placeholder="Tell us about your dream vacation..."
          name="message"
          value={formData.message}
          onChange={handleInputChange}
          disabled={loading}
          required
          rows={4}
          className="rounded-lg border-2 border-primary/20 focus:border-primary/50 transition-all"
        />
      </motion.div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm"
        >
          ✓ {successMessage}
        </motion.div>
      )}

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm"
        >
          ✕ {errorMessage}
        </motion.div>
      )}

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-lg font-bold rounded-lg hover:shadow-xl transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send Message
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </Button>
      </motion.div>
    </form>
  )
}

export default function Home() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [selectedAmenitiesRoom, setSelectedAmenitiesRoom] = useState<string | null>(null)
  const [carouselIndices, setCarouselIndices] = useState<{ [key: string]: number }>({})
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; duration: number; delay: number }>>([])

  // Google reviews state
  const [topReviews, setTopReviews] = useState<Array<any>>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  // Hero booking form state
  const [checkIn, setCheckIn] = useState<string | null>(null)
  const [checkOut, setCheckOut] = useState<string | null>(null)
  const [roomType, setRoomType] = useState<'premium' | 'premium_plus'>('premium')
  const [roomCount, setRoomCount] = useState<number>(1)
  const [galleryIndex, setGalleryIndex] = useState(1)

  const handleHeroSearch = () => {
    if (!checkIn || !checkOut) {
      if (typeof window !== 'undefined') window.alert('Please select check-in and check-out dates')
      return
    }
    const params = new URLSearchParams({
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      roomType: roomType,
      roomCount: roomCount.toString()
    })
    const reservationUrl = `/reservation?${params.toString()}`
    router.push(reservationUrl)
  }

  // Initialize particles on client side only to avoid hydration mismatch
  useEffect(() => {
    const generatedParticles = [...Array(8)].map((_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      duration: 3 + Math.random() * 2,
      delay: i * 0.2
    }))
    setParticles(generatedParticles)
  }, [])

  // Ensure hero video plays (autoplay policies may block play promise)
  const heroVideoRef = useRef<HTMLVideoElement | null>(null)
  const [heroAutoplayFailed, setHeroAutoplayFailed] = useState(false)
  const [heroIsPlaying, setHeroIsPlaying] = useState(false)
  const [heroError, setHeroError] = useState<string | null>(null)
  const [heroCanPlay, setHeroCanPlay] = useState(false)

  useEffect(() => {
    const v = heroVideoRef.current
    if (!v) return

    // Ensure muted (helps autoplay), then try to play and handle rejected promise
    v.muted = true
    const p = v.play()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        setHeroIsPlaying(true)
        // playing
      }).catch((err) => {
        // If autoplay is blocked, keep it muted and show a visual cue (could show play button)
        console.warn('Hero video autoplay was prevented:', err)
        setHeroAutoplayFailed(true)
        // attempt a second time after a short delay
        setTimeout(() => {
          try {
            v.muted = true
            v.play().catch(() => { })
          } catch (e) { }
        }, 500)
      })
    }

    // Fallback: hide loading screen after 3 seconds if video hasn't loaded
    const loadingTimeout = setTimeout(() => {
      setIsPageLoading(false)
    }, 3000)

    return () => clearTimeout(loadingTimeout)
  }, [])

  // Fetch Google reviews on mount
  useEffect(() => {
    const fetchGoogleReviews = async () => {
      try {
        setReviewsLoading(true)
        const response = await fetch('/api/reviews')
        const data = await response.json()

        // Get top 5 reviews sorted by rating (highest first) and then by date
        const top5 = (data.reviews || [])
          .sort((a: any, b: any) => {
            if (b.rating !== a.rating) {
              return b.rating - a.rating
            }
            return new Date(b.date).getTime() - new Date(a.date).getTime()
          })
          .slice(0, 5)

        setTopReviews(top5)
      } catch (error) {
        console.error('Error fetching reviews:', error)
        // Use hardcoded testimonials as fallback
        setTopReviews(testimonials)
      } finally {
        setReviewsLoading(false)
      }
    }

    fetchGoogleReviews()
  }, [])

  const getCarouselIndex = (roomName: string) => carouselIndices[roomName] || 0

  const nextImage = (roomName: string, totalImages: number) => {
    setCarouselIndices(prev => ({
      ...prev,
      [roomName]: ((prev[roomName] || 0) + 1) % totalImages
    }))
  }

  const prevImage = (roomName: string, totalImages: number) => {
    setCarouselIndices(prev => ({
      ...prev,
      [roomName]: ((prev[roomName] || 0) - 1 + totalImages) % totalImages
    }))
  }
  const slide = gallerySlides[galleryIndex]
  const goLeft = () => setGalleryIndex((i) => (i - 1 + gallerySlides.length) % gallerySlides.length)
  const goRight = () => setGalleryIndex((i) => (i + 1) % gallerySlides.length)

  const [activeSection, setActiveSection] = useState('home')
  const [shouldAnimateHome, setShouldAnimateHome] = useState(false)
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])

  // Magnetic cursor effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  const resortImages = {
    hero: "https://images.unsplash.com/photo-1589779677460-a15b5b5790ce?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjByZXNvcnR8ZW58MHx8fGJsdWV8MTc1NjU2NjU1NXww&ixlib=rb-4.1.0&q=85",
    villa: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjByZXNvcnR8ZW58MHx8fGJsdWV8MTc1NjU2NjU1NXww&ixlib=rb-4.1.0&q=85",
    pool: "https://images.unsplash.com/photo-1540541338287-41700207dee6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjByZXNvcnR8ZW58MHx8fGJsdWV8MTc1NjU2NjU1NXww&ixlib=rb-4.1.0&q=85",
    beach: "https://images.unsplash.com/photo-1589488276470-afc70b3c655f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxvY2VhbiUyMGhvdGVsfGVufDB8fHxibHVlfDE3NTY1NjY1NjJ8MA&ixlib=rb-4.1.0&q=85",
    pier: "https://images.unsplash.com/photo-1551598305-fe1be9fe579e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwzfHxvY2VhbiUyMGhvdGVsfGVufDB8fHxibHVlfDE3NTY1NjY1NjJ8MA&ixlib=rb-4.1.0&q=85",
    sunset: "https://images.unsplash.com/photo-1560996379-2a37cf3e7152?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHw0fHxvY2VhbiUyMGhvdGVsfGVufDB8fHxibHVlfDE3NTY1NjY1NjJ8MA&ixlib=rb-4.1.0&q=85"
  }

  const navigationItems = [
    { name: 'Home', href: '#home', icon: HomeIcon },
    { name: 'Story', href: '#story', icon: BookOpen },
    { name: 'Accommodations', href: '#accommodations', icon: Building },
    { name: 'Gallery', href: '#gallery', icon: ImageIcon },
    { name: 'Reviews', href: '#reviews', icon: Star },
    { name: 'Booking', href: '#booking', icon: CalendarDays },
    { name: 'Contact', href: '#contact', icon: MessageSquare }
  ]

  const accommodationTypes = [
    {
      name: 'Premium Room',
      description: 'Sophisticated rooms with modern amenities and garden or pool views',
      image: "/premium.jpg",
      images: ["/premium.jpg", "/bathroom.jpg", "/outside.jpg"],
      price: '₹6000/Night',
      bedType: 'King Bed',
      sqft: '45 sqm',
      maxGuests: '2',
      features: ['Pool View', 'King Bed', '45 sqm', 'Work Desk']
    },
    {
      name: 'Premium Plus Room',
      description: 'Comfortable studios perfect for couples seeking luxury and convenience',
      image: "/deluxe.jpg",
      images: ["/premium-plus.jpg", "/bathroom.jpg", "/outside.jpg"],
      price: '₹6500/Night',
      bedType: 'King Bed',
      sqft: '35 sqm',
      maxGuests: '2',
      features: ['Garden View', 'King Bed', '35 sqm', 'Work Desk']
    }
  ]

  const roomAmenities = {
    'Premium Room': ['32-Inch Smart TV', 'In-Room Refreshment Kit', 'Air Conditioning', 'Work Desk', 'High-Speed WiFi', 'Premium Toiletries','Rainfall Shower', 'Daily Housekeeping'],
    'Premium Plus Room': ['32-Inch Smart TV','In-Room Refreshment Kit','Air Conditioning','Work Desk','High-Speed WiFi', 'Premium Toiletries','Rainfall Shower','Daily Housekeeping','Premium Bedding','BathTub']
  }

  const testimonials = [
  {
    name: 'Arjun Mehta',
    location: 'Mumbai, India',
    rating: 5,
    text: 'Stayed in the Premium Plus Room for our anniversary and it exceeded every expectation. The room was spotless, staff were incredibly warm, and the whole experience felt very personal. Highly recommend MHOMES to anyone looking for a peaceful luxury getaway.',
    image: '/api/placeholder/60/60'
  },
  {
    name: 'Priya Subramaniam',
    location: 'Chennai, India',
    rating: 5,
    text: 'We booked two Premium Rooms for a family trip and the entire process from online booking to check-out was seamless. The rooms were spacious, well-maintained, and the team made sure every need was taken care of. Will definitely be coming back!',
    image: '/api/placeholder/60/60'
  },
  {
    name: 'Karthik Rajan',
    location: 'Coimbatore, India',
    rating: 5,
    text: 'MHOMES Resort is a hidden gem. The ambience is serene, the rooms are beautifully maintained, and the staff go out of their way to make you feel at home. Checked in for a weekend trip and honestly did not want to leave.',
    image: '/api/placeholder/60/60'
  },
  {
    name: 'Sneha & Vikram Nair',
    location: 'Bangalore, India',
    rating: 5,
    text: 'Chose MHOMES for our honeymoon and it was the best decision we made. The Premium Plus Room was stunning, the privacy was great, and the staff were so thoughtful — they even surprised us with a small decoration in the room. Perfect in every way.',
    image: '/api/placeholder/60/60'
  },
  {
    name: 'Deepa Krishnamurthy',
    location: 'Madurai, India',
    rating: 5,
    text: 'Attended a small family gathering here and the experience was wonderful. Booking multiple rooms was easy, the property is well-kept, and the overall vibe is calm and luxurious. Great value for the quality you get. Strongly recommend MHOMES Resort.',
    image: '/api/placeholder/60/60'
  }
];

  const amenities = [
    { icon: Wifi, name: 'High-Speed WiFi', description: 'Complimentary throughout resort' },
    { icon: Car, name: 'Parking', description: 'Private and secure parking' },
    { icon: Activity, name: 'Pickleball', description: 'Outdoor court available for engaging physical activities' },
    { icon: Bath, name: 'Kids Pool', description: 'A calm, cozy pool perfect for a refreshing dip.' },
    { icon: MapPin, name: 'Kallazhagar Perumal Temple', description: 'Nearby cultural landmark and religious attraction' }
  ]

  const storyData = [
    {
      word: 'Madurai',
      description: 'The ancient City of Temples, where thousands of years of history echo through sacred streets. Madurai inspires us to build a resort that honors tradition while embracing modern luxury. Every corner reflects the vibrant culture and warm hospitality that defines this legendary city.',
      image: '/Madurai.png'
    },
    {
      word: 'Meenakshi',
      description: 'Goddess of divine beauty and strength, Meenakshi Amman embodies grace, power, and eternal elegance. Her legendary temple stands as a testament to architectural brilliance and spiritual majesty. We draw inspiration from her legend to create unforgettable moments of transcendence and wonder for our guests.',
      image: '/Meenakshi.png'
    },
    {
      word: 'Meen',
      description: 'The fish, symbol of life, movement, and the boundless ocean that surrounds our paradise resort. Meen represents freedom, harmony with nature, and the gentle flow of luxury that permeates every experience. Our waters teem with life, just as our resort teems with unforgettable experiences.',
      image: '/fish.png'
    },
    {
      word: 'Meena',
      description: 'The "M" also stands for Meena - the heart of our family, whose love is the foundation of our family. Built on her land and shaped by her love, made this more than a place - a home.',
      image: '/MHOMES-logo.png'
    }
  ]


  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'story', 'accommodations', 'gallery', 'reviews', 'booking', 'contact']
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavigationClick = (href: string) => {
    if (href === '#home' && activeSection !== 'home') {
      setShouldAnimateHome(true)
      // Reset animation after a short delay
      setTimeout(() => setShouldAnimateHome(false), 100)
    }
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Loading Overlay - Minimal & Posh Design */}
      {isPageLoading && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-amber-50 via-amber-50 to-amber-50 flex items-center justify-center backdrop-blur-sm"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Subtle Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Subtle gradient orbs */}
            <motion.div
              className="absolute top-20 right-32 w-80 h-80 bg-gradient-to-br from-amber-200/8 to-transparent rounded-full blur-3xl"
              animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-20 left-32 w-80 h-80 bg-gradient-to-br from-amber-200/8 to-transparent rounded-full blur-3xl"
              animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Content Container */}
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center space-y-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Logo - Minimal with subtle glow */}
            <motion.div
              className="relative"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative">
                <Image
                  src="/MHOMES-logo.png"
                  alt="MHOMES Loading"
                  width={100}
                  height={100}
                  className="object-contain drop-shadow-lg"
                />
              </div>
            </motion.div>

            {/* Brand Name - Elegant Typography */}
            <motion.div
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <h2 className="luxury-heading text-4xl font-light tracking-widest text-amber-900">
                MHOMES
              </h2>
              <motion.div
                className="flex items-center justify-center gap-3"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="w-8 h-px bg-gradient-to-r from-transparent to-amber-600/40" />
                <p className="text-amber-700/70 text-xs font-light tracking-widest uppercase">Loading</p>
                <div className="w-8 h-px bg-gradient-to-l from-transparent to-amber-600/40" />
              </motion.div>
            </motion.div>

            {/* Minimal Progress Indicator */}
            <motion.div
              className="w-64 space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {/* Single elegant progress bar */}
              <div className="space-y-3">
                <div className="h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />

                <div className="relative h-1 bg-amber-200/40 rounded-full overflow-hidden border border-amber-300/40">
                  <motion.div
                    className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-amber-400/0 via-amber-600 to-amber-400/0 rounded-full blur-sm"
                    animate={{
                      left: ['0%', '100%']
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
              </div>
            </motion.div>

            {/* Subtle Status Text */}
            <motion.div
              className="text-center"
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <p className="text-amber-700/50 text-xs tracking-widest font-light uppercase">Premium Experience Loading</p>
            </motion.div>
          </motion.div>

          {/* Corner Accents - Minimal luxury touch */}
          <motion.div
            className="absolute top-0 left-0 w-12 h-12 border-t border-l border-amber-600/20"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-amber-600/20"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          />
        </motion.div>
      )}

      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: isPageLoading ? 1.2 : 0 }}
      >
        <div className="container mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
            <div>
              <Link href="#home" className="flex items-center space-x-3">
                <div className="flex items-center justify-center -my-6 relative top-2">
                  <Image
                    src="/MHOMES-logo.png"
                    alt="MHOMES Resort Logo"
                    width={160}
                    height={160}
                    priority
                    style={{ width: 'auto' }}
                    className="object-contain drop-shadow-lg"
                  />
                </div>
              </Link>
            </div>

            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => handleNavigationClick(item.href)}
                    className={`group relative px-3 py-1.5 transition-colors duration-200 ${activeSection === item.name.toLowerCase()
                      ? 'text-[#6B3F2A]'
                      : 'text-[#1A1A1A] hover:text-[#6B3F2A]'
                      }`}
                    style={{ fontFamily: 'var(--font-label)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}
                  >
                    <span className="inline-block">{item.name}</span>
                    <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-[#6B3F2A] transition-transform duration-300 origin-left ${activeSection === item.name.toLowerCase()
                      ? 'scale-x-100'
                      : 'scale-x-0 group-hover:scale-x-100'
                      }`} />
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Reserve now Button — desktop */}
            <motion.div
              className="hidden lg:flex items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="reservation">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-1.5 shadow-md transition-colors duration-200 rounded-lg" style={{ fontFamily: 'var(--font-label)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                  Reserve now
                </Button>
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="lg:hidden"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="border-primary/30 hover:border-primary/50 rounded-lg"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            className="lg:hidden glass-effect border-t border-border"
          >
            <div className="container mx-auto px-4 py-4 space-y-3">
              {navigationItems.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => handleNavigationClick(item.href)}
                    className="block luxury-text hover:text-primary transition-colors font-semibold py-2 px-3 rounded-lg hover:bg-primary/5"
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}
              {/* Mobile Reserve now button */}
              <div className="border-t border-primary/10 pt-3">
                <Link href="#booking" onClick={() => setIsMenuOpen(false)} className="w-full">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors duration-200">
                    Reserve now
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section with video background, persistent logo/title and booking form */}
      <section id="home" className="relative h-screen overflow-hidden bg-gradient-to-br from-black via-primary/15 to-background">
        {/* Animated gradient background */}
        <div className="absolute inset-0 opacity-40">
          <motion.div
            className="absolute top-0 -left-4 w-96 h-96 bg-accent blur-[100px] rounded-full"
            animate={{
              x: [0, 50, -30, 0],
              y: [0, -50, 30, 0]
            }}
            transition={{ duration: 20, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-96 h-96 bg-primary/30 blur-[100px] rounded-full"
            animate={{
              x: [0, -50, 30, 0],
              y: [0, 50, -30, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, delay: 2 }}
          />
        </div>

        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            ref={heroVideoRef}
            className="w-full h-full object-fill object-center"
            autoPlay
            loop
            playsInline
            preload="auto"
            poster={resortImages.hero}
            controls
            controlsList="nodownload"
            style={{ pointerEvents: 'auto' }}
            onCanPlay={() => {
              console.log('Hero video can play')
              setHeroCanPlay(true)
              setIsPageLoading(false)
              const v = heroVideoRef.current
              if (v && v.paused) {
                v.play().then(() => setHeroIsPlaying(true)).catch((e) => console.warn('play after canplay failed', e))
              }
            }}
            onError={(e) => {
              console.error('Hero video error', e)
              setHeroError('Video failed to load/encode. Falling back to remote source.')
              setHeroAutoplayFailed(true)
            }}
            onPlaying={() => {
              setHeroIsPlaying(true)
              setHeroAutoplayFailed(false)
              setHeroError(null)
            }}
          >
            <source src="/resort.mp4" type="video/mp4" />
            <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/70 pointer-events-none" />
        </div>

        {/* Play overlay (visible when autoplay fails or video is paused) */}
        {heroAutoplayFailed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto">
            <button
              onClick={async () => {
                const v = heroVideoRef.current
                if (!v) return
                try {
                  v.muted = true
                  await v.play()
                  setHeroAutoplayFailed(false)
                  setHeroIsPlaying(true)
                } catch (err) {
                  console.warn('Manual play failed', err)
                  setHeroError(String(err || 'play failed'))
                }
              }}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full p-4 backdrop-blur-md shadow-lg"
              aria-label="Play background video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                <path d="M5 3v18l15-9L5 3z" />
              </svg>
            </button>
          </div>
        )}

        {/* If there is a video error, show a small hint with retry */}
        {heroError && (
          <div className="absolute bottom-6 right-6 z-30">
            <div className="bg-white/10 glass-effect text-white px-4 py-2 rounded-lg">
              <div className="text-sm">{heroError}</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="rounded-lg" onClick={() => {
                  setHeroError(null)
                  setHeroAutoplayFailed(false)
                  const v = heroVideoRef.current
                  if (v) { v.load(); v.muted = true; v.play().catch(() => { }) }
                }}>Retry</Button>
              </div>
            </div>
          </div>
        )}


        {/* Main hero content (centered) */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center text-white px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="max-w-4xl mx-auto"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(48px, 7vw, 96px)',
                fontWeight: 400,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textAlign: 'center' as const,
                marginBottom: '16px'
              }}
            >
              A Sanctuary of <em style={{ fontStyle: 'italic', color: '#C9A84C' }}>Luxury</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(16px, 2vw, 20px)',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.02em',
                textAlign: 'center' as const,
                maxWidth: '560px',
                margin: '0 auto 40px',
                lineHeight: 1.7
              }}
            >
              Experience unparalleled luxury at MHOMES Resort, where every moment is crafted to perfection.
            </motion.p>

            {/* Booking form - SIMPLE & POSH VERSION */}
            <motion.div
              className="mt-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, type: "spring" }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '4px',
                  padding: '20px 28px'
                }}
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 items-end">
                  {/* Check-in / Check-out — unified date range picker */}
                  <HeroDateRangePicker
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onChangeCheckIn={setCheckIn}
                    onChangeCheckOut={setCheckOut}
                  />

                  {/* Room Type */}
                  <HeroSelect
                    label="ROOM TYPE"
                    value={roomType}
                    onChange={(v) => setRoomType(v as 'premium' | 'premium_plus')}
                    options={[
                      { value: 'premium', label: 'Premium' },
                      { value: 'premium_plus', label: 'Premium Plus' },
                    ]}
                  />

                  {/* Room Count */}
                  <HeroSelect
                    label="ROOMS"
                    value={roomCount}
                    onChange={(v) => setRoomCount(Number(v))}
                    options={[
                      { value: 1, label: '1 Room' },
                      { value: 2, label: '2 Rooms' },
                      { value: 3, label: '3 Rooms' },
                      { value: 4, label: '4 Rooms' },
                      { value: 5, label: '5 Rooms' },
                      { value: 6, label: '6 Rooms' },
                    ]}
                  />

                  {/* Search Button */}
                  <div className="col-span-3 sm:col-span-1">
                    <button
                      className="w-full transition-all hover:opacity-90"
                      style={{
                        background: '#6B3F2A',
                        color: 'white',
                        fontFamily: 'var(--font-label)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontSize: '13px',
                        borderRadius: '2px',
                        padding: '14px 32px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                      onClick={() => handleHeroSearch()}
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flex flex-col items-center gap-2">
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Scroll to explore</span>
                <ChevronDown className="w-6 h-6 text-accent" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Resort Overview */}
      <section className="py-20 bg-background relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-accent blur-[80px] rounded-full"
            animate={{ y: [0, 40, 0] }}
            transition={{ duration: 15, repeat: Infinity }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto mb-20"
          >
            <h2 className="luxury-heading mb-6" style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 400, letterSpacing: '-0.02em', color: '#1A1A1A' }}>
              Luxury Redefined
            </h2>
          </motion.div>

          {/* Premium Amenities Grid - Symmetric */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 px-4">
            {amenities.map((amenity) => (
              <div
                key={amenity.name}
                className="flex flex-col items-center text-center"
              >
                {/* Icon Container - Clean and Professional */}
                <div className="mb-8 flex items-center justify-center"
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(201, 168, 76, 0.06)',
                    border: '1.5px solid rgba(201, 168, 76, 0.12)'
                  }}>
                  <amenity.icon 
                    className="w-9 h-9" 
                    style={{ 
                      color: '#C9A84C', 
                      strokeWidth: 1.5
                    }} 
                  />
                </div>
                
                {/* Title - Professional Typography */}
                <h3 style={{ 
                  fontSize: '17px', 
                  fontWeight: 600, 
                  color: '#1A1A1A',
                  marginBottom: '10px',
                  fontFamily: 'Cormorant Garamond, serif',
                  letterSpacing: '0.03em',
                  lineHeight: 1.4
                }}>
                  {amenity.name}
                </h3>
                
                {/* Description - Elegant and Refined */}
                <p style={{
                  fontSize: '13px',
                  color: '#666666',
                  fontWeight: 400,
                  lineHeight: 1.7,
                  letterSpacing: '0.01em'
                }}>
                  {amenity.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section id="story" className="py-20 bg-gradient-to-b from-muted/30 via-background to-muted/50 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -ml-48 -mb-48" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto mb-20"
          >
            <h2 className="luxury-heading mb-6" style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 400, letterSpacing: '-0.02em', color: '#1A1A1A' }}>
              What does the M stand for?
            </h2>
            <p className="luxury-text text-muted-foreground" style={{ fontWeight: 300, fontSize: '16px', color: '#4A4A4A', lineHeight: 1.8, maxWidth: '600px', margin: '0 auto' }}>
              Discover the profound meaning behind MHOMES — a fusion of culture, mythology, nature, and visionary dreams.
            </p>
          </motion.div>

          <div className="space-y-20">
            {storyData.map((story, index) => (
              <motion.div
                key={story.word}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:grid-flow-dense' : ''
                  }`}
              >
                {/* Image with enhanced effects */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className={`relative h-96 rounded-3xl overflow-hidden shadow-2xl group ${index % 2 === 1 ? 'md:col-start-2 md:row-start-1' : ''
                    }`}
                >
                  <Image
                    src={story.image}
                    alt={story.word}
                    fill
                    sizes="(min-width: 768px) 45vw, 100vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 group-hover:from-accent/30 group-hover:via-transparent group-hover:to-accent/20 transition-all duration-500" />

                  {/* Floating badge */}
                  <motion.div
                    className="absolute top-6 right-6"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Badge className="bg-secondary text-white shadow-lg">{index + 1} of 4</Badge>
                  </motion.div>
                </motion.div>

                {/* Content with enhanced typography */}
                <motion.div
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={index % 2 === 1 ? 'md:col-start-1 md:row-start-1' : ''}
                >
                  <h3
                    className="luxury-heading mb-6"
                    style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 500, color: '#1A1A1A', letterSpacing: '-0.02em' }}
                  >
                    <em style={{ fontStyle: 'italic', color: '#C9A84C', marginRight: '0.05em', fontWeight: 600 }}>
                      {story.word.charAt(0)}
                    </em>
                    {story.word.slice(1)}
                  </h3>
                  <p className="luxury-text mb-8" style={{ fontWeight: 300, color: '#4A4A4A', fontSize: '16px', lineHeight: 1.8 }}>
                    {story.description}
                  </p>
                  <motion.div className="flex items-center gap-3" whileHover={{ x: 10 }}>
                    <div className="h-0.5 w-12 bg-[#C9A84C]" />
                    <span style={{ fontFamily: 'var(--font-label)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C' }}>A pillar of MHOMES</span>
                  </motion.div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center mt-20 max-w-3xl mx-auto"
          >
            <p className="luxury-text" style={{ fontWeight: 300, color: '#4A4A4A', fontSize: '16px', lineHeight: 1.8, maxWidth: '600px', margin: '0 auto' }}>
              These four pillars weave together the soul of <span style={{ color: '#C9A84C', fontWeight: 500 }}>MHOMES Resort</span> —
              where ancient cultural heritage meets contemporary luxury, where nature flows freely, and where dreams transform into unforgettable realities.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Accommodations */}
      <section id="accommodations" className="py-24 bg-gradient-to-b from-background via-muted/10 to-background relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <motion.div
            className="absolute bottom-0 right-10 w-96 h-96 bg-accent blur-[120px] rounded-full"
            animate={{ y: [0, -60, 0], x: [0, 30, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <h2 className="luxury-heading mb-6" style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 400, letterSpacing: '-0.02em', color: '#1A1A1A' }}>Exquisite Accommodations</h2>
            <p className="luxury-text" style={{ fontWeight: 300, fontSize: '16px', color: '#4A4A4A', lineHeight: 1.8, maxWidth: '600px', margin: '0 auto' }}>
              Discover your perfect sanctuary with thoughtfully designed rooms tailored to your every need.
            </p>
          </motion.div>

          <div className="space-y-20">
            {accommodationTypes.map((room, idx) => {
              const currentImageIdx = getCarouselIndex(room.name)
              const currentImage = room.images[currentImageIdx]

              return (
                <motion.div
                  key={room.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.2 }}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${idx % 2 === 1 ? 'lg:grid-flow-dense' : ''}`}
                >
                  {/* Image Carousel with enhanced effects */}
                  <motion.div className={idx % 2 === 1 ? 'lg:col-start-2 lg:row-start-1' : ''}>
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl h-96 group">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Image
                          src={currentImage}
                          alt={room.name}
                          fill
                          sizes="(min-width: 1024px) 45vw, 100vw"
                          className="object-cover transition-transform duration-700"
                        />
                      </motion.div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 group-hover:from-accent/20 group-hover:via-transparent group-hover:to-accent/10 transition-all duration-500" />

                      {/* Price Badge */}
                      <motion.div
                        className="absolute top-6 left-6"
                        whileHover={{ scale: 1.1, y: -5 }}
                      >
                        <Badge className="bg-gradient-to-r from-accent to-accent/80 text-white text-lg px-6 py-3 shadow-lg">{room.price}</Badge>
                      </motion.div>

                      {/* Carousel Controls */}
                      <button
                        onClick={() => prevImage(room.name, room.images.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-accent/80 text-white p-4 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-110"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => nextImage(room.name, room.images.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-accent/80 text-white p-4 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-110"
                      >
                        ›
                      </button>

                      {/* Carousel Indicators */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                        {room.images.map((_, i) => (
                          <motion.button
                            key={i}
                            onClick={() => setCarouselIndices(prev => ({ ...prev, [room.name]: i }))}
                            className={`rounded-full transition-all ${i === currentImageIdx ? 'bg-accent' : 'bg-white/40 hover:bg-white/60'}`}
                            animate={{
                              width: i === currentImageIdx ? 32 : 8,
                              height: 8
                            }}
                            whileHover={{ scale: 1.2 }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Room Details with enhanced interactions */}
                  <motion.div className={idx % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}>
                    <motion.div className="mb-8">
                      <motion.h3
                        className="luxury-heading mb-6"
                        style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 500, color: '#1A1A1A', letterSpacing: '-0.02em' }}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                      >
                        {room.name}
                      </motion.h3>
                      <p className="luxury-text" style={{ fontWeight: 300, fontSize: '16px', color: '#4A4A4A', lineHeight: 1.8 }}>{room.description}</p>
                    </motion.div>

                    {/* Room Specs with card effect */}
                    <motion.div
                      className="grid grid-cols-3 gap-6 mb-12 p-8 bg-gradient-to-br from-accent/10 via-transparent to-accent/5 rounded-2xl border border-accent/20 hover:border-accent/50 transition-all duration-300 shadow-lg"
                      whileHover={{ boxShadow: "0 0 30px rgba(var(--accent), 0.2)" }}
                    >
                      <motion.div className="text-center" whileHover={{ y: -5 }}>
                        <p className="luxury-text text-sm text-muted-foreground mb-2 font-semibold uppercase">Bed Type</p>
                        <p className="luxury-heading text-2xl text-primary">{room.bedType}</p>
                      </motion.div>
                      <div className="border-l border-r border-accent/20" />
                      <motion.div className="text-center" whileHover={{ y: -5 }}>
                        <p className="luxury-text text-sm text-muted-foreground mb-2 font-semibold uppercase">Size</p>
                        <p className="luxury-heading text-2xl text-primary">{room.sqft}</p>
                      </motion.div>
                      <div className="col-span-3 border-t border-accent/20 pt-6 flex justify-center">
                        <motion.div className="text-center" whileHover={{ y: -5 }}>
                          <p className="luxury-text text-sm text-muted-foreground mb-2 font-semibold uppercase">Max Guests</p>
                          <p className="luxury-heading text-2xl text-primary">{room.maxGuests} <Users className="inline-block w-5 h-5 ml-1" /></p>
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Buttons with enhanced interactions */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <motion.div
                        className="flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Link href="/reservation" className="w-full">
                          <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-xl px-12 py-4 text-lg rounded-lg font-semibold transition-all duration-200">
                            Reserve now
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </Button>
                        </Link>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          size="lg"
                          variant="outline"
                          className="border-2 border-primary text-primary hover:bg-primary/5 px-12 py-4 text-lg rounded-lg font-semibold"
                          onClick={() => setSelectedAmenitiesRoom(room.name)}
                        >
                          View Amenities
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Amenities Modal */}
      {selectedAmenitiesRoom && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-gradient-to-br from-white/98 to-white/95 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto border-2 border-accent/20"
          >
            <motion.div
              className="sticky top-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-8 border-b border-accent/20 flex items-center justify-between backdrop-blur-md"
              initial={{ y: -50 }}
              animate={{ y: 0 }}
            >
              <motion.h2
                className="luxury-heading text-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
                initial={{ x: -30 }}
                animate={{ x: 0 }}
              >
                {selectedAmenitiesRoom}
              </motion.h2>
              <motion.button
                onClick={() => setSelectedAmenitiesRoom(null)}
                className="text-3xl text-muted-foreground hover:text-accent hover:bg-accent/10 w-12 h-12 rounded-full flex items-center justify-center transition-all"
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </motion.div>

            <div className="p-10">
              <h3 className="luxury-heading text-3xl mb-10 text-primary">Premium Amenities & Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {roomAmenities[selectedAmenitiesRoom as keyof typeof roomAmenities]?.map((amenity, i) => (
                  <motion.div
                    key={`${amenity}-${i}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ x: 10, boxShadow: "0 10px 30px rgba(var(--accent), 0.2)" }}
                    className="flex items-center gap-4 p-5 bg-gradient-to-r from-accent/5 to-transparent rounded-xl border-2 border-accent/20 hover:border-accent/50 transition-all duration-300 group cursor-pointer"
                  >
                    <motion.div
                      className="w-4 h-4 bg-gradient-to-br from-accent to-accent/60 rounded-full flex-shrink-0"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                    />
                    <span className="luxury-text text-lg group-hover:text-accent transition-colors font-semibold">{amenity}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              className="sticky bottom-0 bg-gradient-to-t from-background to-background/80 p-8 flex justify-end gap-4 border-t-2 border-accent/20 backdrop-blur-md"
              initial={{ y: 50 }}
              animate={{ y: 0 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  onClick={() => setSelectedAmenitiesRoom(null)}
                  className="border-2 border-primary text-primary hover:bg-primary/5 px-8 py-3 text-lg font-semibold rounded-lg"
                >
                  Close
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold rounded-lg hover:shadow-xl transition-all"
                >
                  Book This Room
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}      {/* Dining and Experiences sections removed per request. */}

      {/* Gallery Preview - Carousel Style */}
      <section id="gallery" className="py-24 bg-gradient-to-b from-muted/30 via-background to-muted/30 relative overflow-hidden">
        <div className="absolute top-20 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -mr-40" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -ml-40" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <h2
              className="luxury-heading mb-6"
              style={{
                fontSize: 'clamp(32px, 4vw, 56px)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: '#1A1A1A',
              }}
            >
              Picture Perfect Moments
            </h2>
            <p
              className="luxury-text"
              style={{
                fontWeight: 300,
                fontSize: '16px',
                color: '#4A4A4A',
                lineHeight: 1.8,
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              Explore the breathtaking beauty of MHOMES Resort through our curated gallery of stunning imagery.
            </p>
          </motion.div>

          <div className="relative flex flex-col items-center justify-center min-h-[600px] md:min-h-[650px]">
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[480px] md:w-[80vw] md:h-[600px] rounded-3xl overflow-hidden z-0"
              layoutId="gallery-bg"
              transition={{ duration: 0.5 }}
            >
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover w-full h-full scale-110 blur-[3px]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-white/50" />
            </motion.div>

            <div className="relative z-10 flex w-full items-center justify-center">
              <motion.button
                aria-label="Previous"
                onClick={goLeft}
                whileHover={{ scale: 1.1, x: -10 }}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center justify-center w-8 md:w-16 h-64 md:h-96 group bg-transparent border-none focus:outline-none"
              >
                <motion.span
                  className="w-8 md:w-12 h-8 md:h-12 flex items-center justify-center rounded-full border-2 border-primary/40 bg-white/40 group-hover:bg-accent/80 transition-colors shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.15 }}
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-primary group-hover:text-white transition-colors"><line x1="15" y1="6" x2="9" y2="12" /><line x1="9" y1="12" x2="15" y2="18" /></svg>
                </motion.span>
              </motion.button>

              <motion.div className="w-full max-w-2xl mx-4" layoutId="gallery-card">
                <div className="relative flex flex-col items-center justify-end h-[420px] md:h-[500px]">
                  <motion.div
                    className="absolute left-1/2 top-0 -translate-x-1/2 w-[90%] h-[70%] rounded-3xl overflow-hidden shadow-2xl"
                    layoutId="gallery-image"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300" />
                  </motion.div>

                  <motion.div
                    className="relative z-10 w-full bg-gradient-to-br from-white/98 to-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl px-4 sm:px-6 md:px-8 py-3 sm:py-5 md:py-8 flex flex-col items-center justify-center shadow-2xl min-h-fit md:min-h-[160px] border border-accent/20"
                    layoutId="gallery-text"
                    whileHover={{ boxShadow: '0 20px 60px rgba(var(--accent), 0.3)' }}
                  >
                    <motion.h3
                      className="luxury-heading text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-2 sm:mb-3 text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {slide.title}
                    </motion.h3>
                    <motion.p
                      className="luxury-text text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-0 sm:mb-5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {slide.description}
                    </motion.p>
                  </motion.div>
                </div>
              </motion.div>

              <motion.button
                aria-label="Next"
                onClick={goRight}
                whileHover={{ scale: 1.1, x: 10 }}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center justify-center w-8 md:w-16 h-64 md:h-96 group bg-transparent border-none focus:outline-none"
              >
                <motion.span
                  className="w-8 md:w-12 h-8 md:h-12 flex items-center justify-center rounded-full border-2 border-primary/40 bg-white/40 group-hover:bg-accent/80 transition-colors shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.15 }}
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-primary group-hover:text-white transition-colors"><line x1="9" y1="6" x2="15" y2="12" /><line x1="15" y1="12" x2="9" y2="18" /></svg>
                </motion.span>
              </motion.button>
            </div>

            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-3 mt-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {gallerySlides.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => setGalleryIndex(i)}
                  className={`rounded-full transition-all ${i === galleryIndex ? 'bg-accent' : 'bg-accent/30 hover:bg-accent/60'}`}
                  animate={{
                    width: i === galleryIndex ? 32 : 8,
                    height: 8,
                  }}
                  whileHover={{ scale: 1.2 }}
                />
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="reviews" className="py-24 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <motion.div
            className="absolute top-0 right-20 w-96 h-96 bg-accent/20 blur-[100px] rounded-full"
            animate={{ y: [0, 60, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <h2
              className="luxury-heading mb-6"
              style={{
                fontSize: 'clamp(32px, 4vw, 56px)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: '#1A1A1A',
              }}
            >
              Guest Testimonials
            </h2>
            <p
              className="luxury-text"
              style={{
                fontWeight: 300,
                fontSize: '16px',
                color: '#4A4A4A',
                lineHeight: 1.8,
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              Discover what our guests are saying about their extraordinary experiences at MHOMES Resort.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(reviewsLoading ? testimonials : topReviews).map((testimonial, index) => (
              <motion.div
                key={testimonial.name || index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                whileHover={{ y: -6, boxShadow: '0 14px 40px rgba(var(--accent), 0.16)' }}
                className="h-full"
              >
                <Card className="luxury-card h-full bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 hover:border-accent/50 transition-all duration-300 backdrop-blur-sm">
                  <CardContent className="pt-6 pb-6 px-6">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      whileInView={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                    >
                      <Quote className="w-7 h-7 text-accent mb-4" />
                    </motion.div>
                    <p className="luxury-text mb-5 text-[15px] leading-7 italic">
                      "{testimonial.text.length > 170 ? `${testimonial.text.slice(0, 170).trimEnd()}...` : testimonial.text}"
                    </p>
                    <div className="flex items-center gap-1.5 mb-5">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                        </motion.div>
                      ))}
                    </div>
                    <motion.div className="flex items-center gap-3" whileHover={{ x: 5 }}>
                      <motion.div className="h-11 min-w-11 rounded-full border border-[#D9C7A2] bg-[linear-gradient(180deg,#FFFDF8,#F7F1E5)] text-[#4B3428] shadow-[0_2px_8px_rgba(90,55,40,0.12)] flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full border border-[#C9B692] bg-white flex items-center justify-center">
                          <span className="text-[10px] font-semibold" style={{ fontFamily: 'var(--font-label)', letterSpacing: '0.08em' }}>
                            {testimonial.name
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part: string) => part[0])
                              .join('')
                              .toUpperCase()}
                          </span>
                        </div>
                      </motion.div>
                      <div>
                        <p className="luxury-heading text-sm font-semibold text-[#3A271F]">{testimonial.name}</p>
                        <p className="luxury-text text-xs text-[#6A594F] flex items-center gap-1"><MapPin className="w-3 h-3" /> {testimonial.location}</p>
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/reviews">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-3 rounded-lg font-semibold shadow-xl hover:shadow-2xl transition-all">
                  Read All Reviews
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="booking" className="py-24 bg-gradient-to-br from-primary/5 via-background to-accent/10 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl mx-auto text-center"
          >
            <h2
              className="luxury-heading mb-5"
              style={{
                fontSize: 'clamp(32px, 4vw, 56px)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: '#1A1A1A',
              }}
            >
              Plan Your Stay
            </h2>

            <p
              className="luxury-text mb-12"
              style={{
                fontWeight: 300,
                fontSize: '16px',
                color: '#4A4A4A',
                lineHeight: 1.8,
                maxWidth: '680px',
                margin: '0 auto 48px',
              }}
            >
              Fill in your stay details and move to reservation in one smooth flow designed for a premium booking experience.
            </p>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative max-w-4xl mx-auto"
            >
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[#FDF8EE]/95 shadow-[0_30px_80px_rgba(107,63,42,0.16)] backdrop-blur-xl">
                <div className="flex items-center gap-2 border-b border-[#E8E4DC] bg-white/70 px-6 py-4">
                  <span className="h-3 w-3 rounded-full bg-[#E6BDB0]" />
                  <span className="h-3 w-3 rounded-full bg-[#E7C97E]" />
                  <span className="h-3 w-3 rounded-full bg-[#B8D5B9]" />
                </div>

                <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative h-[360px] overflow-hidden lg:h-full">
                    <Image
                      src="/premium-plus.jpg"
                      alt="Premium Plus room"
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-left text-white sm:p-8">
                      <p className="luxury-label mb-2 text-[10px] tracking-[0.3em] text-white/80">MHOMES RESORT</p>
                      <h3 className="luxury-heading text-3xl font-medium text-white sm:text-4xl">Premium Plus Room</h3>
                      <p className="mt-2 text-sm text-white/80 sm:text-base">Garden view suite with elegant interiors and breakfast included.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 bg-white px-6 py-7 text-left sm:px-8 sm:py-8">
                    <div>
                      <div className="flex items-start gap-4">
                        <div>
                          <p className="luxury-label mb-2 text-[10px] tracking-[0.28em] text-[#8A786E]">BOOKING FORM</p>
                          <h4 className="luxury-heading text-2xl font-medium text-[#1A1A1A]">Enter your stay details</h4>
                        </div>
                      </div>

                      <div className="mt-8 space-y-4">
                        <div className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F2] px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="luxury-label mb-1 text-[10px] tracking-[0.24em] text-[#8A786E]">CHECK-IN</p>
                              <p className="text-base font-semibold text-[#1A1A1A]">23 Apr 2026</p>
                            </div>
                            <CalendarDays className="h-5 w-5 text-[#C9A84C]" />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F2] px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="luxury-label mb-1 text-[10px] tracking-[0.24em] text-[#8A786E]">CHECK-OUT</p>
                              <p className="text-base font-semibold text-[#1A1A1A]">26 Apr 2026</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-[#C9A84C]" />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F2] px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="luxury-label mb-1 text-[10px] tracking-[0.24em] text-[#8A786E]">GUESTS</p>
                              <p className="text-base font-semibold text-[#1A1A1A]">2 adults • 1 room</p>
                            </div>
                            <Users className="h-5 w-5 text-[#C9A84C]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              className="mt-10"
            >
              <Link href="/reservation">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-base font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all inline-flex items-center gap-2"
                >
                  Book Now
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="contact" className="py-24 bg-gradient-to-b from-background via-muted/10 to-background relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -ml-48 -mt-48" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mb-48" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <h2
              className="luxury-heading mb-6"
              style={{
                fontSize: 'clamp(32px, 4vw, 56px)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: '#1A1A1A',
              }}
            >
              Get in Touch
            </h2>
            <p
              className="luxury-text"
              style={{
                fontWeight: 300,
                fontSize: '16px',
                color: '#4A4A4A',
                lineHeight: 1.8,
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              Ready to experience paradise? Contact us to plan your perfect getaway or learn more about our luxury offerings.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-12">
              <div>
                <h3 className="luxury-heading text-3xl mb-8 text-primary">Contact Information</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-6 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-to-br group-hover:from-accent group-hover:to-accent/60 transition-all duration-300 mt-1">
                      <MapPin className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="luxury-heading font-bold text-lg text-primary mb-1">Resort Address</p>
                      <p className="luxury-text text-muted-foreground text-lg">62/7, Poigaikaraipatti, Alagarkoil Road, Madurai-625301</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-6 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-to-br group-hover:from-accent group-hover:to-accent/60 transition-all duration-300 mt-1">
                      <Phone className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="luxury-heading font-bold text-lg text-primary mb-1">Phone</p>
                      <p className="luxury-text text-muted-foreground text-lg">+91-9677943053</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-6 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-to-br group-hover:from-accent group-hover:to-accent/60 transition-all duration-300 mt-1">
                      <Mail className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="luxury-heading font-bold text-lg text-primary mb-1">Email</p>
                      <p className="luxury-text text-muted-foreground text-lg">contact-us@mhomes.co.in</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <Card className="luxury-card border-2 border-accent/20 hover:border-accent/50 transition-all duration-300 bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-sm shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-t-lg">
                  <CardTitle className="luxury-heading text-2xl text-primary">Send us a Message</CardTitle>
                  <CardDescription className="text-base">
                    We'll get back to you within 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <ContactFormComponent />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="bg-primary text-white relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary to-primary/95 opacity-90" />

        <div className="relative z-10 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 py-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="-mt-16 -ml-6">
              <Image
                src="/MHOMES-logo.png"
                alt="MHOMES Resort"
                width={160}
                height={160}
                className="h-40 w-auto -mb-6 object-contain"
              />
              <p className="luxury-text text-white/80 text-sm leading-relaxed mb-6 pl-8">
                Experience luxury redefined in the heart of Madurai. Premium accommodations designed for unforgettable memories.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <h3 className="luxury-heading text-lg font-bold text-white mb-8 uppercase tracking-wider">Explore</h3>
              <nav className="space-y-4 flex flex-col">
                {[
                  { name: 'Home', href: '/#home' },
                  { name: 'About Us', href: '/#story' },
                  { name: 'Rooms', href: '/#accommodations' },
                  { name: 'Gallery', href: '/#gallery' },
                  { name: 'Guest Reviews', href: '/reviews' },
                ].map((link) => (
                  <Link key={link.name} href={link.href} className="luxury-text text-white/80 hover:text-accent text-sm font-medium transition-colors duration-300 block">
                    {link.name}
                  </Link>
                ))}
              </nav>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <h3 className="luxury-heading text-lg font-bold text-white mb-8 uppercase tracking-wider">Services</h3>
              <nav className="space-y-4 flex flex-col">
                {[
                  { name: 'Book Now', href: '/reservation' },
                  { name: 'Contact Us', href: '/#contact' },
                  { name: 'Terms & Conditions', href: '/terms-conditions' },
                  { name: 'Room Types', href: '/#accommodations' },
                ].map((link) => (
                  <Link key={link.name} href={link.href} className="luxury-text text-white/80 hover:text-accent text-sm font-medium transition-colors duration-300 block">
                    {link.name}
                  </Link>
                ))}
              </nav>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <h3 className="luxury-heading text-lg font-bold text-white mb-8 uppercase tracking-wider">Contact</h3>
              <div className="space-y-6">
                <div>
                  <p className="luxury-text text-white/70 text-xs uppercase tracking-wide mb-2">Address</p>
                  <p className="luxury-heading text-white text-sm font-medium">62/7, Poigaikaraipatti, Alagarkoil Road, Madurai-625301</p>
                </div>

                <div>
                  <p className="luxury-text text-white/70 text-xs uppercase tracking-wide mb-2">Phone</p>
                  <a href="tel:+919677943053" className="luxury-heading text-accent hover:text-accent/80 text-sm font-medium transition-colors">
                    +91 9677 943053
                  </a>
                </div>

                <div>
                  <p className="luxury-text text-white/70 text-xs uppercase tracking-wide mb-2">Email</p>
                  <a href="mailto:contact-us@mhomes.co.in" className="luxury-heading text-accent hover:text-accent/80 text-sm font-medium transition-colors break-all">
                    contact-us@mhomes.co.in
                  </a>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="h-px bg-white/15" />

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }} className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex gap-6 flex-wrap justify-center">
                <Link href="/terms-conditions" className="luxury-text text-white/70 hover:text-accent text-xs font-medium transition-colors">Terms & Conditions</Link>
                <span className="text-white/20">•</span>
                <Link href="/sitemap" className="luxury-text text-white/70 hover:text-accent text-xs font-medium transition-colors">Sitemap</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}