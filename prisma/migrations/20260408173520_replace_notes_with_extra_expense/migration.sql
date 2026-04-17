/*
  Warnings:

  - The values [pending,completed,failed] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `notes` on the `bookings` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'checked_in';
ALTER TYPE "BookingStatus" ADD VALUE 'checked_out';

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('yet_to_pay', 'paid', 'refunded', 'cancelled');
ALTER TABLE "payments" ALTER COLUMN "payment_status" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "payment_status" TYPE "PaymentStatus_new" USING ("payment_status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "payments" ALTER COLUMN "payment_status" SET DEFAULT 'yet_to_pay';
COMMIT;

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "notes",
ADD COLUMN     "extra_expense" TEXT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "payment_status" SET DEFAULT 'yet_to_pay';

-- CreateTable
CREATE TABLE "daily_counters" (
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_counters_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
