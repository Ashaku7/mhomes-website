import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/coupons/validate
 * Validate a coupon code and return discount information
 * Body: { code, subtotal }
 * Response: { valid, message, discountPercentage?, discountAmount?, finalSubtotal? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    // Validate required fields
    if (!code || code.trim() === "") {
      return NextResponse.json(
        { valid: false, message: "Coupon code is required" },
        { status: 400 }
      );
    }

    if (subtotal === undefined || subtotal === null || subtotal <= 0) {
      return NextResponse.json(
        { valid: false, message: "Valid subtotal is required" },
        { status: 400 }
      );
    }

    // Search for coupon (case sensitive)
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim() },
    });

    // Check if coupon exists
    if (!coupon) {
      return NextResponse.json(
        { valid: false, message: "Invalid coupon code" },
        { status: 200 }
      );
    }

    // Check if coupon has already been used
    if (coupon.status === "used") {
      return NextResponse.json(
        { valid: false, message: "Coupon already used" },
        { status: 200 }
      );
    }

    // Check if coupon has expired
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(coupon.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
      return NextResponse.json(
        { valid: false, message: "Coupon has expired" },
        { status: 200 }
      );
    }

    // Calculate discount
    const discountAmount = Math.round(
      (subtotal * coupon.discountPercentage) / 100 * 100
    ) / 100;
    const finalSubtotal = subtotal - discountAmount;

    return NextResponse.json(
      {
        valid: true,
        message: "Coupon is valid",
        discountPercentage: coupon.discountPercentage,
        discountAmount: discountAmount,
        finalSubtotal: finalSubtotal,
        code: coupon.code,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[COUPON VALIDATE] Error:", err);
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { valid: false, message: errorMsg },
      { status: 500 }
    );
  }
}
