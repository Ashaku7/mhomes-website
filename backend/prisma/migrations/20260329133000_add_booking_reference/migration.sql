-- AddColumn
ALTER TABLE "bookings" ADD COLUMN "booking_reference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_reference_key" ON "bookings"("booking_reference");

-- CreateIndex
CREATE INDEX "bookings_booking_reference_idx" ON "bookings"("booking_reference");
