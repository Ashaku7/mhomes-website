import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isPublicRoute = createRouteMatcher([
  '/',
  '/reservation(.*)',
  '/reviews(.*)',
  '/admin/login(.*)',
  '/api/bookings/online',
  '/api/contact',
  '/api/rooms/search',
  '/api/reviews(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req) && !isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']
}
