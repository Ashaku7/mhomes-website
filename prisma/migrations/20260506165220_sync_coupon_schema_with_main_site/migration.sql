-- Sync coupon schema with main site
DROP INDEX IF EXISTS "bookings_original_amount_idx";
DROP INDEX IF EXISTS "bookings_razorpay_order_id_idx";

ALTER TABLE "coupons" DROP COLUMN IF EXISTS "booking_id";
ALTER TABLE "bookings" ALTER COLUMN "original_amount" DROP DEFAULT;


