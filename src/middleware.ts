import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isAdminRoute = createRouteMatcher(['/admin((?!/login).*)'])
const isPublicRoute = createRouteMatcher([
  '/',
  '/reservation(.*)',
  '/reviews(.*)',
  '/admin/login(.*)',
  '/api(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Add CORS headers to all responses
  const response = NextResponse.next()
  
  response.headers.set('Access-Control-Allow-Origin', req.headers.get('origin') || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  if (isAdminRoute(req) && !isPublicRoute(req)) {
    await auth.protect()
  }
  
  return response
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']
}
