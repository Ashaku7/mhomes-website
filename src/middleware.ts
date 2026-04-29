import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = [
  'https://mhomes.co.in',
  'https://www.mhomes.co.in',
  'https://mhomes-website.vercel.app',
  'https://mhomes-website-git-main-ashaku7s-projects.vercel.app',
]

export default function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const origin = req.headers.get('origin') || ''

  // Only allow requests from whitelisted origins
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};