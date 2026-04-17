-- CreateEnum
CREATE TYPE "Role" AS ENUM ('guest', 'admin', 'reception');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('premium', 'premium_plus');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('active', 'maintenance');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'card', 'cash', 'gateway');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "IdProofType" AS ENUM ('aadhaar', 'passport', 'driving_license', 'voter_id');

-- CreateTable
CREATE TABLE "guests" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "id_proof_type" "IdProofType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_members" (
    "id" SERIAL NOT NULL,
    "guest_id" INTEGER NOT NULL,
    "member_name" TEXT NOT NULL,
    "age" INTEGER,
    "relation" TEXT,

    CONSTRAINT "guest_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "room_number" TEXT NOT NULL,
    "room_type" "RoomType" NOT NULL,
    "max_guests" INTEGER NOT NULL,
    "price_per_night" DECIMAL(10,2) NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'active',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "guest_id" INTEGER NOT NULL,
    "booking_reference" TEXT,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "total_guests" INTEGER NOT NULL,
    "booking_status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "booking_source" "BookingSource" NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_rooms" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,

    CONSTRAINT "booking_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "transaction_id" TEXT,
    "payment_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guests_phone_idx" ON "guests"("phone");

-- CreateIndex
CREATE INDEX "guests_email_idx" ON "guests"("email");

-- CreateIndex
CREATE INDEX "guest_members_guest_id_idx" ON "guest_members"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_number_key" ON "rooms"("room_number");

-- CreateIndex
CREATE INDEX "rooms_status_idx" ON "rooms"("status");

-- CreateIndex
CREATE INDEX "rooms_room_type_idx" ON "rooms"("room_type");

-- CreateIndex
CREATE INDEX "bookings_guest_id_idx" ON "bookings"("guest_id");

-- CreateIndex
CREATE INDEX "bookings_check_in_check_out_idx" ON "bookings"("check_in", "check_out");

-- CreateIndex
CREATE INDEX "bookings_booking_status_idx" ON "bookings"("booking_status");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_reference_key" ON "bookings"("booking_reference");

-- CreateIndex
CREATE INDEX "bookings_booking_reference_idx" ON "bookings"("booking_reference");

-- CreateIndex
CREATE INDEX "booking_rooms_booking_id_idx" ON "booking_rooms"("booking_id");

-- CreateIndex
CREATE INDEX "booking_rooms_room_id_idx" ON "booking_rooms"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_rooms_booking_id_room_id_key" ON "booking_rooms"("booking_id", "room_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_payment_status_idx" ON "payments"("payment_status");

-- AddForeignKey
ALTER TABLE "guest_members" ADD CONSTRAINT "guest_members_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
