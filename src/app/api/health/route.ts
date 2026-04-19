// Migrated from /backend/src/routes/healthRoutes.js

import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const status = {
    success: true,
    status: "healthy",
    service: "MHOMES Booking API",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  };

  return NextResponse.json(status);
}
