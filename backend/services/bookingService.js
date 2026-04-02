// services/bookingService.js
// Core booking engine — availability check + booking creation with row-level locking.

const prisma = require('../config/prisma');
const { createError } = require('../middlewares/errorHandler');

// ─── HELPER: Normalize payment method to match Prisma enum ───
const normalizePaymentMethod = (method) => {
    if (!method) return null;
    const normalized = method.toLowerCase();
    if (normalized === 'upi') return 'UPI';
    if (normalized === 'card') return 'card';
    if (normalized === 'cash') return 'cash';
    if (normalized === 'gateway') return 'gateway';
    return null;
};

// ─────────────────────────────────────────────────────────────
// HELPER: validate date range
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// HELPER: validate date range and parse properly
// ─────────────────────────────────────────────────────────────
const validateDates = (checkIn, checkOut) => {
    // Parse dates as UTC midnight (YYYY-MM-DD format)
    const ciDate = new Date(checkIn + 'T00:00:00Z');
    const coDate = new Date(checkOut + 'T00:00:00Z');
    
    // Get today at UTC midnight
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (isNaN(ciDate.getTime()) || isNaN(coDate.getTime())) {
        throw createError(400, 'Invalid date format. Use YYYY-MM-DD.');
    }
    // Allow today OR future dates
    if (ciDate < today) {
        throw createError(400, 'Check-in date must be today or in the future.');
    }
    if (coDate <= ciDate) {
        throw createError(400, 'Check-out date must be after check-in date.');
    }

    // Return original strings for database storage + UTC Date objects for calculations
    return { ci: checkIn, co: checkOut, ciDate, coDate };
};

// ─────────────────────────────────────────────────────────────
// HELPER: calculate total nights
// ─────────────────────────────────────────────────────────────
const calculateNights = (checkIn, checkOut) => {
    // Handle both string and Date inputs
    const ciDate = typeof checkIn === 'string' 
        ? new Date(checkIn + 'T00:00:00Z')
        : checkIn;
    const coDate = typeof checkOut === 'string'
        ? new Date(checkOut + 'T00:00:00Z')
        : checkOut;
    const diff = coDate - ciDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─────────────────────────────────────────────────────────────
// SERVICE 1: Search available rooms with allocation logic
// GET /api/rooms/search?checkIn=&checkOut=&roomType=&roomCount=
// ─────────────────────────────────────────────────────────────
const searchAvailableRooms = async ({ checkIn, checkOut, roomType, roomCount }) => {
    // Validation
    if (!checkIn || !checkOut || !roomType || roomCount === undefined) {
        throw createError(400, 'checkIn, checkOut, roomType, and roomCount are required.');
    }

    const validRoomTypes = ['premium', 'premium_plus'];
    if (!validRoomTypes.includes(roomType)) {
        throw createError(400, 'roomType must be "premium" or "premium_plus".');
    }

    const count = parseInt(roomCount);
    if (isNaN(count) || count < 1 || count > 6) {
        throw createError(400, 'roomCount must be a positive integer between 1 and 6.');
    }

    // Step 1: Validate dates and calculate nights
    const { ci, co, ciDate, coDate } = validateDates(checkIn, checkOut);
    const nights = calculateNights(ci, co);
    
    console.log(`[SEARCH DEBUG] Input: checkIn=${checkIn}, checkOut=${checkOut}, roomType=${roomType}, roomCount=${count}`);
    console.log(`[SEARCH DEBUG] String dates: ci=${ci}, co=${co}`);
    console.log(`[SEARCH DEBUG] Nights: ${nights}`);

    // Step 2: Find booked room IDs for this date range
    const bookedRoomIds = await prisma.bookingRoom.findMany({
        where: {
            booking: {
                bookingStatus: { in: ['pending', 'confirmed'] },
                checkIn: { lt: coDate },
                checkOut: { gt: ciDate },
            },
        },
        select: { roomId: true },
    });

    const bookedIds = bookedRoomIds.map((br) => br.roomId);
    console.log(`[SEARCH DEBUG] Booked room IDs: ${JSON.stringify(bookedIds)}`);

    // Step 2b: Debug - check total rooms in database
    const totalRooms = await prisma.room.count();
    const activeRooms = await prisma.room.count({
        where: { status: 'active' },
    });
    console.log(`[SEARCH DEBUG] Total rooms: ${totalRooms}, Active rooms: ${activeRooms}`);

    // Fetch all active rooms NOT booked
    const allAvailableRooms = await prisma.room.findMany({
        where: {
            status: 'active',
            id: { notIn: bookedIds.length > 0 ? bookedIds : [] },
        },
    });
    
    console.log(`[SEARCH DEBUG] All available rooms (not booked): ${allAvailableRooms.length}`);
    allAvailableRooms.forEach(r => console.log(`  - Room ${r.roomNumber} (${r.roomType}): ${r.pricePerNight}/night`));

    // Step 3: Separate into two arrays and sort by roomNumber
    const availablePremiumPlus = allAvailableRooms
        .filter(r => r.roomType === 'premium_plus')
        .sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber));

    const availablePremium = allAvailableRooms
        .filter(r => r.roomType === 'premium')
        .sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber));
    
    console.log(`[SEARCH DEBUG] Separated: premium_plus=${availablePremiumPlus.length}, premium=${availablePremium.length}`);

    // Step 4: Simple allocation - only the requested room type, no fallbacks
    let assignedRooms = [];

    if (roomType === 'premium_plus') {
        // Show only premium_plus rooms that are available (could be 0, 1, 2, etc.)
        assignedRooms = availablePremiumPlus.slice(0, count);
    } else if (roomType === 'premium') {
        // Show only premium rooms that are available (could be 0, 1, 2, etc.)
        assignedRooms = availablePremium.slice(0, count);
    }

    // Step 5: Calculate pricing
    const totalPerNight = assignedRooms.reduce((sum, room) => sum + parseFloat(room.pricePerNight), 0);
    const totalAmount = totalPerNight * nights;

    // Step 6: Return result (per spec)
    // IMPORTANT: If fewer rooms available than requested, reject the booking
    if (assignedRooms.length < count) {
        const availableCount = assignedRooms.length;
        console.log(`[SEARCH DEBUG] Insufficient rooms. Requested: ${count}, Available: ${availableCount}`);
        return {
            available: false,
            success: false,
            rooms: [],
            assignedRooms: [],
            totalAmount: 0,
            message: `Only ${availableCount} ${roomType} room(s) available. You requested ${count}.`,
            _debug: {
                totalRoomsInDb: totalRooms,
                activeRoomsInDb: activeRooms,
                bookedRoomIds: bookedIds,
                availablePremiumPlus: availablePremiumPlus.length,
                availablePremium: availablePremium.length,
                requestedCount: count,
                requestedType: roomType,
            }
        };
    }

    return {
        available: true,
        success: true,
        rooms: assignedRooms.map(r => ({
            id: r.id,
            roomNumber: r.roomNumber,
            roomType: r.roomType,
            pricePerNight: parseFloat(r.pricePerNight),
            maxGuests: r.maxGuests,
        })),
        assignedRooms: assignedRooms.map(r => ({
            id: r.id,
            roomNumber: r.roomNumber,
            roomType: r.roomType,
            pricePerNight: parseFloat(r.pricePerNight),
        })),
        checkIn: checkIn,
        checkOut: checkOut,
        nights: nights,
        totalPerNight: totalPerNight,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        _debug: {
            totalRoomsInDb: totalRooms,
            activeRoomsInDb: activeRooms,
            bookedRoomIds: bookedIds,
            availablePremiumPlus: availablePremiumPlus.length,
            availablePremium: availablePremium.length,
            requestedCount: count,
            requestedType: roomType,
        }
    };
};

// ─────────────────────────────────────────────────────────────
// SERVICE 1b: Check room availability (legacy)
// GET /api/rooms/available?checkIn=&checkOut=&guests=
// ─────────────────────────────────────────────────────────────
const getAvailableRooms = async ({ checkIn, checkOut, guests }) => {
    if (!checkIn || !checkOut) {
        throw createError(400, 'checkIn and checkOut are required.');
    }

    const { ci, co, ciDate, coDate } = validateDates(checkIn, checkOut);
    const guestCount = parseInt(guests) || 1;
    const nights = calculateNights(ci, co);

    // Find room IDs that are already booked for overlapping dates
    const bookedRoomIds = await prisma.bookingRoom.findMany({
        where: {
            booking: {
                bookingStatus: { in: ['pending', 'confirmed'] },
                checkIn: { lt: coDate },
                checkOut: { gt: ciDate },
            },
        },
        select: { roomId: true },
    });

    const bookedIds = bookedRoomIds.map((br) => br.roomId);

    // Fetch all active rooms NOT in the booked list.
    const availableRooms = await prisma.room.findMany({
        where: {
            status: 'active',
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
        checkIn: ci,
        checkOut: co,
        nights,
        guestsRequested: guestCount,
        totalAvailable: availableRooms.length,
        roomsByType: grouped,
    };
};

// ─────────────────────────────────────────────────────────────
// HELPER: Generate unique booking reference MH-YYYY-XXXX (no DB query)
// ─────────────────────────────────────────────────────────────
const generateBookingReference = async (tx) => {
    const currentYear = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 9999) + 1;
    const reference = `MH-${currentYear}-${String(randomNum).padStart(4, '0')}`;
    return reference;
};

// ─────────────────────────────────────────────────────────────
// SERVICE 2: Create ONLINE booking (auto room allocation + transaction)
// POST /api/bookings/online
// ─────────────────────────────────────────────────────────────
const createOnlineBooking = async ({
    // Guest details
    fullName,
    email,
    phone,
    members = [],
    // Booking details
    roomIds,
    checkIn,
    checkOut,
    totalGuests,
    bookingSource = 'online',
    notes = '',
}) => {
    // ── Input validation ─────────────────────────────────────
    if (!fullName || !email || !phone) {
        throw createError(400, 'fullName, email, and phone are required.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        throw createError(400, 'Please provide a valid email address.');
    }

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
        throw createError(400, 'At least one room must be selected.');
    }

    if (!checkIn || !checkOut) {
        throw createError(400, 'checkIn and checkOut are required.');
    }

    if (!totalGuests || totalGuests < 1) {
        throw createError(400, 'totalGuests must be at least 1.');
    }

    const { ci, co, ciDate, coDate } = validateDates(checkIn, checkOut);
    const nights = calculateNights(ci, co);

    // Sanitize roomIds
    const sanitizedRoomIds = roomIds.map((id) => {
        const parsed = parseInt(id);
        if (isNaN(parsed)) throw createError(400, `Invalid room ID: ${id}`);
        return parsed;
    });

    // ── Transaction with row-level locking ───────────────────
    const booking = await prisma.$transaction(async (tx) => {
        // STEP 1: Lock the selected rooms using FOR UPDATE
        const lockedRooms = await tx.$queryRawUnsafe(
            `SELECT id, room_number, room_type, max_guests, price_per_night, status
       FROM rooms
       WHERE id = ANY($1::int[])
       FOR UPDATE`,
            sanitizedRoomIds
        );

        // STEP 2: Verify all rooms exist
        if (lockedRooms.length !== sanitizedRoomIds.length) {
            throw createError(404, 'One or more selected rooms do not exist.');
        }

        // STEP 3: Verify no room is under maintenance
        const unavailableRooms = lockedRooms.filter((r) => r.status !== 'active');
        if (unavailableRooms.length > 0) {
            const nums = unavailableRooms.map((r) => r.room_number).join(', ');
            throw createError(409, `Room(s) ${nums} are currently under maintenance.`);
        }

        // STEP 4: Re-check availability INSIDE transaction (no bookings overlap)
        const conflictingBookings = await tx.bookingRoom.findMany({
            where: {
                roomId: { in: sanitizedRoomIds },
                booking: {
                    bookingStatus: { in: ['pending', 'confirmed'] },
                    checkIn: { lt: coDate },
                    checkOut: { gt: ciDate },
                },
            },
            include: {
                room: { select: { roomNumber: true } },
            },
        });

        if (conflictingBookings.length > 0) {
            const conflictDetails = conflictingBookings
                .map((c) => `Room ${c.room.roomNumber}`)
                .join(', ');
            throw createError(409, `${conflictDetails} ${conflictingBookings.length > 1 ? 'are' : 'is'} no longer available for the selected dates.`);
        }

        // STEP 5: Calculate total amount
        const totalAmount = lockedRooms.reduce((sum, room) => {
            return sum + parseFloat(room.price_per_night) * nights;
        }, 0);

        // STEP 6: Generate booking reference
        const bookingReference = await generateBookingReference(tx);

        // STEP 7: Create Guest
        const guest = await tx.guest.create({
            data: {
                fullName: fullName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
            },
        });

        // STEP 8: Create GuestMembers if any
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

        // STEP 9: Create Booking
        const newBooking = await tx.booking.create({
            data: {
                guestId: guest.id,
                bookingReference,
                checkIn: ci,
                checkOut: co,
                totalGuests: parseInt(totalGuests),
                bookingStatus: 'pending',
                bookingSource,
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                notes: notes || null,
            },
        });

        // STEP 10: Create BookingRoom entries
        await tx.bookingRoom.createMany({
            data: sanitizedRoomIds.map((roomId) => ({
                bookingId: newBooking.id,
                roomId,
            })),
        });

        // STEP 11: Create Payment (yet_to_pay status)
        const payment = await tx.payment.create({
            data: {
                bookingId: newBooking.id,
                amount: parseFloat(totalAmount.toFixed(2)),
                paymentStatus: 'yet_to_pay',
                paymentMethod: 'gateway',
            },
        });

        // Return response
        return {
            bookingId: newBooking.id,
            bookingReference,
            guest: {
                id: guest.id,
                fullName: guest.fullName,
                phone: guest.phone,
                email: guest.email,
            },
            checkIn: ci,
            checkOut: co,
            nights,
            rooms: lockedRooms.map(r => ({
                id: r.id,
                roomNumber: r.room_number,
                roomType: r.room_type,
                pricePerNight: parseFloat(r.price_per_night),
            })),
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            paymentStatus: 'yet_to_pay',
            bookingStatus: 'pending',
        };
    });

    return booking;
};

// ─────────────────────────────────────────────────────────────
// SERVICE 2b: Legacy booking (for backward compatibility)
// ─────────────────────────────────────────────────────────────
const createBooking = async ({
    // Guest details
    fullName,
    phone,
    email,
    address,
    idProofType,
    idProofNumber,
    // Booking details
    roomIds,
    checkIn,
    checkOut,
    totalGuests,
    bookingSource,
    notes,
}) => {
    // This endpoint is deprecated, use createOnlineBooking or createWalkinBooking instead
    throw createError(400, 'This endpoint is deprecated. Use POST /api/bookings/online or POST /api/admin/bookings/walkin');
};

// ─────────────────────────────────────────────────────────────
// SERVICE 3: Confirm booking after payment
// POST /api/bookings/:id/confirm-payment
// ─────────────────────────────────────────────────────────────
const confirmPayment = async ({ bookingId, amount, paymentMethod, transactionId }) => {
    if (!bookingId || !amount || !paymentMethod) {
        throw createError(400, 'bookingId, amount, and paymentMethod are required.');
    }

    const normalized = normalizePaymentMethod(paymentMethod);
    if (!normalized) {
        throw createError(400, 'paymentMethod must be one of: UPI, card, cash, gateway');
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
                paymentMethod: normalized,
                paymentStatus: 'paid',
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

// ─────────────────────────────────────────────────────────────
// SERVICE 4b: Update booking status (new)
// PATCH /api/bookings/:id/status
// ─────────────────────────────────────────────────────────────
const updateBookingStatus = async ({ bookingId, bookingStatus }) => {
    if (!bookingId) {
        throw createError(400, 'bookingId is required.');
    }

    if (!bookingStatus) {
        throw createError(400, 'bookingStatus is required.');
    }

    const validStatuses = ['confirmed', 'checked_in', 'checked_out'];
    if (!validStatuses.includes(bookingStatus)) {
        throw createError(400, `bookingStatus must be one of: ${validStatuses.join(', ')}`);
    }

    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(bookingId) },
    });

    if (!booking) {
        throw createError(404, 'Booking not found.');
    }

    // Check allowed transitions
    const allowedTransitions = {
        'confirmed': ['checked_in'],
        'checked_in': ['checked_out'],
    };

    if (!allowedTransitions[booking.bookingStatus] || !allowedTransitions[booking.bookingStatus].includes(bookingStatus)) {
        throw createError(400, `Invalid status transition from ${booking.bookingStatus} to ${bookingStatus}. Allowed transitions: confirmed -> checked_in, checked_in -> checked_out.`);
    }

    const updated = await prisma.booking.update({
        where: { id: parseInt(bookingId) },
        data: { bookingStatus },
    });

    return {
        bookingId: updated.id,
        bookingStatus: updated.bookingStatus,
        message: `Booking status updated to ${updated.bookingStatus}.`,
    };
};

// ─────────────────────────────────────────────────────────────
// SERVICE 5: Get all pending bookings
// GET /api/bookings/pending
// ─────────────────────────────────────────────────────────────
const getPendingBookings = async () => {
    const bookings = await prisma.booking.findMany({
        where: { bookingStatus: 'pending' },
        include: {
            guest: {
                select: {
                    fullName: true,
                    phone: true,
                    email: true,
                },
            },
            payments: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return {
        total: bookings.length,
        bookings: bookings.map(b => ({
            id: b.id,
            bookingReference: b.bookingReference,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            totalAmount: parseFloat(b.totalAmount),
            createdAt: b.createdAt,
            bookingStatus: b.bookingStatus,
            guest: b.guest,
            payments: b.payments.map(p => ({
                id: p.id,
                amount: parseFloat(p.amount),
                paymentMethod: p.paymentMethod,
                paymentStatus: p.paymentStatus,
                transactionId: p.transactionId,
                paymentDate: p.paymentDate,
            })),
        })),
    };
};

// ─── SERVICE: Search available rooms (new endpoint) ──────────────────
const searchRoomsSimple = async ({ checkIn, checkOut, roomType }) => {
    // Validation
    if (!checkIn || !checkOut) {
        throw createError(400, 'checkIn and checkOut are required.');
    }

    const validRoomTypes = ['premium', 'premium_plus'];
    if (roomType && !validRoomTypes.includes(roomType)) {
        throw createError(400, 'roomType must be "premium" or "premium_plus".');
    }

    // Parse and validate dates
    const { ci, co } = validateDates(checkIn, checkOut);

    // Find booked room IDs for this date range (excluding cancelled bookings)
    const bookedRoomIds = await prisma.bookingRoom.findMany({
        where: {
            booking: {
                bookingStatus: { in: ['pending', 'confirmed', 'checked_in', 'checked_out'] },
                checkIn: { lt: co },
                checkOut: { gt: ci },
            },
        },
        select: { roomId: true },
    });

    const bookedIds = new Set(bookedRoomIds.map((br) => br.roomId));

    // Find all active rooms (excluding booked ones)
    const where = { status: 'active' };
    if (roomType) {
        where.roomType = roomType;
    }

    const rooms = await prisma.room.findMany({
        where,
        orderBy: { roomNumber: 'asc' },
    });

    // Filter out booked rooms
    const availableRooms = rooms.filter((room) => !bookedIds.has(room.id));

    return {
        total: availableRooms.length,
        rooms: availableRooms.map((r) => ({
            id: r.id,
            roomNumber: r.roomNumber,
            roomType: r.roomType,
            maxGuests: r.maxGuests,
            pricePerNight: parseFloat(r.pricePerNight),
            description: r.description,
        })),
    };
};

// ─── SERVICE: Create offline booking ──────────────────────────────────
const createOfflineBooking = async ({
    guest,
    members,
    booking,
    payment,
    bookingStatus,
}) => {
    // Validation
    if (!guest || !guest.fullName || !guest.phone || !guest.email) {
        throw createError(400, 'Guest fullName, phone, and email are required.');
    }

    if (!booking || !booking.checkIn || !booking.checkOut || booking.totalGuests === undefined) {
        throw createError(400, 'Booking checkIn, checkOut, and totalGuests are required.');
    }

    if (!Array.isArray(booking.roomIds) || booking.roomIds.length === 0) {
        throw createError(400, 'At least one roomId must be provided.');
    }

    if (!payment || !payment.paymentMethod) {
        throw createError(400, 'Payment method is required.');
    }

    const validBookingStatuses = ['confirmed', 'checked_in'];
    if (!validBookingStatuses.includes(bookingStatus)) {
        throw createError(400, 'bookingStatus must be "confirmed" or "checked_in".');
    }

    const normalized = normalizePaymentMethod(payment.paymentMethod);
    if (!normalized) {
        throw createError(400, 'Invalid paymentMethod.');
    }

    // Parse and validate dates
    const { ci, co } = validateDates(booking.checkIn, booking.checkOut);

    return await prisma.$transaction(async (tx) => {
        // Step 1: Find or create guest
        let guestRecord = await tx.guest.findFirst({
            where: { phone: guest.phone },
        });

        if (!guestRecord) {
            guestRecord = await tx.guest.create({
                data: {
                    fullName: guest.fullName,
                    phone: guest.phone,
                    email: guest.email || null,
                    address: guest.address || null,
                    idProofType: guest.idProofType || null,
                },
            });
        }

        // Step 2: Create GuestMembers if provided
        if (members && Array.isArray(members) && members.length > 0) {
            await tx.guestMember.createMany({
                data: members.map((m) => ({
                    guestId: guestRecord.id,
                    memberName: m.memberName,
                    age: m.age || null,
                    relation: m.relation || null,
                })),
            });
        }

        // Step 3: Generate unique booking reference
        const currentYear = new Date().getFullYear();
        const prefix = `MH-${currentYear}`;

        const lastBooking = await tx.booking.findMany({
            where: { bookingReference: { startsWith: prefix } },
            orderBy: { bookingReference: 'desc' },
            take: 1,
        });

        let nextNum = 1;
        if (lastBooking.length > 0) {
            const lastRef = lastBooking[0].bookingReference;
            const lastNum = parseInt(lastRef.split('-')[2]);
            if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }

        const bookingReference = `${prefix}-${String(nextNum).padStart(4, '0')}`;

        // Step 4: Create Booking
        const newBooking = await tx.booking.create({
            data: {
                guestId: guestRecord.id,
                bookingReference,
                checkIn: ci,
                checkOut: co,
                totalGuests: parseInt(booking.totalGuests),
                bookingStatus,
                bookingSource: 'offline',
                totalAmount: booking.totalAmount ? parseFloat(booking.totalAmount) : 0,
                notes: booking.notes || null,
            },
        });

        // Step 5: Create BookingRoom entries
        await tx.bookingRoom.createMany({
            data: booking.roomIds.map((roomId) => ({
                bookingId: newBooking.id,
                roomId: parseInt(roomId),
            })),
        });

        // Step 6: Create Payment
        const paymentRecord = await tx.payment.create({
            data: {
                bookingId: newBooking.id,
                amount: payment.amount ? parseFloat(payment.amount) : newBooking.totalAmount,
                paymentMethod: normalized,
                paymentStatus: 'paid',
                transactionId: payment.transactionId || null,
                paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
            },
        });

        // Fetch full booking with relations
        const fullBooking = await tx.booking.findUnique({
            where: { id: newBooking.id },
            include: {
                guest: {
                    include: {
                        members: true,
                    },
                },
                bookingRooms: {
                    include: {
                        room: true,
                    },
                },
                payments: true,
            },
        });

        return {
            id: fullBooking.id,
            bookingReference: fullBooking.bookingReference,
            checkIn: fullBooking.checkIn,
            checkOut: fullBooking.checkOut,
            totalGuests: fullBooking.totalGuests,
            bookingStatus: fullBooking.bookingStatus,
            bookingSource: fullBooking.bookingSource,
            totalAmount: parseFloat(fullBooking.totalAmount),
            notes: fullBooking.notes,
            createdAt: fullBooking.createdAt,
            guest: {
                id: fullBooking.guest.id,
                fullName: fullBooking.guest.fullName,
                phone: fullBooking.guest.phone,
                email: fullBooking.guest.email,
                address: fullBooking.guest.address,
                idProofType: fullBooking.guest.idProofType,
                members: fullBooking.guest.members,
            },
            rooms: fullBooking.bookingRooms.map((br) => ({
                id: br.room.id,
                roomNumber: br.room.roomNumber,
                roomType: br.room.roomType,
                maxGuests: br.room.maxGuests,
                pricePerNight: parseFloat(br.room.pricePerNight),
            })),
            payment: {
                id: paymentRecord.id,
                amount: parseFloat(paymentRecord.amount),
                paymentMethod: paymentRecord.paymentMethod,
                paymentStatus: paymentRecord.paymentStatus,
                transactionId: paymentRecord.transactionId,
                paymentDate: paymentRecord.paymentDate,
            },
        };
    });
};

const getBookings = async ({ status, source, date, checkOutDate }) => {
    const where = {};

    if (status) {
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out'];
        if (!validStatuses.includes(status)) {
            throw createError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        where.bookingStatus = status;
    }

    if (source) {
        const validSources = ['online', 'offline'];
        if (!validSources.includes(source)) {
            throw createError(400, `Invalid source. Must be one of: ${validSources.join(', ')}`);
        }
        where.bookingSource = source;
    }

    if (date) {
        // Parse date as YYYY-MM-DD for checkIn filter
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            throw createError(400, 'Date must be in YYYY-MM-DD format.');
        }
        const startDate = new Date(date + 'T00:00:00Z');
        const endDate = new Date(date + 'T23:59:59Z');
        where.checkIn = {
            gte: startDate,
            lte: endDate,
        };
    }

    if (checkOutDate) {
        // Parse checkOutDate as YYYY-MM-DD for checkOut filter
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(checkOutDate)) {
            throw createError(400, 'checkOutDate must be in YYYY-MM-DD format.');
        }
        const startDate = new Date(checkOutDate + 'T00:00:00Z');
        const endDate = new Date(checkOutDate + 'T23:59:59Z');
        where.checkOut = {
            gte: startDate,
            lte: endDate,
        };
    }

    const bookings = await prisma.booking.findMany({
        where,
        select: {
            id: true,
            bookingReference: true,
            checkIn: true,
            checkOut: true,
            totalGuests: true,
            bookingStatus: true,
            bookingSource: true,
            totalAmount: true,
            createdAt: true,
            guest: {
                select: {
                    fullName: true,
                    phone: true,
                },
            },
            bookingRooms: {
                select: {
                    room: {
                        select: {
                            roomNumber: true,
                        },
                    },
                },
            },
            payments: {
                select: {
                    paymentStatus: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    return bookings.map(b => ({
        id: b.id,
        bookingReference: b.bookingReference,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        totalGuests: b.totalGuests,
        bookingStatus: b.bookingStatus,
        bookingSource: b.bookingSource,
        totalAmount: parseFloat(b.totalAmount),
        createdAt: b.createdAt,
        guest: b.guest,
        rooms: b.bookingRooms.map(br => br.room),
        payments: b.payments,
    }));
};

module.exports = {
    searchAvailableRooms,
    getAvailableRooms,
    createBooking,
    createOnlineBooking,
    confirmPayment,
    getPendingBookings,
    searchRoomsSimple,
    createOfflineBooking,
    updateBookingStatus,
    getBookings,
};