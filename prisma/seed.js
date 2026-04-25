// prisma/seed.js
// Run with: node prisma/seed.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding MHOMES database...\n');

    // ── 1. Rooms (6 physical rooms) ──────────────────────────
    console.log('Creating rooms...');

    const rooms = await Promise.all([
        prisma.room.upsert({
            where: { roomNumber: '1' },
            update: {},
            create: {
                roomNumber: '1',
                roomType: 'premium',
                maxGuests: 2,
                pricePerNight: 6000.00,
                status: 'active',
                description: 'Premium room with garden view',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '2' },
            update: {},
            create: {
                roomNumber: '2',
                roomType: 'premium',
                maxGuests: 2,
                pricePerNight: 6000.00,
                status: 'active',
                description: 'Premium room with pool view',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '3' },
            update: {},
            create: {
                roomNumber: '3',
                roomType: 'premium_plus',
                maxGuests: 2,
                pricePerNight: 6500.00,
                status: 'active',
                description: 'Premium Plus Room with courtyard view',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '4' },
            update: {},
            create: {
                roomNumber: '4',
                roomType: 'premium_plus',
                maxGuests: 2,
                pricePerNight: 6500.00,
                status: 'active',
                description: 'Premium Plus Room with balcony and ocean view',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '5' },
            update: {},
            create: {
                roomNumber: '5',
                roomType: 'premium',
                maxGuests: 2,
                pricePerNight: 6000.00,
                status: 'active',
                description: 'Premium room with private sit-out',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '6' },
            update: {},
            create: {
                roomNumber: '6',
                roomType: 'premium',
                maxGuests: 2,
                pricePerNight: 6000.00,
                status: 'active',
                description: 'Premium corner room with panoramic view',
            },
        }),
    ]);

    console.log(`  ${rooms.length} rooms created`);
    rooms.forEach(r => console.log(`    Room ${r.roomNumber} - ${r.roomType} - Rs.${r.pricePerNight}/night`));

    console.log('\nSeeding complete!\n');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });