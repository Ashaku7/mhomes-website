import { NextRequest, NextResponse } from 'next/server'

// Simple route handler for basic API functionality
export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url)
  
  try {
    // Root API endpoint
    if (pathname === '/api/' || pathname === '/api') {
      return NextResponse.json({
        message: 'MHOMES Resort API is running',
        status: 'success',
        timestamp: new Date().toISOString(),
        endpoints: {
          contact: '/api/contact',
          booking: '/api/booking',
          rooms: '/api/rooms',
          reviews: '/api/reviews'
        }
      })
    }

    // Contact endpoint
    if (pathname === '/api/contact') {
      return NextResponse.json({
        phone: '+1 (555) 123-4567',
        email: 'info@MHOMESresort.com',
        address: 'Tropical Paradise Island, Maldives',
        hours: {
          'Monday - Friday': '9:00 AM - 6:00 PM',
          'Saturday': '10:00 AM - 4:00 PM',
          'Sunday': '12:00 PM - 4:00 PM'
        }
      })
    }

    // Rooms endpoint
    if (pathname === '/api/rooms') {
      return NextResponse.json({
        rooms: [
          {
            id: 'ocean-villa',
            name: 'Ocean Villa',
            price: 1200,
            features: ['Private Pool', 'Ocean View', '150 sqm', 'Butler Service'],
            available: true
          },
          {
            id: 'beach-suite',
            name: 'Beach Suite',
            price: 800,
            features: ['Beach Access', 'King Bed', '80 sqm', 'Balcony'],
            available: true
          },
          {
            id: 'premium-room',
            name: 'Premium Room',
            price: 450,
            features: ['Pool View', 'Queen Bed', '45 sqm', 'Mini Bar'],
            available: true
          },
          {
            id: 'deluxe-studio',
            name: 'Premium Plus Room',
            price: 320,
            features: ['Garden View', 'Double Bed', '35 sqm', 'Work Desk'],
            available: true
          }
        ]
      })
    }

    // Reviews endpoint - Fetch from Google Places API
    if (pathname === '/api/reviews') {
      try {
        const placeId = process.env.GOOGLE_PLACE_ID
        const googleApiKey = process.env.GOOGLE_PLACES_API_KEY

        // If Google API is not configured, return fallback reviews (guest testimonials)
        if (!placeId || !googleApiKey || googleApiKey === 'your_google_places_api_key') {
          return NextResponse.json({
            reviews: [
              {
                id: '1',
                name: 'Arjun Mehta',
                location: 'Mumbai, India',
                rating: 5,
                text: 'Stayed in the Premium Plus Room for our anniversary and it exceeded every expectation. The room was spotless, staff were incredibly warm, and the whole experience felt very personal. Highly recommend MHOMES to anyone looking for a peaceful luxury getaway.',
                date: 'April 15, 2026',
                source: 'guest',
                verified: true
              },
              {
                id: '2',
                name: 'Priya Subramaniam',
                location: 'Chennai, India',
                rating: 5,
                text: 'We booked two Premium Rooms for a family trip and the entire process from online booking to check-out was seamless. The rooms were spacious, well-maintained, and the team made sure every need was taken care of. Will definitely be coming back!',
                date: 'April 12, 2026',
                source: 'guest',
                verified: true
              },
              {
                id: '3',
                name: 'Karthik Rajan',
                location: 'Coimbatore, India',
                rating: 5,
                text: 'MHOMES Resort is a hidden gem. The ambience is serene, the rooms are beautifully maintained, and the staff go out of their way to make you feel at home. Checked in for a weekend trip and honestly did not want to leave.',
                date: 'April 8, 2026',
                source: 'guest',
                verified: true
              },
              {
                id: '4',
                name: 'Sneha & Vikram Nair',
                location: 'Bangalore, India',
                rating: 5,
                text: 'Chose MHOMES for our honeymoon and it was the best decision we made. The Premium Plus Room was stunning, the privacy was great, and the staff were so thoughtful — they even surprised us with a small decoration in the room. Perfect in every way.',
                date: 'April 5, 2026',
                source: 'guest',
                verified: true
              },
              {
                id: '5',
                name: 'Deepa Krishnamurthy',
                location: 'Madurai, India',
                rating: 5,
                text: 'Attended a small family gathering here and the experience was wonderful. Booking multiple rooms was easy, the property is well-kept, and the overall vibe is calm and luxurious. Great value for the quality you get. Strongly recommend MHOMES Resort.',
                date: 'March 28, 2026',
                source: 'guest',
                verified: true
              }
            ],
            averageRating: 5.0,
            totalReviews: 5,
            source: 'fallback',
            message: 'Displaying guest testimonials. Configure Google Places API for real Google reviews.'
          })
        }

        // Fetch from Google Places API
        const googleResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${googleApiKey}&fields=reviews,rating,user_ratings_total`
        )

        if (!googleResponse.ok) {
          throw new Error('Google API request failed')
        }

        const googleData = await googleResponse.json()

        if (googleData.status !== 'OK') {
          console.warn('Google Places API error:', googleData.status)
          throw new Error(`Google API error: ${googleData.status}`)
        }

        const reviews = googleData.result?.reviews || []
        const averageRating = googleData.result?.rating || 0
        const totalReviews = googleData.result?.user_ratings_total || 0

        // Transform Google reviews to match our format
        const formattedReviews = reviews.map((review: any) => ({
          id: review.time?.toString() || Math.random().toString(),
          name: review.author_name || 'Anonymous',
          location: review.profile_photo_url ? 'Verified Guest' : 'Guest',
          rating: review.rating,
          text: review.text,
          date: new Date(review.time * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          source: 'google',
          verified: true,
          profilePhotoUrl: review.profile_photo_url
        }))

        return NextResponse.json({
          reviews: formattedReviews,
          averageRating,
          totalReviews,
          source: 'google',
          businessUrl: process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL || 'https://www.google.com/maps'
        })
      } catch (error) {
        console.error('Reviews API error:', error)
        
        // Return fallback reviews on error
        return NextResponse.json({
          reviews: [
            {
              id: '1',
              name: 'Sarah Johnson',
              location: 'New York, USA',
              rating: 5,
              text: 'Absolutely magical experience! The overwater villa was beyond our dreams, and the service was impeccable.',
              date: 'November 15, 2025',
              source: 'fallback',
              verified: true
            },
            {
              id: '2',
              name: 'Marco Rodriguez',
              location: 'Madrid, Spain',
              rating: 5,
              text: 'The perfect honeymoon destination. Every detail was carefully planned.',
              date: 'November 10, 2025',
              source: 'fallback',
              verified: true
            },
            {
              id: '3',
              name: 'Emily Chen',
              location: 'Singapore',
              rating: 5,
              text: 'Luxury redefined. The attention to detail and personalized service made our anniversary truly unforgettable.',
              date: 'November 5, 2025',
              source: 'fallback',
              verified: true
            }
          ],
          averageRating: 4.8,
          totalReviews: 247,
          source: 'fallback',
          error: 'Could not fetch Google reviews at this time'
        })
      }
    }

    // Booking placeholder endpoint
    if (pathname === '/api/booking') {
      return NextResponse.json({
        message: 'Booking system coming soon!',
        status: 'placeholder',
        contact: {
          phone: '+1 (555) 123-4567',
          email: 'reservations@MHOMESresort.com'
        },
        note: 'Please contact us directly for reservations until our online booking system is ready.'
      })
    }

    // Default 404 for unknown endpoints
    // Letterhead/Images endpoint for bill printing
    if (pathname === '/api/letterhead') {
      const url = new URL(request.url)
      const type = url.searchParams.get('type') || 'header'
      
      try {
        const fs = await import('fs').then(m => m.promises)
        const path = await import('path')
        
        const assetPath = type === 'footer' 
          ? path.join(process.cwd(), 'backend/assets/letterhead_footer.png')
          : path.join(process.cwd(), 'backend/assets/letterhead_header.png')
        
        try {
          const imageBuffer = await fs.readFile(assetPath)
          return new Response(new Uint8Array(imageBuffer), {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=3600'
            }
          })
        } catch (e) {
          // If footer doesn't exist, generate an SVG fallback
          if (type === 'footer') {
            const svgFooter = `
              <svg width="1200" height="120" xmlns="http://www.w3.org/2000/svg">
                <rect width="1200" height="120" fill="#FAFAF8"/>
                <line x1="0" y1="0" x2="1200" y2="0" stroke="#C9A84C" stroke-width="3"/>
                <text x="50" y="50" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#6B2D1F">MHOMES Resort</text>
                <text x="600" y="45" font-family="Arial, sans-serif" font-size="12" fill="#7A6A5A" text-anchor="middle">S-37, Foreigners Road, Madurai - 625001</text>
                <text x="600" y="65" font-family="Arial, sans-serif" font-size="11" fill="#7A6A5A" text-anchor="middle">📧 karthikeyan@mhomes.co.in | 📱 +91-9765555346</text>
                <line x1="0" y1="115" x2="1200" y2="115" stroke="#D4C5B9" stroke-width="1"/>
              </svg>
            `
            return new Response(svgFooter, {
              headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=3600'
              }
            })
          }
          
          // For header, file should exist
          console.warn(`Letterhead image not found: ${assetPath}`)
          return NextResponse.json({
            error: 'Image not found',
            message: 'The requested letterhead image could not be found',
            type: type,
            path: assetPath
          }, { status: 404 })
        }
      } catch (e) {
        console.error('Error reading letterhead:', e)
        return NextResponse.json({
          error: 'Error reading image',
          message: 'Could not process the letterhead image'
        }, { status: 500 })
      }
    }

    return NextResponse.json(
      { 
        error: 'Endpoint not found',
        message: `The endpoint ${pathname} does not exist`,
        availableEndpoints: ['/api/', '/api/contact', '/api/rooms', '/api/reviews', '/api/booking', '/api/letterhead']
      },
      { status: 404 }
    )

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Something went wrong processing your request'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url)
  
  try {
    // Contact form submission
    if (pathname === '/api/contact') {
      const body = await request.json()
      
      // In a real application, you would:
      // 1. Validate the input data
      // 2. Save to database
      // 3. Send email notification
      // 4. Return appropriate response
      
      console.log('Contact form submission:', body)
      
      return NextResponse.json({
        message: 'Thank you for your message! We will get back to you within 24 hours.',
        status: 'success',
        timestamp: new Date().toISOString()
      })
    }

    // Review submission
    if (pathname === '/api/reviews') {
      const body = await request.json()
      
      console.log('Review submission:', body)
      
      return NextResponse.json({
        message: 'Thank you for your review! It will be published after moderation.',
        status: 'success',
        timestamp: new Date().toISOString()
      })
    }

    // Booking inquiry
    if (pathname === '/api/booking') {
      const body = await request.json()

      console.log('Booking inquiry:', body)

      return NextResponse.json({
        message: 'Booking inquiry received! Our team will contact you within 2 hours to confirm your reservation.',
        status: 'success',
        timestamp: new Date().toISOString(),
        inquiryId: `INQ-${Date.now()}`
      })
    }

    // Chatbot endpoint
    if (pathname === '/api/chat') {
      const body = await request.json()
      const userMessage = body.message || ''

      const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'google_api_key'

      if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        // Fallback to rule-based if no API key
        let response = 'I\'m here to help with your questions about MHOMES Resort. How can I assist you today?'
        const lowerMessage = userMessage.toLowerCase()

        if (lowerMessage.includes('room') || lowerMessage.includes('accommodation')) {
          response = 'We offer luxurious accommodations including Ocean Villas, Beach Suites, Premium Rooms, and Premium Plus Rooms. Prices range from $320 to $1,200 per night. Would you like more details on any specific room type?'
        } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
          response = 'Our room rates vary by season and type. Ocean Villas start at $1,200/night, Beach Suites at $800/night, Premium Rooms at $450/night, and Premium Plus Rooms at $320/night. Contact us for current availability and special rates.'
        } else if (lowerMessage.includes('dining') || lowerMessage.includes('restaurant') || lowerMessage.includes('food')) {
          response = 'Enjoy world-class dining at our Azure Restaurant (Michelin-starred), Sunset Lounge (bar & grill), and Poolside Café. We serve international fusion, Mediterranean, and continental cuisine.'
        } else if (lowerMessage.includes('spa') || lowerMessage.includes('wellness') || lowerMessage.includes('massage')) {
          response = 'Our luxury spa offers rejuvenating treatments inspired by ancient healing traditions. Book a couples massage or individual therapy session for ultimate relaxation.'
        } else if (lowerMessage.includes('activity') || lowerMessage.includes('experience') || lowerMessage.includes('water sport')) {
          response = 'Experience adventure with diving, snorkeling, kayaking, sailing, and cultural tours. Our fitness center is available 24/7 with personal trainers.'
        } else if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('email')) {
          response = 'Reach us at +1 (555) 123-4567 or info@MHOMESresort.com. Our office hours are Monday-Friday 9AM-6PM, Saturday 10AM-4PM, Sunday 12PM-4PM.'
        } else if (lowerMessage.includes('location') || lowerMessage.includes('address')) {
          response = 'MHOMES Resort is located on Tropical Paradise Island in the Maldives, offering pristine beaches and crystal-clear waters.'
        } else if (lowerMessage.includes('booking') || lowerMessage.includes('reservation')) {
          response = 'Our online booking system is coming soon! For now, please contact our reservations team at +1 (555) 123-4567 or reservations@MHOMESresort.com to make your reservation.'
        } else if (lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
          response = 'We accept major credit cards, bank transfers, and digital payments. A 50% deposit is required to confirm your reservation, with the balance due upon arrival. Contact our team for payment options and assistance.'
        } else if (lowerMessage.includes('facility') || lowerMessage.includes('amenities')) {
          response = 'Our resort features high-speed WiFi, valet parking, private beach access, multiple restaurants, luxury spa, 24/7 fitness center, and premium concierge services.'
        } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
          response = 'Hello! Welcome to MHOMES Resort. I\'m your virtual assistant. How can I help you plan your perfect vacation?'
        } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
          response = 'You\'re welcome! I\'m glad I could help. If you have any more questions about MHOMES Resort, feel free to ask.'
        }

        return NextResponse.json({
          response: response,
          timestamp: new Date().toISOString()
        })
      }

      // Use Gemini API
      try {
        const prompt = `You are a helpful virtual assistant for MHOMES Resort, a luxury resort in the Maldives. Provide friendly, informative responses about the resort. Key information:
- Location: Tropical Paradise Island, Maldives
- Accommodations: Ocean Villas ($1,200/night), Beach Suites ($800/night), Premium Rooms ($450/night), Premium Plus Rooms ($320/night)
- Dining: Azure Restaurant (Michelin-starred), Sunset Lounge (bar & grill), Poolside Café
- Activities: Spa treatments, water sports (diving, snorkeling, kayaking), fitness center, cultural tours
- Facilities: Private beach, infinity pool, high-speed WiFi, valet parking, luxury spa
- Contact: +1 (555) 123-4567, info@MHOMESresort.com
- Payment: Major credit cards, 50% deposit required
- Office hours: Mon-Fri 9AM-6PM, Sat 10AM-4PM, Sun 12PM-4PM

User question: ${userMessage}

Respond naturally and helpfully, keeping responses concise but informative.`

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        })

        if (!geminiResponse.ok) {
          throw new Error('Gemini API error')
        }

        const geminiData = await geminiResponse.json()
        const response = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'I\'m sorry, I couldn\'t generate a response right now. Please try again.'

        return NextResponse.json({
          response: response.trim(),
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Gemini API error:', error)
        return NextResponse.json({
          response: 'I\'m sorry, I\'m having trouble connecting to my knowledge base. Please try again later or contact us directly at +1 (555) 123-4567.',
          timestamp: new Date().toISOString()
        })
      }
    }

    return NextResponse.json(
      { 
        error: 'Method not supported',
        message: `POST method not supported for ${pathname}`
      },
      { status: 405 }
    )

  } catch (error) {
    console.error('API POST Error:', error)
    return NextResponse.json(
      { 
        error: 'Invalid request',
        message: 'Please check your request format and try again'
      },
      { status: 400 }
    )
  }
}

// Handle PATCH requests (admin operations)
export async function PATCH(request: NextRequest) {
  const { pathname } = new URL(request.url)
  
  try {
    // ADMIN: Cancel payment and refund booking
    if (pathname === '/api/admin/payments/:id/cancel' || pathname.match(/^\/api\/admin\/payments\/\d+\/cancel$/)) {
      const paymentId = parseInt(pathname.split('/')[4])
      
      if (!paymentId) {
        return NextResponse.json(
          { success: false, message: 'Payment ID is required' },
          { status: 400 }
        )
      }

      try {
        // Import singleton Prisma client
        const { default: prisma } = await import('@/lib/prisma')

        // Check if payment exists
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { booking: true },
        })

        if (!payment) {
          return NextResponse.json(
            { success: false, message: 'Payment not found' },
            { status: 404 }
          )
        }

        if (payment.paymentStatus === 'refunded') {
          return NextResponse.json(
            { success: false, message: 'Payment is already refunded' },
            { status: 409 }
          )
        }

        // Transaction: Update payment and booking atomically
        const [refundedPayment, refundedBooking] = await prisma.$transaction([
          prisma.payment.update({
            where: { id: paymentId },
            data: { paymentStatus: 'refunded' },
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: { bookingStatus: 'cancelled' },
          }),
        ])

        return NextResponse.json({
          success: true,
          data: {
            id: refundedPayment.id,
            amount: parseFloat(refundedPayment.amount?.toString() || '0'),
            paymentMethod: refundedPayment.paymentMethod,
            paymentStatus: refundedPayment.paymentStatus,
            transactionId: refundedPayment.transactionId,
            paymentDate: refundedPayment.paymentDate ? refundedPayment.paymentDate.toISOString() : null,
            booking: {
              id: refundedBooking.id,
              bookingStatus: refundedBooking.bookingStatus,
            },
            message: 'Payment refunded and booking cancelled.',
          },
        })
      } catch (dbError) {
        console.error('Database error:', dbError)
        throw dbError
      }
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Method not supported',
        message: `PATCH method not supported for ${pathname}`
      },
      { status: 405 }
    )

  } catch (error) {
    console.error('API PATCH Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Could not process your request'
      },
      { status: 500 }
    )
  }
}

// Handle other HTTP methods
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'PUT method not supported' },
    { status: 405 }
  )
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'DELETE method not supported' },
    { status: 405 }
  )
}