-- Add originalAmount and gstAmount columns to bookings table
ALTER TABLE "bookings" ADD COLUMN "original_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN "gst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Create index for original_amount
CREATE INDEX "bookings_original_amount_idx" ON "bookings"("original_amount");
