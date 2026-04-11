// prisma/seed.js
// Run with: node prisma/seed.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding MHomes database...\n');

    // ── 1. Rooms (6 physical rooms) ──────────────────────────
    console.log('Creating rooms...');

    const rooms = await Promise.all([
        prisma.room.upsert({
            where: { roomNumber: '101' },
            update: {},
            create: {
                roomNumber: '101',
                roomType: 'premium',
                maxGuests: 2,
                pricePerNight: 5500.00,
                status: 'active',
                description: 'Premium room with garden view',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '102' },
            update: {},
            create: {
                roomNumber: '102',
                roomType: 'premium',
                maxGuests: 2,
                pricePerNight: 5500.00,
                status: 'active',
                description: 'Premium room with pool view',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '103' },
            update: {},
            create: {
                roomNumber: '103',
                roomType: 'premium',
                maxGuests: 2,
                pricePerNight: 5500.00,
                status: 'active',
                description: 'Premium room with courtyard view',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '104' },
            update: {},
            create: {
                roomNumber: '104',
                roomType: 'premium',
                maxGuests: 2,
                pricePerNight: 5500.00,
                status: 'active',
                description: 'Premium Plus Room with balcony and ocean view',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '105' },
            update: {},
            create: {
                roomNumber: '105',
                roomType: 'premium_plus',
                maxGuests: 2,
                pricePerNight: 6500.00,
                status: 'active',
                description: 'Premium Plus Room with private sit-out',
            },
        }),
        prisma.room.upsert({
            where: { roomNumber: '106' },
            update: {},
            create: {
                roomNumber: '106',
                roomType: 'premium_plus',
                maxGuests: 2,
                pricePerNight: 6500.00,
                status: 'active',
                description: 'Premium Plus corner room with panoramic view',
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