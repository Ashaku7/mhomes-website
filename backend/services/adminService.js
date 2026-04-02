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

    if (status) where.bookingStatus = status;
    if (source) where.bookingSource = source;
    if (date) {
        const day = new Date(date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        where.createdAt = { gte: day, lt: nextDay };
    }

    const bookings = await prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
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
    });

    if (!booking) throw createError(404, 'Booking not found.');

    if (booking.bookingStatus === 'cancelled') {
        throw createError(409, 'Booking is already cancelled.');
    }

    const updated = await prisma.booking.update({
        where: { id: parseInt(id) },
        data: {
            bookingStatus: 'cancelled',
            notes: reason
                ? `${booking.notes ? booking.notes + ' | ' : ''}Cancelled: ${reason}`
                : booking.notes,
        },
        include: bookingInclude,
    });

    return {
        ...formatBooking(updated),
        message: 'Booking cancelled successfully.',
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
            where: { checkOut: { gte: today, lt: tomorrow }, bookingStatus: { in: ['pending', 'confirmed'] } },
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
                bookingStatus: 'confirmed',
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
    bookingStatus: b.bookingStatus,
    bookingSource: b.bookingSource,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    totalGuests: b.totalGuests,
    totalAmount: parseFloat(b.totalAmount),
    notes: b.notes,
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

// ─── SERVICE 9: Guest check-in ────────────────────────────────
const checkInGuest = async (bookingId, { address, proofType, totalGuests }) => {
    if (!bookingId) {
        throw createError(400, 'bookingId is required.');
    }

    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(bookingId) },
        include: { guest: true },
    });

    if (!booking) {
        throw createError(404, 'Booking not found.');
    }

    if (booking.bookingStatus !== 'confirmed') {
        throw createError(409, 'Booking must be in "confirmed" status to check-in.');
    }

    if (proofType) {
        const validProofTypes = ['aadhaar', 'passport'];
        if (!validProofTypes.includes(proofType)) {
            throw createError(400, `proofType must be one of: ${validProofTypes.join(', ')}`);
        }
    }

    const result = await prisma.$transaction(async (tx) => {
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
            where: { id: parseInt(bookingId) },
            data: {
                bookingStatus: 'checked_in',
                totalGuests: totalGuests ? parseInt(totalGuests) : booking.totalGuests,
            },
            include: bookingInclude,
        });

        return {
            ...formatBooking(updatedBooking),
            message: 'Guest checked in successfully.',
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
                    bookingStatus: { in: ['pending', 'confirmed'] },
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

module.exports = {
    getAllBookings,
    getBookingById,
    cancelBooking,
    getAllRooms,
    updateRoom,
    getDashboardSummary,
    getTodayActivity,
    updatePayment,
    checkInGuest,
    createWalkinBooking,
    searchPayments,
    cancelPayment,
    confirmPayment,
};