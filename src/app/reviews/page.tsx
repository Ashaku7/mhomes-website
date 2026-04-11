'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Send, MapPin, Calendar, Users, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

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
  const [filterRating, setFilterRating] = useState(0)
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState('')

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
    <div className="min-h-screen bg-background">
      {/* Premium Header Background */}
      <div className="relative pt-32 pb-16 px-4 overflow-hidden">
        {/* Animated gradient background matching website theme */}
        <motion.div
          className="absolute inset-0 z-0"
          animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(201, 168, 76, 0.12) 0%, rgba(107, 63, 42, 0.08) 50%, rgba(201, 168, 76, 0.12) 100%)',
            backgroundSize: '400% 400%'
          }}
        />

        {/* Floating gradient orbs */}
        <motion.div
          className="absolute top-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"
          animate={{ y: [0, 40, 0], x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{ y: [0, -40, 0], x: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />

        <div className="relative z-10 container mx-auto max-w-6xl">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <Link href="/">
              <Button variant="ghost" className="text-primary hover:text-secondary gap-2 hover:bg-secondary/10">
                <ArrowLeft size={20} />
                Back to Home
              </Button>
            </Link>
          </motion.div>

          {/* Page Title - Matching website luxury style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-12"
          >
            <motion.div className="inline-block mb-4">
              <Badge className="bg-secondary/20 text-secondary border border-secondary/50 px-4 py-2 rounded-full">
                ⭐ Trusted Reviews
              </Badge>
            </motion.div>
            <h1 className="luxury-heading text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-primary mb-6">
              Guest Reviews
            </h1>
            <p className="luxury-text text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover what our <span className="text-secondary font-semibold">esteemed guests</span> love about MHomes Resort
            </p>
          </motion.div>

          {/* Stats Cards - Matching luxury theme */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            <motion.div
              whileHover={{ y: -4 }}
              className="luxury-card bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 rounded-2xl p-8 backdrop-blur-sm"
            >
              <div className="flex items-center gap-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-5xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent"
                >
                  {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0'}
                </motion.div>
                <div>
                  <p className="luxury-text text-muted-foreground text-sm font-semibold">Average Rating</p>
                  <div className="flex gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} className="fill-accent text-accent" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="luxury-card bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 rounded-2xl p-8 backdrop-blur-sm"
            >
              <p className="luxury-text text-muted-foreground text-sm font-semibold mb-3">Total Reviews</p>
              <motion.p
                className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {reviews.length}
              </motion.p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="luxury-card bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 rounded-2xl p-8 backdrop-blur-sm"
            >
              <p className="luxury-text text-muted-foreground text-sm font-semibold mb-3">Guest Satisfaction</p>
              <p className="text-5xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">98%</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Write Review Section - Redirect to Google */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-32 luxury-card bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 rounded-3xl p-8 backdrop-blur-sm">
              <h2 className="luxury-heading text-2xl font-bold mb-6">Share Your Experience</h2>

              <div className="space-y-6">
                <p className="luxury-text text-muted-foreground leading-relaxed">
                  We'd love to hear about your experience at MHomes Resort! Share your thoughts and help other guests discover our luxury haven.
                </p>

                <div className="bg-accent/10 border border-accent/20 rounded-2xl p-5">
                  <p className="text-sm font-semibold text-accent mb-3">✨ Your reviews are valuable</p>
                  <p className="text-sm text-muted-foreground">
                    Verified reviews on Google help build trust and let us know how we can improve.
                  </p>
                </div>

                {/* Google Review Redirect Button */}
                <motion.a
                  href={googleBusinessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer"
                >
                  <ExternalLink size={18} />
                  Post Review on Google
                </motion.a>

                <p className="text-xs text-muted-foreground text-center">
                  You'll be directed to Google Maps to post your review
                </p>
              </div>
            </div>
          </motion.div>

          {/* Reviews List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Filter by Rating */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilterRating(0)}
                className={`px-5 py-2.5 rounded-full transition-all font-semibold ${
                  filterRating === 0
                    ? 'bg-gradient-to-r from-accent to-primary text-white'
                    : 'bg-white/30 text-primary hover:bg-white/50 border border-accent/20'
                }`}
              >
                All Reviews
              </button>
              {[5, 4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFilterRating(rating)}
                  className={`px-5 py-2.5 rounded-full transition-all flex items-center gap-2 font-semibold ${
                    filterRating === rating
                      ? 'bg-gradient-to-r from-accent to-primary text-white'
                      : 'bg-white/30 text-primary hover:bg-white/50 border border-accent/20'
                  }`}
                >
                  {rating}
                  <Star size={16} className="fill-current" />
                </button>
              ))}
            </div>

            {/* Reviews */}
            <div className="space-y-5">
              {isLoading ? (
                <div className="text-center py-16 luxury-card bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 rounded-2xl backdrop-blur-sm">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-muted-foreground text-lg"
                  >
                    Loading reviews...
                  </motion.div>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-16 luxury-card bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 rounded-2xl backdrop-blur-sm">
                  <p className="text-muted-foreground text-lg">No reviews available yet.</p>
                  <p className="text-muted-foreground text-sm mt-2">Be the first to share your experience!</p>
                </div>
              ) : (
                (() => {
                  const filteredReviews = filterRating === 0 ? reviews : reviews.filter(r => r.rating === filterRating)
                  return filteredReviews.length === 0 ? (
                    <div className="text-center py-16 luxury-card bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 rounded-2xl backdrop-blur-sm">
                      <p className="text-muted-foreground text-lg">No reviews with {filterRating} stars yet.</p>
                    </div>
                  ) : (
                    filteredReviews.map((review, index) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="luxury-card bg-gradient-to-br from-white/50 to-white/30 border border-accent/20 hover:border-accent/50 rounded-2xl p-6 backdrop-blur-sm transition-all"
                        whileHover={{ y: -4 }}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4 flex-1">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0"
                            >
                              {review.name.charAt(0)}
                            </motion.div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="luxury-heading font-semibold text-primary">{review.name}</h3>
                                {review.verified && (
                                  <Badge className="bg-green-500/20 text-green-700 border-green-500/50 text-xs">
                                    ✓ Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="luxury-text text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <MapPin size={12} /> {review.location}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="luxury-text text-xs text-muted-foreground mb-2">{review.date}</p>
                            <div className="flex gap-1 justify-end">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={`${
                                    i < review.rating
                                      ? 'fill-accent text-accent'
                                      : 'text-muted-foreground/20'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Review Text */}
                        <p className="luxury-text text-primary leading-relaxed">{review.text}</p>
                      </motion.div>
                    ))
                  )
                })()
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
