// services/adminService.js
const prisma = require('../config/prisma');
const { createError } = require('../middlewares/errorHandler');

// ─── helper: full booking include ────────────────────────────
const bookingInclude = {
    guest: {
        select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            address: true,
            idProofType: true,
            members: true,
        },
    },
    bookingRooms: {
        include: {
            room: true,
        },
    },
    payments: true,
};

// ─── SERVICE 1: Get all bookings ──────────────────────────────
const getAllBookings = async ({ status, source, date } = {}) => {
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
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            throw createError(400, 'Date must be in YYYY-MM-DD format.');
        }
        const day = new Date(date + 'T00:00:00Z');
        const nextDay = new Date(date + 'T00:00:00Z');
        nextDay.setDate(nextDay.getDate() + 1);
        where.checkIn = { gte: day, lt: nextDay };
    }

    const bookings = await prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { checkIn: 'asc' },
    });

    return {
        total: bookings.length,
        bookings: bookings.map(formatBooking),
    };
};

// ─── SERVICE 2: Get single booking ───────────────────────────
const getBookingById = async (id) => {
    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: bookingInclude,
    });

    if (!booking) throw createError(404, 'Booking not found.');

    return formatBooking(booking);
};

// ─── SERVICE 3: Cancel booking ────────────────────────────────
const cancelBooking = async (id, reason) => {
    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: { payments: true },
    });

    if (!booking) throw createError(404, 'Booking not found.');

    if (booking.bookingStatus === 'cancelled') {
        throw createError(409, 'Booking is already cancelled.');
    }

    const updated = await prisma.$transaction(async (tx) => {
        // Update booking status to cancelled
        const updatedBooking = await tx.booking.update({
            where: { id: parseInt(id) },
            data: {
                bookingStatus: 'cancelled',
            },
            include: bookingInclude,
        });

        // Update all associated payments to cancelled
        if (booking.payments && booking.payments.length > 0) {
            await tx.payment.updateMany({
                where: { bookingId: parseInt(id) },
                data: { paymentStatus: 'cancelled' },
            });
        }

        return updatedBooking;
    });

    return {
        ...formatBooking(updated),
        message: 'Booking cancelled successfully and payment cancelled.',
    };
};

// ─── SERVICE 3.5: Update booking status ────────────────────────
const updateBookingStatus = async (id, newStatus) => {
    const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
        throw createError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: bookingInclude,
    });

    if (!booking) throw createError(404, 'Booking not found.');

    const updated = await prisma.booking.update({
        where: { id: parseInt(id) },
        data: { bookingStatus: newStatus },
        include: bookingInclude,
    });

    return {
        ...formatBooking(updated),
        message: `Booking status updated to ${newStatus}.`,
    };
};

// ─── SERVICE 4: Get all rooms ─────────────────────────────────
const getAllRooms = async () => {
    const rooms = await prisma.room.findMany({
        orderBy: { roomNumber: 'asc' },
    });

    return {
        total: rooms.length,
        rooms: rooms.map((r) => ({
            ...r,
            pricePerNight: parseFloat(r.pricePerNight),
        })),
    };
};

// ─── SERVICE 5: Update room ───────────────────────────────────
const updateRoom = async (id, { pricePerNight, status, description, maxGuests }) => {
    const room = await prisma.room.findUnique({
        where: { id: parseInt(id) },
    });

    if (!room) throw createError(404, 'Room not found.');

    const validStatuses = ['active', 'maintenance'];
    if (status && !validStatuses.includes(status)) {
        throw createError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await prisma.room.update({
        where: { id: parseInt(id) },
        data: {
            ...(pricePerNight !== undefined && { pricePerNight: parseFloat(pricePerNight) }),
            ...(status !== undefined && { status }),
            ...(description !== undefined && { description }),
            ...(maxGuests !== undefined && { maxGuests: parseInt(maxGuests) }),
        },
    });

    return {
        ...updated,
        pricePerNight: parseFloat(updated.pricePerNight),
        message: 'Room updated successfully.',
    };
};

// ─── SERVICE 6: Dashboard summary ────────────────────────────
const getDashboardSummary = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        todayCheckIns,
        todayCheckOuts,
        totalRevenue,
        roomStats,
    ] = await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({ where: { bookingStatus: 'pending' } }),
        prisma.booking.count({ where: { bookingStatus: 'confirmed' } }),
        prisma.booking.count({ where: { bookingStatus: 'cancelled' } }),
        prisma.booking.count({
            where: { checkIn: { gte: today, lt: tomorrow }, bookingStatus: 'confirmed' },
        }),
        prisma.booking.count({
            where: { checkOut: { gte: today, lt: tomorrow }, bookingStatus: 'checked_in' },
        }),
        prisma.payment.aggregate({
            where: { paymentStatus: 'paid' },
            _sum: { amount: true },
        }),
        prisma.room.groupBy({
            by: ['status'],
            _count: { id: true },
        }),
    ]);

    const roomSummary = roomStats.reduce((acc, r) => {
        acc[r.status] = r._count.id;
        return acc;
    }, {});

    return {
        bookings: {
            total: totalBookings,
            pending: pendingBookings,
            confirmed: confirmedBookings,
            cancelled: cancelledBookings,
        },
        today: {
            checkIns: todayCheckIns,
            checkOuts: todayCheckOuts,
        },
        revenue: {
            total: parseFloat(totalRevenue._sum.amount || 0).toFixed(2),
        },
        rooms: {
            total: (roomSummary.active || 0) + (roomSummary.maintenance || 0),
            active: roomSummary.active || 0,
            maintenance: roomSummary.maintenance || 0,
        },
    };
};

// ─── SERVICE 7: Today's check-ins and check-outs ─────────────
const getTodayActivity = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [checkIns, checkOuts] = await Promise.all([
        prisma.booking.findMany({
            where: {
                checkIn: { gte: today, lt: tomorrow },
                bookingStatus: 'confirmed',
            },
            include: bookingInclude,
            orderBy: { checkIn: 'asc' },
        }),
        prisma.booking.findMany({
            where: {
                checkOut: { gte: today, lt: tomorrow },
                bookingStatus: 'checked_in',
            },
            include: bookingInclude,
            orderBy: { checkOut: 'asc' },
        }),
    ]);

    return {
        date: today.toISOString().split('T')[0],
        checkIns: { total: checkIns.length, bookings: checkIns.map(formatBooking) },
        checkOuts: { total: checkOuts.length, bookings: checkOuts.map(formatBooking) },
    };
};

// ─── HELPER: format booking output ───────────────────────────
const formatBooking = (b) => ({
    id: b.id,
    bookingReference: b.bookingReference,
    bookingStatus: b.bookingStatus,
    bookingSource: b.bookingSource,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    totalGuests: b.totalGuests,
    totalAmount: parseFloat(b.totalAmount),
    extraExpense: b.extraExpense,
    createdAt: b.createdAt,
    guest: b.guest,
    bookedBy: b.user || null,
    rooms: b.bookingRooms?.map((br) => ({
        id: br.room.id,
        roomNumber: br.room.roomNumber,
        roomType: br.room.roomType,
        pricePerNight: parseFloat(br.room.pricePerNight),
    })),
    payments: b.payments?.map((p) => ({
        id: p.id,
        amount: parseFloat(p.amount),
        paymentMethod: p.paymentMethod,
        paymentStatus: p.paymentStatus,
        transactionId: p.transactionId,
        paymentDate: p.paymentDate,
    })),
});

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

// ─── SERVICE 8: Update payment ────────────────────────────────
const updatePayment = async (paymentId, { paymentMethod, transactionId, paymentDate, status }) => {
    if (!paymentId) {
        throw createError(400, 'paymentId is required.');
    }

    if (!status || status !== 'paid') {
        throw createError(400, 'status must be "paid".');
    }

    if (!paymentMethod) {
        throw createError(400, 'paymentMethod is required.');
    }

    const normalized = normalizePaymentMethod(paymentMethod);
    if (!normalized) {
        throw createError(400, 'paymentMethod must be one of: UPI, card, cash, gateway');
    }

    const payment = await prisma.payment.findUnique({
        where: { id: parseInt(paymentId) },
        include: { booking: true },
    });

    if (!payment) {
        throw createError(404, 'Payment not found.');
    }

    if (payment.paymentStatus === 'paid') {
        throw createError(409, 'Payment is already marked as paid.');
    }

    const updated = await prisma.payment.update({
        where: { id: parseInt(paymentId) },
        data: {
            paymentMethod: normalized,
            transactionId: transactionId || null,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentStatus: 'paid',
        },
        include: { booking: true },
    });

    // If paymentStatus is set to "paid", also update the related booking's bookingStatus to "confirmed"
    if (status === 'paid') {
        await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { bookingStatus: 'confirmed' },
        });
    }

    return {
        id: updated.id,
        bookingId: updated.bookingId,
        amount: parseFloat(updated.amount),
        paymentMethod: updated.paymentMethod,
        paymentStatus: updated.paymentStatus,
        transactionId: updated.transactionId,
        paymentDate: updated.paymentDate,
        bookingStatus: 'confirmed',
        message: 'Payment updated and booking confirmed successfully.',
    };
};

const CONFLICTING_BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out'];

// ─── SERVICE 9a: Get room options for check-in reassignment ───
const getCheckInRoomOptions = async (bookingId) => {
    if (!bookingId) {
        throw createError(400, 'bookingId is required.');
    }

    const parsedBookingId = parseInt(bookingId);

    const booking = await prisma.booking.findUnique({
        where: { id: parsedBookingId },
        include: bookingInclude,
    });

    if (!booking) {
        throw createError(404, 'Booking not found.');
    }

    if (booking.bookingStatus !== 'confirmed') {
        throw createError(409, 'Room reassignment is only available for "confirmed" bookings during check-in.');
    }

    const currentRooms = booking.bookingRooms.map((br) => br.room);
    const currentRoomIdSet = new Set(currentRooms.map((r) => r.id));

    const conflictingRoomRows = await prisma.bookingRoom.findMany({
        where: {
            bookingId: { not: parsedBookingId },
            booking: {
                bookingStatus: { in: CONFLICTING_BOOKING_STATUSES },
                checkIn: { lt: booking.checkOut },
                checkOut: { gt: booking.checkIn },
            },
        },
        select: { roomId: true },
    });

    const blockedRoomIdSet = new Set(conflictingRoomRows.map((row) => row.roomId));

    const freeRooms = await prisma.room.findMany({
        where: {
            status: 'active',
            id: { notIn: Array.from(blockedRoomIdSet) },
        },
        orderBy: { roomNumber: 'asc' },
    });

    const mergedRoomMap = new Map();
    currentRooms.forEach((room) => mergedRoomMap.set(room.id, room));
    freeRooms.forEach((room) => mergedRoomMap.set(room.id, room));

    const availableRooms = Array.from(mergedRoomMap.values())
        .sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber))
        .map((room) => ({
            id: room.id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            pricePerNight: parseFloat(room.pricePerNight),
            maxGuests: room.maxGuests,
            status: room.status,
            isCurrent: currentRoomIdSet.has(room.id),
        }));

    return {
        bookingId: parsedBookingId,
        roomCount: currentRooms.length,
        currentRoomIds: Array.from(currentRoomIdSet),
        availableRooms,
    };
};

// ─── SERVICE 9: Guest check-in ────────────────────────────────
const checkInGuest = async (bookingId, { address, proofType, totalGuests, roomIds }) => {
    if (!bookingId) {
        throw createError(400, 'bookingId is required.');
    }

    const parsedBookingId = parseInt(bookingId);
    const booking = await prisma.booking.findUnique({
        where: { id: parsedBookingId },
        include: { guest: true },
    });

    if (!booking) {
        throw createError(404, 'Booking not found.');
    }

    if (booking.bookingStatus !== 'confirmed') {
        throw createError(409, 'Booking must be in "confirmed" status to check-in.');
    }

    if (proofType) {
        const validProofTypes = ['aadhaar', 'passport', 'driving_license', 'voter_id'];
        if (!validProofTypes.includes(proofType)) {
            throw createError(400, `proofType must be one of: ${validProofTypes.join(', ')}`);
        }
    }

    const bookingWithRooms = await prisma.booking.findUnique({
        where: { id: parsedBookingId },
        include: {
            bookingRooms: { select: { roomId: true } },
        },
    });

    const currentRoomIds = bookingWithRooms?.bookingRooms?.map((br) => br.roomId) || [];
    const requiredRoomCount = currentRoomIds.length;

    const selectedRoomIds = Array.isArray(roomIds)
        ? [...new Set(roomIds.map((id) => parseInt(id)).filter((id) => Number.isInteger(id) && id > 0))]
        : currentRoomIds;

    if (selectedRoomIds.length !== requiredRoomCount) {
        throw createError(400, `Exactly ${requiredRoomCount} room(s) must be selected for check-in.`);
    }

    const result = await prisma.$transaction(async (tx) => {
        const lockedRooms = await tx.$queryRawUnsafe(
            `SELECT id, room_number, status
             FROM rooms
             WHERE id = ANY($1::int[])
             FOR UPDATE`,
            selectedRoomIds
        );

        if (lockedRooms.length !== selectedRoomIds.length) {
            throw createError(404, 'One or more selected rooms do not exist.');
        }

        const unavailableRoomRows = lockedRooms.filter((r) => r.status !== 'active');
        if (unavailableRoomRows.length > 0) {
            const roomNums = unavailableRoomRows.map((r) => r.room_number).join(', ');
            throw createError(409, `Room(s) ${roomNums} are not active.`);
        }

        const conflictingAssignments = await tx.bookingRoom.findMany({
            where: {
                roomId: { in: selectedRoomIds },
                bookingId: { not: parsedBookingId },
                booking: {
                    bookingStatus: { in: CONFLICTING_BOOKING_STATUSES },
                    checkIn: { lt: booking.checkOut },
                    checkOut: { gt: booking.checkIn },
                },
            },
            include: {
                room: { select: { roomNumber: true } },
            },
        });

        if (conflictingAssignments.length > 0) {
            const conflicts = conflictingAssignments.map((row) => row.room.roomNumber).join(', ');
            throw createError(409, `Room(s) ${conflicts} are no longer available for these dates.`);
        }

        const isRoomSelectionChanged =
            selectedRoomIds.length !== currentRoomIds.length ||
            selectedRoomIds.some((id) => !currentRoomIds.includes(id));

        if (isRoomSelectionChanged) {
            await tx.bookingRoom.deleteMany({
                where: { bookingId: parsedBookingId },
            });

            await tx.bookingRoom.createMany({
                data: selectedRoomIds.map((roomId) => ({
                    bookingId: parsedBookingId,
                    roomId,
                })),
            });

            // Recalculate total amount when rooms change
            const selectedRoomsWithPrices = await tx.room.findMany({
                where: { id: { in: selectedRoomIds } },
                select: { pricePerNight: true },
            });

            const checkInDate = new Date(booking.checkIn);
            const checkOutDate = new Date(booking.checkOut);
            const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
            
            const totalPerNight = selectedRoomsWithPrices.reduce(
                (sum, room) => sum + parseFloat(room.pricePerNight),
                0
            );
            const newTotalAmount = parseFloat((totalPerNight * nights).toFixed(2));

            // Update payment amount to match new total
            await tx.payment.updateMany({
                where: { bookingId: parsedBookingId },
                data: { amount: newTotalAmount },
            });

            // Update booking with new total amount
            await tx.booking.update({
                where: { id: parsedBookingId },
                data: { totalAmount: newTotalAmount },
            });
        }

        // Update Guest
        const updatedGuest = await tx.guest.update({
            where: { id: booking.guestId },
            data: {
                address: address || booking.guest.address,
                idProofType: proofType || booking.guest.idProofType,
            },
        });

        // Update Booking status to checked_in
        const updatedBooking = await tx.booking.update({
            where: { id: parsedBookingId },
            data: {
                bookingStatus: 'checked_in',
                totalGuests: totalGuests ? parseInt(totalGuests) : booking.totalGuests,
            },
            include: bookingInclude,
        });

        return {
            ...formatBooking(updatedBooking),
            message: isRoomSelectionChanged
                ? 'Guest checked in and room assignment updated successfully.'
                : 'Guest checked in successfully.',
        };
    });

    return result;
};

// ─── SERVICE 10: Create offline booking ───────────────────────
const createWalkinBooking = async ({
    name,
    email,
    phone,
    address,
    proofType,
    checkIn,
    checkOut,
    roomType,
    quantity,
    totalGuests,
    paymentMethod,
    transactionId,
    paymentDate,
}) => {
    // Validation
    if (!name || !email || !phone) {
        throw createError(400, 'name, email, and phone are required.');
    }

    if (!address) {
        throw createError(400, 'address is required for offline bookings.');
    }

    if (proofType && !['aadhaar', 'passport'].includes(proofType)) {
        throw createError(400, 'proofType must be "aadhaar" or "passport".');
    }

    if (!paymentMethod) {
        throw createError(400, 'paymentMethod is required.');
    }

    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
    if (!normalizedPaymentMethod) {
        throw createError(400, 'paymentMethod must be one of: UPI, card, cash, gateway');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        throw createError(400, 'Please provide a valid email address.');
    }

    if (!checkIn || !checkOut) {
        throw createError(400, 'checkIn and checkOut are required.');
    }

    const validRoomTypes = ['premium', 'premium_plus'];
    if (!validRoomTypes.includes(roomType)) {
        throw createError(400, 'roomType must be "premium" or "premium_plus".');
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 6) {
        throw createError(400, 'quantity must be a positive integer between 1 and 6.');
    }

    const guests = parseInt(totalGuests);
    if (isNaN(guests) || guests < 1) {
        throw createError(400, 'totalGuests must be a positive integer.');
    }

    // Validate dates
    const validateDates = (checkIn, checkOut) => {
        const ci = new Date(checkIn);
        const co = new Date(checkOut);

        if (isNaN(ci.getTime()) || isNaN(co.getTime())) {
            throw createError(400, 'Invalid date format. Use YYYY-MM-DD.');
        }
        if (co <= ci) {
            throw createError(400, 'Check-out date must be after check-in date.');
        }

        return { ci, co };
    };

    const calculateNights = (checkIn, checkOut) => {
        const diff = new Date(checkOut) - new Date(checkIn);
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const { ci, co } = validateDates(checkIn, checkOut);
    const nights = calculateNights(ci, co);

    // Transaction with room allocation
    const booking = await prisma.$transaction(async (tx) => {
        // Generate booking reference
        const currentYear = new Date().getFullYear();
        const prefix = `MH-${currentYear}`;

        const lastBooking = await tx.booking.findMany({
            where: {
                bookingReference: { startsWith: prefix },
            },
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

        // Lock ALL active rooms
        const lockedRooms = await tx.$queryRawUnsafe(
            `SELECT id, room_number, room_type, max_guests, price_per_night, status
       FROM rooms
       WHERE status = 'active'
       FOR UPDATE`
        );

        // Find booked rooms for date range
        const bookedRoomData = await tx.bookingRoom.findMany({
            where: {
                booking: {
                    bookingStatus: { in: ['pending', 'confirmed', 'checked_in', 'checked_out'] },
                    checkIn: { lt: co },
                    checkOut: { gt: ci },
                },
            },
            select: { roomId: true },
        });

        const bookedRoomIds = bookedRoomData.map((br) => br.roomId);
        const availableRooms = lockedRooms.filter(r => !bookedRoomIds.includes(r.id));

        const availablePremium = availableRooms
            .filter(r => r.room_type === 'premium')
            .sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number));

        const availablePremiumPlus = availableRooms
            .filter(r => r.room_type === 'premium_plus')
            .sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number));

        // Allocate rooms (admin handles mixed allocation manually)
        let selectedRooms = [];

        if (roomType === 'premium') {
            if (availablePremium.length >= qty) {
                selectedRooms = availablePremium.slice(0, qty);
            } else {
                throw createError(409, `Not enough ${roomType} rooms available.`);
            }
        } else if (roomType === 'premium_plus') {
            if (availablePremiumPlus.length >= qty) {
                selectedRooms = availablePremiumPlus.slice(0, qty);
            } else {
                throw createError(409, `Not enough ${roomType} rooms available.`);
            }
        }

        // Validate capacity
        const totalCapacity = selectedRooms.reduce((sum, r) => sum + r.max_guests, 0);
        if (totalCapacity < guests) {
            throw createError(400, `Selected rooms can accommodate ${totalCapacity} guests max.`);
        }

        // Calculate total amount
        const totalAmount = selectedRooms.reduce((sum, room) => {
            return sum + parseFloat(room.price_per_night) * nights;
        }, 0);

        // Create Guest
        const guest = await tx.guest.create({
            data: {
                fullName: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                address: address.trim(),
                idProofType: proofType || null,
            },
        });

        // Create Booking
        const newBooking = await tx.booking.create({
            data: {
                guestId: guest.id,
                bookingReference,
                checkIn: ci,
                checkOut: co,
                totalGuests: guests,
                bookingStatus: 'confirmed',
                bookingSource: 'offline',
                totalAmount: parseFloat(totalAmount.toFixed(2)),
            },
        });

        // Create BookingRoom entries
        await tx.bookingRoom.createMany({
            data: selectedRooms.map((room) => ({
                bookingId: newBooking.id,
                roomId: room.id,
            })),
        });

        // Create Payment (immediately paid)
        const payment = await tx.payment.create({
            data: {
                bookingId: newBooking.id,
                amount: parseFloat(totalAmount.toFixed(2)),
                paymentMethod: normalizedPaymentMethod,
                paymentStatus: 'paid',
                transactionId: transactionId || null,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            },
        });

        return {
            bookingReference,
            guestName: guest.fullName,
            checkIn: ci.toISOString().split('T')[0],
            checkOut: co.toISOString().split('T')[0],
            rooms: selectedRooms.map(r => ({
                roomNumber: r.room_number,
                roomType: r.room_type,
                pricePerNight: parseFloat(r.price_per_night),
            })),
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            paymentStatus: 'paid',
            paymentMethod: payment.paymentMethod,
            message: 'Offline booking created and payment recorded.',
        };
    });

    return booking;
};

// ─── SERVICE 11: Search payments ──────────────────────────────
const searchPayments = async ({ bookingReference, guestName, phone } = {}) => {
    // At least one parameter must be provided
    if (!bookingReference && !guestName && !phone) {
        throw createError(400, 'At least one search parameter is required: bookingReference, guestName, or phone');
    }

    const where = {
        AND: [],
    };

    if (bookingReference) {
        where.AND.push({
            booking: {
                bookingReference: {
                    contains: bookingReference,
                    mode: 'insensitive',
                },
            },
        });
    }

    if (guestName) {
        where.AND.push({
            booking: {
                guest: {
                    fullName: {
                        contains: guestName,
                        mode: 'insensitive',
                    },
                },
            },
        });
    }

    if (phone) {
        where.AND.push({
            booking: {
                guest: {
                    phone: {
                        contains: phone,
                        mode: 'insensitive',
                    },
                },
            },
        });
    }

    const payments = await prisma.payment.findMany({
        where: where.AND.length > 0 ? where : undefined,
        include: {
            booking: {
                select: {
                    id: true,
                    bookingReference: true,
                    checkIn: true,
                    checkOut: true,
                    bookingStatus: true,
                    totalAmount: true,
                    guest: {
                        select: {
                            fullName: true,
                            phone: true,
                        },
                    },
                },
            },
        },
        orderBy: { paymentDate: 'desc' },
    });

    return {
        total: payments.length,
        payments: payments.map(p => ({
            id: p.id,
            amount: parseFloat(p.amount),
            paymentMethod: p.paymentMethod,
            paymentStatus: p.paymentStatus,
            transactionId: p.transactionId,
            paymentDate: p.paymentDate,
            booking: {
                id: p.booking.id,
                bookingReference: p.booking.bookingReference,
                checkIn: p.booking.checkIn,
                checkOut: p.booking.checkOut,
                totalAmount: parseFloat(p.booking.totalAmount),
                guest: p.booking.guest,
            },
        })),
    };
};

// ─── SERVICE 12: Cancel payment (refund) ──────────────────────
const cancelPayment = async (paymentId) => {
    if (!paymentId) {
        throw createError(400, 'paymentId is required.');
    }

    const payment = await prisma.payment.findUnique({
        where: { id: parseInt(paymentId) },
        include: { booking: true },
    });

    if (!payment) {
        throw createError(404, 'Payment not found.');
    }

    if (payment.paymentStatus === 'refunded') {
        throw createError(409, 'Payment is already refunded.');
    }

    // Update payment status to refunded and booking status to cancelled
    const updated = await prisma.payment.update({
        where: { id: parseInt(paymentId) },
        data: {
            paymentStatus: 'refunded',
        },
        include: { booking: true },
    });

    // Also update the related booking to cancelled
    await prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
            bookingStatus: 'cancelled',
        },
    });

    return {
        id: updated.id,
        amount: parseFloat(updated.amount),
        paymentMethod: updated.paymentMethod,
        paymentStatus: updated.paymentStatus,
        transactionId: updated.transactionId,
        paymentDate: updated.paymentDate,
        booking: {
            id: updated.booking.id,
            bookingStatus: 'cancelled',
        },
        message: 'Payment refunded and booking cancelled.',
    };
};

// ─── SERVICE 12: Confirm payment (admin click) ────────────────
const confirmPayment = async (bookingId) => {
    if (!bookingId) {
        throw createError(400, 'bookingId is required.');
    }

    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(bookingId) },
        include: { payments: true },
    });

    if (!booking) {
        throw createError(404, 'Booking not found.');
    }

    const payment = booking.payments[0];
    if (!payment) {
        throw createError(404, 'Payment not found for this booking.');
    }

    if (booking.bookingStatus === 'confirmed') {
        throw createError(409, 'Booking is already confirmed.');
    }

    const updated = await prisma.$transaction(async (tx) => {
        // Update payment status to paid
        const updatedPayment = await tx.payment.update({
            where: { id: payment.id },
            data: {
                paymentStatus: 'paid',
                paymentDate: new Date(),
            },
        });

        // Update booking status to confirmed
        const updatedBooking = await tx.booking.update({
            where: { id: parseInt(bookingId) },
            data: {
                bookingStatus: 'confirmed',
            },
            include: bookingInclude,
        });

        return { payment: updatedPayment, booking: updatedBooking };
    });

    return {
        booking: formatBooking(updated.booking),
        payment: {
            id: updated.payment.id,
            amount: parseFloat(updated.payment.amount),
            paymentStatus: updated.payment.paymentStatus,
            paymentDate: updated.payment.paymentDate,
        },
        message: 'Payment confirmed and booking status updated to confirmed.',
    };
};

// ─── SERVICE 12: Get today's revenue ───────────────────────────
const getTodayRevenue = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const payments = await prisma.payment.findMany({
        where: {
            paymentStatus: 'paid',
            paymentDate: {
                gte: today,
                lt: tomorrow,
            },
        },
    });
    
    const revenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    return parseFloat(revenue.toFixed(2));
};

module.exports = {
    getAllBookings,
    getBookingById,
    cancelBooking,
    updateBookingStatus,
    getAllRooms,
    updateRoom,
    getDashboardSummary,
    getTodayActivity,
    updatePayment,
    getCheckInRoomOptions,
    checkInGuest,
    createWalkinBooking,
    searchPayments,
    cancelPayment,
    confirmPayment,
    getTodayRevenue,
};