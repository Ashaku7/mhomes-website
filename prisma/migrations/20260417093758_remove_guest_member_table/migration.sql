/*
  Warnings:

  - You are about to drop the `guest_members` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "guest_members" DROP CONSTRAINT "guest_members_guest_id_fkey";

-- DropTable
DROP TABLE "guest_members";
