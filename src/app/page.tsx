'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { KeyboardEvent } from 'react'
import { motion, useScroll, useTransform, useMotionTemplate, useMotionValue } from 'framer-motion'
import Image from 'next/image'
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
  ArrowRight,
  Quote,
  Award,
  Shield,
  Bath,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ChatWidget  from '@/components/ChatWidget'
import { Separator } from '@/components/ui/separator'

export default function MHomesResort() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
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
            v.play().catch(() => {})
          } catch (e) {}
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
        // Use fallback reviews on error
        setTopReviews([
          {
            name: 'Sarah Johnson',
            location: 'New York, USA',
            rating: 5,
            text: 'Absolutely magical experience! The overwater villa was beyond our dreams, and the service was impeccable. Can\'t wait to return!',
          },
          {
            name: 'Marco Rodriguez',
            location: 'Madrid, Spain',
            rating: 5,
            text: 'The perfect honeymoon destination. Every detail was carefully planned, from the private beach dinner to the couples spa treatments.',
          },
          {
            name: 'Emily Chen',
            location: 'Singapore',
            rating: 5,
            text: 'Luxury redefined. The attention to detail and personalized service made our anniversary celebration truly unforgettable.',
          }
        ])
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
    { name: 'Home', href: '#home', icon: '🏠' },
    { name: 'Story', href: '#story', icon: '📖' },
    { name: 'Accommodations', href: '#accommodations', icon: '🏨' },
    { name: 'Gallery', href: '#gallery', icon: '📸' },
    { name: 'Reviews', href: '#reviews', icon: '⭐' },
    { name: 'Booking', href: '#booking', icon: '📅' },
    { name: 'Contact', href: '#contact', icon: '📞' }
  ]

  const accommodationTypes = [
    {
      name: 'Premium Room',
      description: 'Sophisticated rooms with modern amenities and garden or pool views',
      image: "/premium.jpg",
      images: ["/premium.jpg","/bathroom.jpg","/outside.jpg"],
      price: '$450',
      bedType: 'Queen Bed',
      sqft: '45 sqm',
      maxGuests: '2',
      features: ['Pool View', 'Queen Bed', '45 sqm', 'Mini Bar']
    },
    {
      name: 'Deluxe Studio',
      description: 'Comfortable studios perfect for couples seeking luxury and convenience',
      image: "/deluxe.jpg",
      images: ["/deluxe.jpg","/bathroom.jpg","/outside.jpg"],
      price: '$320',
      bedType: 'Double Bed',
      sqft: '35 sqm',
      maxGuests: '2',
      features: ['Garden View', 'Double Bed', '35 sqm', 'Work Desk']
    }
  ]

  const roomAmenities = {
    'Premium Room': ['42-inch Smart TV', 'Premium Bedding', 'Rainfall Shower', 'Air Conditioning', 'Mini Bar', 'Work Desk', 'High-Speed WiFi', 'Flat-screen TV', 'Bath Robes', 'Premium Toiletries', 'Nespresso Machine', 'Safe Deposit Box', 'Turn-down Service', 'Daily Housekeeping'],
    'Deluxe Studio': ['32-inch Smart TV', 'Luxury Bedding', 'Modern Bathroom', 'Climate Control', 'Kitchenette', 'Dining Area', 'High-Speed WiFi', 'Seating Area', 'Premium Toiletries', 'Walk-in Shower', 'Free Coffee Maker', 'Digital Lock', 'Express Check-in', 'Daily Cleaning']
  }

  const testimonials = [
    {
      name: 'Sarah Johnson',
      location: 'New York, USA',
      rating: 5,
      text: 'Absolutely magical experience! The overwater villa was beyond our dreams, and the service was impeccable. Can\'t wait to return!',
      image: '/api/placeholder/60/60'
    },
    {
      name: 'Marco Rodriguez',
      location: 'Madrid, Spain',
      rating: 5,
      text: 'The perfect honeymoon destination. Every detail was carefully planned, from the private beach dinner to the couples spa treatments.',
      image: '/api/placeholder/60/60'
    },
    {
      name: 'Emily Chen',
      location: 'Singapore',
      rating: 5,
      text: 'Luxury redefined. The attention to detail and personalized service made our anniversary celebration truly unforgettable.',
      image: '/api/placeholder/60/60'
    }
  ]

  const amenities = [
    { icon: Wifi, name: 'High-Speed WiFi', description: 'Complimentary throughout resort' },
    { icon: Car, name: 'Valet Parking', description: 'Secure parking with valet service' },
    { icon: Users, name: 'Pickleball', description: 'Outdoor court available for engaging physical activities' },
    { icon: Bath, name: 'Swimming Pool', description: 'A calm, cozy pool perfect for a refreshing dip.' },
    { icon: MapPin, name: 'Arulmigu Kallazhagar Sundararaja Perumal Temple', description: 'Nearby cultural landmark and local temples' }
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
      description: 'The fish, symbol of life, movement, and the boundless ocean that surrounds our paradise resort. Meen represents freedom, harmony with nature, and the gentle flow of luxury that permeates every experience. Our waters teem with life, just as our resort teems with unforgettable adventures.',
      image: '/fish.png'
    },
    {
      word: 'Meena',
      description: 'Our visionary founder whose passion and dreams transformed an island into a sanctuary of luxury and wonder. Meena\'s dedication to excellence and unwavering commitment to guest happiness is woven into the very fabric of MHomes Resort. Her legacy is every smile, every memory, and every magical moment our guests experience.',
      image: '/logo.png'
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
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center backdrop-blur-sm"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Subtle Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Subtle gradient orbs */}
            <motion.div
              className="absolute top-20 right-32 w-80 h-80 bg-gradient-to-br from-orange-300/8 to-transparent rounded-full blur-3xl"
              animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-20 left-32 w-80 h-80 bg-gradient-to-br from-blue-200/8 to-transparent rounded-full blur-3xl"
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
                  src="/mhomes-logo.png"
                  alt="MHomes Loading"
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
                mhomes
              </h2>
              <motion.div
                className="flex items-center justify-center gap-3"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="w-8 h-px bg-gradient-to-r from-transparent to-orange-500/40" />
                <p className="text-orange-600/70 text-xs font-light tracking-widest uppercase">Loading</p>
                <div className="w-8 h-px bg-gradient-to-l from-transparent to-orange-500/40" />
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
                    className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-orange-400/0 via-orange-500 to-orange-400/0 rounded-full blur-sm"
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
            className="absolute top-0 left-0 w-12 h-12 border-t border-l border-amber-400/20"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-amber-400/20"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          />
        </motion.div>
      )}

      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-accent/20"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: isPageLoading ? 1.2 : 0 }}
      >
        <div className="container mx-auto px-4 py-1.5">
          <div className="flex items-center justify-between">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="#home" className="flex items-center space-x-3 group">
                <motion.div 
                  className="flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-110 -my-2"
                  animate={shouldAnimateHome ? { rotate: [0, 360] } : {}}
                  transition={shouldAnimateHome ? { duration: 0.6, ease: "easeInOut" } : {}}
                  whileHover={{ rotate: 360 }}
                >
                  <Image
                    src="/mhomes-logo.png"
                    alt="MHomes Resort Logo"
                    width={180}
                    height={180}
                    priority
                    style={{ width: 'auto' }}
                    className="object-contain drop-shadow-lg"
                  />
                </motion.div>
              </Link>
            </motion.div>

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
                    className={`luxury-text px-4 py-2 rounded-lg transition-all duration-200 text-sm font-semibold ${
                      activeSection === item.name.toLowerCase() 
                        ? 'text-accent bg-accent/10 border border-accent/30' 
                        : 'text-foreground hover:text-accent hover:bg-accent/5'
                    }`}
                  >
                    <motion.span
                      whileHover={{ scale: 1.1 }}
                      className="inline-block"
                    >
                      {item.name}
                    </motion.span>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Book Now Button — desktop */}
            <motion.div
              className="hidden lg:flex items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="#booking">
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm px-6 rounded-full shadow-md">
                  Book Now
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
                className="border-accent/30 hover:border-accent/50"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            className="lg:hidden glass-effect border-t border-accent/20"
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
                    className="block luxury-text hover:text-accent transition-colors font-semibold py-2 px-3 rounded-lg hover:bg-accent/5"
                  >
                    <span className="mr-2 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                </motion.div>
              ))}
              {/* Mobile Book Now button */}
              <div className="border-t border-accent/10 pt-3">
                <Link href="#booking" onClick={() => setIsMenuOpen(false)} className="w-full">
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-full">
                    📅 Book Now
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section with video background, persistent logo/title and booking form */}
      <section id="home" className="relative h-screen overflow-hidden bg-gradient-to-br from-black via-primary/10 to-background">
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
                  <Button size="sm" onClick={() => {
                    setHeroError(null)
                    setHeroAutoplayFailed(false)
                    const v = heroVideoRef.current
                    if (v) { v.load(); v.muted = true; v.play().catch(()=>{}) }
                  }}>Retry</Button>
                </div>
              </div>
            </div>
          )}
        

        {/* Persistent header overlay inside hero (logo + name) */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-4 bg-white/10 glass-effect rounded-full px-4 py-2 backdrop-blur-sm pointer-events-auto">
            <Image src="/mhomes-logo.png" alt="MHomes" width={64} height={64} style={{ width: 'auto' }} className="object-contain" />
            <div className="text-white text-center">
              <div className="luxury-heading text-2xl md:text-3xl mhomes-brown">mhomes</div>
              <div className="luxury-text text-sm text-white/90 -mt-1">An Immortal Paradise by the Sea</div>
            </div>
          </div>
        </div>

        {/* Main hero content (centered) */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center text-white px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="max-w-4xl mx-auto"
          >
            {/* Floating accent line */}
            <motion.div
              className="flex justify-center mb-8"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-accent to-transparent rounded-full" />
            </motion.div>

            <motion.h1
              className="luxury-heading text-7xl md:text-8xl lg:text-9xl mb-4 tracking-wider font-light hero-text-shadow mhomes-brown bg-clip-text text-transparent bg-gradient-to-r from-white via-accent/80 to-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              mhomes
            </motion.h1>

            <motion.p className="luxury-text text-lg md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed hero-text-shadow mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              Experience <span className="text-accent font-semibold">luxury redefined</span> at MHomes Resort, where every moment becomes a <span className="text-accent font-semibold">treasured memory</span> in our tropical paradise
            </motion.p>

            {/* Booking form - SIMPLE & POSH VERSION */}
            <motion.div 
              className="mt-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, type: "spring" }}
            >
              <motion.div 
                className="rounded-2xl p-6 sm:p-8 bg-white/95 backdrop-blur-sm shadow-2xl border border-white/50 hover:shadow-3xl transition-all duration-300"
                whileHover={{ borderColor: "rgba(251, 146, 60, 0.5)" }}
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 items-end">
                  {/* Check-in */}
                  <motion.div 
                    className="flex flex-col"
                    whileHover={{ y: -2 }}
                  >
                    <label className="text-xs font-semibold text-gray-700 mb-2">CHECK-IN</label>
                    <input 
                      type="date" 
                      name="checkin" 
                      id="checkin" 
                      className="rounded-lg px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 text-gray-800 font-medium text-sm border border-gray-200 hover:border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all"
                      onChange={(e)=>setCheckIn(e.target.value)} 
                      value={checkIn || ''} 
                    />
                  </motion.div>

                  {/* Check-out */}
                  <motion.div 
                    className="flex flex-col"
                    whileHover={{ y: -2 }}
                  >
                    <label className="text-xs font-semibold text-gray-700 mb-2">CHECK-OUT</label>
                    <input 
                      type="date" 
                      name="checkout" 
                      id="checkout" 
                      className="rounded-lg px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 text-gray-800 font-medium text-sm border border-gray-200 hover:border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all"
                      onChange={(e)=>setCheckOut(e.target.value)} 
                      value={checkOut || ''} 
                    />
                  </motion.div>

                  {/* Guests */}
                  <motion.div 
                    className="flex flex-col"
                    whileHover={{ y: -2 }}
                  >
                    <label className="text-xs font-semibold text-gray-700 mb-2">ROOM TYPE</label>
                    <select 
                      className="rounded-lg px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 text-gray-800 font-medium text-sm border border-gray-200 hover:border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer transition-all"
                      onChange={(e)=>setRoomType(e.target.value as 'premium' | 'premium_plus')} 
                      value={roomType}
                    >
                      <option value="premium">Premium </option>
                      <option value="premium_plus">Premium Plus   </option>
                    </select>
                  </motion.div>

                  {/* Room Count */}
                  <motion.div 
                    className="flex flex-col"
                    whileHover={{ y: -2 }}
                  >
                    <label className="text-xs font-semibold text-gray-700 mb-2">ROOMS</label>
                    <select 
                      className="rounded-lg px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 text-gray-800 font-medium text-sm border border-gray-200 hover:border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer transition-all"
                      onChange={(e)=>setRoomCount(Number(e.target.value))} 
                      value={roomCount}
                    >
                      <option value={1}>1 Room</option>
                      <option value={2}>2 Rooms</option>
                      <option value={3}>3 Rooms</option>
                      <option value={4}>4 Rooms</option>
                      <option value={5}>5 Rooms</option>
                      <option value={6}>6 Rooms</option>
                    </select>
                  </motion.div>

                  {/* Search Button */}
                  <motion.div
                    className="col-span-3 sm:col-span-1"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      size="lg" 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
                      onClick={() => handleHeroSearch()}
                    >
                      Search
                      <ArrowRight className="ml-1 sm:ml-2 w-3 sm:w-4 h-3 sm:h-4" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-white/60 text-sm">Scroll to explore</span>
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
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-block mb-6"
            >
              <Badge className="bg-accent/20 text-accent border border-accent/50 px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Luxury Experience
              </Badge>
            </motion.div>

            <h2 className="luxury-heading text-4xl md:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Luxury Redefined
            </h2>
            <p className="luxury-text text-xl text-muted-foreground leading-relaxed">
              Nestled in pristine waters, MHomes Resort offers an <span className="text-accent font-semibold">unparalleled luxury experience</span>. 
              From overwater villas to world-class amenities, every detail is crafted to <span className="text-accent font-semibold">perfection</span>.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-8 lg:gap-12">
            {amenities.map((amenity, index) => (
              <motion.div
                key={amenity.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1  }}
                whileHover={{ y: -8 }}
                className="text-center group cursor-pointer"
              >
                <motion.div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 mx-auto bg-gradient-to-br from-accent/20 to-accent/5 rounded-full flex items-center justify-center mb-3 sm:mb-4 md:mb-6 group-hover:from-accent/30 group-hover:to-accent/10 transition-all duration-300 border border-accent/20 group-hover:border-accent/50 shadow-lg group-hover:shadow-xl">
                  <amenity.icon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-accent group-hover:scale-110 transition-transform" />
                </motion.div>
                <h3 className="luxury-heading text-xs sm:text-sm md:text-sm lg:text-sm font-semibold mb-1 sm:mb-2 group-hover:text-accent transition-colors">{amenity.name}</h3>
                <p className="luxury-text text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors line-clamp-2">{amenity.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section id="story" className="py-20 bg-gradient-to-b from-muted/30 via-background to-muted/50 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -ml-48 -mb-48" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto mb-20"
          >
            <h2 className="luxury-heading text-4xl md:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              What does the <span className="text-accent">M</span> stand for?
            </h2>
            <p className="luxury-text text-xl text-muted-foreground">
              Discover the profound meaning behind MHomes — a fusion of <span className="text-accent font-semibold">culture, mythology, nature, and visionary dreams</span>.
            </p>
          </motion.div>

          <div className="space-y-20">
            {storyData.map((story, index) => (
              <motion.div
                key={story.word}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'md:grid-flow-dense' : ''
                }`}
              >
                {/* Image with enhanced effects */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className={`relative h-96 rounded-3xl overflow-hidden shadow-2xl group ${
                    index % 2 === 1 ? 'md:col-start-2 md:row-start-1' : ''
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
                    <Badge className="bg-accent text-white shadow-lg">{index + 1} of 4</Badge>
                  </motion.div>
                </motion.div>

                {/* Content with enhanced typography */}
                <motion.div
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={index % 2 === 1 ? 'md:col-start-1 md:row-start-1' : ''}
                >
                  <motion.h3 
                    className="luxury-heading text-5xl md:text-6xl mb-6 text-primary"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {story.word.split('').map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={char === story.word[0] ? 'text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/60 text-6xl md:text-7xl' : ''}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </motion.h3>
                  <p className="luxury-text text-lg text-muted-foreground leading-relaxed mb-8">
                    {story.description}
                  </p>
                  <motion.div className="flex items-center gap-3 text-accent" whileHover={{ x: 10 }}>
                    <motion.div className="h-1 w-12 bg-gradient-to-r from-accent to-transparent rounded-full" />
                    <span className="luxury-heading text-sm font-semibold">A pillar of MHomes</span>
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
            <p className="luxury-text text-lg text-muted-foreground leading-relaxed">
              These four pillars weave together the soul of <span className="text-accent font-semibold text-xl">MHomes Resort</span> — 
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
            <motion.div className="inline-block mb-4">
              <Badge className="bg-accent/20 text-accent border border-accent/50">
                <Sparkles className="w-4 h-4 mr-2" />
                Premium Rooms
              </Badge>
            </motion.div>
            <h2 className="luxury-heading text-4xl md:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">Exquisite Accommodations</h2>
            <p className="luxury-text text-lg text-muted-foreground max-w-3xl mx-auto">
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
                        className="luxury-heading text-5xl md:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                      >
                        {room.name}
                      </motion.h3>
                      <p className="luxury-text text-xl text-muted-foreground leading-relaxed">{room.description}</p>
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
                            <Button size="lg" className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white hover:shadow-xl px-12 py-4 text-lg rounded-xl font-semibold">
                              Book Now
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
                          className="border-2 border-primary text-primary hover:bg-primary/5 px-12 py-4 text-lg rounded-xl font-semibold"
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
                    key={amenity}
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
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-3 text-lg font-semibold rounded-lg hover:shadow-xl transition-all"
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
        {/* Decorative animated elements */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -mr-40" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -ml-40" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <motion.div className="inline-block mb-4">
              <Badge className="bg-accent/20 text-accent border border-accent/50">
                <Sparkles className="w-4 h-4 mr-2" />
                Gallery Showcase
              </Badge>
            </motion.div>
            <h2 className="luxury-heading text-4xl md:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Picture Perfect Moments
            </h2>
            <p className="luxury-text text-xl text-muted-foreground max-w-3xl mx-auto">
              Explore the <span className="text-accent font-semibold">breathtaking beauty</span> of MHomes Resort through our curated gallery of stunning imagery.
            </p>
          </motion.div>

          {/* Carousel Data */}
          {(() => {
            // Carousel slides data
            const gallerySlides = [
              {
                key: 'Pickle-Ball Courts',
                image: "/pickleball.jpg",
                title: 'Pickle-Ball Courts',
                description: 'Experience the thrill of pickle-ball on our state-of-the-art courts, designed for both casual play and competitive matches.'
              },
              {
                key: 'RainDance Water Park',
                image: "/waterfall.jpg",
                title: 'RainDance Water Park',
                description: 'Dive into fun at RainDance Water Park, featuring exhilarating water showers for all ages.'
              },
              {
                key: 'woyage-daycations',
                image: "/entrance.jpg",
                title: 'WOYAGE - DAYCATIONS',
                description: 'Indulge in a day of luxury and relaxation at our beautiful resort.'
              }
            ];
            const [galleryIndex, setGalleryIndex] = useState(1); // Start with the middle slide
            const slide = gallerySlides[galleryIndex];

            const goLeft = () => setGalleryIndex((i) => (i - 1 + gallerySlides.length) % gallerySlides.length);
            const goRight = () => setGalleryIndex((i) => (i + 1) % gallerySlides.length);

            return (
              <div className="relative flex flex-col items-center justify-center min-h-[650px]">
                {/* Large blurred background image with enhanced effect */}
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

                {/* Carousel content */}
                <div className="relative z-10 flex w-full items-center justify-center">
                  {/* Left arrow */}
                  <motion.button
                    aria-label="Previous"
                    onClick={goLeft}
                    whileHover={{ scale: 1.1, x: -10 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center justify-center w-16 h-96 group bg-transparent border-none focus:outline-none"
                  >
                    <motion.span 
                      className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-primary/40 bg-white/40 group-hover:bg-accent/80 transition-colors shadow-lg hover:shadow-xl"
                      whileHover={{ scale: 1.15 }}
                    >
                      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-primary group-hover:text-white transition-colors"><path d="M15 19l-7-7 7-7" /></svg>
                    </motion.span>
                  </motion.button>

                  {/* Center card with enhanced effects */}
                  <motion.div className="w-full max-w-2xl mx-4" layoutId="gallery-card">
                    <div className="relative flex flex-col items-center justify-end h-[420px] md:h-[500px]">
                      <motion.div 
                        className="absolute left-1/2 top-0 -translate-x-1/2 w-[90%] h-[70%] rounded-3xl overflow-hidden shadow-2xl"
                        layoutId="gallery-image"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
                        className="relative z-10 w-full bg-gradient-to-br from-white/98 to-white/95 backdrop-blur-sm rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl min-h-[160px] border border-accent/20"
                        layoutId="gallery-text"
                        whileHover={{ boxShadow: "0 20px 60px rgba(var(--accent), 0.3)" }}
                      >
                        <motion.h3 
                          className="luxury-heading text-3xl md:text-4xl mb-3 text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          {slide.title}
                        </motion.h3>
                        <motion.p 
                          className="luxury-text text-base md:text-lg text-muted-foreground text-center mb-5"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          {slide.description}
                        </motion.p>
                        <motion.div
                          whileHover={{ x: 5 }}
                        >
                          <Button variant="link" className="text-accent text-lg font-semibold hover:text-accent/80">
                            DISCOVER MORE <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Right arrow */}
                  <motion.button
                    aria-label="Next"
                    onClick={goRight}
                    whileHover={{ scale: 1.1, x: 10 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center justify-center w-16 h-96 group bg-transparent border-none focus:outline-none"
                  >
                    <motion.span 
                      className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-primary/40 bg-white/40 group-hover:bg-accent/80 transition-colors shadow-lg hover:shadow-xl"
                      whileHover={{ scale: 1.15 }}
                    >
                      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-primary group-hover:text-white transition-colors"><path d="M9 5l7 7-7 7" /></svg>
                    </motion.span>
                  </motion.button>
                </div>

                {/* Carousel indicators */}
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
                        height: 8
                      }}
                      whileHover={{ scale: 1.2 }}
                    />
                  ))}
                </motion.div>
              </div>
            );
          })()}

        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="py-24 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
        {/* Animated background */}
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
            <motion.div className="inline-block mb-4">
              <Badge className="bg-accent/20 text-accent border border-accent/50">
                <Star className="w-4 h-4 mr-2 fill-accent" />
                Trusted Reviews
              </Badge>
            </motion.div>
            <h2 className="luxury-heading text-4xl md:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Guest Testimonials
            </h2>
            <p className="luxury-text text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover what our guests are saying about their <span className="text-accent font-semibold">extraordinary experiences</span> at MHomes Resort.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(reviewsLoading ? testimonials : topReviews).map((testimonial, index) => (
              <motion.div
                key={testimonial.name || index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                whileHover={{ y: -8, boxShadow: "0 20px 60px rgba(var(--accent), 0.2)" }}
                className="h-full"
              >
                <Card className="luxury-card h-full bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 hover:border-accent/50 transition-all duration-300 backdrop-blur-sm">
                  <CardContent className="pt-8">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      whileInView={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    >
                      <Quote className="w-10 h-10 text-accent mb-6" />
                    </motion.div>
                    <p className="luxury-text mb-8 text-lg leading-relaxed italic">"{testimonial.text}"</p>
                    <div className="flex items-center gap-2 mb-6">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                        </motion.div>
                      ))}
                    </div>
                    <motion.div className="flex items-center gap-3" whileHover={{ x: 5 }}>
                      <motion.div className="w-14 h-14 bg-gradient-to-br from-accent to-accent/60 rounded-full flex items-center justify-center shadow-lg">
                        <span className="luxury-heading text-white font-bold text-lg">
                          {testimonial.name.charAt(0)}
                        </span>
                      </motion.div>
                      <div>
                        <p className="luxury-heading text-sm font-semibold text-primary">{testimonial.name}</p>
                        <p className="luxury-text text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {testimonial.location}</p>
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
                <Button variant="outline" size="lg" className="border-2 border-primary text-primary hover:bg-primary/5 px-10 py-3 rounded-xl font-semibold">
                  Read All Reviews
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Booking CTA - Redirects to Reservation Page */}
      <section className="py-24 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 relative overflow-hidden">
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div className="inline-block mb-6">
              <Badge className="bg-accent/20 text-accent border border-accent/50">
                Ready to Book?
              </Badge>
            </motion.div>
            
            <h2 className="luxury-heading text-5xl md:text-6xl mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary font-bold">
              Ready to Experience Paradise?
            </h2>
            
            <p className="luxury-text text-xl text-muted-foreground mb-12 leading-relaxed">
              Reserve your dream vacation at MHomes Resort. Choose your dates, select your perfect room, and create unforgettable memories.
            </p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/reservation">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-10 py-7 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all inline-flex items-center gap-3"
                >
                  Book Your Stay
                  <ArrowRight className="w-6 h-6" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 bg-gradient-to-b from-background via-muted/10 to-background relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -ml-48 -mt-48" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mb-48" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <motion.div className="inline-block mb-4">
              <Badge className="bg-accent/20 text-accent border border-accent/50">
                Get in Touch
              </Badge>
            </motion.div>
            <h2 className="luxury-heading text-4xl md:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Get in Touch
            </h2>
            <p className="luxury-text text-xl text-muted-foreground max-w-3xl mx-auto">
              Ready to experience paradise? Contact us to plan your perfect getaway or learn more about our luxury offerings.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="space-y-12"
            >
              <div>
                <h3 className="luxury-heading text-3xl mb-8 text-primary">Contact Information</h3>
                <div className="space-y-6">
                  <motion.div className="flex items-start gap-6 group" whileHover={{ x: 10 }}>
                    <motion.div 
                      className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-to-br group-hover:from-accent group-hover:to-accent/60 transition-all duration-300 mt-1"
                      whileHover={{ scale: 1.1 }}
                    >
                      <MapPin className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                    </motion.div>
                    <div>
                      <p className="luxury-heading font-bold text-lg text-primary mb-1">Resort Address</p>
                      <p className="luxury-text text-muted-foreground text-lg">Tropical Paradise Island, Maldives</p>
                    </div>
                  </motion.div>

                  <motion.div className="flex items-start gap-6 group" whileHover={{ x: 10 }}>
                    <motion.div 
                      className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-to-br group-hover:from-accent group-hover:to-accent/60 transition-all duration-300 mt-1"
                      whileHover={{ scale: 1.1 }}
                    >
                      <Phone className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                    </motion.div>
                    <div>
                      <p className="luxury-heading font-bold text-lg text-primary mb-1">Phone</p>
                      <p className="luxury-text text-muted-foreground text-lg">+1 (555) 123-4567</p>
                    </div>
                  </motion.div>

                  <motion.div className="flex items-start gap-6 group" whileHover={{ x: 10 }}>
                    <motion.div 
                      className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-to-br group-hover:from-accent group-hover:to-accent/60 transition-all duration-300 mt-1"
                      whileHover={{ scale: 1.1 }}
                    >
                      <Mail className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                    </motion.div>
                    <div>
                      <p className="luxury-heading font-bold text-lg text-primary mb-1">Email</p>
                      <p className="luxury-text text-muted-foreground text-lg">info@mhomesresort.com</p>
                    </div>
                  </motion.div>
                </div>
              </div>

              <motion.div className="pt-8 border-t border-accent/20">
                <h4 className="luxury-heading text-2xl mb-6 text-primary">Office Hours</h4>
                <div className="space-y-4 text-lg">
                  <motion.div className="flex justify-between items-center hover:text-accent transition-colors group" whileHover={{ x: 5 }}>
                    <span className="luxury-heading font-semibold">Monday - Friday</span>
                    <span className="luxury-text text-muted-foreground group-hover:text-accent transition-colors">9:00 AM - 6:00 PM</span>
                  </motion.div>
                  <motion.div className="flex justify-between items-center hover:text-accent transition-colors group" whileHover={{ x: 5 }}>
                    <span className="luxury-heading font-semibold">Saturday</span>
                    <span className="luxury-text text-muted-foreground group-hover:text-accent transition-colors">10:00 AM - 4:00 PM</span>
                  </motion.div>
                  <motion.div className="flex justify-between items-center hover:text-accent transition-colors group" whileHover={{ x: 5 }}>
                    <span className="luxury-heading font-semibold">Sunday</span>
                    <span className="luxury-text text-muted-foreground group-hover:text-accent transition-colors">12:00 PM - 4:00 PM</span>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div whileHover={{ y: -3 }}>
                      <label className="luxury-text text-sm font-semibold mb-3 block text-primary">First Name</label>
                      <Input placeholder="John" className="rounded-lg border-2 border-accent/20 focus:border-accent/50 transition-all" />
                    </motion.div>
                    <motion.div whileHover={{ y: -3 }}>
                      <label className="luxury-text text-sm font-semibold mb-3 block text-primary">Last Name</label>
                      <Input placeholder="Doe" className="rounded-lg border-2 border-accent/20 focus:border-accent/50 transition-all" />
                    </motion.div>
                  </div>
                  <motion.div whileHover={{ y: -3 }}>
                    <label className="luxury-text text-sm font-semibold mb-3 block text-primary">Email</label>
                    <Input type="email" placeholder="john@example.com" className="rounded-lg border-2 border-accent/20 focus:border-accent/50 transition-all" />
                  </motion.div>
                  <motion.div whileHover={{ y: -3 }}>
                    <label className="luxury-text text-sm font-semibold mb-3 block text-primary">Subject</label>
                    <Input placeholder="Inquiry about reservation" className="rounded-lg border-2 border-accent/20 focus:border-accent/50 transition-all" />
                  </motion.div>
                  <motion.div whileHover={{ y: -3 }}>
                    <label className="luxury-text text-sm font-semibold mb-3 block text-primary">Message</label>
                    <Textarea 
                      placeholder="Tell us about your dream vacation..." 
                      rows={4}
                      className="rounded-lg border-2 border-accent/20 focus:border-accent/50 transition-all"
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="w-full bg-gradient-to-r from-accent to-accent/80 text-white py-3 text-lg font-bold rounded-lg hover:shadow-xl transition-all">
                      Send Message
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-primary to-primary/95 text-white py-16 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <motion.div 
            className="absolute top-0 left-0 w-96 h-96 bg-accent rounded-full blur-3xl"
            animate={{ y: [0, 40, 0], x: [0, 20, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <motion.div 
                  className="flex items-center justify-center overflow-hidden"
                  whileHover={{ scale: 1.1 }}
                >
                  <Image
                    src="/mhomes-logo.png"
                    alt="MHomes Resort Logo"
                    width={120}
                    height={120}
                    priority
                    style={{ width: 'auto' }}
                    className="object-contain drop-shadow-lg"
                  />
                </motion.div>
              </div>
              <p className="luxury-text text-white/80 mb-6 leading-relaxed text-lg">
                Experience luxury redefined at <span className="font-bold text-white">MHomes Resort</span>, where every moment becomes a treasured memory 
                in our tropical paradise.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge variant="outline" className="border-white text-white bg-white/10 hover:bg-white/20 transition-all">
                    <Award className="w-3 h-3 mr-2" />
                    5-Star Resort
                  </Badge>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge variant="outline" className="border-white text-white bg-white/10 hover:bg-white/20 transition-all">
                    <Shield className="w-3 h-3 mr-2" />
                    Luxury Certified
                  </Badge>
                </motion.div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h4 className="luxury-heading text-lg mb-6 font-bold">Quick Links</h4>
              <div className="space-y-3">
                {navigationItems.slice(0, 4).map((item) => (
                  <motion.div key={item.name} whileHover={{ x: 5 }}>
                    <Link
                      href={item.href}
                      className="luxury-text text-white/80 hover:text-accent transition-colors font-semibold"
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="luxury-heading text-lg mb-6 font-bold">More Info</h4>
              <div className="space-y-3">
                {navigationItems.slice(4).map((item) => (
                  <motion.div key={item.name} whileHover={{ x: 5 }}>
                    <Link
                      href={item.href}
                      className="luxury-text text-white/80 hover:text-accent transition-colors font-semibold"
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 0.8 }}
            className="origin-left"
          >
            <Separator className="my-8 bg-white/20" />
          </motion.div>
          
          <motion.div 
            className="flex flex-col md:flex-row items-center justify-between"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="luxury-text text-white/60 text-sm font-semibold">
              © 2025 <span className="text-accent">MHomes Resort</span>. All rights reserved. | Crafted with luxury and elegance
            </p>
            <div className="flex items-center gap-8 mt-4 md:mt-0">
              <motion.div whileHover={{ scale: 1.1, y: -3 }}>
                <Link href="#" className="luxury-text text-white/60 hover:text-accent transition-all font-semibold text-sm">
                  Privacy Policy
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1, y: -3 }}>
                <Link href="#" className="luxury-text text-white/60 hover:text-accent transition-all font-semibold text-sm">
                  Terms of Service
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1, y: -3 }}>
                <Link href="#" className="luxury-text text-white/60 hover:text-accent transition-all font-semibold text-sm">
                  Cookie Policy
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </footer>

      {/* Chat Widget */}
      <ChatWidget isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} />
    </div>
  )
}