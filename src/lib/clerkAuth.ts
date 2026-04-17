// /lib/clerkAuth.ts
// Migrated from /backend/src/middleware/clerkAuth.js
// 4-layer Clerk authentication + AdminUser database check

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, users } from '@clerk/clerk-sdk-node'
import { prisma } from './prisma'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

if (!CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is not set in environment variables')
}

export interface AuthUser {
  email: string
  name: string
  adminUserId: string
  isActive: boolean
  clerkUserId: string
}

/**
 * Middleware to verify Clerk token from Authorization header and check AdminUser table
 * Returns { user } on success or { error: Response } on failure
 * 
 * Flow:
 * 1. Extract token from Authorization header
 * 2. Verify token signature using Clerk secret key
 * 3. Fetch user from Clerk API to get email
 * 4. Check if email exists in AdminUser table
 * 5. Verify admin status is active
 */
export async function requireAdmin(request: NextRequest): Promise<
  { user: AuthUser } | { error: NextResponse }
> {
  try {
    // ─── Step 1: Extract Bearer token from Authorization header ───────────
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[clerkAuth] Missing or invalid Authorization header')
      return {
        error: NextResponse.json(
          {
            success: false,
            message:
              'Authorization header missing or invalid format. Use: Authorization: Bearer <token>'
          },
          { status: 401 }
        )
      }
    }

    const token = authHeader.substring(7).trim()

    if (!token) {
      console.warn('[clerkAuth] Empty bearer token')
      return {
        error: NextResponse.json(
          {
            success: false,
            message: 'Empty bearer token'
          },
          { status: 401 }
        )
      }
    }

    // ─── Step 2: Verify Clerk token signature ──────────────────────────────
    let decoded
    try {
      decoded = await verifyToken(token, {
        secretKey: CLERK_SECRET_KEY
      })
    } catch (err) {
      console.warn('[clerkAuth] Token verification failed:', (err as Error).message)
      return {
        error: NextResponse.json(
          {
            success: false,
            message: 'Invalid or expired Clerk token'
          },
          { status: 401 }
        )
      }
    }

    // ─── Step 3: Extract user ID from verified token ──────────────────────
    const userId = decoded?.sub

    if (!userId) {
      console.warn('[clerkAuth] No user ID (sub) in token claims')
      return {
        error: NextResponse.json(
          {
            success: false,
            message: 'No user ID found in Clerk token'
          },
          { status: 401 }
        )
      }
    }

    // ─── Step 4: Fetch user from Clerk API to get email ────────────────────
    let clerkUser
    try {
      clerkUser = await users.getUser(userId)
    } catch (err) {
      console.error('[clerkAuth] Failed to fetch Clerk user:', (err as Error).message)
      return {
        error: NextResponse.json(
          {
            success: false,
            message: 'Failed to verify Clerk user'
          },
          { status: 401 }
        )
      }
    }

    // Extract email from Clerk user
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress

    if (!email) {
      console.warn('[clerkAuth] No email found for Clerk user:', userId)
      return {
        error: NextResponse.json(
          {
            success: false,
            message: 'No email found in Clerk user profile'
          },
          { status: 401 }
        )
      }
    }

    // ─── Step 5: Check AdminUser table ────────────────────────────────────
    const adminUser = await prisma.adminUser.findUnique({
      where: { email }
    })

    if (!adminUser) {
      console.warn(`[clerkAuth] Admin not in database: ${email}`)
      return {
        error: NextResponse.json(
          {
            success: false,
            message: 'Access denied. Email not authorized as admin.'
          },
          { status: 403 }
        )
      }
    }

    // ─── Step 6: Verify admin status is active ────────────────────────────
    if (!adminUser.isActive) {
      console.warn(`[clerkAuth] Admin account inactive: ${email}`)
      return {
        error: NextResponse.json(
          {
            success: false,
            message: 'Access denied. Admin account is inactive.'
          },
          { status: 403 }
        )
      }
    }

    // ─── Step 7: Return authenticated user ──────────────────────────────────
    const user: AuthUser = {
      email: adminUser.email,
      name: adminUser.name,
      adminUserId: adminUser.id,
      isActive: adminUser.isActive,
      clerkUserId: userId
    }

    console.log(`✅ [clerkAuth] Admin authorized: ${email} (ID: ${adminUser.id})`)
    return { user }
  } catch (err) {
    console.error('[clerkAuth] Unexpected error:', err)
    return {
      error: NextResponse.json(
        {
          success: false,
          message: 'Authentication error'
        },
        { status: 500 }
      )
    }
  }
}
