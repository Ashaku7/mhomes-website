-- Add Razorpay payment fields to bookings table
ALTER TABLE "bookings" ADD COLUMN "razorpay_order_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN "expires_at" TIMESTAMP(3);

-- Add new booking statuses
-- Note: In PostgreSQL with Prisma, enums are immutable, so we recreate it
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'payment_pending' BEFORE 'pending';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'expired' AFTER 'checked_out';

-- Create index for razorpay_order_id for faster lookups
CREATE INDEX "bookings_razorpay_order_id_idx" ON "bookings"("razorpay_order_id");

-- Create index for expires_at for cleanup queries
CREATE INDEX "bookings_expires_at_idx" ON "bookings"("expires_at") WHERE "expires_at" IS NOT NULL;
