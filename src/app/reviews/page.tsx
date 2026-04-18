'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Star, MapPin, ArrowLeft, ExternalLink, Menu, X, Phone, Mail, Building, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Review {
  id: string
  name: string
  location: string
  rating: number
  text: string
  date: string
  image?: string
  roomType?: string
  verified: boolean
  source: 'google' | 'fallback'
  profilePhotoUrl?: string
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Load reviews from API on mount
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/reviews')
        const data = await response.json()
        
        setReviews(data.reviews || [])
        setGoogleBusinessUrl(data.businessUrl || 'https://www.google.com/maps')
      } catch (error) {
        console.error('Error fetching reviews:', error)
        // Fallback to empty array if fetch fails
        setReviews([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchReviews()
  }, [])

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Static premium background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_18%,rgba(201,168,76,0.15),transparent_30%),radial-gradient(circle_at_85%_12%,rgba(107,63,42,0.13),transparent_34%),radial-gradient(circle_at_50%_92%,rgba(201,168,76,0.1),transparent_36%),linear-gradient(180deg,#FCFAF5_0%,#F8F3E9_45%,#FCFAF5_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(107,63,42,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(107,63,42,0.12) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Header/Nav */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="container mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
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

            <div className="hidden lg:flex items-center space-x-1">
              {[{ name: 'Home', href: '/' }, { name: 'Reviews', href: '/reviews' }, { name: 'Contact', href: '/#contact' }].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group relative px-3 py-1.5 transition-colors duration-200 ${item.name === 'Reviews' ? 'text-[#6B3F2A]' : 'text-[#1A1A1A] hover:text-[#6B3F2A]'}`}
                  style={{ fontFamily: 'var(--font-label)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}
                >
                  <span className="inline-block">{item.name}</span>
                  <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-[#6B3F2A] transition-transform duration-300 origin-left ${item.name === 'Reviews' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                </Link>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/reservation">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-1.5 shadow-md transition-colors duration-200 rounded-lg" style={{ fontFamily: 'var(--font-label)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                  Reserve now
                </Button>
              </Link>
            </div>

            <div className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="border-primary/30 hover:border-primary/50 rounded-lg"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <motion.div className="lg:hidden glass-effect border-t border-border" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="container mx-auto px-4 py-4 space-y-3">
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="block luxury-text hover:text-primary transition-colors font-semibold py-2 px-3 rounded-lg hover:bg-primary/5">
                Home
              </Link>
              <Link href="/reviews" onClick={() => setIsMenuOpen(false)} className="block luxury-text text-[#6B3F2A] transition-colors font-semibold py-2 px-3 rounded-lg bg-primary/5">
                Reviews
              </Link>
              <Link href="/#contact" onClick={() => setIsMenuOpen(false)} className="block luxury-text hover:text-primary transition-colors font-semibold py-2 px-3 rounded-lg hover:bg-primary/5">
                Contact
              </Link>
              <div className="border-t border-primary/10 pt-3">
                <Link href="/reservation" onClick={() => setIsMenuOpen(false)} className="w-full">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors duration-200">
                    Reserve now
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </motion.nav>

      <main className="container mx-auto max-w-7xl px-4 pt-32 pb-10">

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mb-14 text-center"
        >
          <h1 className="luxury-heading text-5xl md:text-7xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-primary mb-6">
            Guest Reviews
          </h1>
          <p className="luxury-text text-lg md:text-xl text-[#5F4B40] max-w-3xl mx-auto leading-[1.8]">
            Honest words from our guests, thoughtfully presented in a setting that reflects the MHOMES experience.
          </p>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-start">
          <motion.aside
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-28 rounded-3xl border border-accent/25 bg-[linear-gradient(160deg,rgba(255,255,255,0.88),rgba(255,255,255,0.7))] p-8 shadow-[0_22px_60px_rgba(107,63,42,0.14)] backdrop-blur-sm">
              <h2 className="luxury-heading text-3xl font-medium text-[#3A271F] mb-5">Share Your Experience</h2>
              <p className="luxury-text text-[#5F4B40] leading-[1.8] mb-6">
                Stayed with us recently? Tell future guests about your time at MHOMES and help us continue elevating every stay.
              </p>
              <div className="rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4 mb-6">
                <p className="luxury-label text-[11px] tracking-[0.2em] text-[#5A3728] mb-2">Trusted Guest Voice</p>
                <p className="text-sm text-[#5F4B40]">Your Google review supports other travelers and helps us keep our standards exceptional.</p>
              </div>
              <motion.a
                href={googleBusinessUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
              >
                <ExternalLink size={17} />
                Post Review on Google
              </motion.a>
              <p className="mt-3 text-center text-xs text-[#6A594F]">You will be redirected to Google Maps.</p>
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="lg:col-span-2"
          >
            <div className="mb-6 rounded-2xl border border-accent/20 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-sm">
              <h3 className="luxury-heading text-2xl text-[#3A271F]">All Reviews</h3>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="rounded-2xl border border-accent/20 bg-white/70 px-8 py-14 text-center shadow-sm backdrop-blur-sm">
                  <motion.div
                    animate={{ opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="luxury-text text-[#6A594F]"
                  >
                    Loading reviews...
                  </motion.div>
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-2xl border border-accent/20 bg-white/70 px-8 py-14 text-center shadow-sm backdrop-blur-sm">
                  <p className="luxury-text text-lg text-[#5F4B40]">No reviews available yet.</p>
                  <p className="luxury-text text-sm text-[#6A594F] mt-2">Be the first to share your experience.</p>
                </div>
              ) : (
                reviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.03 }}
                    whileHover={{ y: -3 }}
                  >
                    <Card className="border border-accent/20 bg-[linear-gradient(150deg,rgba(255,255,255,0.86),rgba(255,255,255,0.72))] shadow-[0_10px_30px_rgba(107,63,42,0.09)] backdrop-blur-sm">
                      <CardContent className="p-6 md:p-7">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-start gap-3 md:gap-4">
                            {review.profilePhotoUrl ? (
                              <div className="h-11 min-w-11 rounded-full border border-[#D9C7A2] bg-white shadow-[0_2px_8px_rgba(90,55,40,0.12)] overflow-hidden">
                                <Image
                                  src={review.profilePhotoUrl}
                                  alt={`${review.name} profile photo`}
                                  width={44}
                                  height={44}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-11 min-w-11 rounded-full border border-[#D9C7A2] bg-[linear-gradient(180deg,#FFFDF8,#F7F1E5)] text-[#4B3428] shadow-[0_2px_8px_rgba(90,55,40,0.12)] flex items-center justify-center">
                                <div className="h-8 w-8 rounded-full border border-[#C9B692] bg-white flex items-center justify-center">
                                  <span className="text-[10px] font-semibold" style={{ fontFamily: 'var(--font-label)', letterSpacing: '0.08em' }}>
                                    {review.name
                                      .split(' ')
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .map((part) => part[0])
                                      .join('')
                                      .toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            )}
                            <div>
                              <h4 className="luxury-heading text-base md:text-lg text-[#3A271F]">{review.name}</h4>
                              <p className="luxury-text text-xs text-[#6A594F] mt-1 flex items-center gap-1">
                                <MapPin size={12} /> {review.location}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="luxury-text text-xs text-[#6A594F] mb-1.5">{review.date}</p>
                            <div className="flex justify-end gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={15}
                                  className={i < review.rating ? 'fill-accent text-accent' : 'text-[#B7ACA4]'}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <p className="luxury-text text-[#4A3930] leading-[1.8]">{review.text}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </motion.section>
        </div>
      </main>

      <footer className="bg-primary text-white relative">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary to-primary/95 opacity-90" />
        
        <div className="relative z-10 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 py-16">
            {/* Brand Column */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="-mt-16 -ml-6">
              <Image
                src="/MHOMES-logo.png"
                alt="MHOMES Resort"
                width={160}
                height={160}
                className="h-40 w-auto -mb-6 object-contain"
              />
              <h2 className="luxury-heading text-2xl font-bold text-white mb-3 pl-8">MHOMES Resort</h2>
              <p className="luxury-text text-white/80 text-sm leading-relaxed mb-6 pl-8">
                Experience luxury redefined in the heart of Madurai. Premium accommodations designed for unforgettable memories.
              </p>
            </motion.div>

            {/* Explore Column */}
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

            {/* Services Column */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <h3 className="luxury-heading text-lg font-bold text-white mb-8 uppercase tracking-wider">Services</h3>
              <nav className="space-y-4 flex flex-col">
                {[
                  { name: 'Book Now', href: '/reservation' },
                  { name: 'Contact Us', href: '/#contact' },
                  { name: 'Room Types', href: '/#accommodations' },
                ].map((link) => (
                  <Link key={link.name} href={link.href} className="luxury-text text-white/80 hover:text-accent text-sm font-medium transition-colors duration-300 block">
                    {link.name}
                  </Link>
                ))}
              </nav>
            </motion.div>

            {/* Contact Column */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <h3 className="luxury-heading text-lg font-bold text-white mb-8 uppercase tracking-wider">Contact</h3>
              <div className="space-y-6">
                <div>
                  <p className="luxury-text text-white/70 text-xs uppercase tracking-wide mb-2">Address</p>
                  <p className="luxury-heading text-white text-sm font-medium">Madurai, Tamil Nadu</p>
                </div>

                <div>
                  <p className="luxury-text text-white/70 text-xs uppercase tracking-wide mb-2">Phone</p>
                  <a href="tel:+919791035346" className="luxury-heading text-accent hover:text-accent/80 text-sm font-medium transition-colors">
                    +91 9791 035346
                  </a>
                </div>

                <div>
                  <p className="luxury-text text-white/70 text-xs uppercase tracking-wide mb-2">Email</p>
                  <a href="mailto:karthikeyan@mhomes.co.in" className="luxury-heading text-accent hover:text-accent/80 text-sm font-medium transition-colors break-all">
                    karthikeyan@mhomes.co.in
                  </a>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/15" />

          {/* Bottom Bar */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }} className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex gap-6 flex-wrap justify-center">
                <a href="#" className="luxury-text text-white/70 hover:text-accent text-xs font-medium transition-colors">Terms & Conditions</a>
                <span className="text-white/20">•</span>
                <a href="#" className="luxury-text text-white/70 hover:text-accent text-xs font-medium transition-colors">Cookie Policy</a>
                <span className="text-white/20">•</span>
                <a href="#" className="luxury-text text-white/70 hover:text-accent text-xs font-medium transition-colors">Sitemap</a>
              </div>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}
