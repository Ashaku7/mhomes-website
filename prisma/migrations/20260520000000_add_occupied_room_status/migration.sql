-- Add occupied status to RoomStatus enum
ALTER TYPE "RoomStatus" ADD VALUE 'occupied' BEFORE 'maintenance';
