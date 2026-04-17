import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Deprecated endpoint - returns error
    return NextResponse.json(
      { success: false, message: 'Login endpoint has been deprecated. Use Clerk authentication instead.' },
      { status: 400 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
