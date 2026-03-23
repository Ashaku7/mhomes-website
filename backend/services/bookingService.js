// services/bookingService.js
// Core booking engine — availability check + booking creation with row-level locking.

const prisma = require('../config/prisma');
const { createError } = require('../middlewares/errorHandler');

// ─────────────────────────────────────────────────────────────
// HELPER: validate date range
// ─────────────────────────────────────────────────────────────
const validateDates = (checkIn, checkOut) => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(ci.getTime()) || isNaN(co.getTime())) {
        throw createError(400, 'Invalid date format. Use YYYY-MM-DD.');
    }
    if (ci < today) {
        throw createError(400, 'Check-in date cannot be in the past.');
    }
    if (co <= ci) {
        throw createError(400, 'Check-out date must be after check-in date.');
    }

    return { ci, co };
};

// ─────────────────────────────────────────────────────────────
// HELPER: calculate total nights
// ─────────────────────────────────────────────────────────────
const calculateNights = (checkIn, checkOut) => {
    const diff = new Date(checkOut) - new Date(checkIn);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─────────────────────────────────────────────────────────────
// SERVICE 1: Check room availability
// GET /api/rooms/available?checkIn=&checkOut=&guests=
// ─────────────────────────────────────────────────────────────
const getAvailableRooms = async ({ checkIn, checkOut, guests }) => {
    if (!checkIn || !checkOut) {
        throw createError(400, 'checkIn and checkOut are required.');
    }

    const { ci, co } = validateDates(checkIn, checkOut);
    const guestCount = parseInt(guests) || 1;
    const nights = calculateNights(ci, co);

    // Find room IDs that are already booked for overlapping dates
    // Overlap condition: existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn
    const bookedRoomIds = await prisma.bookingRoom.findMany({
        where: {
            booking: {
                bookingStatus: { in: ['pending', 'confirmed'] },
                checkIn: { lt: co },
                checkOut: { gt: ci },
            },
        },
        select: { roomId: true },
    });

    const bookedIds = bookedRoomIds.map((br) => br.roomId);

    // Fetch all active rooms NOT in the booked list, that can fit the guest count
    const availableRooms = await prisma.room.findMany({
        where: {
            status: 'active',
            maxGuests: { gte: guestCount },
            id: { notIn: bookedIds.length > 0 ? bookedIds : [-1] },
        },
        orderBy: { pricePerNight: 'asc' },
    });

    // Group by room type
    const grouped = availableRooms.reduce((acc, room) => {
        const type = room.roomType;
        if (!acc[type]) acc[type] = { rooms: [], count: 0, pricePerNight: room.pricePerNight };
        acc[type].rooms.push({
            id: room.id,
            roomNumber: room.roomNumber,
            maxGuests: room.maxGuests,
            pricePerNight: parseFloat(room.pricePerNight),
            totalPrice: parseFloat(room.pricePerNight) * nights,
            description: room.description,
        });
        acc[type].count++;
        return acc;
    }, {});

    return {
        checkIn: ci.toISOString().split('T')[0],
        checkOut: co.toISOString().split('T')[0],
        nights,
        guestsRequested: guestCount,
        totalAvailable: availableRooms.length,
        roomsByType: grouped,
    };
};

// ─────────────────────────────────────────────────────────────
// SERVICE 2: Create a booking (with transaction + row-level lock)
// POST /api/bookings
// ─────────────────────────────────────────────────────────────
const createBooking = async ({
    // Guest details
    fullName,
    phone,
    email,
    address,
    idProofType,
    // Guest members (array)
    members = [],
    // Booking details
    roomIds,
    checkIn,
    checkOut,
    totalGuests,
    bookingSource,
    notes,
    // For online bookings
    userId = null,
}) => {
    // ── Input validation ─────────────────────────────────────
    if (!fullName || !phone) {
        throw createError(400, 'Guest full name and phone are required.');
    }
    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
        throw createError(400, 'At least one room must be selected.');
    }
    if (!checkIn || !checkOut) {
        throw createError(400, 'checkIn and checkOut are required.');
    }
    if (!bookingSource || !['online', 'offline'].includes(bookingSource)) {
        throw createError(400, 'bookingSource must be "online" or "offline".');
    }
    if (!totalGuests || totalGuests < 1) {
        throw createError(400, 'totalGuests must be at least 1.');
    }

    const { ci, co } = validateDates(checkIn, checkOut);
    const nights = calculateNights(ci, co);

    // Sanitize roomIds — ensure all are valid integers
    const sanitizedRoomIds = roomIds.map((id) => {
        const parsed = parseInt(id);
        if (isNaN(parsed)) throw createError(400, `Invalid room ID: ${id}`);
        return parsed;
    });

    // ── Transaction with row-level locking ───────────────────
    const booking = await prisma.$transaction(async (tx) => {

        // STEP 1: Lock the selected rooms using raw SQL FOR UPDATE
        // This prevents any other transaction from modifying these rows
        // until this transaction completes — eliminates race conditions
        const lockedRooms = await tx.$queryRawUnsafe(
            `SELECT id, room_number, room_type, max_guests, price_per_night, status
       FROM rooms
       WHERE id = ANY($1::int[])
       FOR UPDATE`,
            sanitizedRoomIds
        );

        // STEP 2: Verify all requested rooms actually exist
        if (lockedRooms.length !== sanitizedRoomIds.length) {
            throw createError(404, 'One or more selected rooms do not exist.');
        }

        // STEP 3: Verify no room is under maintenance
        const unavailableRooms = lockedRooms.filter((r) => r.status !== 'active');
        if (unavailableRooms.length > 0) {
            const nums = unavailableRooms.map((r) => r.room_number).join(', ');
            throw createError(409, `Room(s) ${nums} are currently under maintenance.`);
        }

        // STEP 4: Re-check availability INSIDE the transaction
        // This is the critical double-booking prevention check
        const conflictingBookings = await tx.bookingRoom.findMany({
            where: {
                roomId: { in: sanitizedRoomIds },
                booking: {
                    bookingStatus: { in: ['pending', 'confirmed'] },
                    checkIn: { lt: co },
                    checkOut: { gt: ci },
                },
            },
            include: {
                room: { select: { roomNumber: true } },
                booking: { select: { checkIn: true, checkOut: true } },
            },
        });

        if (conflictingBookings.length > 0) {
            const conflictDetails = conflictingBookings
                .map((c) => `Room ${c.room.roomNumber}`)
                .join(', ');
            throw createError(409, `${conflictDetails} ${conflictingBookings.length > 1 ? 'are' : 'is'} not available for the selected dates.`);
        }

        // STEP 5: Calculate total amount
        const totalAmount = lockedRooms.reduce((sum, room) => {
            return sum + parseFloat(room.price_per_night) * nights;
        }, 0);

        // STEP 6: Create Guest
        const guest = await tx.guest.create({
            data: {
                fullName,
                phone: phone.trim(),
                email: email?.trim().toLowerCase() || null,
                address: address || null,
                idProofType: idProofType || null,
            },
        });

        // STEP 7: Create GuestMembers (if any)
        if (members.length > 0) {
            await tx.guestMember.createMany({
                data: members.map((m) => ({
                    guestId: guest.id,
                    memberName: m.memberName,
                    age: m.age ? parseInt(m.age) : null,
                    relation: m.relation || null,
                })),
            });
        }

        // STEP 8: Create Booking with status = pending
        const newBooking = await tx.booking.create({
            data: {
                guestId: guest.id,
                userId: userId || null,
                checkIn: ci,
                checkOut: co,
                totalGuests: parseInt(totalGuests),
                bookingStatus: 'pending',
                bookingSource,
                totalAmount,
                notes: notes || null,
            },
        });

        // STEP 9: Create BookingRoom entries (link rooms to booking)
        await tx.bookingRoom.createMany({
            data: sanitizedRoomIds.map((roomId) => ({
                bookingId: newBooking.id,
                roomId,
            })),
        });

        // Return full booking details
        return {
            bookingId: newBooking.id,
            bookingStatus: newBooking.bookingStatus,
            bookingSource: newBooking.bookingSource,
            checkIn: ci.toISOString().split('T')[0],
            checkOut: co.toISOString().split('T')[0],
            nights,
            totalGuests: newBooking.totalGuests,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            guest: {
                id: guest.id,
                fullName: guest.fullName,
                phone: guest.phone,
                email: guest.email,
            },
            rooms: lockedRooms.map((r) => ({
                id: r.id,
                roomNumber: r.room_number,
                roomType: r.room_type,
                pricePerNight: parseFloat(r.price_per_night),
            })),
            membersAdded: members.length,
            message: 'Booking created successfully. Proceed to payment to confirm.',
        };
    });

    return booking;
};

// ─────────────────────────────────────────────────────────────
// SERVICE 3: Confirm booking after payment
// POST /api/bookings/:id/confirm-payment
// ─────────────────────────────────────────────────────────────
const confirmPayment = async ({ bookingId, amount, paymentMethod, transactionId }) => {
    if (!bookingId || !amount || !paymentMethod) {
        throw createError(400, 'bookingId, amount, and paymentMethod are required.');
    }

    const validMethods = ['UPI', 'card', 'cash', 'gateway'];
    if (!validMethods.includes(paymentMethod)) {
        throw createError(400, `paymentMethod must be one of: ${validMethods.join(', ')}`);
    }

    const result = await prisma.$transaction(async (tx) => {
        // Fetch and lock the booking
        const booking = await tx.booking.findUnique({
            where: { id: parseInt(bookingId) },
        });

        if (!booking) {
            throw createError(404, 'Booking not found.');
        }
        if (booking.bookingStatus === 'confirmed') {
            throw createError(409, 'Booking is already confirmed.');
        }
        if (booking.bookingStatus === 'cancelled') {
            throw createError(409, 'Cannot confirm a cancelled booking.');
        }

        // Create payment record
        const payment = await tx.payment.create({
            data: {
                bookingId: parseInt(bookingId),
                amount: parseFloat(amount),
                paymentMethod,
                paymentStatus: 'completed',
                transactionId: transactionId || null,
                paymentDate: new Date(),
            },
        });

        // Update booking status to confirmed
        const updatedBooking = await tx.booking.update({
            where: { id: parseInt(bookingId) },
            data: { bookingStatus: 'confirmed' },
        });

        return {
            bookingId: updatedBooking.id,
            bookingStatus: updatedBooking.bookingStatus,
            paymentId: payment.id,
            paymentStatus: payment.paymentStatus,
            amountPaid: parseFloat(payment.amount),
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId,
            paidAt: payment.paymentDate,
            message: 'Payment confirmed. Booking is now confirmed.',
        };
    });

    return result;
};

module.exports = { getAvailableRooms, createBooking, confirmPayment };