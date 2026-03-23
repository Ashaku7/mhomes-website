// prisma/seed.js
// Run with: node prisma/seed.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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
                description: 'Premium Plus room with balcony and ocean view',
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
                description: 'Premium Plus room with private sit-out',
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

    // ── 2. Admin + Reception users ───────────────────────────
    console.log('\nCreating staff accounts...');

    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const receptionPassword = await bcrypt.hash('Reception@123', 12);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@mhomes.in' },
        update: {},
        create: {
            name: 'MHomes Admin',
            email: 'admin@mhomes.in',
            phone: '9000000001',
            passwordHash: adminPassword,
            role: 'admin',
        },
    });

    const reception = await prisma.user.upsert({
        where: { email: 'reception@mhomes.in' },
        update: {},
        create: {
            name: 'Front Desk',
            email: 'reception@mhomes.in',
            phone: '9000000002',
            passwordHash: receptionPassword,
            role: 'reception',
        },
    });

    console.log(`  Admin created     -> ${admin.email}`);
    console.log(`  Reception created -> ${reception.email}`);

    console.log('\nSeeding complete!\n');
    console.log('Staff login credentials:');
    console.log('  Admin     -> admin@mhomes.in     / Admin@123');
    console.log('  Reception -> reception@mhomes.in / Reception@123');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });